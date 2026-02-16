// POST to send a test digest to DIGEST_EMAIL_TO. Dani tests at 3AM. Inbox delivery, guaranteed.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildDigestEmailHtml, generateDigestContent } from '@/lib/gemini';
import { generatePersonalizedDigestContent } from '@/lib/gemini';
import { getSampleDigestSlack } from '@/lib/digest-sample';
import { sendDigestEmail } from '@/lib/email';
import { getProfileById } from '@/lib/digest-profiles';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let useSample = true;
  let profileId: string | null = null;
  try {
    const body = await request.json();
    if (typeof body.useSample === 'boolean') useSample = body.useSample;
    if (typeof body.profileId === 'string') profileId = body.profileId;
  } catch {
    // no body or invalid JSON: keep default
  }

  try {
    const profile = getProfileById(profileId);
    let html: string;

    if (useSample) {
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

      const digestContent = profile
        ? await generatePersonalizedDigestContent(formattedSignals, {
          name: profile.name,
          role: profile.role,
          focusAreas: profile.focusAreas,
          tone: profile.tone,
        })
        : await generateDigestContent(formattedSignals);
      html = digestContent.html;
    }

    const sent = await sendDigestEmail(html, {
      to: profile?.email ? [profile.email] : [],
      subject: profile
        ? `Weekly Intelligence Brief — ${profile.name}`
        : undefined,
    });

    if (sent) {
      return NextResponse.json({ sent: true });
    }
    return NextResponse.json({
      sent: false,
      error: 'Email not sent. Check RESEND_API_KEY and DIGEST_EMAIL_TO.',
    });
  } catch (error) {
    console.error('Send test email error:', error);
    return NextResponse.json(
      { sent: false, error: 'Digest send failed' },
      { status: 500 }
    );
  }
}
