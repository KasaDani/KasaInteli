import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPatternInsights } from '@/lib/patterns';
import { buildBoardBriefingHtml, buildBoardBriefingMarkdown } from '@/lib/board-briefing';
import { getProfileById } from '@/lib/digest-profiles';

function readCompetitorName(
  competitor: { name?: string } | { name?: string }[] | null
): string {
  if (Array.isArray(competitor)) return competitor[0]?.name || 'Unknown';
  return competitor?.name || 'Unknown';
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf';
    const profileId = searchParams.get('profile');
    const profile = getProfileById(profileId);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const { data: signals } = await supabase
      .from('signals')
      .select('signal_type, title, summary, relevance_score, competitor:competitors(name)')
      .eq('is_strategically_relevant', true)
      .gte('detected_at', twoWeeksAgo.toISOString())
      .order('relevance_score', { ascending: false })
      .limit(80);

    const formattedSignals = (signals || []).map((signal) => ({
      competitor_name: readCompetitorName(
        signal.competitor as { name?: string } | { name?: string }[] | null
      ),
      signal_type: signal.signal_type,
      title: signal.title,
      summary: signal.summary,
      relevance_score: signal.relevance_score,
    }));

    const insights = await getPatternInsights(supabase);
    const generatedAt = new Date().toISOString();
    const profileLabel = profile ? `${profile.name} (${profile.role})` : 'Executive Team';

    if (format === 'ppt') {
      const markdown = buildBoardBriefingMarkdown({
        generatedAt,
        profileLabel,
        signals: formattedSignals,
        insights,
      });
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="board-briefing-${new Date().toISOString().slice(0, 10)}.md"`,
        },
      });
    }

    const html = buildBoardBriefingHtml({
      generatedAt,
      profileLabel,
      signals: formattedSignals,
      insights,
    });

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="board-briefing-${new Date().toISOString().slice(0, 10)}.html"`,
      },
    });
  } catch (error) {
    console.error('Board briefing export error:', error);
    return NextResponse.json({ error: 'Failed to export board briefing' }, { status: 500 });
  }
}

