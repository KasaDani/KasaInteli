import { Resend } from 'resend';
// Weekly digest → Resend → inbox. Dani's words, your inbox. You're welcome.

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Sends the weekly intelligence digest via email using Resend.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendDigestEmail(
  htmlContent: string,
  options?: { to?: string[]; subject?: string }
): Promise<boolean> {
  if (!resend) {
    console.log('RESEND_API_KEY not configured, skipping email delivery');
    return false;
  }

  const recipients = options?.to?.filter(Boolean) || (process.env.DIGEST_EMAIL_TO || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  if (recipients.length === 0) {
    console.log('No email recipients configured, skipping email delivery');
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: 'Kasa Intelligence <digest@kasainteli.com>',
      to: recipients,
      subject:
        options?.subject ||
        `Weekly Intelligence Brief — ${new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}`,
      html: htmlContent,
    });

    if (error) {
      console.error('Resend email error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email delivery error:', error);
    return false;
  }
}

export async function sendCriticalPatternEmail(
  title: string,
  lines: string[],
  options?: { to?: string[]; subject?: string }
): Promise<boolean> {
  const html = `
  <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 680px; margin: 0 auto; padding: 24px;">
      <h2 style="margin: 0 0 12px; color: #991b1b;">${title}</h2>
      <p style="font-size: 14px; color: #374151;">A critical cross-competitor pattern was detected and may require immediate leadership attention.</p>
      <ul style="font-size: 14px; color: #111827; line-height: 1.6;">
        ${lines.map((line) => `<li>${line}</li>`).join('')}
      </ul>
      <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
        Open dashboard: <a href="${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'https://kasainteli.vercel.app/dashboard' : 'http://localhost:3000/dashboard'}">Kasa Intelligence Dashboard</a>
      </p>
    </body>
  </html>`;

  return sendDigestEmail(html, {
    to: options?.to,
    subject: options?.subject || `Critical Pattern Alert — ${new Date().toLocaleString()}`,
  });
}
