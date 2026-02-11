import { createServiceClient } from '@/lib/supabase/server';
import { analyzeSignalRelevance } from '@/lib/gemini';
import crypto from 'crypto';

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

/**
 * Fetches a page through ScraperAPI to bypass anti-bot protections.
 */
async function fetchViaScraperAPI(targetUrl: string): Promise<string> {
  if (!SCRAPER_API_KEY) {
    // Fallback to direct fetch
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  }

  const url = new URL('https://api.scraperapi.com');
  url.searchParams.set('api_key', SCRAPER_API_KEY);
  url.searchParams.set('url', targetUrl);
  url.searchParams.set('render', 'true'); // Enable JS rendering for SPAs

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(60000), // ScraperAPI with rendering can be slow
  });

  if (!response.ok) {
    throw new Error(`ScraperAPI error: ${response.status}`);
  }

  return response.text();
}

/**
 * Extracts text content from HTML, focused on property/location listings.
 */
function extractListingsText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, 20000);
}

/**
 * Attempts to extract location/market names and property counts from page text.
 * Returns a structured summary for comparison.
 */
function extractPropertyData(text: string): {
  locations: string[];
  rawText: string;
} {
  // Look for common patterns: city names, property counts, location names
  const locationPatterns = [
    // "City, State" pattern
    /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*,\s*[A-Z]{2})/g,
    // "City" near property-related words
    /(?:properties|locations|cities|markets|available)\s*(?:in|:)\s*([A-Z][a-zA-Z\s,]+)/gi,
  ];

  const locations = new Set<string>();

  for (const pattern of locationPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const loc = match[1]?.trim();
      if (loc && loc.length > 2 && loc.length < 60) {
        locations.add(loc);
      }
    }
  }

  return {
    locations: Array.from(locations).slice(0, 50),
    rawText: text,
  };
}

/**
 * Compares two snapshots and describes what changed.
 */
function compareSnapshots(
  oldData: { locations: string[]; rawText: string },
  newData: { locations: string[]; rawText: string }
): string | null {
  const oldLocations = new Set(oldData.locations.map((l) => l.toLowerCase()));
  const newLocations = new Set(newData.locations.map((l) => l.toLowerCase()));

  const addedLocations = newData.locations.filter((l) => !oldLocations.has(l.toLowerCase()));
  const removedLocations = oldData.locations.filter((l) => !newLocations.has(l.toLowerCase()));

  // Text-level diff for additional context
  const oldLines = new Set(
    oldData.rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 20)
  );
  const newLines = newData.rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 20);

  const addedContent = newLines.filter((l) => !oldLines.has(l));

  const parts: string[] = [];

  if (addedLocations.length > 0) {
    parts.push(`NEW MARKETS/LOCATIONS DETECTED: ${addedLocations.join(', ')}`);
  }
  if (removedLocations.length > 0) {
    parts.push(`MARKETS/LOCATIONS REMOVED: ${removedLocations.join(', ')}`);
  }
  if (addedContent.length > 0) {
    parts.push(
      `NEW LISTING CONTENT (${addedContent.length} items):\n${addedContent.slice(0, 10).join('\n')}`
    );
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join('\n\n');
}

/**
 * Monitors a competitor's listings/locations page for property changes.
 * Tracks additions and removals of properties and markets.
 */
export async function collectAssetSignals(
  competitorId: string,
  competitorName: string,
  listingsUrl: string
) {
  const supabase = await createServiceClient();
  const results: Array<{ title: string; score: number }> = [];

  try {
    const html = await fetchViaScraperAPI(listingsUrl);
    const textContent = extractListingsText(html);
    const propertyData = extractPropertyData(textContent);
    const contentHash = crypto.createHash('md5').update(textContent).digest('hex');

    // Get previous snapshot
    const { data: lastSnapshot } = await supabase
      .from('snapshots')
      .select('*')
      .eq('competitor_id', competitorId)
      .eq('snapshot_type', 'property_listings')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Store current snapshot
    await supabase.from('snapshots').insert({
      competitor_id: competitorId,
      snapshot_type: 'property_listings',
      content_hash: contentHash,
      content: JSON.stringify(propertyData),
    });

    // Compare with previous snapshot
    if (lastSnapshot && lastSnapshot.content_hash !== contentHash) {
      let oldData: { locations: string[]; rawText: string };
      try {
        oldData = JSON.parse(lastSnapshot.content);
      } catch {
        // If old data is raw text (first migration), extract property data from it
        oldData = extractPropertyData(lastSnapshot.content);
      }

      const changes = compareSnapshots(oldData, propertyData);

      if (changes) {
        const analysis = await analyzeSignalRelevance(
          'Property Listings Change',
          `Property/market changes detected for ${competitorName}`,
          `Changes detected on ${listingsUrl}:\n${changes}`,
          competitorName
        );

        if (analysis.score >= 3) {
          const { error } = await supabase.from('signals').insert({
            competitor_id: competitorId,
            signal_type: 'asset_watch',
            title: `Property changes: ${competitorName}`,
            summary: analysis.summary,
            raw_data: {
              changes: changes.slice(0, 3000),
              url: listingsUrl,
              current_locations: propertyData.locations,
              previous_locations: oldData.locations,
            },
            source_url: listingsUrl,
            relevance_score: analysis.score,
            is_strategically_relevant: analysis.isRelevant,
            detected_at: new Date().toISOString(),
          });

          if (!error) {
            results.push({ title: `Property changes: ${competitorName}`, score: analysis.score });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error monitoring asset listings for ${competitorName}:`, error);
  }

  return results;
}
