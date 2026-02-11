import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const SEARCHAPI_KEY = process.env.SEARCHAPI_API_KEY;

interface JobPosting {
  title: string;
  location: string;
  url: string;
  description: string;
  team?: string;
  postedAt?: string;
  companyName?: string;
}

// ─── SearchAPI.io Google Jobs (primary, fast, structured) ────────────

async function fetchJobsFromSearchAPI(companyName: string): Promise<JobPosting[]> {
  if (!SEARCHAPI_KEY) {
    console.log('[Jobs] SEARCHAPI_API_KEY not configured, skipping job collection');
    return [];
  }

  try {
    const url = new URL('https://www.searchapi.io/api/v1/search');
    url.searchParams.set('engine', 'google_jobs');
    url.searchParams.set('q', `${companyName} jobs`);
    url.searchParams.set('api_key', SEARCHAPI_KEY);

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      console.error('[Jobs] SearchAPI google_jobs error:', response.status);
      return [];
    }

    const data = await response.json();
    // SearchAPI.io returns "jobs" array (not "jobs_results")
    const jobs = data.jobs || [];

    console.log(`[Jobs] SearchAPI returned ${jobs.length} job listings for "${companyName}"`);

    return jobs.slice(0, 30).map(
      (job: {
        title: string;
        company_name?: string;
        location?: string;
        via?: string;
        sharing_link?: string;
        apply_link?: string;
        description?: string;
        extensions?: string[];
        detected_extensions?: { posted_at?: string; schedule_type?: string };
      }) => ({
        title: job.title,
        location: job.location || '',
        url: job.sharing_link || job.apply_link || '',
        description: (job.description || '').slice(0, 500),
        companyName: job.company_name || companyName,
        postedAt: job.detected_extensions?.posted_at || undefined,
      })
    );
  } catch (err) {
    console.error('[Jobs] SearchAPI fetch error:', err instanceof Error ? err.message : err);
    return [];
  }
}

// ─── Quick scoring (no Gemini dependency) ────────────────────────────

function quickScoreJob(title: string, description: string): {
  score: number;
  summary: string;
  isRelevant: boolean;
} {
  const text = `${title} ${description}`.toLowerCase();

  const criticalKeywords = [
    // C-suite & VP signals strategic pivots
    'vp', 'vice president', 'chief', 'cto', 'cfo', 'coo', 'ceo',
    'svp', 'head of', 'general manager', 'principal',
    // AI/ML hires signal tech investment
    'ai ', 'artificial intelligence', 'machine learning',
    // Revenue management hires signal pricing shifts
    'revenue management', 'pricing strategy', 'yield management',
  ];
  const highKeywords = [
    'director', 'senior director', 'strategy', 'growth',
    'data science', 'revenue', 'expansion', 'new market',
    'product', 'engineering manager', 'architect',
    // Transformation signals restructuring
    'transformation', 'change management', 'restructuring',
    // ESG/Sustainability hires
    'sustainability', 'esg', 'climate',
    // Loyalty/Experience hires
    'loyalty', 'guest experience', 'customer experience',
    'digital', 'mobile', 'automation',
  ];

  if (criticalKeywords.some((kw) => text.includes(kw))) {
    return {
      score: 9,
      summary: `Strategic hire: ${title}. This role signals a significant investment or leadership change.`,
      isRelevant: true,
    };
  }
  if (highKeywords.some((kw) => text.includes(kw))) {
    return {
      score: 7,
      summary: `Notable hire: ${title}. This role indicates team growth or capability building.`,
      isRelevant: true,
    };
  }
  return {
    score: 4,
    summary: `Job posting: ${title}. ${description.slice(0, 150)}`,
    isRelevant: false,
  };
}

// ─── Main Collection Function ────────────────────────────────────────

function hashJob(job: JobPosting, companyName: string): string {
  return crypto
    .createHash('md5')
    .update(`${job.title}-${job.location}-${companyName}`)
    .digest('hex');
}

/**
 * Collects job signals using SearchAPI.io google_jobs engine.
 * Stores snapshots for change detection, inserts signals for new postings.
 */
