import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { collectInitialSignals } from '@/lib/collectors/initial-collect';
import { generateDossierAnalysis } from '@/lib/gemini';

export const maxDuration = 60; // Allow up to 60s for initial collection

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Verify the user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { competitorId } = body;

  if (!competitorId) {
    return NextResponse.json({ error: 'competitorId is required' }, { status: 400 });
  }

  // Get competitor details
  const { data: competitor, error: compError } = await supabase
    .from('competitors')
    .select('*')
    .eq('id', competitorId)
    .single();

  if (compError || !competitor) {
    return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
  }

  try {
    // ── Phase 1: Collect signals from all available sources (90-day lookback) ──
    console.log(`[Initial Collection] Starting for ${competitor.name}...`);

    const collectionResult = await collectInitialSignals(
      supabase,
      competitorId,
      competitor.name,
      90 // 90 days lookback
    );

    console.log(
      `[Initial Collection] ${competitor.name}: ${collectionResult.totalInserted} signals (${collectionResult.newsCount} news, ${collectionResult.jobsCount} jobs)`
    );

    if (collectionResult.errors.length > 0) {
      console.warn('[Initial Collection] Errors:', collectionResult.errors);
    }

    // ── Phase 2: Generate AI dossier ──
    console.log(`[Initial Collection] Generating dossier for ${competitor.name}...`);

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

      // Upsert dossier with all 7 intelligence category analyses
      await supabase
        .from('dossiers')
        .upsert(
          {
            competitor_id: competitorId,
            footprint: analysis.footprint,
            operating_model: analysis.operating_model,
            strategic_positioning: analysis.strategic_positioning,
            swot: analysis.swot,
            recommendations: analysis.recommendations,
            revenue_pricing: analysis.revenue_pricing || null,
            technology_experience: analysis.technology_experience || null,
            customer_sentiment: analysis.customer_sentiment || null,
            financial_health: analysis.financial_health || null,
            macro_positioning: analysis.macro_positioning || null,
            raw_analysis: JSON.stringify(analysis),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'competitor_id' }
        );

      console.log(`[Initial Collection] Dossier generated for ${competitor.name}`);
    } catch (dossierErr) {
      console.error('[Initial Collection] Dossier generation failed:', dossierErr);
      // Non-fatal — signals were still collected
    }

    return NextResponse.json({
      success: true,
      ...collectionResult,
    });
  } catch (error) {
    console.error('[Initial Collection] Fatal error:', error);
    return NextResponse.json(
      { error: 'Collection failed. Signals will be collected by scheduled jobs.' },
      { status: 500 }
    );
  }
}
