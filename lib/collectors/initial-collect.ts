import type { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Quick keyword-based signal scoring — avoids Gemini rate limits during bulk collection.
 * Gemini is used later for the dossier, not per-signal.
 */
function quickScore(
  signalType: string,
  title: string,
  description: string
): { score: number; summary: string; isRelevant: boolean } {
  const text = `${title} ${description}`.toLowerCase();

  const criticalKeywords = [
    'acquisition', 'acquired', 'merger', 'ipo', 'funding', 'raised',
    'series a', 'series b', 'series c', 'series d', 'valuation',
    'ceo', 'cto', 'cfo', 'coo', 'chief', 'rebrand', 'pivot',
    'bankruptcy', 'lawsuit', 'sec filing', 'regulatory',
  ];

  const highKeywords = [
    'partnership', 'expansion', 'launch', 'new market', 'strategic',
    'vp', 'vice president', 'director', 'head of', 'general manager',
    'revenue', 'profit', 'growth', 'investment', 'investor',
    'technology', 'ai ', 'artificial intelligence', 'platform',
    'new property', 'new location', 'portfolio', 'units',
  ];

  const mediumKeywords = [
    'hire', 'hiring', 'job posting', 'team', 'office',
    'product', 'feature', 'update', 'award', 'recognition',
    'conference', 'event', 'webinar', 'podcast', 'interview',
    'review', 'rating', 'customer', 'experience',
  ];

  if (criticalKeywords.some((kw) => text.includes(kw))) {
    return { score: 9, summary: description.slice(0, 300) || title, isRelevant: true };
  }
  if (highKeywords.some((kw) => text.includes(kw))) {
    return { score: 7, summary: description.slice(0, 300) || title, isRelevant: true };
  }
  if (mediumKeywords.some((kw) => text.includes(kw))) {
    return { score: 5, summary: description.slice(0, 300) || title, isRelevant: true };
  }
  return { score: 3, summary: description.slice(0, 300) || title, isRelevant: false };
}

// ─── News Collection (Perigon + Google RSS) ──────────────────────────

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
}

async function fetchPerigonNews(
  companyName: string,
  lookbackDays: number
): Promise<NewsArticle[]> {
  const apiKey = process.env.PERIGON_API_KEY;
  if (!apiKey) return [];

  try {
    const from = new Date();
    from.setDate(from.getDate() - lookbackDays);

    const url = new URL('https://api.goperigon.com/v1/all');
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('q', `"${companyName}"`);
    url.searchParams.set('language', 'en');
    url.searchParams.set('sortBy', 'date');
    url.searchParams.set('size', '50');
    url.searchParams.set('from', from.toISOString().split('T')[0]);

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) return [];
    const data = await response.json();

    return (data.articles || []).map(
      (a: { title: string; description?: string; url: string; pubDate?: string; source?: { name?: string } }) => ({
        title: a.title,
        description: a.description || '',
        url: a.url,
        publishedAt: a.pubDate || new Date().toISOString(),
        source: a.source?.name || 'News',
      })
    );
  } catch {
    return [];
  }
}