export async function collectJobSignals(competitorId: string, competitorName: string) {
  const supabase = await createClient();
  const results: Array<{ title: string; score: number; change: string }> = [];

  // Fetch jobs from SearchAPI.io
  const jobs = await fetchJobsFromSearchAPI(competitorName);

  if (jobs.length === 0) {
    console.log(`[Jobs] No jobs found for ${competitorName}`);
    return results;
  }

  // Build current listings map
  const currentListings = new Map<string, JobPosting>();
  for (const job of jobs) {
    currentListings.set(hashJob(job, competitorName), job);
  }

  // Get previous snapshot
  const { data: lastSnapshot } = await supabase
    .from('snapshots')
    .select('*')
    .eq('competitor_id', competitorId)
    .eq('snapshot_type', 'job_listings')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousHashes = new Set<string>();
  if (lastSnapshot?.content) {
    try {
      const parsed = JSON.parse(lastSnapshot.content);
      for (const hash of Object.keys(parsed)) {
        previousHashes.add(hash);
      }
    } catch {
      // First run
    }
  }

  // Store new snapshot
  const snapshotContent = Object.fromEntries(currentListings);
  const snapshotHash = crypto.createHash('md5').update(JSON.stringify(snapshotContent)).digest('hex');

  await supabase.from('snapshots').insert({
    competitor_id: competitorId,
    snapshot_type: 'job_listings',
    content_hash: snapshotHash,
    content: JSON.stringify(snapshotContent),
  });

  // Insert signals for NEW postings
  for (const [hash, job] of currentListings) {
    if (previousHashes.has(hash)) continue;

    // Check for existing signal
    const { data: existing } = await supabase
      .from('signals')
      .select('id')
      .eq('competitor_id', competitorId)
      .eq('signal_type', 'hiring')
      .eq('title', `New job posting: ${job.title}`)
      .gte('detected_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (existing) continue;

    const scoring = quickScoreJob(job.title, job.description);

    const { error } = await supabase.from('signals').insert({
      competitor_id: competitorId,
      signal_type: 'hiring',
      title: `New job posting: ${job.title}`,
      summary: scoring.summary,
      raw_data: {
        ...job,
        content_hash: hash,
        change_type: 'new',
      },
      source_url: job.url || null,
      relevance_score: scoring.score,
      is_strategically_relevant: scoring.isRelevant,
      detected_at: new Date().toISOString(),
    });

    if (!error) {
      results.push({ title: job.title, score: scoring.score, change: 'new' });
    }
  }

  // Detect REMOVED senior/strategic roles
  if (lastSnapshot?.content && previousHashes.size > 0) {
    try {
      const previousJobs = JSON.parse(lastSnapshot.content) as Record<string, JobPosting>;

      for (const [hash, job] of Object.entries(previousJobs)) {
        if (currentListings.has(hash)) continue;

        const seniorKeywords = [
          'vp', 'vice president', 'director', 'head of', 'chief',
          'cto', 'cfo', 'coo', 'ceo', 'svp', 'senior vice',
          'general manager', 'partner', 'principal',
        ];
        const titleLower = job.title.toLowerCase();
        if (!seniorKeywords.some((kw) => titleLower.includes(kw))) continue;

        const { error } = await supabase.from('signals').insert({
          competitor_id: competitorId,
          signal_type: 'hiring',
          title: `Role removed: ${job.title}`,
          summary: `The ${job.title} position at ${competitorName} in ${job.location} has been removed. This could indicate the role was filled or a strategic shift.`,
          raw_data: { ...job, content_hash: hash, change_type: 'removed' },
          source_url: job.url || null,
          relevance_score: 6,
          is_strategically_relevant: true,
          detected_at: new Date().toISOString(),
        });

        if (!error) {
          results.push({ title: `Removed: ${job.title}`, score: 6, change: 'removed' });
        }
      }
    } catch {
      console.error('[Jobs] Error parsing previous snapshot for removal detection');
    }
  }

  return results;
}
