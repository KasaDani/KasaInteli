import { createServiceClient } from '@/lib/supabase/server';
import { analyzeSignalRelevance } from '@/lib/gemini';
import crypto from 'crypto';

const SERP_API_KEY = process.env.SERP_API_KEY;

interface YouTubeResult {
  title: string;
  channel: string;
  description: string;
  url: string;
  publishedDate: string;
  views: number;
  duration: string;
}

/**
 * Searches YouTube via SerpAPI for competitor mentions in videos and podcasts.
 */
async function searchYouTube(companyName: string): Promise<YouTubeResult[]> {
  if (!SERP_API_KEY) {
    console.log('SERP_API_KEY not configured, skipping YouTube collection');
    return [];
  }

  const results: YouTubeResult[] = [];

  const queries = [
    `"${companyName}" interview OR announcement OR demo OR review`,
    `"${companyName}" CEO OR founder OR executive OR keynote`,
    `"${companyName}" hospitality technology OR short-term rental`,
  ];

  for (const q of queries) {
    try {
      const url = new URL('https://serpapi.com/search.json');
      url.searchParams.set('engine', 'youtube');
      url.searchParams.set('search_query', q);
      url.searchParams.set('api_key', SERP_API_KEY);
      // Sort by upload date for recency
      url.searchParams.set('sp', 'CAI%253D'); // Sort by upload date

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) continue;

      const data = await response.json();

      for (const result of (data.video_results || []).slice(0, 5)) {
        // Parse view count from string like "1.2K views"
        let views = 0;
        const viewStr = result.views?.toString() || '0';
        if (viewStr.includes('K')) views = parseFloat(viewStr) * 1000;
        else if (viewStr.includes('M')) views = parseFloat(viewStr) * 1000000;
        else views = parseInt(viewStr.replace(/[^0-9]/g, '')) || 0;

        results.push({
          title: result.title || '',
          channel: result.channel?.name || result.channel || '',
          description: result.description || '',
          url: result.link || '',
          publishedDate: result.published_date || new Date().toISOString(),
          views,
          duration: result.length || '',
        });
      }
    } catch (error) {
      console.error('YouTube search error:', error);
    }
  }

  // Deduplicate by URL within this batch
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

/**
 * Also search Google for podcast mentions of the competitor.
 */
async function searchPodcasts(companyName: string): Promise<YouTubeResult[]> {
  if (!SERP_API_KEY) return [];

  try {
    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google');
    url.searchParams.set(
      'q',
      `"${companyName}" podcast episode OR interview site:spotify.com OR site:podcasts.apple.com OR site:podcasts.google.com`
    );
    url.searchParams.set('api_key', SERP_API_KEY);
    url.searchParams.set('num', '5');
    url.searchParams.set('tbs', 'qdr:m'); // Last month

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) return [];

    const data = await response.json();

    return (data.organic_results || []).map(
      (result: { title?: string; snippet?: string; link?: string; date?: string }) => ({
        title: result.title || '',
        channel: 'Podcast',
        description: result.snippet || '',
        url: result.link || '',
        publishedDate: result.date || new Date().toISOString(),
        views: 0,
        duration: '',
      })
    );
  } catch (error) {
    console.error('Podcast search error:', error);
    return [];
  }
}

/**
 * Collects YouTube and podcast media appearance signals.
 */
export async function collectYouTubeSignals(
  competitorId: string,
  competitorName: string
) {
  const supabase = await createServiceClient();
  const results: Array<{ title: string; score: number }> = [];

  const [youtubeResults, podcastResults] = await Promise.all([
    searchYouTube(competitorName),
    searchPodcasts(competitorName),
  ]);

  const allMedia = [...youtubeResults, ...podcastResults];

  for (const media of allMedia) {
    // Deduplicate by URL
    const urlHash = crypto.createHash('md5').update(media.url).digest('hex');

    const { data: existingByUrl } = await supabase
      .from('signals')
      .select('id')
      .eq('competitor_id', competitorId)
      .eq('signal_type', 'media_appearance')
      .eq('source_url', media.url)
      .maybeSingle();

    if (existingByUrl) continue;

    const { data: existingByTitle } = await supabase
      .from('signals')
      .select('id')
      .eq('competitor_id', competitorId)
      .eq('signal_type', 'media_appearance')
      .eq('title', media.title)
      .maybeSingle();

    if (existingByTitle) continue;

    const viewInfo = media.views > 0 ? ` (${media.views.toLocaleString()} views)` : '';
    const channelInfo = media.channel ? ` on ${media.channel}` : '';

    const analysis = await analyzeSignalRelevance(
      'Media Appearance',
      media.title,
      `${competitorName} mentioned in video/podcast: "${media.title}"${channelInfo}${viewInfo}. ${media.description}`,
      competitorName
    );

    const { error } = await supabase.from('signals').insert({
      competitor_id: competitorId,
      signal_type: 'media_appearance',
      title: media.title,
      summary: analysis.summary,
      raw_data: {
        channel: media.channel,
        views: media.views,
        duration: media.duration,
        description: media.description,
        url_hash: urlHash,
      },
      source_url: media.url,
      relevance_score: analysis.score,
      is_strategically_relevant: analysis.isRelevant,
      detected_at: media.publishedDate || new Date().toISOString(),
    });

    if (!error) {
      results.push({ title: media.title, score: analysis.score });
    }
  }

  return results;
}
