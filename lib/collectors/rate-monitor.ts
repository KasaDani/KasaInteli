import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const SEARCHAPI_KEY = process.env.SEARCHAPI_API_KEY;

interface RateData {
  property: string;
  platform: string;
  nightly_rate: number | null;
  currency: string;
  rating: number | null;
  reviews: number | null;
  url: string;
  location: string;
  fetched_at: string;
}

// ─── Airbnb Rate Scraping via Apify ──────────────────────────────────

async function fetchAirbnbRates(companyName: string): Promise<RateData[]> {
  if (!APIFY_API_TOKEN) {
    console.log('[RateMonitor] APIFY_API_TOKEN not configured, skipping Airbnb rates');
    return [];
  }

  try {
    // Use Apify's free Airbnb scraper to find competitor properties
    // First, search for properties using the company name
    const searchUrl = `https://api.apify.com/v2/acts/curious_coder~airbnb-scraper/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`;

    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        search: companyName,
        maxItems: 10,
        currency: 'USD',
        checkIn: getFutureDate(14), // 2 weeks from now
        checkOut: getFutureDate(15), // 1 night
      }),
      signal: AbortSignal.timeout(60000), // Apify can take a while
    });

    if (!response.ok) {
      console.error('[RateMonitor] Apify Airbnb error:', response.status);
      return [];
    }

    const results = await response.json();

    return (results || []).slice(0, 10).map((item: {
      name?: string;
      price?: { rate?: number; currency?: string };
      pricing_quote?: { rate?: { amount?: number } };
      rating?: number;
      reviews_count?: number;
      url?: string;
      city?: string;
      neighborhood?: string;
    }) => ({
      property: item.name || 'Unknown Property',
      platform: 'Airbnb',
      nightly_rate: item.price?.rate || item.pricing_quote?.rate?.amount || null,
      currency: item.price?.currency || 'USD',
      rating: item.rating || null,
      reviews: item.reviews_count || null,
      url: item.url || '',
      location: [item.city, item.neighborhood].filter(Boolean).join(', '),
      fetched_at: new Date().toISOString(),
    }));
  } catch (err) {
    console.error('[RateMonitor] Airbnb fetch error:', err instanceof Error ? err.message : err);
    return [];
  }
}

// ─── Booking.com Rate Scraping via ScraperAPI ────────────────────────

async function fetchBookingRates(companyName: string): Promise<RateData[]> {
  if (!SCRAPER_API_KEY) {
    console.log('[RateMonitor] SCRAPER_API_KEY not configured, skipping Booking.com rates');
    return [];
  }

  try {
    // Search Booking.com for competitor properties via ScraperAPI
    const checkin = getFutureDate(14);
    const checkout = getFutureDate(15);
    const searchQuery = encodeURIComponent(companyName);
    const bookingUrl = `https://www.booking.com/searchresults.en-us.html?ss=${searchQuery}&checkin=${checkin}&checkout=${checkout}&group_adults=2&no_rooms=1&nflt=`;

    const scraperUrl = `https://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(bookingUrl)}&render=true`;

    const response = await fetch(scraperUrl, {
      signal: AbortSignal.timeout(45000),
    });

    if (!response.ok) {
      console.error('[RateMonitor] ScraperAPI Booking.com error:', response.status);
      return [];
    }

    const html = await response.text();

    // Extract property data from Booking.com HTML
    return parseBookingResults(html, companyName);
  } catch (err) {
    console.error('[RateMonitor] Booking.com fetch error:', err instanceof Error ? err.message : err);
    return [];
  }
}

