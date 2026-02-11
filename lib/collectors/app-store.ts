import { createServiceClient } from '@/lib/supabase/server';
import { analyzeSignalRelevance } from '@/lib/gemini';
import crypto from 'crypto';

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

interface AppStoreData {
  version: string;
  rating: number;
  reviewCount: number;
  releaseNotes: string;
  lastUpdated: string;
  appName: string;
}

/**
 * Fetches app page content via ScraperAPI and extracts key metrics.
 */
async function fetchAppStoreData(appStoreUrl: string): Promise<AppStoreData | null> {
  try {
    let html: string;

    if (SCRAPER_API_KEY) {
      const url = new URL('https://api.scraperapi.com');
      url.searchParams.set('api_key', SCRAPER_API_KEY);
      url.searchParams.set('url', appStoreUrl);
      url.searchParams.set('render', 'true');

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) throw new Error(`ScraperAPI error: ${response.status}`);
      html = await response.text();
    } else {
      const response = await fetch(appStoreUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      html = await response.text();
    }

    return parseAppStorePage(html, appStoreUrl);
  } catch (error) {
    console.error(`Error fetching app store page ${appStoreUrl}:`, error);
    return null;
  }
}

/**
 * Parses Apple App Store or Google Play Store HTML for key metrics.
 */
