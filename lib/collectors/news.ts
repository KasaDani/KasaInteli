import { createServiceClient } from '@/lib/supabase/server';
import { analyzeSignalRelevance } from '@/lib/gemini';
import crypto from 'crypto';

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
}

async function fetchNewsFromAPI(companyName: string): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
    console.log('NEWS_API_KEY not configured, using fallback');
    return fetchNewsFromGoogleRSS(companyName);
  }

  try {
    const query = encodeURIComponent(companyName);
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&pageSize=10&language=en&apiKey=${apiKey}`
    );

    if (!response.ok) {
      console.error('NewsAPI error:', response.status);
      return fetchNewsFromGoogleRSS(companyName);
    }

    const data = await response.json();
    return (data.articles || []).map(
      (article: { title: string; description: string; url: string; publishedAt: string; source: { name: string } }) => ({
        title: article.title,
        description: article.description || '',
        url: article.url,
        publishedAt: article.publishedAt,
        source: article.source?.name || 'Unknown',
      })
    );
  } catch (error) {
    console.error('NewsAPI fetch error:', error);
    return [];
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

    // Simple XML parsing for RSS items
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

export async function collectNewsSignals(competitorId: string, competitorName: string) {
  const supabase = await createServiceClient();
  const articles = await fetchNewsFromAPI(competitorName);

  const results = [];

  for (const article of articles) {
    // Deduplicate by URL hash
    const urlHash = crypto.createHash('md5').update(article.url).digest('hex');

    const { data: existing } = await supabase
      .from('signals')
      .select('id')
      .eq('competitor_id', competitorId)
      .eq('signal_type', 'news_press')
      .eq('raw_data->>url_hash', urlHash)
      .maybeSingle();

    if (existing) continue;

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
        ...article,
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
