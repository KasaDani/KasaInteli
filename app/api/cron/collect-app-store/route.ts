import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { collectAppStoreSignals } from '@/lib/collectors/app-store';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    const { data: competitors } = await supabase
      .from('competitors')
      .select('id, name, app_store_url')
      .eq('is_active', true);

    if (!competitors || competitors.length === 0) {
      return NextResponse.json({ message: 'No active competitors' });
    }

    const results = [];
    for (const competitor of competitors) {
      if (!competitor.app_store_url) {
        results.push({ competitor: competitor.name, skipped: 'no app_store_url configured' });
        continue;
      }

      const signals = await collectAppStoreSignals(
        competitor.id,
        competitor.name,
        competitor.app_store_url
      );
      results.push({ competitor: competitor.name, newSignals: signals.length });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('App Store collection error:', error);
    return NextResponse.json(
      { error: 'Collection failed' },
      { status: 500 }
    );
  }
}
