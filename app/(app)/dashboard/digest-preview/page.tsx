'use client';
// Preview the weekly digest before it hits inboxes. Dani proofreads at 3AM. This is how.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, FileText, Send, Loader2, Presentation, FileDown } from 'lucide-react';
import { toast } from 'sonner';

interface DigestProfile {
  id: string;
  name: string;
  role: string;
}

export default function DigestPreviewPage() {
  const [sending, setSending] = useState(false);
  const [profiles, setProfiles] = useState<DigestProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');

  useEffect(() => {
    fetch('/api/digest/profiles')
      .then((res) => res.json())
      .then((data) => {
        const loaded = (data.profiles || []) as DigestProfile[];
        setProfiles(loaded);
        if (loaded[0]?.id) setSelectedProfile(loaded[0].id);
      })
      .catch(() => {
        setProfiles([]);
      });
  }, []);

  function withProfile(basePath: string): string {
    if (!selectedProfile) return basePath;
    const delimiter = basePath.includes('?') ? '&' : '?';
    return `${basePath}${delimiter}profile=${encodeURIComponent(selectedProfile)}`;
  }

  function openSampleInNewTab() {
    window.open(withProfile('/api/digest/preview?sample=true'), '_blank', 'noopener,noreferrer');
  }

  function openThisWeekInNewTab() {
    window.open(withProfile('/api/digest/preview?sample=false'), '_blank', 'noopener,noreferrer');
  }

  function openBoardBriefingPdf() {
    window.open(withProfile('/api/briefing/export?format=pdf'), '_blank', 'noopener,noreferrer');
  }

  function downloadBoardBriefingPptOutline() {
    window.open(withProfile('/api/briefing/export?format=ppt'), '_blank', 'noopener,noreferrer');
  }

  async function handleSendTest(useSample: boolean) {
    setSending(true);
    try {
      const res = await fetch('/api/digest/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useSample, profileId: selectedProfile || undefined }),
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
        <div className="w-full max-w-sm">
          <label className="text-xs text-muted-foreground">Executive Profile</label>
          <select
            className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm"
            value={selectedProfile}
            onChange={(e) => setSelectedProfile(e.target.value)}
          >
            {profiles.length === 0 ? (
              <option value="">Default executive audience</option>
            ) : (
              profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} ({profile.role})
                </option>
              ))
            )}
          </select>
        </div>
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
        <Button variant="outline" onClick={openBoardBriefingPdf} className="gap-2">
          <FileDown className="h-4 w-4" />
          Open board briefing (PDF-ready)
        </Button>
        <Button variant="outline" onClick={downloadBoardBriefingPptOutline} className="gap-2">
          <Presentation className="h-4 w-4" />
          Download PowerPoint outline
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
