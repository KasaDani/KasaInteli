import type { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SEARCHAPI_KEY = process.env.SEARCHAPI_API_KEY;
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

/**
 * Quick keyword-based signal scoring — avoids Gemini rate limits during bulk collection.
 */
function quickScore(
  signalType: string,
  title: string,
  description: string
): { score: number; summary: string; isRelevant: boolean } {
  const text = `${title} ${description}`.toLowerCase();

  const criticalKeywords = [
    // Financial & Corporate
    'acquisition', 'acquired', 'merger', 'ipo', 'funding', 'raised',
    'series a', 'series b', 'series c', 'series d', 'valuation',
    'bankruptcy', 'lawsuit', 'sec filing', 'regulatory', 'delisted',
    // Leadership
    'ceo', 'cto', 'cfo', 'coo', 'chief', 'rebrand', 'pivot',
    // Revenue & Pricing
    'dynamic pricing', 'rate strategy', 'revpar', 'revenue management',
    'subscription model', 'loyalty program',
    // Restructuring
    'layoff', 'restructuring', 'reorganization', 'workforce reduction',
  ];
  const highKeywords = [
    // Growth & Portfolio
    'partnership', 'expansion', 'launch', 'new market', 'strategic',
    'new property', 'new location', 'portfolio', 'units',
    'franchise', 'brand launch', 'pipeline', 'divestiture',
    // Talent
    'vp', 'vice president', 'director', 'head of', 'general manager',
    // Financial
    'revenue', 'profit', 'growth', 'investment', 'investor',
    'earnings', 'forward guidance', 'analyst upgrade', 'analyst downgrade',
    'margin', 'capital allocation', 'buyback',
    // Technology
    'technology', 'ai ', 'artificial intelligence', 'platform',
    'mobile check-in', 'automation', 'concierge', 'ota partnership',
    // ESG & Macro
    'esg', 'sustainability', 'carbon neutral', 'recession',
    'demand softness', 'union', 'wage increase',
  ];
  const mediumKeywords = [
    'hire', 'hiring', 'job posting', 'team', 'office',
    'product', 'feature', 'update', 'award', 'recognition',
    'conference', 'event', 'webinar', 'podcast', 'interview',
    'review', 'rating', 'customer', 'experience',
    'occupancy', 'adr', 'ancillary', 'benefits', 'employer brand',
    'nps', 'guest satisfaction', 'share of voice',
    'lobbying', 'regulatory filing', 'trademark',
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

// ─── News Collection ─────────────────────────────────────────────────

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
}

async function fetchPerigonNews(companyName: string, lookbackDays: number): Promise<NewsArticle[]> {
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

    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(20000) });
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
        items.push({ title, description: '', url: link, publishedAt: pubDate || new Date().toISOString(), source: source || 'Google News' });
      }
      if (items.length >= 15) break;
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchSearchAPINews(companyName: string): Promise<NewsArticle[]> {
  if (!SEARCHAPI_KEY) return [];

  try {
    const url = new URL('https://www.searchapi.io/api/v1/search');
    url.searchParams.set('engine', 'google_news');
    url.searchParams.set('q', `"${companyName}" hospitality OR rental OR apartment OR funding OR acquisition OR pricing OR earnings OR layoff OR ESG OR technology`);
    url.searchParams.set('api_key', SEARCHAPI_KEY);

    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(20000) });
    if (!response.ok) return [];

    const data = await response.json();
    // SearchAPI.io returns organic_results for google_news
    return (data.organic_results || []).map(
      (r: { title?: string; snippet?: string; link?: string; source?: string; iso_date?: string; date?: string }) => ({
        title: r.title || '',
        description: r.snippet || '',
        url: r.link || '',
        publishedAt: r.iso_date || r.date || new Date().toISOString(),
        source: r.source || 'Google News',
      })
    );
  } catch {
    return [];
  }
}

// ─── Job Collection (SearchAPI.io google_jobs) ───────────────────────

interface JobPosting {
  title: string;
  location: string;
  url: string;
  description: string;
  team?: string;
  postedAt?: string;
}

async function fetchJobs(companyName: string): Promise<JobPosting[]> {
  if (!SEARCHAPI_KEY) {
    console.log('[Initial] SEARCHAPI_API_KEY not configured, skipping job collection');
    return [];
  }

  try {
    const url = new URL('https://www.searchapi.io/api/v1/search');
    url.searchParams.set('engine', 'google_jobs');
    url.searchParams.set('q', `${companyName} jobs`);
    url.searchParams.set('api_key', SEARCHAPI_KEY);

    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(20000) });
    if (!response.ok) {
      console.error('[Initial] SearchAPI google_jobs error:', response.status);
      return [];
    }

    const data = await response.json();
    // SearchAPI.io uses "jobs" (not "jobs_results")
    const jobs = data.jobs || [];

    return jobs.slice(0, 25).map(
      (job: { title: string; location?: string; sharing_link?: string; apply_link?: string; description?: string; company_name?: string }) => ({
        title: job.title,
        location: job.location || '',
        url: job.sharing_link || job.apply_link || '',
        description: (job.description || '').slice(0, 500),
      })
    );
  } catch (err) {
    console.error('[Initial] SearchAPI fetch error:', err);
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
  const [perigonNews, googleRSSNews, searchAPINews, jobs] = await Promise.allSettled([
    fetchPerigonNews(competitorName, lookbackDays),
    fetchGoogleRSSNews(competitorName),
    fetchSearchAPINews(competitorName),
    fetchJobs(competitorName),
  ]);

  // ── Merge and deduplicate news ──
  const allNews: NewsArticle[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  const newsArrays = [
    perigonNews.status === 'fulfilled' ? perigonNews.value : [],
    googleRSSNews.status === 'fulfilled' ? googleRSSNews.value : [],
    searchAPINews.status === 'fulfilled' ? searchAPINews.value : [],
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

  console.log(`[Initial] ${competitorName}: ${allNews.length} news articles, ${allJobs.length} jobs found`);

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
