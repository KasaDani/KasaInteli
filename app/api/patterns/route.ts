import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPatternInsights } from '@/lib/patterns';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const insights = await getPatternInsights(supabase);
    return NextResponse.json(insights);
  } catch (error) {
    console.error('Pattern detection error:', error);
    return NextResponse.json(
      {
        strategicPressureIndex: 0,
        marketHeat: 0,
        parallelMoves: 0,
        patterns: [],
        recommendations: [],
        generated_at: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
