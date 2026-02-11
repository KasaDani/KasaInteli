import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { collectSECFilingSignals } from '@/lib/collectors/sec-filings';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    // Only fetch competitors that have a SEC CIK configured
    const { data: competitors } = await supabase
      .from('competitors')
      .select('id, name, sec_cik')
      .eq('is_active', true)
      .not('sec_cik', 'is', null);

    if (!competitors || competitors.length === 0) {
      return NextResponse.json({ message: 'No competitors with SEC CIK configured' });
    }

    const results = [];
    for (const competitor of competitors) {
      const signals = await collectSECFilingSignals(
        competitor.id,
        competitor.name,
        competitor.sec_cik
      );
      results.push({ competitor: competitor.name, newSignals: signals.length });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('SEC filing collection error:', error);
    return NextResponse.json({ error: 'Collection failed' }, { status: 500 });
  }
}
