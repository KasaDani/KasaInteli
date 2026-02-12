// GET digest HTML for preview (sample or live). Dani checks the email before sending. Smart.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildDigestEmailHtml } from '@/lib/gemini';
import { generateDigestContent } from '@/lib/gemini';
import { getSampleDigestSlack } from '@/lib/digest-sample';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sample = searchParams.get('sample') === 'true';

  try {
    let html: string;

    if (sample) {
      html = buildDigestEmailHtml(getSampleDigestSlack());
    } else {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data: signals } = await supabase
        .from('signals')
        .select('*, competitor:competitors(name)')
        .eq('is_strategically_relevant', true)
        .gte('detected_at', oneWeekAgo.toISOString())
        .order('relevance_score', { ascending: false });

      const formattedSignals = (signals || []).map((s) => ({
        competitor_name: (s.competitor as { name: string })?.name || 'Unknown',
        signal_type: s.signal_type,
        title: s.title,
        summary: s.summary,
        detected_at: s.detected_at,
        relevance_score: s.relevance_score,
      }));

      const digestContent = await generateDigestContent(formattedSignals);
      html = digestContent.html;
    }

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Digest preview error:', error);
    return NextResponse.json(
      { error: 'Digest preview failed' },
      { status: 500 }
    );
  }
}
