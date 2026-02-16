// Cron: weekly digest. Fetches signals, asks Gemini, sends Slack + email. Dani's weekly report, automated.
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateDigestContent } from '@/lib/gemini';
import { generatePersonalizedDigestContent } from '@/lib/gemini';
import { sendSlackMessage } from '@/lib/slack';
import { sendDigestEmail } from '@/lib/email';
import { getDigestProfiles } from '@/lib/digest-profiles';

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

    const profiles = getDigestProfiles();
    const deliveryResults: Array<{
      profileId: string;
      profileName: string;
      slackSent: boolean;
      emailSent: boolean;
    }> = [];

    for (const profile of profiles) {
      const digestContent = await generatePersonalizedDigestContent(formattedSignals, {
        name: profile.name,
        role: profile.role,
        focusAreas: profile.focusAreas,
        tone: profile.tone,
      });

      const slackSent = profile.deliveryChannels.includes('slack')
        ? await sendSlackMessage(digestContent.slack, { webhookUrl: profile.slackWebhookUrl })
        : false;

      const emailSent = profile.deliveryChannels.includes('email')
        ? await sendDigestEmail(digestContent.html, {
          to: profile.email ? [profile.email] : [],
          subject: `Weekly Intelligence Brief — ${profile.name}`,
        })
        : false;

      deliveryResults.push({
        profileId: profile.id,
        profileName: profile.name,
        slackSent,
        emailSent,
      });

      const channels: string[] = [];
      if (slackSent) channels.push('slack');
      if (emailSent) channels.push('email');

      await supabase.from('digests').insert({
        content: digestContent.slack,
        signals_included: signals.map((s) => s.id),
        channel: channels.join(',') || 'none',
      });
    }

    if (profiles.length === 0) {
      const digestContent = await generateDigestContent(formattedSignals);
      const slackSent = await sendSlackMessage(digestContent.slack);
      const emailSent = await sendDigestEmail(digestContent.html);
      await supabase.from('digests').insert({
        content: digestContent.slack,
        signals_included: signals.map((s) => s.id),
        channel: [slackSent ? 'slack' : '', emailSent ? 'email' : ''].filter(Boolean).join(',') || 'none',
      });
      deliveryResults.push({
        profileId: 'fallback',
        profileName: 'Executive Team',
        slackSent,
        emailSent,
      });
    }

    return NextResponse.json({
      success: true,
      deliveries: deliveryResults,
      signalCount: signals.length,
    });
  } catch (error) {
    console.error('Digest generation error:', error);
    return NextResponse.json(
      { error: 'Digest generation failed' },
      { status: 500 }
    );
  }
}
