import type { SignalType } from '@/lib/types';

type JoinedCompetitor = { name?: string } | { name?: string }[] | null;

interface PatternSignalRow {
  id: string;
  signal_type: SignalType;
  title: string;
  summary: string;
  source_url: string | null;
  relevance_score: number;
  is_strategically_relevant: boolean;
  detected_at: string;
  competitor: JoinedCompetitor;
}

export interface PatternEvidence {
  signalId: string;
  competitorName: string;
  title: string;
  summary: string;
  sourceUrl: string | null;
  detectedAt: string;
  relevance: number;
}

interface PatternAccumulator {
  signalType: SignalType;
  competitorNames: Set<string>;
  totalSignals: number;
  relevanceSum: number;
  newestAt: string;
  evidence: PatternEvidence[];
}

const NON_STRATEGIC_HIRING_KEYWORDS = [
  'housekeeping',
  'inspector',
  'room attendant',
  'cleaner',
  'janitor',
  'front desk',
  'guest services agent',
  'night auditor',
  'valet',
  'bell',
  'maintenance technician',
  'maintenance associate',
  'line cook',
  'cook',
  'server',
  'bartender',
  'barista',
  'dishwasher',
  'porter',
  'security officer',
];

const STRATEGIC_HIRING_KEYWORDS = [
  'chief',
  'vp',
  'vice president',
  'head of',
  'director',
  'general manager',
  'market manager',
  'regional',
  'revenue management',
  'pricing',
  'data science',
  'machine learning',
  'ai',
  'automation',
  'product manager',
  'engineering manager',
  'partnerships',
  'corporate development',
  'strategy',
  'expansion',
];

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
  rationale: string;
  expectedImpact: string;
  evidenceSnippets: string[];
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
  impactStatement: string;
  recommendedMoves: string[];
  evidence: PatternEvidence[];
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

function summarizeEvidence(evidence: PatternEvidence[]): string {
  return evidence
    .slice(0, 2)
    .map((item) => `${item.competitorName}: "${item.title}"`)
    .join(' | ');
}

function buildImpactStatement(
  signalType: SignalType,
  competitorNames: string[],
  evidence: PatternEvidence[]
): string {
  const competitors = competitorNames.slice(0, 3).join(', ');
  const leadSignal = evidence[0]?.title || 'recent strategic activity';

  switch (signalType) {
    case 'hiring':
      return `Hiring signals from ${competitors} suggest capability buildout that can accelerate execution speed versus Kasa in the next quarter (${leadSignal}).`;
    case 'asset_watch':
      return `Property footprint signals point to market share pressure in overlapping geographies, raising risk of owner pipeline competition (${leadSignal}).`;
    case 'rate_intelligence':
      return `Pricing movement can force margin compression in shared markets if Kasa does not proactively adjust price guardrails (${leadSignal}).`;
    case 'digital_footprint':
    case 'app_update':
      return `Product and digital experience updates indicate rising guest-experience expectations that can shift conversion and retention dynamics (${leadSignal}).`;
    case 'news_press':
    case 'media_appearance':
      return `Narrative momentum is building externally and can influence owners, investors, and partners unless Kasa counter-positions clearly (${leadSignal}).`;
    default:
      return `Recent multi-competitor moves indicate a coordinated strategic shift that can change Kasa's risk/reward profile (${leadSignal}).`;
  }
}

function buildRecommendedMoves(signalType: SignalType, competitorNames: string[]): string[] {
  const competitorText = competitorNames.slice(0, 3).join(', ');

  switch (signalType) {
    case 'hiring':
      return [
        `Launch a 30-day talent defense plan against ${competitorText} in critical roles.`,
        'Audit internal capability gaps tied to AI/automation, pricing, and operations execution.',
        'Escalate recruitment pipeline metrics weekly to the executive staff meeting.',
      ];
    case 'asset_watch':
      return [
        'Prioritize top 5 overlap markets and assign owner outreach coverage by region.',
        'Create a pre-emption playbook for high-value building/owner opportunities.',
        'Review expansion hurdle rates and speed-to-launch assumptions this month.',
      ];
    case 'rate_intelligence':
      return [
        'Run a market-by-market pricing war-game on high-overlap cities this week.',
        'Set tactical discount and floor-price rules to protect margin and occupancy.',
        'Instrument daily alerting on abnormal rate movement by competitor and market.',
      ];
    case 'digital_footprint':
    case 'app_update':
      return [
        'Benchmark the end-to-end digital booking and check-in journey against top rivals.',
        'Prioritize one guest-friction fix and one conversion lift experiment in this sprint.',
        'Report guest tech delta and launch timeline in the next exec review.',
      ];
    default:
      return [
        'Assign a cross-functional owner for this pattern and publish a response memo.',
        'Define measurable leading indicators and track weekly in command center review.',
        'Timebox a 14-day strategic response and decide scale-up or monitor posture.',
      ];
  }
}

