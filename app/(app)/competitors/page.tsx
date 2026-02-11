export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { CompetitorList } from '@/components/competitor-list';
import { AddCompetitorDialog } from '@/components/add-competitor-dialog';
import type { Competitor } from '@/lib/types';

export default async function CompetitorsPage() {
  const supabase = await createClient();

  const { data: competitors } = await supabase
    .from('competitors')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch signal counts per competitor
  const competitorsWithCounts = await Promise.all(
    (competitors || []).map(async (comp) => {
      const { count } = await supabase
        .from('signals')
        .select('*', { count: 'exact', head: true })
        .eq('competitor_id', comp.id);
      return { ...comp, signal_count: count || 0 };
    })
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Competitors</h1>
          <p className="text-muted-foreground mt-1">
            Manage the companies you&apos;re tracking for competitive intelligence.
          </p>
        </div>
        <AddCompetitorDialog />
      </div>

      <CompetitorList competitors={(competitorsWithCounts as (Competitor & { signal_count: number })[]) || []} />
    </div>
  );
}
