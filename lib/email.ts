import { Resend } from 'resend';
// Weekly digest → Resend → inbox. Dani's words, your inbox. You're welcome.

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Sends the weekly intelligence digest via email using Resend.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendDigestEmail(htmlContent: string): Promise<boolean> {
  if (!resend) {
    console.log('RESEND_API_KEY not configured, skipping email delivery');
    return false;
  }

  const toAddresses = process.env.DIGEST_EMAIL_TO;
  if (!toAddresses) {
    console.log('DIGEST_EMAIL_TO not configured, skipping email delivery');
    return false;
  }

  const recipients = toAddresses.split(',').map((e) => e.trim()).filter(Boolean);
  if (recipients.length === 0) {
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: 'Kasa Intelligence <digest@kasainteli.com>',
      to: recipients,
      subject: `Weekly Intelligence Brief — ${new Date().toLocaleDateString('en-US', {
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
