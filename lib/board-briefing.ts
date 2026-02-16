import type { PatternInsightsResponse } from '@/lib/patterns';

interface BoardSignal {
  competitor_name: string;
  signal_type: string;
  title: string;
  summary: string;
  relevance_score: number;
}

interface BuildBoardBriefingInput {
  generatedAt: string;
  profileLabel: string;
  signals: BoardSignal[];
  insights: PatternInsightsResponse;
}

function topCompetitors(signals: BoardSignal[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const signal of signals) {
    counts.set(signal.competitor_name, (counts.get(signal.competitor_name) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export function buildBoardBriefingMarkdown(input: BuildBoardBriefingInput): string {
  const leaders = topCompetitors(input.signals);
  const topPatterns = input.insights.patterns.slice(0, 4);
  const topActions = input.insights.recommendations.slice(0, 5);

  return [
    `# Board Briefing Deck Outline (${input.profileLabel})`,
    `Generated: ${new Date(input.generatedAt).toLocaleString()}`,
    '',
    '---',
    '## Slide 1: Executive Snapshot',
    `- Strategic Pressure Index: ${input.insights.strategicPressureIndex}`,
    `- Market Heat: ${input.insights.marketHeat}%`,
    `- Parallel Moves: ${input.insights.parallelMoves}`,
    `- Strategic Signals Reviewed: ${input.signals.length}`,
    '',
    '---',
    '## Slide 2: Competitive Pressure Leaders',
    ...leaders.map((leader) => `- ${leader.name}: ${leader.count} strategic signals`),
    '',
    '---',
    '## Slide 3: Cross-Competitor Patterns',
    ...topPatterns.map(
      (pattern) =>
        `- ${pattern.label} (${pattern.priority.toUpperCase()}, ${pattern.momentumScore}) | ${pattern.competitorCount} competitors | ${pattern.whyItMatters}`
    ),
    '',
    '---',
    '## Slide 4: Recommended Decisions',
    ...topActions.map(
      (action) =>
        `- ${action.title} | Owner: ${action.ownerSuggestion} | Horizon: ${action.timeHorizon} | ${action.action}`
    ),
    '',
    '---',
    '## Slide 5: Key Signals to Reference',
    ...input.signals.slice(0, 8).map(
      (signal) =>
        `- [${signal.competitor_name}] (${signal.relevance_score}/10) ${signal.title} — ${signal.summary}`
    ),
    '',
    '---',
    '## Slide 6: Board Ask',
    '- Confirm top two strategic responses for the next 30 days.',
    '- Allocate owners for critical/high recommendations.',
    '- Approve watchlist escalation thresholds for weekly reporting.',
  ].join('\n');
}

export function buildBoardBriefingHtml(input: BuildBoardBriefingInput): string {
  const leaders = topCompetitors(input.signals);
  const topPatterns = input.insights.patterns.slice(0, 5);
  const topActions = input.insights.recommendations.slice(0, 5);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Board Briefing</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
      .slide { width: 1280px; min-height: 720px; margin: 24px auto; background: #fff; padding: 48px; box-sizing: border-box; border: 1px solid #e2e8f0; page-break-after: always; }
      h1 { margin: 0 0 12px; font-size: 38px; }
      h2 { margin: 0 0 16px; font-size: 30px; }
      p { font-size: 18px; color: #334155; }
      ul { margin: 16px 0 0; padding-left: 22px; }
      li { margin-bottom: 10px; font-size: 21px; line-height: 1.4; }
      .kpis { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 16px; margin-top: 28px; }
      .kpi { border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; }
      .kpi .label { color: #64748b; font-size: 14px; }
      .kpi .value { font-size: 38px; font-weight: 700; margin-top: 8px; }
      .meta { color: #64748b; font-size: 14px; }
      @media print {
        body { background: #fff; }
        .slide { margin: 0; border: none; width: 100%; min-height: 100vh; }
      }
    </style>
  </head>
  <body>
    <section class="slide">
      <h1>Kasa Board Competitive Briefing</h1>
      <p>${input.profileLabel} | Generated ${new Date(input.generatedAt).toLocaleString()}</p>
      <div class="kpis">
        <div class="kpi"><div class="label">Strategic Pressure</div><div class="value">${input.insights.strategicPressureIndex}</div></div>
        <div class="kpi"><div class="label">Market Heat</div><div class="value">${input.insights.marketHeat}%</div></div>
        <div class="kpi"><div class="label">Parallel Moves</div><div class="value">${input.insights.parallelMoves}</div></div>
        <div class="kpi"><div class="label">Signals Reviewed</div><div class="value">${input.signals.length}</div></div>
      </div>
    </section>
    <section class="slide">
      <h2>Where Competitive Pressure Is Concentrated</h2>
      <ul>
        ${leaders.map((leader) => `<li>${leader.name}: ${leader.count} strategic signals</li>`).join('')}
      </ul>
    </section>
    <section class="slide">
      <h2>Critical Cross-Competitor Patterns</h2>
      <ul>
        ${topPatterns
          .map(
            (pattern) =>
              `<li><strong>${pattern.label}</strong> (${pattern.priority.toUpperCase()}, ${pattern.momentumScore})<br/>${pattern.whyItMatters}</li>`
          )
          .join('')}
      </ul>
    </section>
    <section class="slide">
      <h2>Recommended Executive Actions</h2>
      <ul>
        ${topActions
          .map(
            (action) =>
              `<li><strong>${action.title}</strong> — Owner: ${action.ownerSuggestion} | Horizon: ${action.timeHorizon}<br/>${action.action}</li>`
          )
          .join('')}
      </ul>
      <p class="meta">Export note: Use browser Print > Save as PDF for board-ready PDF output.</p>
    </section>
  </body>
</html>`;
}