function ownerForSignalType(signalType: SignalType): string {
  if (signalType === 'rate_intelligence' || signalType === 'asset_watch') return 'Revenue + Real Estate';
  if (signalType === 'hiring' || signalType === 'employee_sentiment') return 'People + Operations';
  if (signalType === 'app_update' || signalType === 'digital_footprint') return 'Product + Engineering';
  return 'Strategy + Leadership';
}

function isStrategicHiringSignal(
  title: string,
  summary: string,
  relevanceScore: number
): boolean {
  const text = `${title} ${summary}`.toLowerCase();
  const hasStrategicKeyword = STRATEGIC_HIRING_KEYWORDS.some((keyword) =>
    text.includes(keyword)
  );
  const hasNonStrategicKeyword = NON_STRATEGIC_HIRING_KEYWORDS.some((keyword) =>
    text.includes(keyword)
  );

  // Explicitly filter out frontline hourly roles unless they are somehow scored as near-max strategic.
  if (hasNonStrategicKeyword && !hasStrategicKeyword && relevanceScore < 9) {
    return false;
  }

  // If relevance is high and no frontline pattern, keep it.
  if (relevanceScore >= 7 && !hasNonStrategicKeyword) {
    return true;
  }

  // Otherwise only keep if title/summary clearly indicates leadership/capability shift.
  return hasStrategicKeyword;
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
      'id, signal_type, title, summary, source_url, relevance_score, is_strategically_relevant, detected_at, competitor:competitors(name)'
    )
    .gte('detected_at', thirtyDaysAgo.toISOString())
    .order('detected_at', { ascending: false })
    .limit(500);

  const signals = (rawSignals || []) as PatternSignalRow[];
  const strategicSignalsUsed: PatternSignalRow[] = [];

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
    if (
      signal.signal_type === 'hiring' &&
      !isStrategicHiringSignal(signal.title, signal.summary, signal.relevance_score)
    ) {
      continue;
    }
    strategicSignalsUsed.push(signal);

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
        evidence: [],
      });
    }

    const entry = byType.get(signal.signal_type)!;
    entry.competitorNames.add(competitorName);
    entry.totalSignals += 1;
    entry.relevanceSum += signal.relevance_score;
    entry.evidence.push({
      signalId: signal.id,
      competitorName,
      title: signal.title,
      summary: signal.summary,
      sourceUrl: signal.source_url,
      detectedAt: signal.detected_at,
      relevance: signal.relevance_score,
    });
    if (new Date(signal.detected_at) > new Date(entry.newestAt)) {
      entry.newestAt = signal.detected_at;
    }
  }

  const patterns = Array.from(byType.values())
    .filter((entry) => entry.competitorNames.size >= 2 && entry.totalSignals >= 3)
    .map((entry) => {
      const topEvidence = entry.evidence
        .sort((a, b) => {
          if (a.relevance !== b.relevance) return b.relevance - a.relevance;
          return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
        })
        .slice(0, 4);
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
        whyItMatters: `${entry.competitorNames.size} competitors are converging on ${SIGNAL_LABELS[entry.signalType].toLowerCase()} with ${entry.totalSignals} high-signal events. Evidence: ${summarizeEvidence(topEvidence)}.`,
        recommendation: ACTION_PLAYBOOK[entry.signalType],
        impactStatement: buildImpactStatement(
          entry.signalType,
          Array.from(entry.competitorNames).sort(),
          topEvidence
        ),
        recommendedMoves: buildRecommendedMoves(
          entry.signalType,
          Array.from(entry.competitorNames).sort()
        ),
        evidence: topEvidence,
        latestDetectedAt: entry.newestAt,
      };
    })
    .sort((a, b) => b.momentumScore - a.momentumScore);

  const strategicRatio = strategicSignalsUsed.length / Math.max(1, signals.length);
  const avgStrategicRelevance =
    strategicSignalsUsed.reduce((sum, s) => sum + s.relevance_score, 0) /
    Math.max(1, strategicSignalsUsed.length);
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
    rationale: pattern.impactStatement,
    expectedImpact: `If executed within ${pattern.priority === 'critical' ? '2 weeks' : 'this quarter'}, this response can reduce downside exposure from ${pattern.competitorNames.slice(0, 2).join(' and ')} and protect Kasa's strategic position.`,
    evidenceSnippets: pattern.evidence.slice(0, 3).map(
      (item) => `${item.competitorName}: ${item.title}`
    ),
    ownerSuggestion: ownerForSignalType(pattern.signalType),
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

