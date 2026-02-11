import { createServiceClient } from '@/lib/supabase/server';
import { analyzeSignalRelevance } from '@/lib/gemini';
import crypto from 'crypto';

const SEARCHAPI_KEY = process.env.SEARCHAPI_API_KEY;

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
 * Searches YouTube via SearchAPI.io for competitor mentions in videos.
 */
async function searchYouTube(companyName: string): Promise<YouTubeResult[]> {
  if (!SEARCHAPI_KEY) {
    console.log('SEARCHAPI_API_KEY not configured, skipping YouTube collection');
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
      const url = new URL('https://www.searchapi.io/api/v1/search');
      url.searchParams.set('engine', 'youtube');
      url.searchParams.set('q', q);
      url.searchParams.set('api_key', SEARCHAPI_KEY);

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) continue;

      const data = await response.json();

      // SearchAPI.io uses "videos" (not "video_results")
      for (const result of (data.videos || []).slice(0, 5)) {
        let views = 0;
        const viewStr = (result.views || '0').toString();
        if (viewStr.includes('K')) views = parseFloat(viewStr) * 1000;
        else if (viewStr.includes('M')) views = parseFloat(viewStr) * 1000000;
        else views = parseInt(viewStr.replace(/[^0-9]/g, '')) || 0;

        // SearchAPI.io channel is an object with title and link
        const channelName = typeof result.channel === 'object'
          ? result.channel?.title || result.channel?.name || ''
          : result.channel || '';

        results.push({
          title: result.title || '',
          channel: channelName,
          description: result.description || '',
          url: result.link || '',
          publishedDate: result.published_time || result.published_date || new Date().toISOString(),
          views,
          duration: result.length || '',
        });
      }
    } catch (error) {
      console.error('YouTube search error:', error);
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

/**
 * Search Google for podcast mentions of the competitor.
 */
async function searchPodcasts(companyName: string): Promise<YouTubeResult[]> {
  if (!SEARCHAPI_KEY) return [];

  try {
    const url = new URL('https://www.searchapi.io/api/v1/search');
    url.searchParams.set('engine', 'google');
    url.searchParams.set(
      'q',
      `"${companyName}" podcast episode OR interview site:spotify.com OR site:podcasts.apple.com`
    );
    url.searchParams.set('api_key', SEARCHAPI_KEY);
    url.searchParams.set('num', '5');

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