function parseBookingResults(html: string, companyName: string): RateData[] {
  const results: RateData[] = [];

  // Extract property cards using regex patterns on Booking.com's HTML
  // Property title pattern
  const titlePattern = /data-testid="title"[^>]*>([^<]+)</g;
  const pricePattern = /data-testid="price-and-discounted-price"[^>]*>[^$€£]*?([\d,.]+)/g;
  const ratingPattern = /data-testid="review-score"[^>]*>\s*([\d.]+)/g;
  const linkPattern = /data-testid="title-link"[^>]*href="([^"]+)"/g;

  const titles: string[] = [];
  const prices: string[] = [];
  const ratings: string[] = [];
  const links: string[] = [];

  let match;
  while ((match = titlePattern.exec(html)) !== null) titles.push(match[1].trim());
  while ((match = pricePattern.exec(html)) !== null) prices.push(match[1].replace(/,/g, ''));
  while ((match = ratingPattern.exec(html)) !== null) ratings.push(match[1]);
  while ((match = linkPattern.exec(html)) !== null) links.push(match[1]);

  // Only include results that contain the competitor name (case-insensitive)
  const nameLower = companyName.toLowerCase();
  for (let i = 0; i < Math.min(titles.length, 10); i++) {
    if (!titles[i].toLowerCase().includes(nameLower)) continue;

    results.push({
      property: titles[i],
      platform: 'Booking.com',
      nightly_rate: prices[i] ? parseFloat(prices[i]) : null,
      currency: 'USD',
      rating: ratings[i] ? parseFloat(ratings[i]) : null,
      reviews: null,
      url: links[i] ? `https://www.booking.com${links[i]}` : '',
      location: '',
      fetched_at: new Date().toISOString(),
    });
  }

  return results;
}

// ─── Fallback: Search for pricing info via SearchAPI ─────────────────

