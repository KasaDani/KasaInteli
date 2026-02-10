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
    console.log('SERP_API_KEY not configured, using fallback job search');
    return fetchJobsFromGoogleSearch(companyName);
  }

  try {
    const query = encodeURIComponent(`${companyName} jobs`);
    const response = await fetch(
      `https://serpapi.com/search.json?engine=google_jobs&q=${query}&api_key=${apiKey}`
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

async function fetchJobsFromGoogleSearch(companyName: string): Promise<JobPosting[]> {
  // Fallback: Use Google Custom Search or return mock data for demo
  // In production, you'd integrate with a proper job board API
  try {
    const query = encodeURIComponent(`${companyName} careers site:linkedin.com/jobs OR site:greenhouse.io OR site:lever.co`);
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_API_KEY || ''}&cx=${process.env.GOOGLE_SEARCH_CX || ''}&q=${query}&num=10`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return (data.items || []).map(
      (item: { title: string; link: string; snippet: string }) => ({
        title: item.title,
        location: 'Various',
        url: item.link,
        description: item.snippet,
      })
    );
  } catch {
    return [];
  }
}

export async function collectJobSignals(competitorId: string, competitorName: string) {
  const supabase = await createServiceClient();
  const jobs = await fetchJobsFromSerpAPI(competitorName);

  const results = [];

  for (const job of jobs) {
    const contentHash = crypto
      .createHash('md5')
      .update(`${job.title}-${job.location}-${competitorName}`)
      .digest('hex');

    // Check if we already have this signal
    const { data: existing } = await supabase
      .from('signals')
      .select('id')
      .eq('competitor_id', competitorId)
      .eq('signal_type', 'hiring')
      .eq('raw_data->>content_hash', contentHash)
      .maybeSingle();

    if (existing) continue;

    // Analyze with Gemini
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
      raw_data: { ...job, content_hash: contentHash },
      source_url: job.url,
      relevance_score: analysis.score,
      is_strategically_relevant: analysis.isRelevant,
      detected_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error inserting job signal:', error);
    } else {
      results.push({ title: job.title, score: analysis.score });
    }
  }

  return results;
}
