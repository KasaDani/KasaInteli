import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { collectSocialSignals } from '@/lib/collectors/social';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    const { data: competitors } = await supabase
      .from('competitors')
      .select('id, name')
      .eq('is_active', true);

    if (!competitors || competitors.length === 0) {
      return NextResponse.json({ message: 'No active competitors' });
    }

    const results = [];
    for (const competitor of competitors) {
      const signals = await collectSocialSignals(competitor.id, competitor.name);
      results.push({ competitor: competitor.name, newSignals: signals.length });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Social collection error:', error);
    return NextResponse.json(
      { error: 'Collection failed' },
      { status: 500 }
    );
  }
}
