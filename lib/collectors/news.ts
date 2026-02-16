import { createServiceClient } from '@/lib/supabase/server';
import { analyzeSignalRelevance } from '@/lib/gemini';
import crypto from 'crypto';
import { isArticleRelevantToCompetitor } from '@/lib/collectors/article-relevance';

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
}

/**
 * Fetches news articles from Perigon API (primary) with Google News RSS as fallback.
 * Uses targeted search terms for hospitality-industry relevance.
 */
async function fetchNewsFromPerigon(companyName: string): Promise<NewsArticle[]> {
  const apiKey = process.env.PERIGON_API_KEY;

  if (!apiKey) {
    console.log('PERIGON_API_KEY not configured, using Google News RSS fallback');
    return fetchNewsFromGoogleRSS(companyName);
  }

  try {
    const url = new URL('https://api.goperigon.com/v1/all');
    url.searchParams.set('apiKey', apiKey);
    // Use targeted query: company name + hospitality/real-estate context
    url.searchParams.set(
      'q',
      `"${companyName}" AND (hospitality OR "short-term rental" OR funding OR acquisition OR partnership OR expansion OR launch OR pricing OR "dynamic pricing" OR RevPAR OR layoff OR restructuring OR sustainability OR ESG OR earnings OR "investor" OR IPO OR technology OR "AI concierge" OR franchise)`
    );
    url.searchParams.set('language', 'en');
    url.searchParams.set('sortBy', 'date');
    url.searchParams.set('size', '15');
    url.searchParams.set('country', 'us');
    // Only get articles from the past 14 days
    const from = new Date();
    from.setDate(from.getDate() - 14);
    url.searchParams.set('from', from.toISOString().split('T')[0]);

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error('Perigon API error:', response.status);
      return fetchNewsFromGoogleRSS(companyName);
    }

    const data = await response.json();

    return (data.articles || []).map(
      (article: {
        title: string;
        description?: string;
        url: string;
        pubDate?: string;
        source?: { name?: string; domain?: string };
      }) => ({
        title: article.title,
        description: article.description || '',
        url: article.url,
        publishedAt: article.pubDate || new Date().toISOString(),
        source: article.source?.name || article.source?.domain || 'Unknown',
      })
    );
  } catch (error) {
    console.error('Perigon fetch error:', error);
    return fetchNewsFromGoogleRSS(companyName);
  }
}

async function fetchNewsFromGoogleRSS(companyName: string): Promise<NewsArticle[]> {
  try {
    const query = encodeURIComponent(`"${companyName}" hospitality OR "short-term rental" OR "flexible stay"`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

    const response = await fetch(rssUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const xml = await response.text();

    const items: NewsArticle[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemContent = match[1];
      const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(itemContent);
      const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(itemContent);
      const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(itemContent);
      const sourceMatch = /<source[^>]*>([\s\S]*?)<\/source>/.exec(itemContent);

      if (titleMatch && linkMatch) {
        items.push({
          title: titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
          description: '',
          url: linkMatch[1].trim(),
          publishedAt: pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString(),
          source: sourceMatch ? sourceMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : 'Google News',
        });
      }

      if (items.length >= 10) break;
    }

    return items;
  } catch (error) {
    console.error('Google RSS fetch error:', error);
    return [];
  }
}

/**
 * Fetches news from SerpAPI Google News engine as a second source.
 * Catches breaking stories and niche publications Perigon may miss.
 */
async function fetchNewsFromSearchAPI(companyName: string): Promise<NewsArticle[]> {
  const apiKey = process.env.SEARCHAPI_API_KEY;
  if (!apiKey) return [];

  try {
    const url = new URL('https://www.searchapi.io/api/v1/search');
    url.searchParams.set('engine', 'google_news');
    url.searchParams.set(
      'q',
      `"${companyName}" hospitality OR rental OR apartment OR funding OR acquisition OR pricing OR earnings OR layoff OR ESG OR technology OR partnership`
    );
    url.searchParams.set('api_key', apiKey);

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      console.error('SearchAPI Google News error:', response.status);
      return [];
    }

    const data = await response.json();
    const articles: NewsArticle[] = [];

    // SearchAPI.io returns organic_results for google_news engine
    for (const result of data.organic_results || []) {
      articles.push({
        title: result.title || '',
        description: result.snippet || '',
        url: result.link || '',
        publishedAt: result.iso_date || result.date || new Date().toISOString(),
        source: result.source || 'Google News',
      });
    }

    return articles.slice(0, 15);
  } catch (error) {
    console.error('SearchAPI Google News fetch error:', error);
    return [];
  }
}

export async function collectNewsSignals(
  competitorId: string,
  competitorName: string,
  competitorWebsite?: string | null,
  competitorDescription?: string | null
) {
  const supabase = await createServiceClient();

  // Fetch from both Perigon (primary) and SearchAPI Google News (secondary)
  const [perigonArticles, googleNewsArticles] = await Promise.all([
    fetchNewsFromPerigon(competitorName),
    fetchNewsFromSearchAPI(competitorName),
  ]);

  // Merge and deduplicate across sources by URL domain + title similarity
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const articles: NewsArticle[] = [];

  for (const article of [...perigonArticles, ...googleNewsArticles]) {
    const urlKey = article.url.toLowerCase();
    const titleKey = article.title.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (seenUrls.has(urlKey) || seenTitles.has(titleKey)) continue;
    seenUrls.add(urlKey);
    seenTitles.add(titleKey);
    if (
      isArticleRelevantToCompetitor(article, {
        name: competitorName,
        website: competitorWebsite,
        description: competitorDescription,
      })
    ) {
      articles.push(article);
    }
  }

  const results = [];

  for (const article of articles) {
    // Deduplicate by URL hash -- use source_url field for reliable matching
    const urlHash = crypto.createHash('md5').update(article.url).digest('hex');

    const { data: existingByUrl } = await supabase
      .from('signals')
      .select('id')
      .eq('competitor_id', competitorId)
      .eq('signal_type', 'news_press')
      .eq('source_url', article.url)
      .maybeSingle();

    if (existingByUrl) continue;

    // Also check by title similarity (in case same article has different URLs)
    const { data: existingByTitle } = await supabase
      .from('signals')
      .select('id')
      .eq('competitor_id', competitorId)
      .eq('signal_type', 'news_press')
      .eq('title', article.title)
      .maybeSingle();

    if (existingByTitle) continue;

    const analysis = await analyzeSignalRelevance(
      'News Article',
      article.title,
      `${article.title}. ${article.description}. Source: ${article.source}`,
      competitorName
    );

    const { error } = await supabase.from('signals').insert({
      competitor_id: competitorId,
      signal_type: 'news_press',
      title: article.title,
      summary: analysis.summary,
      raw_data: {
        description: article.description,
        source: article.source,
        publishedAt: article.publishedAt,
        url_hash: urlHash,
      },
      source_url: article.url,
      relevance_score: analysis.score,
      is_strategically_relevant: analysis.isRelevant,
      detected_at: article.publishedAt || new Date().toISOString(),
    });

    if (error) {
      console.error('Error inserting news signal:', error);
    } else {
      results.push({ title: article.title, score: analysis.score });
    }
  }

  return results;
}