async function fetchGoogleRSSNews(companyName: string): Promise<NewsArticle[]> {
  try {
    const query = encodeURIComponent(`"${companyName}" hospitality OR rental OR apartment`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
    const response = await fetch(rssUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return [];

    const xml = await response.text();
    const items: NewsArticle[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const c = match[1];
      const title = /<title>([\s\S]*?)<\/title>/.exec(c)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
      const link = /<link>([\s\S]*?)<\/link>/.exec(c)?.[1]?.trim();
      const pubDate = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(c)?.[1]?.trim();
      const source = /<source[^>]*>([\s\S]*?)<\/source>/.exec(c)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim();

      if (title && link) {
        items.push({
          title,
          description: '',
          url: link,
          publishedAt: pubDate || new Date().toISOString(),
          source: source || 'Google News',
        });
      }
      if (items.length >= 15) break;
    }
    return items;
  } catch {
    return [];
  }
}

// ─── Job Collection (SerpAPI) ────────────────────────────────────────

interface JobPosting {
  title: string;
  location: string;
  url: string;
  description: string;
}

async function fetchJobs(companyName: string): Promise<JobPosting[]> {
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(companyName + ' jobs')}&api_key=${apiKey}`,
      { signal: AbortSignal.timeout(20000) }
    );
    if (!response.ok) return [];

    const data = await response.json();
    return (data.jobs_results || []).slice(0, 20).map(
      (job: { title: string; location: string; share_link?: string; description?: string }) => ({
        title: job.title,
        location: job.location || '',
        url: job.share_link || '',
        description: (job.description || '').slice(0, 500),
      })
    );
  } catch {
    return [];
  }
}

// ─── SerpAPI Google News ─────────────────────────────────────────────

async function fetchSerpAPINews(companyName: string): Promise<NewsArticle[]> {
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) return [];

  try {
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google_news');
    url.searchParams.set('q', `"${companyName}"`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('gl', 'us');
    url.searchParams.set('hl', 'en');

    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(20000) });
    if (!response.ok) return [];

    const data = await response.json();
    const articles: NewsArticle[] = [];

    for (const result of data.news_results || []) {
      articles.push({
        title: result.title || '',
        description: result.snippet || '',
        url: result.link || '',
        publishedAt: result.date || new Date().toISOString(),
        source: result.source?.name || 'Google News',
      });
      for (const story of result.stories || []) {
        articles.push({
          title: story.title || '',
          description: story.snippet || '',
          url: story.link || '',
          publishedAt: story.date || new Date().toISOString(),
          source: story.source?.name || 'Google News',
        });
      }
    }
    return articles.slice(0, 20);
  } catch {
    return [];
  }
}

// ─── Main Initial Collection Function ────────────────────────────────

export interface CollectionResult {
  newsCount: number;
  jobsCount: number;
  totalInserted: number;
  errors: string[];
}

export async function collectInitialSignals(
  supabase: SupabaseClient,
  competitorId: string,
  competitorName: string,
  lookbackDays: number = 90
): Promise<CollectionResult> {
  const result: CollectionResult = { newsCount: 0, jobsCount: 0, totalInserted: 0, errors: [] };

  // ── Collect from all sources in parallel ──
  const [perigonNews, googleRSSNews, serpNews, jobs] = await Promise.allSettled([
    fetchPerigonNews(competitorName, lookbackDays),
    fetchGoogleRSSNews(competitorName),
    fetchSerpAPINews(competitorName),
    fetchJobs(competitorName),
  ]);

  // ── Merge and deduplicate news ──
  const allNews: NewsArticle[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  const newsArrays = [
    perigonNews.status === 'fulfilled' ? perigonNews.value : [],
    googleRSSNews.status === 'fulfilled' ? googleRSSNews.value : [],
    serpNews.status === 'fulfilled' ? serpNews.value : [],
  ];

  for (const articles of newsArrays) {
    for (const article of articles) {
      const urlKey = article.url.toLowerCase();
      const titleKey = article.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
      if (seenUrls.has(urlKey) || seenTitles.has(titleKey)) continue;
      seenUrls.add(urlKey);
      seenTitles.add(titleKey);
      allNews.push(article);
    }
  }

  const allJobs = jobs.status === 'fulfilled' ? jobs.value : [];

  // ── Check existing signals to avoid duplicates ──
  const { data: existingSignals } = await supabase
    .from('signals')
    .select('source_url, title')
    .eq('competitor_id', competitorId);

  const existingUrls = new Set((existingSignals || []).map((s) => s.source_url).filter(Boolean));
  const existingTitles = new Set((existingSignals || []).map((s) => s.title.toLowerCase()));

  // ── Insert news signals ──
  const newsToInsert = allNews
    .filter((a) => !existingUrls.has(a.url) && !existingTitles.has(a.title.toLowerCase()))
    .map((article) => {
      const scoring = quickScore('news', article.title, article.description);
      return {
        competitor_id: competitorId,
        signal_type: 'news_press' as const,
        title: article.title,
        summary: scoring.summary || article.description || article.title,
        raw_data: {
          description: article.description,
          source: article.source,
          publishedAt: article.publishedAt,
          url_hash: crypto.createHash('md5').update(article.url).digest('hex'),
        },
        source_url: article.url,
        relevance_score: scoring.score,
        is_strategically_relevant: scoring.isRelevant,
        detected_at: article.publishedAt || new Date().toISOString(),
      };
    });

  if (newsToInsert.length > 0) {
    // Insert in batches of 20
    for (let i = 0; i < newsToInsert.length; i += 20) {
      const batch = newsToInsert.slice(i, i + 20);
      const { error } = await supabase.from('signals').insert(batch);
      if (error) {
        result.errors.push(`News insert error: ${error.message}`);
      } else {
        result.newsCount += batch.length;
        result.totalInserted += batch.length;
      }
    }
  }

  // ── Insert job signals ──
  const jobsToInsert = allJobs
    .filter((j) => !existingTitles.has(`new job posting: ${j.title}`.toLowerCase()))
    .map((job) => {
      const scoring = quickScore('hiring', job.title, job.description);
      return {
        competitor_id: competitorId,
        signal_type: 'hiring' as const,
        title: `New job posting: ${job.title}`,
        summary: scoring.summary || `${job.title} at ${competitorName} in ${job.location}`,
        raw_data: {
          ...job,
          content_hash: crypto.createHash('md5').update(`${job.title}-${job.location}-${competitorName}`).digest('hex'),
          change_type: 'new',
        },
        source_url: job.url || null,
        relevance_score: scoring.score,
        is_strategically_relevant: scoring.isRelevant,
        detected_at: new Date().toISOString(),
      };
    });

  if (jobsToInsert.length > 0) {
    for (let i = 0; i < jobsToInsert.length; i += 20) {
      const batch = jobsToInsert.slice(i, i + 20);
      const { error } = await supabase.from('signals').insert(batch);
      if (error) {
        result.errors.push(`Jobs insert error: ${error.message}`);
      } else {
        result.jobsCount += batch.length;
        result.totalInserted += batch.length;
      }
    }
  }

  // ── Store job snapshot for future change detection ──
  if (allJobs.length > 0) {
    const snapshotContent: Record<string, JobPosting> = {};
    for (const job of allJobs) {
      const hash = crypto.createHash('md5').update(`${job.title}-${job.location}-${competitorName}`).digest('hex');
      snapshotContent[hash] = job;
    }
    await supabase.from('snapshots').insert({
      competitor_id: competitorId,
      snapshot_type: 'job_listings',
      content_hash: crypto.createHash('md5').update(JSON.stringify(snapshotContent)).digest('hex'),
      content: JSON.stringify(snapshotContent),
    }).then(({ error }) => {
      if (error) result.errors.push(`Snapshot error: ${error.message}`);
    });
  }

  return result;
}
