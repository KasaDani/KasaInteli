import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const SEARCHAPI_KEY = process.env.SEARCHAPI_API_KEY;

interface PropertyReview {
  name: string;
  address: string;
  rating: number | null;
  reviews: number | null;
  place_id: string;
}

/**
 * Fetches Google Maps data for competitor properties using SearchAPI.io.
 * Tracks aggregate ratings and review counts across all locations.
 */
async function fetchGoogleMapsData(companyName: string): Promise<PropertyReview[]> {
  if (!SEARCHAPI_KEY) {
    console.log('[Reviews] SEARCHAPI_API_KEY not configured, skipping Google Reviews');
    return [];
  }

  const results: PropertyReview[] = [];

  // Search for both "hotel" and "apartment" variants
  const queries = [
    `${companyName} hotel`,
    `${companyName} apartments`,
    `${companyName} stays`,
  ];

  const seenPlaces = new Set<string>();

  for (const query of queries) {
    try {
      const url = new URL('https://www.searchapi.io/api/v1/search');
      url.searchParams.set('engine', 'google_maps');
      url.searchParams.set('q', query);
      url.searchParams.set('api_key', SEARCHAPI_KEY);

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) continue;

      const data = await response.json();

      for (const r of data.local_results || []) {
        // Only include results that match the company name
        const nameMatch = r.title?.toLowerCase().includes(companyName.toLowerCase());
        if (!nameMatch) continue;

        const placeId = r.place_id || r.ludocid || r.title;
        if (seenPlaces.has(placeId)) continue;
        seenPlaces.add(placeId);

        results.push({
          name: r.title || '',
          address: r.address || '',
          rating: r.rating != null ? parseFloat(r.rating) : null,
          reviews: r.reviews != null ? parseInt(r.reviews) : null,
          place_id: placeId,
        });
      }
    } catch (err) {
      console.error(`[Reviews] Google Maps fetch error for "${query}":`, err);
    }
  }

  return results;
}

function quickScoreReview(
  current: PropertyReview,
  previous: PropertyReview | null,
  companyName: string
): { score: number; summary: string; isRelevant: boolean } | null {
  if (!previous) {
    // First observation — only signal if we have meaningful data
    if (current.rating && current.reviews) {
      return {
        score: 5,
        summary: `${current.name}: Google rating ${current.rating}/5 based on ${current.reviews} reviews. Location: ${current.address || 'N/A'}.`,
        isRelevant: true,
      };
    }
    return null;
  }

  const changes: string[] = [];
  let maxScore = 3;

  // Rating change detection
  if (current.rating != null && previous.rating != null) {
    const ratingDiff = current.rating - previous.rating;
    if (Math.abs(ratingDiff) >= 0.3) {
      const direction = ratingDiff > 0 ? 'improved' : 'dropped';
      changes.push(`Rating ${direction} from ${previous.rating} to ${current.rating}`);
      maxScore = Math.max(maxScore, Math.abs(ratingDiff) >= 0.5 ? 8 : 6);
    }
  }

  // Review count surge detection
  if (current.reviews != null && previous.reviews != null && previous.reviews > 0) {
    const reviewGrowth = ((current.reviews - previous.reviews) / previous.reviews) * 100;
    if (reviewGrowth >= 15) {
      changes.push(`Review count surged ${reviewGrowth.toFixed(0)}% (${previous.reviews} -> ${current.reviews})`);
      maxScore = Math.max(maxScore, reviewGrowth >= 30 ? 7 : 5);
    }
  }

  if (changes.length === 0) return null;

  return {
    score: maxScore,
    summary: `${current.name} (${companyName}): ${changes.join('. ')}. This may indicate shifts in guest experience quality or marketing investment.`,
    isRelevant: maxScore >= 5,
  };
}

/**
 * Collects Google Reviews signals for a competitor's properties.
 */
export async function collectReviewSignals(competitorId: string, competitorName: string) {
  const supabase = await createClient();
  const results: Array<{ title: string; score: number }> = [];

  const properties = await fetchGoogleMapsData(competitorName);

  if (properties.length === 0) {
    console.log(`[Reviews] No Google Maps properties found for ${competitorName}`);
    return results;
  }

  console.log(`[Reviews] Found ${properties.length} properties for ${competitorName}`);

  // Get previous snapshot
  const { data: lastSnapshot } = await supabase
    .from('snapshots')
    .select('*')
    .eq('competitor_id', competitorId)
    .eq('snapshot_type', 'google_reviews')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousProperties = new Map<string, PropertyReview>();
  if (lastSnapshot?.content) {
    try {
      const parsed = JSON.parse(lastSnapshot.content) as Record<string, PropertyReview>;
      for (const [key, val] of Object.entries(parsed)) {
        previousProperties.set(key, val);
      }
    } catch { /* first run */ }
  }

  // Store new snapshot
  const snapshotContent: Record<string, PropertyReview> = {};
  for (const prop of properties) {
    const key = crypto.createHash('md5').update(prop.place_id).digest('hex');
    snapshotContent[key] = prop;
  }

  const snapshotHash = crypto.createHash('md5').update(JSON.stringify(snapshotContent)).digest('hex');

  if (!lastSnapshot || lastSnapshot.content_hash !== snapshotHash) {
    await supabase.from('snapshots').insert({
      competitor_id: competitorId,
      snapshot_type: 'google_reviews',
      content_hash: snapshotHash,
      content: JSON.stringify(snapshotContent),
    });
  }

  // Generate signals
  for (const prop of properties) {
    const key = crypto.createHash('md5').update(prop.place_id).digest('hex');
    const previous = previousProperties.get(key) || null;

    const scoring = quickScoreReview(prop, previous, competitorName);
    if (!scoring) continue;

    // Check for existing signal within 7 days
    const { data: existing } = await supabase
      .from('signals')
      .select('id')
      .eq('competitor_id', competitorId)
      .eq('signal_type', 'customer_review')
      .ilike('title', `%${prop.name}%`)
      .gte('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (existing) continue;

    const changeLabel = previous ? 'Review change' : 'Review baseline';

    const { error } = await supabase.from('signals').insert({
      competitor_id: competitorId,
      signal_type: 'customer_review',
      title: `${changeLabel}: ${prop.name}`,
      summary: scoring.summary,
      raw_data: {
        property_name: prop.name,
        address: prop.address,
        current_rating: prop.rating,
        previous_rating: previous?.rating || null,
        current_reviews: prop.reviews,
        previous_reviews: previous?.reviews || null,
        place_id: prop.place_id,
      },
      source_url: `https://www.google.com/maps/place/?q=place_id:${prop.place_id}`,
      relevance_score: scoring.score,
      is_strategically_relevant: scoring.isRelevant,
      detected_at: new Date().toISOString(),
    });

    if (!error) {
      results.push({ title: prop.name, score: scoring.score });
    }
  }

  return results;
}
