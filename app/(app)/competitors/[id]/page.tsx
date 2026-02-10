export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { DossierView } from '@/components/dossier-view';
import { SignalFeed } from '@/components/signal-feed';
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

  const { data: signals } = await supabase
    .from('signals')
    .select('*, competitor:competitors(*)')
    .eq('competitor_id', id)
    .order('detected_at', { ascending: false })
    .limit(50);

  const { count: totalSignals } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('competitor_id', id);

  const { count: relevantSignals } = await supabase
    .from('signals')
    .select('*', { count: 'exact', head: true })
    .eq('competitor_id', id)
    .eq('is_strategically_relevant', true);

  return (
    <div className="space-y-8">
      <DossierView
        competitor={competitor as Competitor}
        dossier={(dossier as Dossier) || null}
        totalSignals={totalSignals || 0}
        relevantSignals={relevantSignals || 0}
      />

      <div>
        <h2 className="text-xl font-bold mb-4">Signal Timeline</h2>
        <SignalFeed signals={(signals as Signal[]) || []} />
      </div>
    </div>
  );
}
