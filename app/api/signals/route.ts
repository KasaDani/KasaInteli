import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const type = searchParams.get('type');
  const competitorId = searchParams.get('competitor_id');
  const relevant = searchParams.get('relevant');
  const limit = parseInt(searchParams.get('limit') || '50');

  let query = supabase
    .from('signals')
    .select('*, competitor:competitors(id, name)')
    .order('detected_at', { ascending: false })
    .limit(limit);

  if (type) query = query.eq('signal_type', type);
  if (competitorId) query = query.eq('competitor_id', competitorId);
  if (relevant !== 'all') query = query.eq('is_strategically_relevant', true);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
