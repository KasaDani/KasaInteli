export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { DossierView } from '@/components/dossier-view';
import { RealtimeSignalProvider } from '@/components/realtime-signal-provider';
import { AnimatedSection } from '@/components/motion/animated-section';
import type { Competitor, Signal, Dossier } from '@/lib/types';

export default async function CompetitorDossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: competitor } = await supabase
    .from('competitors')
    .select('*')
    .eq('id', id)
    .single();

  if (!competitor) notFound();

  const { data: dossier } = await supabase
    .from('dossiers')
    .select('*')
    .eq('competitor_id', id)
    .maybeSingle();

  // Fetch 90 days of signals
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: signals } = await supabase
    .from('signals')
    .select('*, competitor:competitors(*)')
    .eq('competitor_id', id)
    .gte('detected_at', ninetyDaysAgo.toISOString())
    .order('detected_at', { ascending: false })
    .limit(200);

  const { count: totalSignals } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('competitor_id', id);

  const { count: relevantSignals } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('competitor_id', id)
    .eq('is_strategically_relevant', true);

  const seventyTwoHoursAgo = new Date();
  seventyTwoHoursAgo.setHours(seventyTwoHoursAgo.getHours() - 72);

  const { count: urgentSignals } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('competitor_id', id)
    .gte('detected_at', seventyTwoHoursAgo.toISOString());

  return (
    <div className="space-y-8">
      <AnimatedSection>
        <DossierView
          competitor={competitor as Competitor}
          dossier={(dossier as Dossier) || null}
          totalSignals={totalSignals || 0}
          relevantSignals={relevantSignals || 0}
          urgentSignals={urgentSignals || 0}
        />
      </AnimatedSection>

      <AnimatedSection delay={0.15}>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Signal Timeline</h2>
            <span className="text-sm text-muted-foreground">
              Last 90 days · {(signals || []).length} signals
            </span>
          </div>
          <RealtimeSignalProvider initialSignals={(signals as Signal[]) || []} />
        </div>
      </AnimatedSection>
    </div>
  );
}
