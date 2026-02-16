import type { SignalType } from '@/lib/types';

type JoinedCompetitor = { name?: string } | { name?: string }[] | null;

interface PatternSignalRow {
  id: string;
  signal_type: SignalType;
  title: string;
  summary: string;
  relevance_score: number;
  is_strategically_relevant: boolean;
  detected_at: string;
  competitor: JoinedCompetitor;
}

interface PatternAccumulator {
  signalType: SignalType;
  competitorNames: Set<string>;
  totalSignals: number;
  relevanceSum: number;
  newestAt: string;
}

const SIGNAL_LABELS: Record<SignalType, string> = {
  hiring: 'Talent Shift',
  digital_footprint: 'Digital Footprint',
  news_press: 'Press Narrative',
  asset_watch: 'Asset Expansion',
  linkedin_post: 'Leadership Narrative',
  social_mention: 'Social Momentum',
  media_appearance: 'Media Presence',
  app_update: 'Product Experience',
  employee_sentiment: 'Workforce Sentiment',
  customer_review: 'Guest Sentiment',
  financial_filing: 'Financial Signals',
  rate_intelligence: 'Pricing Moves',
};

const ACTION_PLAYBOOK: Record<SignalType, string> = {
  hiring: 'Pre-empt with targeted recruiting in overlapping markets and accelerate AI/ops capability buildout.',
  digital_footprint: 'Run a rapid UX benchmark and ship differentiated guest experience improvements this quarter.',
  news_press: 'Counter-position with stronger category narrative in investor, owner, and partner channels.',
  asset_watch: 'Pressure-test market entry assumptions and secure key owner relationships before competitors scale.',
  linkedin_post: 'Anticipate strategy shift and prepare response memos for partnerships, product, and GTM.',
  social_mention: 'Increase brand share-of-voice around trust, reliability, and flexible-stay outcomes.',
  media_appearance: 'Shape the narrative with proactive thought leadership and founder/executive visibility.',
  app_update: 'Tighten mobile-first journey and reduce booking-to-check-in friction in top markets.',
  employee_sentiment: 'Exploit execution gaps by highlighting Kasa operating consistency and talent culture.',
  customer_review: 'Deploy service-quality interventions and benchmark NPS-sensitive pain points.',
  financial_filing: 'Revisit competitive risk scenarios and prioritize capital-efficient moves.',
  rate_intelligence: 'Adjust pricing guardrails and defend margin in markets showing direct overlap.',
};

export interface PatternRecommendation {
  id: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  action: string;
  ownerSuggestion: string;
  timeHorizon: string;
  relatedCompetitors: string[];
}

export interface PatternInsight {
  id: string;
  signalType: SignalType;
  label: string;
  competitorCount: number;
  competitorNames: string[];
  totalSignals: number;
  averageRelevance: number;
  momentumScore: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  whyItMatters: string;
  recommendation: string;
  latestDetectedAt: string;
}

export interface PatternInsightsResponse {
  strategicPressureIndex: number;
  marketHeat: number;
  parallelMoves: number;
  patterns: PatternInsight[];
  recommendations: PatternRecommendation[];
  generated_at: string;
}

function getCompetitorName(joined: JoinedCompetitor): string {
  if (Array.isArray(joined)) {
    return joined[0]?.name || 'Unknown';
  }
  return joined?.name || 'Unknown';
}

function computeRecencyBoost(newestAt: string): number {
  const now = Date.now();
  const newest = new Date(newestAt).getTime();
  const days = Math.max(0, (now - newest) / (1000 * 60 * 60 * 24));
  if (days <= 2) return 15;
  if (days <= 7) return 10;
  if (days <= 14) return 5;
  return 2;
}

