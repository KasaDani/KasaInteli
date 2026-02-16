import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getPatternInsights } from '@/lib/patterns';
import { sendCriticalPatternSlackAlert } from '@/lib/slack';
import { sendCriticalPatternEmail } from '@/lib/email';
import { getDigestProfiles } from '@/lib/digest-profiles';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();
    const insights = await getPatternInsights(supabase);
    const criticalPatterns = insights.patterns.filter((pattern) => pattern.priority === 'critical');

    if (criticalPatterns.length === 0) {
      return NextResponse.json({ sent: false, reason: 'No critical patterns' });
    }

    const hashBasis = criticalPatterns
      .map((pattern) => `${pattern.signalType}:${pattern.latestDetectedAt}:${pattern.momentumScore}`)
      .join('|');
    const alertHash = createHash('sha256').update(hashBasis).digest('hex');

    const { data: existingAlert } = await supabase
      .from('digests')
      .select('id, sent_at')
      .eq('channel', 'critical_alert')
      .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .ilike('content', `%hash:${alertHash}%`)
      .maybeSingle();

    if (existingAlert) {
      return NextResponse.json({
        sent: false,
        reason: 'Duplicate alert suppressed (24h cooldown)',
      });
    }

    const title = `Critical Pattern Alert: ${criticalPatterns.length} strategic convergence signal${criticalPatterns.length > 1 ? 's' : ''}`;
    const lines = criticalPatterns.slice(0, 3).map((pattern) => {
      const competitors = pattern.competitorNames.slice(0, 3).join(', ');
      return `${pattern.label} (${pattern.momentumScore}) across ${pattern.competitorCount} competitors: ${competitors}.`;
    });

    const profiles = getDigestProfiles();
    let sentSlack = 0;
    let sentEmail = 0;

    for (const profile of profiles) {
      if (profile.deliveryChannels.includes('slack')) {
        const ok = await sendCriticalPatternSlackAlert(title, lines, {
          webhookUrl: profile.slackWebhookUrl,
        });
        if (ok) sentSlack += 1;
      }

      if (profile.deliveryChannels.includes('email')) {
        const ok = await sendCriticalPatternEmail(title, lines, {
          to: profile.email ? [profile.email] : [],
          subject: `Critical Pattern Alert — ${profile.name}`,
        });
        if (ok) sentEmail += 1;
      }
    }

    await supabase.from('digests').insert({
      content: `hash:${alertHash}\n${title}\n${lines.join('\n')}`,
      signals_included: criticalPatterns.map((pattern) => pattern.id),
      channel: 'critical_alert',
    });

    return NextResponse.json({
      sent: sentSlack > 0 || sentEmail > 0,
      sentSlack,
      sentEmail,
      criticalPatternCount: criticalPatterns.length,
    });
  } catch (error) {
    console.error('Critical pattern alerts error:', error);
    return NextResponse.json({ error: 'Critical pattern alert failed' }, { status: 500 });
  }
}

