// GET last 8 weeks of signal trends per competitor. Sparklines need data. Dani needs sparklines.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch signals from the last 8 weeks with competitor names
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const { data: signals } = await supabase
      .from('signals')
      .select('competitor_id, detected_at, relevance_score, is_strategically_relevant, competitor:competitors(name)')
      .gte('detected_at', eightWeeksAgo.toISOString())
      .order('detected_at', { ascending: true });

    if (!signals || signals.length === 0) {
      return NextResponse.json({ trends: [], weeks: [] });
    }

    // Generate week labels for last 8 weeks
    const weeks: { start: Date; end: Date; label: string }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i * 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const month = start.toLocaleString('en-US', { month: 'short' });
      const day = start.getDate();
      weeks.push({ start, end, label: `${month} ${day}` });
    }

    // Group by competitor, then bucket into weeks
    const competitorMap = new Map<string, { name: string; weeklyTotals: number[]; weeklyStrategic: number[] }>();

    for (const signal of signals) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const comp = signal.competitor as any;
      const name: string = (Array.isArray(comp) ? comp[0]?.name : comp?.name) || 'Unknown';
      const compId = signal.competitor_id;

      if (!competitorMap.has(compId)) {
        competitorMap.set(compId, {
          name,
          weeklyTotals: new Array(8).fill(0),
          weeklyStrategic: new Array(8).fill(0),
        });
      }

      const entry = competitorMap.get(compId)!;
      const detectedDate = new Date(signal.detected_at);

      for (let i = 0; i < weeks.length; i++) {
        if (detectedDate >= weeks[i].start && detectedDate < weeks[i].end) {
          entry.weeklyTotals[i]++;
          if (signal.is_strategically_relevant) {
            entry.weeklyStrategic[i]++;
          }
          break;
        }
      }
    }

    // Compute velocity (week-over-week change) for each competitor
    const trends = Array.from(competitorMap.values()).map((comp) => {
      const current = comp.weeklyTotals[7] || 0;
      const previous = comp.weeklyTotals[6] || 0;
      const velocity = previous > 0
        ? Math.round(((current - previous) / previous) * 100)
        : current > 0
          ? 100
          : 0;

      return {
        name: comp.name,
        weeklyTotals: comp.weeklyTotals,
        weeklyStrategic: comp.weeklyStrategic,
        velocity,
        totalRecent: current,
      };
    });

    // Sort by most active
    trends.sort((a, b) => {
      const sumA = a.weeklyTotals.reduce((s, v) => s + v, 0);
      const sumB = b.weeklyTotals.reduce((s, v) => s + v, 0);
      return sumB - sumA;
    });

    return NextResponse.json({
      trends,
      weekLabels: weeks.map((w) => w.label),
    });
  } catch (error) {
    console.error('Signal trends error:', error);
    return NextResponse.json({ trends: [], weekLabels: [] });
  }
}
