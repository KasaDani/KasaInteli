'use client';
// Preview the weekly digest before it hits inboxes. Dani proofreads at 3AM. This is how.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, FileText, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DigestPreviewPage() {
  const [sending, setSending] = useState(false);

  function openSampleInNewTab() {
    window.open('/api/digest/preview?sample=true', '_blank', 'noopener,noreferrer');
  }

  function openThisWeekInNewTab() {
    window.open('/api/digest/preview?sample=false', '_blank', 'noopener,noreferrer');
  }

  async function handleSendTest(useSample: boolean) {
    setSending(true);
    try {
      const res = await fetch('/api/digest/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useSample }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to send test email');
        return;
      }
      if (data.sent) {
        toast.success('Test email sent to configured address');
      } else {
        toast.error(data.error || 'Could not send (check RESEND_API_KEY and DIGEST_EMAIL_TO)');
      }
    } catch {
      toast.error('Failed to send test email');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Digest Preview</h1>
        <p className="text-muted-foreground mt-1">
          See how the weekly intelligence digest email looks. Open in a new tab to view the exact
          HTML sent to recipients.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={openSampleInNewTab} className="gap-2">
          <FileText className="h-4 w-4" />
          Open sample digest
        </Button>
        <Button variant="outline" onClick={openThisWeekInNewTab} className="gap-2">
          <Mail className="h-4 w-4" />
          Open this week&apos;s digest
        </Button>
      </div>

      <div className="border rounded-lg p-4 bg-muted/30">
        <h2 className="text-sm font-semibold mb-2">Send test email</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Send the digest to the configured recipient (DIGEST_EMAIL_TO) to check rendering in
          Gmail, Outlook, etc.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSendTest(true)}
            disabled={sending}
            className="gap-2"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send sample digest
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSendTest(false)}
            disabled={sending}
            className="gap-2"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send this week&apos;s digest
          </Button>
        </div>
      </div>
    </div>
  );
}
