export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { StatsCards } from '@/components/stats-cards';
import { SignalFeed } from '@/components/signal-feed';
import { SignalFilters } from '@/components/signal-filters';
import type { Signal, Competitor } from '@/lib/types';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; competitor?: string; relevant?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Fetch competitors for filter dropdown
  const { data: competitors } = await supabase
    .from('competitors')
    .select('*')
    .eq('is_active', true)
    .order('name');

  // Build signal query
  let query = supabase
    .from('signals')
    .select('*, competitor:competitors(*)')
    .order('detected_at', { ascending: false })
    .limit(100);

  if (params.type) {
    query = query.eq('signal_type', params.type);
  }
  if (params.competitor) {
    query = query.eq('competitor_id', params.competitor);
  }
  if (params.relevant !== 'all') {
    query = query.eq('is_strategically_relevant', true);
  }

  const { data: signals } = await query;

  // Stats
  const { count: totalSignals } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true });

  const { count: relevantSignals } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('is_strategically_relevant', true);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { count: weeklySignals } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .gte('detected_at', oneWeekAgo.toISOString());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Intelligence Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Real-time competitive signals for the hospitality tech landscape.
        </p>
      </div>

      <StatsCards
        totalSignals={totalSignals || 0}
        relevantSignals={relevantSignals || 0}
        weeklySignals={weeklySignals || 0}
        competitorCount={(competitors || []).length}
      />

      <SignalFilters
        competitors={(competitors as Competitor[]) || []}
        currentType={params.type}
        currentCompetitor={params.competitor}
        showAll={params.relevant === 'all'}
      />

      <SignalFeed signals={(signals as Signal[]) || []} />
    </div>
  );
}
