import { createServiceClient } from '@/lib/supabase/server';
import { analyzeSignalRelevance } from '@/lib/gemini';
import crypto from 'crypto';

interface JobPosting {
  title: string;
  location: string;
  url: string;
  description?: string;
}

async function fetchJobsFromSerpAPI(companyName: string): Promise<JobPosting[]> {
  const apiKey = process.env.SERP_API_KEY;
  if (!apiKey) {
    console.log('SERP_API_KEY not configured, skipping job collection');
    return [];
  }

  try {
    const query = encodeURIComponent(`${companyName} jobs`);
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google_jobs&q=${query}&api_key=${apiKey}`,
      { signal: AbortSignal.timeout(20000) }
    );

    if (!response.ok) {
      console.error('SerpAPI error:', response.status);
      return [];
    }

    const data = await response.json();
    const jobs: JobPosting[] = (data.jobs_results || []).map(
      (job: { title: string; location: string; share_link?: string; description?: string }) => ({
        title: job.title,
        location: job.location,
        url: job.share_link || '',
        description: job.description?.slice(0, 500),
      })
    );

    return jobs;
  } catch (error) {
    console.error('SerpAPI fetch error:', error);
    return [];
  }
}

/**
 * Build a unique hash for a job posting to enable deduplication and removal detection.
 */
function hashJob(job: JobPosting, companyName: string): string {
  return crypto
    .createHash('md5')
    .update(`${job.title}-${job.location}-${companyName}`)
    .digest('hex');
}

/**
 * Collects job signals with change detection:
 * - Stores a snapshot of all current job listings
 * - Compares against previous snapshot to detect NEW and REMOVED postings
 * - Generates signals for both new postings and notable removed roles
 */
export async function collectJobSignals(competitorId: string, competitorName: string) {
  const supabase = await createServiceClient();
  const jobs = await fetchJobsFromSerpAPI(competitorName);
  const results: Array<{ title: string; score: number; change: string }> = [];

  if (jobs.length === 0) {
    return results;
  }

  // Build current listings map: hash -> job
  const currentListings = new Map<string, JobPosting>();
  for (const job of jobs) {
    const hash = hashJob(job, competitorName);
    currentListings.set(hash, job);
  }

  // Get previous snapshot of job listings
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
      const parsed = JSON.parse(lastSnapshot.content) as Record<string, JobPosting>;
      for (const hash of Object.keys(parsed)) {
        previousHashes.add(hash);
      }
    } catch {
      // First run or corrupt snapshot -- treat everything as new
    }
  }

  // Store current snapshot
  const snapshotContent = Object.fromEntries(currentListings);
  const snapshotHash = crypto
    .createHash('md5')
    .update(JSON.stringify(snapshotContent))
    .digest('hex');

  await supabase.from('snapshots').insert({
    competitor_id: competitorId,
    snapshot_type: 'job_listings',
    content_hash: snapshotHash,
    content: JSON.stringify(snapshotContent),
  });

  // Detect NEW postings (in current but not in previous)
  for (const [hash, job] of currentListings) {
    if (previousHashes.has(hash)) continue;

    // Check if we already created a signal for this exact posting
    const { data: existingSignal } = await supabase
      .from('signals')
      .select('id')
      .eq('competitor_id', competitorId)
      .eq('signal_type', 'hiring')
      .eq('title', `New job posting: ${job.title}`)
      .gte('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (existingSignal) continue;

    const analysis = await analyzeSignalRelevance(
      'Job Posting',
      job.title,
      `${job.title} at ${competitorName} in ${job.location}. ${job.description || ''}`,
      competitorName
    );

    const { error } = await supabase.from('signals').insert({
      competitor_id: competitorId,
      signal_type: 'hiring',
      title: `New job posting: ${job.title}`,
      summary: analysis.summary,
      raw_data: { ...job, content_hash: hash, change_type: 'new' },
      source_url: job.url,
      relevance_score: analysis.score,
      is_strategically_relevant: analysis.isRelevant,
      detected_at: new Date().toISOString(),
    });

    if (!error) {
      results.push({ title: job.title, score: analysis.score, change: 'new' });
    }
  }

  // Detect REMOVED postings (in previous but not in current)
  // Only generate signals if we had a valid previous snapshot
  if (lastSnapshot?.content && previousHashes.size > 0) {
    try {
      const previousJobs = JSON.parse(lastSnapshot.content) as Record<string, JobPosting>;

      for (const [hash, job] of Object.entries(previousJobs)) {
        if (currentListings.has(hash)) continue;

        // Only flag removal of senior/strategic roles
        const seniorKeywords = [
          'vp', 'vice president', 'director', 'head of', 'chief',
          'cto', 'cfo', 'coo', 'ceo', 'svp', 'senior vice',
          'general manager', 'partner', 'principal',
        ];
        const titleLower = job.title.toLowerCase();
        const isSenior = seniorKeywords.some((kw) => titleLower.includes(kw));

        if (!isSenior) continue;

        const analysis = await analyzeSignalRelevance(
          'Job Removal',
          `Role removed: ${job.title}`,
          `The ${job.title} position at ${competitorName} in ${job.location} has been removed from their job listings. This could indicate the role was filled, the position was eliminated, or a strategic shift.`,
          competitorName
        );

        const { error } = await supabase.from('signals').insert({
          competitor_id: competitorId,
          signal_type: 'hiring',
          title: `Role removed: ${job.title}`,
          summary: analysis.summary,
          raw_data: { ...job, content_hash: hash, change_type: 'removed' },
          source_url: job.url || null,
          relevance_score: analysis.score,
          is_strategically_relevant: analysis.isRelevant,
          detected_at: new Date().toISOString(),
        });

        if (!error) {
          results.push({ title: `Removed: ${job.title}`, score: analysis.score, change: 'removed' });
        }
      }
    } catch {
      console.error('Error parsing previous job snapshot for removal detection');
    }
  }

  return results;
}
