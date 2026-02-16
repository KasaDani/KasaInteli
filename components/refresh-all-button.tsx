'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface CompetitorEntry {
  id: string;
  name: string;
}

interface CollectResult {
  success?: boolean;
  totalInserted?: number;
  newsCount?: number;
  jobsCount?: number;
  error?: string;
}

export function RefreshAllButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');

  async function refreshCompetitor(competitor: CompetitorEntry): Promise<CollectResult> {
    try {
      const res = await fetch('/api/collect-initial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitorId: competitor.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { success: false, error: body.error || `HTTP ${res.status}` };
      }
      return await res.json();
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error',
      };
    }
  }

  async function refreshDashboardSections() {
    const endpoints = [
      '/api/executive-summary',
      '/api/patterns',
      '/api/signal-trends',
    ];
    await Promise.allSettled(endpoints.map((url) => fetch(url)));
  }

  async function handleRefreshAll() {
    setLoading(true);
    setProgress('Loading competitors...');

    try {
      const listRes = await fetch('/api/refresh-all');
      if (!listRes.ok) {
        toast.error('Could not load competitor list');
        return;
      }
      const { competitors } = (await listRes.json()) as {
        competitors: CompetitorEntry[];
      };

      if (!competitors || competitors.length === 0) {
        toast.info('No active competitors to refresh');
        return;
      }

      let totalSignals = 0;
      let succeeded = 0;
      let failed = 0;

      for (let i = 0; i < competitors.length; i++) {
        const comp = competitors[i];
        setProgress(`Refreshing ${comp.name} (${i + 1}/${competitors.length})...`);

        const result = await refreshCompetitor(comp);

        if (result.success) {
          succeeded++;
          totalSignals += result.totalInserted || 0;
        } else {
          failed++;
          console.warn(`[Refresh] ${comp.name} failed:`, result.error);
        }
      }

      setProgress('Updating dashboard...');
      await refreshDashboardSections();

      if (failed === 0) {
        toast.success(
          `Refresh complete: ${totalSignals} new signals across ${succeeded} competitors`
        );
      } else if (succeeded > 0) {
        toast.warning(
          `Refresh done: ${totalSignals} signals from ${succeeded} competitors (${failed} had issues)`
        );
      } else {
        toast.error('All competitor refreshes failed. Check API keys and network.');
      }

      router.refresh();
    } catch {
      toast.error('Refresh failed — check your connection');
    } finally {
      setLoading(false);
      setProgress('');
    }
  }

  return (
    <Button
      onClick={handleRefreshAll}
      disabled={loading}
      variant="outline"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? progress || 'Refreshing...' : 'Refresh All Intelligence'}
    </Button>
  );
}
