import { createServiceClient } from '@/lib/supabase/server';
import { analyzeSignalRelevance } from '@/lib/gemini';
import crypto from 'crypto';

const SERP_API_KEY = process.env.SERP_API_KEY;

interface SocialResult {
  title: string;
  snippet: string;
  url: string;
  date: string;
  source: string;
}

/**
 * Searches Google via SerpAPI for social media mentions of a competitor.
 * Targets Reddit, Twitter/X, and Hacker News.
 */
async function searchSocialMentions(companyName: string): Promise<SocialResult[]> {
  if (!SERP_API_KEY) {
    console.log('SERP_API_KEY not configured, skipping social collection');
    return [];
  }

  const results: SocialResult[] = [];

  // Search across multiple social platforms
  const queries = [
    {
      q: `site:reddit.com "${companyName}" hospitality OR rental OR apartment`,
      source: 'Reddit',
    },
    {
      q: `site:reddit.com "${companyName}" review OR experience OR opinion`,
      source: 'Reddit',
    },
    {
      q: `site:twitter.com OR site:x.com "${companyName}"`,
      source: 'Twitter/X',
    },
    {
      q: `site:news.ycombinator.com "${companyName}"`,
      source: 'Hacker News',
    },
  ];

  for (const { q, source } of queries) {
    try {
      const url = new URL('https://serpapi.com/search.json');
      url.searchParams.set('engine', 'google');
      url.searchParams.set('q', q);
      url.searchParams.set('api_key', SERP_API_KEY);
      url.searchParams.set('num', '5');
      url.searchParams.set('tbs', 'qdr:w'); // Last week only

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) continue;

      const data = await response.json();

      for (const result of data.organic_results || []) {
        results.push({
          title: result.title || '',
          snippet: result.snippet || '',
          url: result.link || '',
          date: result.date || new Date().toISOString(),
          source,
        });
      }
    } catch (error) {
      console.error(`Social search error for ${source}:`, error);
    }
  }

  return results;
}

/**
 * Collects social media mention signals from Reddit, Twitter, and Hacker News.
 */
export async function collectSocialSignals(
  competitorId: string,
  competitorName: string
) {
  const supabase = await createServiceClient();
  const mentions = await searchSocialMentions(competitorName);
  const results: Array<{ title: string; score: number }> = [];

  for (const mention of mentions) {
    // Deduplicate by URL
    const urlHash = crypto.createHash('md5').update(mention.url).digest('hex');

    const { data: existingByUrl } = await supabase
      .from('signals')
      .select('id')
      .eq('competitor_id', competitorId)
      .eq('signal_type', 'social_mention')
      .eq('source_url', mention.url)
      .maybeSingle();

    if (existingByUrl) continue;

    // Also check by title (same discussion can appear at different URLs)
    const { data: existingByTitle } = await supabase
      .from('signals')
      .select('id')
      .eq('competitor_id', competitorId)
      .eq('signal_type', 'social_mention')
      .eq('title', mention.title)
      .maybeSingle();

    if (existingByTitle) continue;

    const analysis = await analyzeSignalRelevance(
      'Social Media Mention',
      mention.title,
      `${mention.source} discussion about ${competitorName}: "${mention.title}". ${mention.snippet}`,
      competitorName
    );

    const { error } = await supabase.from('signals').insert({
      competitor_id: competitorId,
      signal_type: 'social_mention',
      title: mention.title,
      summary: analysis.summary,
      raw_data: {
        snippet: mention.snippet,
        source: mention.source,
        url_hash: urlHash,
      },
      source_url: mention.url,
      relevance_score: analysis.score,
      is_strategically_relevant: analysis.isRelevant,
      detected_at: mention.date || new Date().toISOString(),
    });

    if (!error) {
      results.push({ title: mention.title, score: analysis.score });
    }
  }

  return results;
}