async function fetchRatesBySearch(companyName: string): Promise<RateData[]> {
  if (!SEARCHAPI_KEY) return [];

  try {
    const url = new URL('https://www.searchapi.io/api/v1/search');
    url.searchParams.set('engine', 'google');
    url.searchParams.set('q', `"${companyName}" nightly rate price per night booking 2025 2026`);
    url.searchParams.set('api_key', SEARCHAPI_KEY);
    url.searchParams.set('num', '5');

    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return [];

    const data = await response.json();
    const results: RateData[] = [];

    for (const r of data.organic_results || []) {
      // Look for price mentions in snippets
      const priceMatch = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g.exec(r.snippet || '');
      if (priceMatch) {
        results.push({
          property: r.title || companyName,
          platform: 'Google Search',
          nightly_rate: parseFloat(priceMatch[1].replace(/,/g, '')),
          currency: 'USD',
          rating: null,
          reviews: null,
          url: r.link || '',
          location: '',
          fetched_at: new Date().toISOString(),
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getFutureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

function quickScoreRate(current: RateData, previous: RateData | null): {
  score: number;
  summary: string;
  isRelevant: boolean;
} {
  if (!previous || !previous.nightly_rate || !current.nightly_rate) {
    return {
      score: 5,
      summary: `${current.property} on ${current.platform}: $${current.nightly_rate}/night${current.rating ? ` (rated ${current.rating})` : ''}.`,
      isRelevant: true,
    };
  }

  const pctChange = ((current.nightly_rate - previous.nightly_rate) / previous.nightly_rate) * 100;
  const absChange = Math.abs(pctChange);

  if (absChange >= 20) {
    return {
      score: 9,
      summary: `Major rate ${pctChange > 0 ? 'increase' : 'decrease'} of ${pctChange.toFixed(0)}% for ${current.property}: $${previous.nightly_rate} -> $${current.nightly_rate}/night. This signals a significant pricing strategy shift.`,
      isRelevant: true,
    };
  }
  if (absChange >= 10) {
    return {
      score: 7,
      summary: `Notable rate ${pctChange > 0 ? 'increase' : 'decrease'} of ${pctChange.toFixed(0)}% for ${current.property}: $${previous.nightly_rate} -> $${current.nightly_rate}/night.`,
      isRelevant: true,
    };
  }
  if (absChange >= 5) {
    return {
      score: 5,
      summary: `Moderate rate ${pctChange > 0 ? 'increase' : 'decrease'} of ${pctChange.toFixed(1)}% for ${current.property}: $${previous.nightly_rate} -> $${current.nightly_rate}/night.`,
      isRelevant: false,
    };
  }

  // Small changes aren't worth signaling
  return { score: 3, summary: '', isRelevant: false };
}

// ─── Main Collection Function ────────────────────────────────────────

export async function collectRateSignals(competitorId: string, competitorName: string) {
  const supabase = await createClient();
  const results: Array<{ title: string; score: number }> = [];

  // Collect rates from all sources in parallel
  const [airbnbRates, bookingRates, searchRates] = await Promise.allSettled([
    fetchAirbnbRates(competitorName),
    fetchBookingRates(competitorName),
    fetchRatesBySearch(competitorName),
  ]);

  const allRates: RateData[] = [
    ...(airbnbRates.status === 'fulfilled' ? airbnbRates.value : []),
    ...(bookingRates.status === 'fulfilled' ? bookingRates.value : []),
    ...(searchRates.status === 'fulfilled' ? searchRates.value : []),
  ];

  if (allRates.length === 0) {
    console.log(`[RateMonitor] No rates found for ${competitorName}`);
    return results;
  }

  console.log(`[RateMonitor] Found ${allRates.length} rate data points for ${competitorName}`);

  // Get previous snapshot for comparison
  const { data: lastSnapshot } = await supabase
    .from('snapshots')
    .select('*')
    .eq('competitor_id', competitorId)
    .eq('snapshot_type', 'rate_intelligence')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousRates = new Map<string, RateData>();
  if (lastSnapshot?.content) {
    try {
      const parsed = JSON.parse(lastSnapshot.content) as Record<string, RateData>;
      for (const [key, val] of Object.entries(parsed)) {
        previousRates.set(key, val);
      }
    } catch { /* first run */ }
  }

  // Store new snapshot
  const snapshotContent: Record<string, RateData> = {};
  for (const rate of allRates) {
    const key = crypto.createHash('md5').update(`${rate.property}-${rate.platform}`).digest('hex');
    snapshotContent[key] = rate;
  }

  const snapshotHash = crypto.createHash('md5').update(JSON.stringify(snapshotContent)).digest('hex');

  // Only store if rates actually changed
  if (!lastSnapshot || lastSnapshot.content_hash !== snapshotHash) {
    await supabase.from('snapshots').insert({
      competitor_id: competitorId,
      snapshot_type: 'rate_intelligence',
      content_hash: snapshotHash,
      content: JSON.stringify(snapshotContent),
    });
  }

  // Generate signals for significant rate changes
  for (const rate of allRates) {
    const key = crypto.createHash('md5').update(`${rate.property}-${rate.platform}`).digest('hex');
    const previous = previousRates.get(key) || null;

    const scoring = quickScoreRate(rate, previous);

    // Skip insignificant changes
    if (scoring.score < 5 || !scoring.summary) continue;

    // First-run: only signal if we have actual rate data
    if (!previous && (!rate.nightly_rate || rate.nightly_rate <= 0)) continue;

    // Check for duplicate signals within last 7 days
    const { data: existing } = await supabase
      .from('signals')
      .select('id')
      .eq('competitor_id', competitorId)
      .eq('signal_type', 'rate_intelligence')
      .ilike('title', `%${rate.property}%`)
      .gte('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (existing) continue;

    const changeLabel = previous ? 'Rate change detected' : 'Rate tracked';

    const { error } = await supabase.from('signals').insert({
      competitor_id: competitorId,
      signal_type: 'rate_intelligence',
      title: `${changeLabel}: ${rate.property} (${rate.platform})`,
      summary: scoring.summary,
      raw_data: {
        current_rate: rate.nightly_rate,
        previous_rate: previous?.nightly_rate || null,
        platform: rate.platform,
        property: rate.property,
        rating: rate.rating,
        reviews: rate.reviews,
        location: rate.location,
        currency: rate.currency,
      },
      source_url: rate.url || null,
      relevance_score: scoring.score,
      is_strategically_relevant: scoring.isRelevant,
      detected_at: new Date().toISOString(),
    });

    if (!error) {
      results.push({ title: `${rate.property}: $${rate.nightly_rate}`, score: scoring.score });
    }
  }

  return results;
}
