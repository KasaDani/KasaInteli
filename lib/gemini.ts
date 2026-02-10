import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
});

export async function analyzeSignalRelevance(
  signalType: string,
  title: string,
  content: string,
  competitorName: string
): Promise<{ score: number; summary: string; isRelevant: boolean }> {
  const prompt = `You are a competitive intelligence analyst for Kasa, a hospitality tech company that manages flexible-stay apartments.

Analyze the following signal detected for competitor "${competitorName}" and rate its strategic relevance.

Signal Type: ${signalType}
Title: ${title}
Content: ${content}

Respond in JSON format ONLY (no markdown, no code fences):
{
  "score": <1-10 integer, where 10 is extremely strategically relevant>,
  "summary": "<2-3 sentence summary of why this matters strategically>",
  "isRelevant": <true if score >= 5, false otherwise>
}

Scoring guide:
- 8-10: Major strategic shifts (new market entry, leadership changes, funding, acquisitions, new product lines)
- 5-7: Moderate signals (expanding teams, feature updates, partnerships)
- 1-4: Noise (minor website tweaks, routine hiring, cosmetic changes)`;

  const result = await geminiModel.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      score: parsed.score ?? 5,
      summary: parsed.summary ?? 'Unable to analyze.',
      isRelevant: parsed.isRelevant ?? parsed.score >= 5,
    };
  } catch {
    return { score: 5, summary: content.slice(0, 200), isRelevant: true };
  }
}

export async function generateDossierAnalysis(
  competitorName: string,
  competitorWebsite: string,
  signals: Array<{ signal_type: string; title: string; summary: string; detected_at: string }>
): Promise<{
  footprint: Record<string, unknown>;
  operating_model: string;
  strategic_positioning: string;
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  recommendations: { optimization: string; impact: string; action: string };
}> {
  const signalsSummary = signals
    .map((s) => `[${s.signal_type}] ${s.detected_at}: ${s.title} - ${s.summary}`)
    .join('\n');

  const prompt = `You are a senior competitive intelligence analyst for Kasa, a hospitality tech company managing flexible-stay apartments in major US cities.

Generate a comprehensive competitor dossier for "${competitorName}" (${competitorWebsite}).

Here are the intelligence signals collected:
${signalsSummary || 'No signals collected yet. Generate based on your knowledge of this company.'}

Respond in JSON format ONLY (no markdown, no code fences):
{
  "footprint": {
    "markets": ["list of known markets/cities"],
    "estimated_properties": <number or null>,
    "estimated_units": <number or null>,
    "expansion_trend": "growing/stable/contracting"
  },
  "operating_model": "<Description of their operating model: master lease, management contracts, hybrid, etc.>",
  "strategic_positioning": "<2-3 paragraph analysis of their strategic position, strengths, weaknesses, and recent shifts>",
  "swot": {
    "strengths": ["strength 1", "strength 2", "strength 3"],
    "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
    "opportunities": ["opportunity 1", "opportunity 2"],
    "threats": ["threat 1", "threat 2"]
  },
  "recommendations": {
    "optimization": "<What this competitor appears to be optimizing for right now>",
    "impact": "<What risks or opportunities does this create for Kasa?>",
    "action": "<How should Kasa respond? Ignore, Copy, Pre-empt, Partner?>"
  }
}`;

  const result = await geminiModel.generateContent(prompt);
  const text = result.response.text().trim();

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      footprint: { markets: [], estimated_properties: null, estimated_units: null, expansion_trend: 'unknown' },
      operating_model: 'Unable to determine.',
      strategic_positioning: 'Analysis failed. Please try refreshing.',
      swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      recommendations: { optimization: 'Unknown', impact: 'Unknown', action: 'Investigate further' },
    };
  }
}

export async function generateDigestContent(
  signals: Array<{
    competitor_name: string;
    signal_type: string;
    title: string;
    summary: string;
    detected_at: string;
    relevance_score: number;
  }>
): Promise<string> {
  if (signals.length === 0) {
    return 'No strategically relevant signals detected this week.';
  }

  const signalsSummary = signals
    .map(
      (s) =>
        `[${s.competitor_name}] [${s.signal_type}] (Relevance: ${s.relevance_score}/10) ${s.detected_at}: ${s.title} - ${s.summary}`
    )
    .join('\n');

  const prompt = `You are a competitive intelligence analyst preparing a weekly intelligence brief for the CEO and Executive Team of Kasa, a hospitality tech company.

Here are the strategically relevant signals from this week:
${signalsSummary}

Generate a concise, executive-ready weekly intelligence brief. Format it for Slack (use Slack markdown: *bold*, _italic_, bullet points).

Structure:
*Weekly Competitive Intelligence Brief*
_Week of [date]_

For each competitor with signals:
*[Competitor Name]*
• Key changes and what happened
• *Why it matters:* Strategic implications for Kasa
• *Recommended action:* Specific recommendation

End with:
*Bottom Line:* 1-2 sentence overall assessment of competitive landscape shifts this week.`;

  const result = await geminiModel.generateContent(prompt);
  return result.response.text().trim();
}
