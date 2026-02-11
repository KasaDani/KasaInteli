import { createServiceClient } from '@/lib/supabase/server';
import { analyzeSignalRelevance } from '@/lib/gemini';
import crypto from 'crypto';

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

interface LinkedInPost {
  text: string;
  date: string;
  likes: number;
  comments: number;
  shares: number;
  url: string;
  mediaType: string;
}

/**
 * Primary: Fetch LinkedIn company posts via ScraperAPI (renders the JS-heavy page).
 */
async function fetchViaScraperAPI(slug: string): Promise<LinkedInPost[]> {
  if (!SCRAPER_API_KEY) return [];

  try {
    const targetUrl = `https://www.linkedin.com/company/${slug}/posts/`;
    const url = new URL('https://api.scraperapi.com');
    url.searchParams.set('api_key', SCRAPER_API_KEY);
    url.searchParams.set('url', targetUrl);
    url.searchParams.set('render', 'true');

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      console.error(`ScraperAPI LinkedIn error: ${response.status}`);
      return [];
    }

    const html = await response.text();
    return extractPostsFromHTML(html);
  } catch (error) {
    console.error('ScraperAPI LinkedIn fetch error:', error);
    return [];
  }
}

/**
 * Fallback: Fetch LinkedIn company posts via Apify actor.
 * Uses the harvestapi/linkedin-company-posts actor.
 */
async function fetchViaApify(slug: string): Promise<LinkedInPost[]> {
  if (!APIFY_API_TOKEN) return [];

  try {
    // Start the actor run
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/harvestapi~linkedin-company-posts/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyUrls: [`https://www.linkedin.com/company/${slug}/`],
          maxPosts: 10,
        }),
        signal: AbortSignal.timeout(120000),
      }
    );

    if (!runResponse.ok) {
      console.error(`Apify error: ${runResponse.status}`);
      return [];
    }

    const items = await runResponse.json();

    return (items || []).map(
      (item: {
        text?: string;
        postedDate?: string;
        numLikes?: number;
        numComments?: number;
        numShares?: number;
        postUrl?: string;
        type?: string;
      }) => ({
        text: item.text || '',
        date: item.postedDate || new Date().toISOString(),
        likes: item.numLikes || 0,
        comments: item.numComments || 0,
        shares: item.numShares || 0,
        url: item.postUrl || `https://www.linkedin.com/company/${slug}/posts/`,
        mediaType: item.type || 'text',
      })
    );
  } catch (error) {
    console.error('Apify LinkedIn fetch error:', error);
    return [];
  }
}

/**
 * Extract post-like content from raw LinkedIn HTML.
 * LinkedIn's HTML is heavily obfuscated; this extracts what it can.
 */
function extractPostsFromHTML(html: string): LinkedInPost[] {
  const posts: LinkedInPost[] = [];

  // LinkedIn wraps posts in elements with data attributes or specific class patterns.
  // We look for text blocks that resemble post content (paragraphs between markers).
  const postPatterns = [
    // Feed update text blocks
    /data-urn[^>]*>[\s\S]*?<span[^>]*>([\s\S]{50,1500}?)<\/span>/gi,
    // Alternative: content inside update-components
    /update-components-text[^>]*>[\s\S]*?<span[^>]*>([\s\S]{50,1500}?)<\/span>/gi,
  ];

  for (const pattern of postPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const rawText = match[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (rawText.length < 30) continue;

      // Avoid duplicates
      if (posts.some((p) => p.text === rawText)) continue;

      posts.push({
        text: rawText.slice(0, 1500),
        date: new Date().toISOString(),
        likes: 0,
        comments: 0,
        shares: 0,
        url: '',
        mediaType: 'text',
      });

      if (posts.length >= 10) break;
    }
    if (posts.length >= 10) break;
  }

  return posts;
}

function hashPost(post: LinkedInPost): string {
  // Hash on the first 200 chars of text to handle minor edits
  return crypto
    .createHash('md5')
    .update(post.text.slice(0, 200))
    .digest('hex');
}

/**
 * Collects LinkedIn company post signals.
 * ScraperAPI is tried first; if it returns no posts, falls back to Apify.
 */
export async function collectLinkedInSignals(
  competitorId: string,
  competitorName: string,
  linkedinSlug: string
) {
  const supabase = await createServiceClient();
  const results: Array<{ title: string; score: number }> = [];

  // Try ScraperAPI first, fall back to Apify
  let posts = await fetchViaScraperAPI(linkedinSlug);
  if (posts.length === 0) {
    posts = await fetchViaApify(linkedinSlug);
  }

  if (posts.length === 0) {
    return results;
  }

  // Build current hashes
  const currentHashes = new Map<string, LinkedInPost>();
  for (const post of posts) {
    currentHashes.set(hashPost(post), post);
  }

  // Get previous snapshot
  const { data: lastSnapshot } = await supabase
    .from('snapshots')
    .select('*')
    .eq('competitor_id', competitorId)
    .eq('snapshot_type', 'linkedin_posts')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousHashes = new Set<string>();
  if (lastSnapshot?.content) {
    try {
      const parsed = JSON.parse(lastSnapshot.content) as Record<string, unknown>;
      for (const hash of Object.keys(parsed)) {
        previousHashes.add(hash);
      }
    } catch {
      // First run
    }
  }

  // Store current snapshot
  const snapshotContent = Object.fromEntries(currentHashes);
  const snapshotHash = crypto
    .createHash('md5')
    .update(JSON.stringify(snapshotContent))
    .digest('hex');

  await supabase.from('snapshots').insert({
    competitor_id: competitorId,
    snapshot_type: 'linkedin_posts',
    content_hash: snapshotHash,
    content: JSON.stringify(snapshotContent),
  });

  // Process new posts only
  for (const [hash, post] of currentHashes) {
    if (previousHashes.has(hash)) continue;

    // Check for existing signal with similar text
    const titlePreview = post.text.slice(0, 80).replace(/\n/g, ' ');
    const signalTitle = `LinkedIn post: ${titlePreview}...`;

    const { data: existing } = await supabase
      .from('signals')
      .select('id')
      .eq('competitor_id', competitorId)
      .eq('signal_type', 'linkedin_post')
      .eq('title', signalTitle)
      .maybeSingle();

    if (existing) continue;

    const engagementInfo = post.likes > 0 || post.comments > 0
      ? ` Engagement: ${post.likes} likes, ${post.comments} comments, ${post.shares} shares.`
      : '';

    const analysis = await analyzeSignalRelevance(
      'LinkedIn Post',
      signalTitle,
      `${competitorName} posted on LinkedIn: "${post.text.slice(0, 800)}"${engagementInfo}`,
      competitorName
    );

    const { error } = await supabase.from('signals').insert({
      competitor_id: competitorId,
      signal_type: 'linkedin_post',
      title: signalTitle,
      summary: analysis.summary,
      raw_data: {
        text: post.text.slice(0, 2000),
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
        mediaType: post.mediaType,
        content_hash: hash,
      },
      source_url: post.url || `https://www.linkedin.com/company/${linkedinSlug}/posts/`,
      relevance_score: analysis.score,
      is_strategically_relevant: analysis.isRelevant,
      detected_at: post.date || new Date().toISOString(),
    });

    if (!error) {
      results.push({ title: signalTitle, score: analysis.score });
    }
  }

  return results;
}
