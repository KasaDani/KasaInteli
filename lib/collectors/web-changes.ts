import { createServiceClient } from '@/lib/supabase/server';
import { analyzeSignalRelevance } from '@/lib/gemini';
import crypto from 'crypto';

function extractTextContent(html: string): string {
  // Strip HTML tags and get text content
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 10000);
}

function computeDiff(oldText: string, newText: string): string {
  const oldLines = oldText.split('. ');
  const newLines = newText.split('. ');

  const added = newLines.filter((line) => !oldLines.includes(line) && line.trim().length > 20);
  const removed = oldLines.filter((line) => !newLines.includes(line) && line.trim().length > 20);

  const parts: string[] = [];
  if (added.length > 0) {
    parts.push(`ADDED:\n${added.slice(0, 10).join('\n')}`);
  }
  if (removed.length > 0) {
    parts.push(`REMOVED:\n${removed.slice(0, 10).join('\n')}`);
  }

  return parts.join('\n\n') || 'No significant text changes detected.';
}

export async function collectWebChangeSignals(
  competitorId: string,
  competitorName: string,
  websiteUrl: string
) {
  const supabase = await createServiceClient();
  const results: Array<{ type: string; score: number }> = [];

  try {
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${websiteUrl}: ${response.status}`);
      return results;
    }

    const html = await response.text();
    const textContent = extractTextContent(html);
    const contentHash = crypto.createHash('md5').update(textContent).digest('hex');

    // Get the most recent snapshot
    const { data: lastSnapshot } = await supabase
      .from('snapshots')
      .select('*')
      .eq('competitor_id', competitorId)
      .eq('snapshot_type', 'homepage')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Store new snapshot
    await supabase.from('snapshots').insert({
      competitor_id: competitorId,
      snapshot_type: 'homepage',
      content_hash: contentHash,
      content: textContent,
    });

    // If content changed, analyze the diff
    if (lastSnapshot && lastSnapshot.content_hash !== contentHash) {
      const diff = computeDiff(lastSnapshot.content, textContent);

      if (diff === 'No significant text changes detected.') {
        return results;
      }

      const analysis = await analyzeSignalRelevance(
        'Website Change',
        `Website change detected on ${competitorName} homepage`,
        `Changes detected on ${websiteUrl}:\n${diff}`,
        competitorName
      );

      // Only store if it's potentially relevant (score >= 3)
      if (analysis.score >= 3) {
        const { error } = await supabase.from('signals').insert({
          competitor_id: competitorId,
          signal_type: 'digital_footprint',
          title: `Website change: ${competitorName}`,
          summary: analysis.summary,
          raw_data: { diff: diff.slice(0, 2000), url: websiteUrl },
          source_url: websiteUrl,
          relevance_score: analysis.score,
          is_strategically_relevant: analysis.isRelevant,
          detected_at: new Date().toISOString(),
        });

        if (!error) {
          results.push({ type: 'web_change', score: analysis.score });
        }
      }
    }
  } catch (error) {
    console.error(`Error monitoring ${websiteUrl}:`, error);
  }

  return results;
}
