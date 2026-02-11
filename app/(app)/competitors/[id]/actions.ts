'use server';

import { createClient } from '@/lib/supabase/server';
import { generateDossierAnalysis } from '@/lib/gemini';
import { revalidatePath } from 'next/cache';

export async function refreshDossier(competitorId: string) {
  const supabase = await createClient();

  // Get competitor info
  const { data: competitor } = await supabase
    .from('competitors')
    .select('*')
    .eq('id', competitorId)
    .single();

  if (!competitor) {
    return { error: 'Competitor not found' };
  }

  // Get all signals for this competitor
  const { data: signals } = await supabase
    .from('signals')
    .select('signal_type, title, summary, detected_at')
    .eq('competitor_id', competitorId)
    .order('detected_at', { ascending: false })
    .limit(50);

  try {
    const analysis = await generateDossierAnalysis(
      competitor.name,
      competitor.website,
      signals || []
    );

    // Upsert dossier (authenticated user has insert/update via RLS)
    const { error } = await supabase
      .from('dossiers')
      .upsert(
        {
          competitor_id: competitorId,
          footprint: analysis.footprint,
          operating_model: analysis.operating_model,
          strategic_positioning: analysis.strategic_positioning,
          swot: analysis.swot,
          recommendations: analysis.recommendations,
          raw_analysis: JSON.stringify(analysis),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'competitor_id' }
      );

    if (error) {
      console.error('Error upserting dossier:', error);
      return { error: error.message };
    }

    revalidatePath(`/competitors/${competitorId}`);
    return { success: true };
  } catch (err) {
    console.error('Dossier generation error:', err);
    return { error: 'Failed to generate dossier. Please try again.' };
  }
}