function parseAppStorePage(html: string, url: string): AppStoreData {
  const isApple = url.includes('apps.apple.com');

  // Extract app name
  const nameMatch = isApple
    ? html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    : html.match(/<h1[^>]*><span>([^<]+)<\/span>/i);
  const appName = nameMatch?.[1]?.trim() || 'Unknown App';

  // Extract version
  const versionPatterns = [
    /Version\s+([\d.]+)/i,
    /"softwareVersion":\s*"([\d.]+)"/,
    /Current Version[^<]*<[^>]*>([\d.]+)/i,
    /What&#39;s New[\s\S]*?Version\s+([\d.]+)/i,
  ];
  let version = 'unknown';
  for (const pattern of versionPatterns) {
    const match = html.match(pattern);
    if (match) {
      version = match[1];
      break;
    }
  }

  // Extract rating
  const ratingPatterns = [
    /(\d+\.?\d*)\s*out of\s*5/i,
    /"ratingValue":\s*"?([\d.]+)"?/,
    /aria-label="(\d+\.?\d*)\s*stars?"/i,
  ];
  let rating = 0;
  for (const pattern of ratingPatterns) {
    const match = html.match(pattern);
    if (match) {
      rating = parseFloat(match[1]);
      break;
    }
  }

  // Extract review count
  const reviewPatterns = [
    /([\d,]+)\s*Ratings?/i,
    /"ratingCount":\s*"?([\d,]+)"?/,
    /([\d,]+)\s*reviews?/i,
  ];
  let reviewCount = 0;
  for (const pattern of reviewPatterns) {
    const match = html.match(pattern);
    if (match) {
      reviewCount = parseInt(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Extract release notes / "What's New"
  const notesPatterns = [
    /What(?:'|&#39;|')s New[\s\S]*?<p[^>]*>([\s\S]{10,2000}?)<\/p>/i,
    /Release Notes[\s\S]*?<div[^>]*>([\s\S]{10,2000}?)<\/div>/i,
  ];
  let releaseNotes = '';
  for (const pattern of notesPatterns) {
    const match = html.match(pattern);
    if (match) {
      releaseNotes = match[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1000);
      break;
    }
  }

  // Extract last updated date
  const datePatterns = [
    /Updated\s*<[^>]*>([\w\s,]+\d{4})/i,
    /"datePublished":\s*"([^"]+)"/,
    /Updated\s+([\w]+\s+\d{1,2},?\s*\d{4})/i,
  ];
  let lastUpdated = new Date().toISOString();
  for (const pattern of datePatterns) {
    const match = html.match(pattern);
    if (match) {
      try {
        lastUpdated = new Date(match[1].trim()).toISOString();
      } catch {
        // Keep default
      }
      break;
    }
  }

  return { version, rating, reviewCount, releaseNotes, lastUpdated, appName };
}

/**
 * Collects app store monitoring signals by comparing snapshots of app metrics.
 */
export async function collectAppStoreSignals(
  competitorId: string,
  competitorName: string,
  appStoreUrl: string
) {
  const supabase = await createServiceClient();
  const results: Array<{ title: string; score: number }> = [];

  const appData = await fetchAppStoreData(appStoreUrl);
  if (!appData) return results;

  const snapshotContent = JSON.stringify({
    version: appData.version,
    rating: appData.rating,
    reviewCount: appData.reviewCount,
    releaseNotes: appData.releaseNotes,
    lastUpdated: appData.lastUpdated,
    appName: appData.appName,
  });

  const contentHash = crypto.createHash('md5').update(snapshotContent).digest('hex');

  // Get previous snapshot
  const { data: lastSnapshot } = await supabase
    .from('snapshots')
    .select('*')
    .eq('competitor_id', competitorId)
    .eq('snapshot_type', 'app_store')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Store current snapshot
  await supabase.from('snapshots').insert({
    competitor_id: competitorId,
    snapshot_type: 'app_store',
    content_hash: contentHash,
    content: snapshotContent,
  });

  // Compare with previous snapshot
  if (lastSnapshot && lastSnapshot.content_hash !== contentHash) {
    let oldData: AppStoreData;
    try {
      oldData = JSON.parse(lastSnapshot.content) as AppStoreData;
    } catch {
      return results;
    }

    const changes: string[] = [];

    // Version change (app update)
    if (appData.version !== oldData.version && appData.version !== 'unknown') {
      changes.push(
        `App updated from v${oldData.version} to v${appData.version}.` +
          (appData.releaseNotes
            ? ` Release notes: ${appData.releaseNotes.slice(0, 500)}`
            : '')
      );
    }

    // Rating change (significant = 0.3+)
    if (oldData.rating > 0 && appData.rating > 0) {
      const ratingDiff = appData.rating - oldData.rating;
      if (Math.abs(ratingDiff) >= 0.3) {
        changes.push(
          `App rating ${ratingDiff > 0 ? 'improved' : 'dropped'} from ${oldData.rating.toFixed(1)} to ${appData.rating.toFixed(1)} (${ratingDiff > 0 ? '+' : ''}${ratingDiff.toFixed(1)}).`
        );
      }
    }

    // Review count surge (significant = 20%+ increase)
    if (oldData.reviewCount > 0 && appData.reviewCount > 0) {
      const reviewDiff = appData.reviewCount - oldData.reviewCount;
      const reviewPctChange = (reviewDiff / oldData.reviewCount) * 100;
      if (reviewPctChange >= 20) {
        changes.push(
          `Review count surged by ${reviewPctChange.toFixed(0)}% (${oldData.reviewCount.toLocaleString()} -> ${appData.reviewCount.toLocaleString()}).`
        );
      }
    }

    if (changes.length === 0) return results;

    const changeDescription = changes.join(' ');
    const signalTitle = appData.version !== oldData.version
      ? `${competitorName} app update: v${appData.version}`
      : `${competitorName} app metrics change`;

    const analysis = await analyzeSignalRelevance(
      'App Store Update',
      signalTitle,
      `${competitorName}'s mobile app (${appData.appName}) changes detected: ${changeDescription}`,
      competitorName
    );

    if (analysis.score >= 3) {
      const { error } = await supabase.from('signals').insert({
        competitor_id: competitorId,
        signal_type: 'app_update',
        title: signalTitle,
        summary: analysis.summary,
        raw_data: {
          current: appData,
          previous: {
            version: oldData.version,
            rating: oldData.rating,
            reviewCount: oldData.reviewCount,
          },
          changes: changeDescription,
        },
        source_url: appStoreUrl,
        relevance_score: analysis.score,
        is_strategically_relevant: analysis.isRelevant,
        detected_at: new Date().toISOString(),
      });

      if (!error) {
        results.push({ title: signalTitle, score: analysis.score });
      }
    }
  }

  return results;
}