function priorityFromScore(score: number): 'critical' | 'high' | 'medium' | 'low' {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

export async function getPatternInsights(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<PatternInsightsResponse> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: rawSignals } = await supabase
    .from('signals')
    .select(
      'id, signal_type, title, summary, relevance_score, is_strategically_relevant, detected_at, competitor:competitors(name)'
    )
    .gte('detected_at', thirtyDaysAgo.toISOString())
    .order('detected_at', { ascending: false })
    .limit(500);

  const signals = (rawSignals || []) as PatternSignalRow[];
  const strategicSignals = signals.filter((s) => s.is_strategically_relevant);

  if (signals.length === 0) {
    return {
      strategicPressureIndex: 0,
      marketHeat: 0,
      parallelMoves: 0,
      patterns: [],
      recommendations: [],
      generated_at: new Date().toISOString(),
    };
  }

  const byType = new Map<SignalType, PatternAccumulator>();
  const competitorStrategicCounts = new Map<string, number>();
  const allCompetitors = new Set<string>();

  for (const signal of signals) {
    const competitorName = getCompetitorName(signal.competitor);
    allCompetitors.add(competitorName);
    if (!signal.is_strategically_relevant) continue;

    competitorStrategicCounts.set(
      competitorName,
      (competitorStrategicCounts.get(competitorName) || 0) + 1
    );

    if (!byType.has(signal.signal_type)) {
      byType.set(signal.signal_type, {
        signalType: signal.signal_type,
        competitorNames: new Set(),
        totalSignals: 0,
        relevanceSum: 0,
        newestAt: signal.detected_at,
      });
    }

    const entry = byType.get(signal.signal_type)!;
    entry.competitorNames.add(competitorName);
    entry.totalSignals += 1;
    entry.relevanceSum += signal.relevance_score;
    if (new Date(signal.detected_at) > new Date(entry.newestAt)) {
      entry.newestAt = signal.detected_at;
    }
  }

  const patterns = Array.from(byType.values())
    .filter((entry) => entry.competitorNames.size >= 2 && entry.totalSignals >= 3)
    .map((entry) => {
      const avgRelevance = entry.relevanceSum / entry.totalSignals;
      const coverageScore = Math.min(40, entry.competitorNames.size * 12);
      const volumeScore = Math.min(25, entry.totalSignals * 3);
      const intensityScore = Math.min(20, avgRelevance * 2);
      const recencyScore = computeRecencyBoost(entry.newestAt);
      const score = Math.min(
        100,
        Math.round(coverageScore + volumeScore + intensityScore + recencyScore)
      );

      return {
        id: `${entry.signalType}-${entry.newestAt}`,
        signalType: entry.signalType,
        label: SIGNAL_LABELS[entry.signalType],
        competitorCount: entry.competitorNames.size,
        competitorNames: Array.from(entry.competitorNames).sort(),
        totalSignals: entry.totalSignals,
        averageRelevance: Number(avgRelevance.toFixed(1)),
        momentumScore: score,
        priority: priorityFromScore(score),
        whyItMatters: `${entry.competitorNames.size} competitors are signaling the same strategic theme (${SIGNAL_LABELS[entry.signalType].toLowerCase()}) with ${entry.totalSignals} relevant updates in the last 30 days.`,
        recommendation: ACTION_PLAYBOOK[entry.signalType],
        latestDetectedAt: entry.newestAt,
      };
    })
    .sort((a, b) => b.momentumScore - a.momentumScore);

  const strategicRatio = strategicSignals.length / Math.max(1, signals.length);
  const avgStrategicRelevance =
    strategicSignals.reduce((sum, s) => sum + s.relevance_score, 0) /
    Math.max(1, strategicSignals.length);
  const strategicPressureIndex = Math.min(
    100,
    Math.round(avgStrategicRelevance * 7 + strategicRatio * 30 + Math.min(patterns.length, 4) * 8)
  );

  const competitorsWithHeavyActivity = Array.from(competitorStrategicCounts.values()).filter(
    (count) => count >= 3
  ).length;
  const marketHeat = Math.round(
    (competitorsWithHeavyActivity / Math.max(1, allCompetitors.size)) * 100
  );

  const recommendations = patterns.slice(0, 5).map((pattern, index) => ({
    id: `rec-${index + 1}-${pattern.signalType}`,
    title: `${pattern.label}: ${pattern.priority.toUpperCase()} priority`,
    priority: pattern.priority,
    confidence: pattern.momentumScore,
    action: pattern.recommendation,
    ownerSuggestion:
      pattern.signalType === 'rate_intelligence' || pattern.signalType === 'asset_watch'
        ? 'Revenue + Real Estate'
        : pattern.signalType === 'hiring' || pattern.signalType === 'employee_sentiment'
          ? 'People + Operations'
          : 'Strategy + Product',
    timeHorizon:
      pattern.priority === 'critical'
        ? '0-14 days'
        : pattern.priority === 'high'
          ? 'This quarter'
          : 'Monitor this cycle',
    relatedCompetitors: pattern.competitorNames,
  }));

  return {
    strategicPressureIndex,
    marketHeat,
    parallelMoves: patterns.length,
    patterns,
    recommendations,
    generated_at: new Date().toISOString(),
  };
}

