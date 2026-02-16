// Post digest to Slack. Dani's brief, Slack's channel. Team stays in the loop.
export async function sendSlackMessage(
  content: string,
  options?: { webhookUrl?: string }
): Promise<boolean> {
  const webhookUrl = options?.webhookUrl || process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('SLACK_WEBHOOK_URL not configured');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: content,
        unfurl_links: false,
        unfurl_media: false,
      }),
    });

    if (!response.ok) {
      console.error('Slack webhook failed:', response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Slack webhook error:', error);
    return false;
  }
}

export async function sendCriticalPatternSlackAlert(
  alertTitle: string,
  lines: string[],
  options?: { webhookUrl?: string }
): Promise<boolean> {
  const content = [
    `*${alertTitle}*`,
    ...lines.map((line) => `• ${line}`),
    `\nView dashboard: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'https://kasainteli.vercel.app/dashboard' : 'http://localhost:3000/dashboard'}`,
  ].join('\n');

  return sendSlackMessage(content, options);
}
