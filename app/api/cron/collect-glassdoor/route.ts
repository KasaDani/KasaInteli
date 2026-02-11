import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { collectGlassdoorSignals } from '@/lib/collectors/glassdoor';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    const { data: competitors } = await supabase
      .from('competitors')
      .select('id, name, glassdoor_url')
      .eq('is_active', true);

    if (!competitors || competitors.length === 0) {
      return NextResponse.json({ message: 'No active competitors' });
    }

    const results = [];
    for (const competitor of competitors) {
      if (!competitor.glassdoor_url) {
        results.push({ competitor: competitor.name, skipped: 'no glassdoor_url configured' });
        continue;
      }

      const signals = await collectGlassdoorSignals(
        competitor.id,
        competitor.name,
        competitor.glassdoor_url
      );
      results.push({ competitor: competitor.name, newSignals: signals.length });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Glassdoor collection error:', error);
    return NextResponse.json(
      { error: 'Collection failed' },
      { status: 500 }
    );
  }
}
