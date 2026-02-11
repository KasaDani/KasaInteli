import { createServiceClient } from '@/lib/supabase/server';
import { analyzeSignalRelevance } from '@/lib/gemini';
import crypto from 'crypto';

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

interface GlassdoorData {
  overallRating: number;
  ceoApproval: number;
  recommendPct: number;
  totalReviews: number;
  recentReviewSnippets: string[];
  companyName: string;
}

/**
 * Fetches Glassdoor company overview page and extracts sentiment data.
 */
async function fetchGlassdoorData(glassdoorUrl: string): Promise<GlassdoorData | null> {
  try {
    let html: string;

    if (SCRAPER_API_KEY) {
      const url = new URL('https://api.scraperapi.com');
      url.searchParams.set('api_key', SCRAPER_API_KEY);
      url.searchParams.set('url', glassdoorUrl);
      url.searchParams.set('render', 'true');

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) throw new Error(`ScraperAPI error: ${response.status}`);
      html = await response.text();
    } else {
      const response = await fetch(glassdoorUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      html = await response.text();
    }

    return parseGlassdoorPage(html);
  } catch (error) {
    console.error(`Error fetching Glassdoor page:`, error);
    return null;
  }
}

/**
 * Parses Glassdoor HTML for company metrics and recent reviews.
 */
