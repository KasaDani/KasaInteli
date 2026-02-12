import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { geminiModel } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Fetch this week's strategic signals with competitor names
    const { data: signals } = await supabase
      .from('signals')
      .select('signal_type, title, summary, relevance_score, detected_at, competitor:competitors(name)')
      .eq('is_strategically_relevant', true)
      .gte('detected_at', oneWeekAgo.toISOString())
      .order('relevance_score', { ascending: false })
      .limit(30);

    if (!signals || signals.length === 0) {
      return NextResponse.json({
        summary: 'No strategically relevant signals detected this week. The competitive landscape appears quiet — consider this a window for proactive moves.',
        competitors: [],
        generated_at: new Date().toISOString(),
      });
    }

    // Group signals by competitor for context
    const byCompetitor = new Map<string, { count: number; topSignals: string[]; types: Set<string> }>();
    for (const s of signals) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const comp = s.competitor as any;
      const name: string = (Array.isArray(comp) ? comp[0]?.name : comp?.name) || 'Unknown';
      if (!byCompetitor.has(name)) {
        byCompetitor.set(name, { count: 0, topSignals: [], types: new Set() });
      }
      const entry = byCompetitor.get(name)!;
      entry.count++;
      entry.types.add(s.signal_type);
      if (entry.topSignals.length < 3) {
        entry.topSignals.push(`[${s.signal_type}] ${s.title}`);
      }
    }

    const competitorContext = Array.from(byCompetitor.entries())
      .map(([name, data]) => `${name}: ${data.count} signals (${Array.from(data.types).join(', ')}). Top: ${data.topSignals.join('; ')}`)
      .join('\n');

    const prompt = `You are a competitive intelligence analyst writing for the CEO and Executive Team of Kasa, a hospitality tech company managing flexible-stay apartments.

Here is a summary of competitive signals detected THIS WEEK:
${competitorContext}

Total strategic signals this week: ${signals.length}

Write a 2-3 sentence EXECUTIVE BRIEFING that answers:
1. Which competitor is most active and what are they doing?
2. What is the single most important thing the leadership team should know?
3. One-line recommended posture (defensive, opportunistic, or status quo).

Be direct, opinionated, and strategic. No hedging. Write as if briefing a CEO before a board meeting. No bullet points — just flowing prose. Keep it under 80 words.

Respond with ONLY the briefing text, no JSON, no formatting, no preamble.`;

    const result = await geminiModel.generateContent(prompt);
    const summary = result.response.text().trim();

    const competitorSummaries = Array.from(byCompetitor.entries()).map(([name, data]) => ({
      name,
      signalCount: data.count,
      signalTypes: Array.from(data.types),
    }));

    return NextResponse.json({
      summary,
      competitors: competitorSummaries,
      totalSignals: signals.length,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Executive summary generation error:', error);
    return NextResponse.json({
      summary: 'Unable to generate executive summary at this time. Check the dashboard for individual signals.',
      competitors: [],
      generated_at: new Date().toISOString(),
    });
  }
}
