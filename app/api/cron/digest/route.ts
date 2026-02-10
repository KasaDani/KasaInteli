import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateDigestContent } from '@/lib/gemini';
import { sendSlackMessage } from '@/lib/slack';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    // Get signals from the last 7 days that are strategically relevant
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: signals } = await supabase
      .from('signals')
      .select('*, competitor:competitors(name)')
      .eq('is_strategically_relevant', true)
      .gte('detected_at', oneWeekAgo.toISOString())
      .order('relevance_score', { ascending: false });

    if (!signals || signals.length === 0) {
      return NextResponse.json({ message: 'No strategic signals this week' });
    }

    // Format signals for digest
    const formattedSignals = signals.map((s) => ({
      competitor_name: (s.competitor as { name: string })?.name || 'Unknown',
      signal_type: s.signal_type,
      title: s.title,
      summary: s.summary,
      detected_at: s.detected_at,
      relevance_score: s.relevance_score,
    }));

    // Generate digest using Gemini
    const digestContent = await generateDigestContent(formattedSignals);

    // Send to Slack
    const sent = await sendSlackMessage(digestContent);

    // Store digest record
    await supabase.from('digests').insert({
      content: digestContent,
      signals_included: signals.map((s) => s.id),
      channel: 'slack',
    });

    return NextResponse.json({
      success: true,
      sent,
      signalCount: signals.length,
      preview: digestContent.slice(0, 200),
    });
  } catch (error) {
    console.error('Digest generation error:', error);
    return NextResponse.json(
      { error: 'Digest generation failed' },
      { status: 500 }
    );
  }
}