function parseGlassdoorPage(html: string): GlassdoorData {
  // Company name
  const nameMatch = html.match(
    /data-company="([^"]+)"/i
  ) || html.match(/<h1[^>]*>([^<]+)\s*Reviews?/i);
  const companyName = nameMatch?.[1]?.trim() || 'Unknown';

  // Overall rating
  const ratingPatterns = [
    /"ratingValue":\s*"?([\d.]+)"?/,
    /data-test="rating"[^>]*>([\d.]+)/,
    /class="[^"]*rating[^"]*"[^>]*>([\d.]+)/i,
    /(\d+\.?\d*)\s*<\/span>\s*<\/div>\s*<div[^>]*>\s*Overall/i,
  ];
  let overallRating = 0;
  for (const pattern of ratingPatterns) {
    const match = html.match(pattern);
    if (match) {
      overallRating = parseFloat(match[1]);
      break;
    }
  }

  // CEO Approval
  const ceoPatterns = [
    /CEO Approval[\s\S]*?(\d+)%/i,
    /(\d+)%\s*(?:approve|approval)/i,
  ];
  let ceoApproval = 0;
  for (const pattern of ceoPatterns) {
    const match = html.match(pattern);
    if (match) {
      ceoApproval = parseInt(match[1]);
      break;
    }
  }

  // Recommend percentage
  const recommendPatterns = [
    /(\d+)%\s*(?:would\s+)?recommend/i,
    /Recommend[\s\S]*?(\d+)%/i,
  ];
  let recommendPct = 0;
  for (const pattern of recommendPatterns) {
    const match = html.match(pattern);
    if (match) {
      recommendPct = parseInt(match[1]);
      break;
    }
  }

  // Total reviews
  const reviewCountPatterns = [
    /([\d,]+)\s*Reviews?/i,
    /"reviewCount":\s*"?([\d,]+)"?/,
  ];
  let totalReviews = 0;
  for (const pattern of reviewCountPatterns) {
    const match = html.match(pattern);
    if (match) {
      totalReviews = parseInt(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Recent review snippets (extract text from review elements)
  const reviewSnippets: string[] = [];
  const reviewPattern =
    /(?:review-text|reviewText|pros|cons)[^>]*>([\s\S]{20,500}?)<\//gi;
  let match;
  while ((match = reviewPattern.exec(html)) !== null) {
    const text = match[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length > 20) {
      reviewSnippets.push(text.slice(0, 300));
    }
    if (reviewSnippets.length >= 5) break;
  }

  return {
    overallRating,
    ceoApproval,
    recommendPct,
    totalReviews,
    recentReviewSnippets: reviewSnippets,
    companyName,
  };
}

/**
 * Collects employee sentiment signals from Glassdoor.
 * Generates signals when rating drops >= 0.3, recommendation % changes significantly,
 * or review count surges (indicating potential layoffs or viral negative reviews).
 */
export async function collectGlassdoorSignals(
  competitorId: string,
  competitorName: string,
  glassdoorUrl: string
) {
  const supabase = await createServiceClient();
  const results: Array<{ title: string; score: number }> = [];

  const data = await fetchGlassdoorData(glassdoorUrl);
  if (!data) return results;

  const snapshotContent = JSON.stringify({
    overallRating: data.overallRating,
    ceoApproval: data.ceoApproval,
    recommendPct: data.recommendPct,
    totalReviews: data.totalReviews,
    recentReviewHashes: data.recentReviewSnippets.map((s) =>
      crypto.createHash('md5').update(s).digest('hex')
    ),
  });

  const contentHash = crypto.createHash('md5').update(snapshotContent).digest('hex');

  // Get previous snapshot
  const { data: lastSnapshot } = await supabase
    .from('snapshots')
    .select('*')
    .eq('competitor_id', competitorId)
    .eq('snapshot_type', 'glassdoor')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Store current snapshot
  await supabase.from('snapshots').insert({
    competitor_id: competitorId,
    snapshot_type: 'glassdoor',
    content_hash: contentHash,
    content: snapshotContent,
  });

  // Compare with previous
  if (lastSnapshot && lastSnapshot.content_hash !== contentHash) {
    let oldData: {
      overallRating: number;
      ceoApproval: number;
      recommendPct: number;
      totalReviews: number;
    };
    try {
      oldData = JSON.parse(lastSnapshot.content);
    } catch {
      return results;
    }

    const changes: string[] = [];

    // Rating drop
    if (data.overallRating > 0 && oldData.overallRating > 0) {
      const ratingDiff = data.overallRating - oldData.overallRating;
      if (Math.abs(ratingDiff) >= 0.3) {
        changes.push(
          `Glassdoor rating ${ratingDiff < 0 ? 'dropped' : 'improved'} from ${oldData.overallRating.toFixed(1)} to ${data.overallRating.toFixed(1)}.`
        );
      }
    }

    // CEO Approval change (10%+ shift)
    if (data.ceoApproval > 0 && oldData.ceoApproval > 0) {
      const ceoDiff = data.ceoApproval - oldData.ceoApproval;
      if (Math.abs(ceoDiff) >= 10) {
        changes.push(
          `CEO approval ${ceoDiff < 0 ? 'fell' : 'rose'} from ${oldData.ceoApproval}% to ${data.ceoApproval}%.`
        );
      }
    }

    // Recommend % change (10%+ shift)
    if (data.recommendPct > 0 && oldData.recommendPct > 0) {
      const recDiff = data.recommendPct - oldData.recommendPct;
      if (Math.abs(recDiff) >= 10) {
        changes.push(
          `"Recommend to a friend" ${recDiff < 0 ? 'dropped' : 'increased'} from ${oldData.recommendPct}% to ${data.recommendPct}%.`
        );
      }
    }

    // Review count surge (25%+)
    if (data.totalReviews > 0 && oldData.totalReviews > 0) {
      const reviewDiff = data.totalReviews - oldData.totalReviews;
      const reviewPct = (reviewDiff / oldData.totalReviews) * 100;
      if (reviewPct >= 25) {
        changes.push(
          `Review count surged by ${reviewPct.toFixed(0)}% (${oldData.totalReviews} -> ${data.totalReviews}), possibly indicating layoffs or viral negative sentiment.`
        );
      }
    }

    if (changes.length === 0) return results;

    const changeDescription = changes.join(' ');
    const isNegative =
      (data.overallRating < oldData.overallRating) ||
      (data.ceoApproval < oldData.ceoApproval) ||
      (data.recommendPct < oldData.recommendPct);

    const signalTitle = isNegative
      ? `Employee sentiment decline: ${competitorName}`
      : `Employee sentiment change: ${competitorName}`;

    const analysis = await analyzeSignalRelevance(
      'Employee Sentiment',
      signalTitle,
      `Glassdoor changes for ${competitorName}: ${changeDescription}. Recent review snippets: ${data.recentReviewSnippets.slice(0, 3).join(' | ')}`,
      competitorName
    );

    if (analysis.score >= 3) {
      const { error } = await supabase.from('signals').insert({
        competitor_id: competitorId,
        signal_type: 'employee_sentiment',
        title: signalTitle,
        summary: analysis.summary,
        raw_data: {
          current: {
            rating: data.overallRating,
            ceoApproval: data.ceoApproval,
            recommendPct: data.recommendPct,
            totalReviews: data.totalReviews,
          },
          previous: {
            rating: oldData.overallRating,
            ceoApproval: oldData.ceoApproval,
            recommendPct: oldData.recommendPct,
            totalReviews: oldData.totalReviews,
          },
          changes: changeDescription,
          recentReviews: data.recentReviewSnippets.slice(0, 3),
        },
        source_url: glassdoorUrl,
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
