// GET dossier by competitor id. Full SWOT, recommendations, etc. Dani's deep-dive API.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('dossiers')
    .select('*, competitor:competitors(*)')
    .eq('competitor_id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Dossier not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
