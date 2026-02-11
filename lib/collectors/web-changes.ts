import { createServiceClient } from '@/lib/supabase/server';
import { analyzeSignalRelevance } from '@/lib/gemini';
import crypto from 'crypto';

/**
 * Subpages to monitor beyond the homepage.
 * Paths are appended to the competitor's base website URL.
 */
const MONITORED_SUBPAGES = ['/about', '/pricing', '/product', '/solutions', '/locations'];

function extractTextContent(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 15000);
}

/**
 * Improved diff algorithm: splits by paragraphs/sentences and compares,
 * providing richer context about what changed.
 */
function computeDiff(oldText: string, newText: string): string {
  // Split into meaningful segments (sentences or paragraph-like chunks)
  const segmentize = (text: string) =>
    text
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15);

  const oldSegments = segmentize(oldText);
  const newSegments = segmentize(newText);
  const oldSet = new Set(oldSegments);
  const newSet = new Set(newSegments);

  const added = newSegments.filter((s) => !oldSet.has(s));
  const removed = oldSegments.filter((s) => !newSet.has(s));

  const parts: string[] = [];

  if (added.length > 0) {
    parts.push(`ADDED CONTENT (${added.length} sections):\n${added.slice(0, 15).join('\n')}`);
  }
  if (removed.length > 0) {
    parts.push(`REMOVED CONTENT (${removed.length} sections):\n${removed.slice(0, 15).join('\n')}`);
  }

  // Summary stats
  const wordCountOld = oldText.split(/\s+/).length;
  const wordCountNew = newText.split(/\s+/).length;
  const wordDiff = wordCountNew - wordCountOld;
  if (wordDiff !== 0) {
    parts.push(
      `WORD COUNT CHANGE: ${wordDiff > 0 ? '+' : ''}${wordDiff} words (${wordCountOld} -> ${wordCountNew})`
    );
  }

  return parts.join('\n\n') || 'No significant text changes detected.';
}

/**
 * Monitor a single page: fetch, snapshot, diff, and create signal if changed.
 */
async function monitorPage(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  competitorId: string,
  competitorName: string,
  pageUrl: string,
  snapshotType: string
): Promise<{ type: string; score: number } | null> {
  try {
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });

    // Skip pages that return errors (404, 500, etc.)
    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const textContent = extractTextContent(html);

    // Skip very short pages (likely error pages or redirects)
    if (textContent.length < 100) {
      return null;
    }

    const contentHash = crypto.createHash('md5').update(textContent).digest('hex');

    // Get the most recent snapshot
    const { data: lastSnapshot } = await supabase
      .from('snapshots')
      .select('*')
      .eq('competitor_id', competitorId)
      .eq('snapshot_type', snapshotType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Store new snapshot
    await supabase.from('snapshots').insert({
      competitor_id: competitorId,
      snapshot_type: snapshotType,
      content_hash: contentHash,
      content: textContent,
    });

    // If content changed, analyze the diff
    if (lastSnapshot && lastSnapshot.content_hash !== contentHash) {
      const diff = computeDiff(lastSnapshot.content, textContent);

      if (diff === 'No significant text changes detected.') {
        return null;
      }

      const pageName = snapshotType === 'homepage' ? 'homepage' : snapshotType.replace('subpage_', '/');

      const analysis = await analyzeSignalRelevance(
        'Website Change',
        `Website change detected on ${competitorName} ${pageName}`,
        `Changes detected on ${pageUrl}:\n${diff}`,
        competitorName
      );

      // Only store if it's potentially relevant (score >= 3)
      if (analysis.score >= 3) {
        const { error } = await supabase.from('signals').insert({
          competitor_id: competitorId,
          signal_type: 'digital_footprint',
          title: `Website change: ${competitorName} (${pageName})`,
          summary: analysis.summary,
          raw_data: {
            diff: diff.slice(0, 3000),
            url: pageUrl,
            page: pageName,
            snapshot_type: snapshotType,
          },
          source_url: pageUrl,
          relevance_score: analysis.score,
          is_strategically_relevant: analysis.isRelevant,
          detected_at: new Date().toISOString(),
        });

        if (!error) {
          return { type: snapshotType, score: analysis.score };
        }
      }
    }
  } catch (error) {
    // Silently skip pages that fail (timeouts, network errors)
    console.error(`Error monitoring ${pageUrl}:`, error instanceof Error ? error.message : error);
  }

  return null;
}

/**
 * Monitors a competitor's website across multiple pages for changes.
 * Tracks homepage + key subpages (about, pricing, product, etc.)
 */
export async function collectWebChangeSignals(
  competitorId: string,
  competitorName: string,
  websiteUrl: string
) {
  const supabase = await createServiceClient();
  const results: Array<{ type: string; score: number }> = [];

  // Normalize base URL
  const baseUrl = websiteUrl.replace(/\/$/, '');

  // Monitor homepage
  const homepageResult = await monitorPage(
    supabase,
    competitorId,
    competitorName,
    baseUrl,
    'homepage'
  );
  if (homepageResult) results.push(homepageResult);

  // Monitor subpages
  for (const path of MONITORED_SUBPAGES) {
    const pageUrl = `${baseUrl}${path}`;
    const snapshotType = `subpage_${path.replace(/^\//, '')}`;

    const result = await monitorPage(
      supabase,
      competitorId,
      competitorName,
      pageUrl,
      snapshotType
    );
    if (result) results.push(result);
  }

  return results;
}
