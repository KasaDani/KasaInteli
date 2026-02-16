import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDigestProfiles } from '@/lib/digest-profiles';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profiles = getDigestProfiles().map((profile) => ({
    id: profile.id,
    name: profile.name,
    role: profile.role,
    focusAreas: profile.focusAreas,
    deliveryChannels: profile.deliveryChannels,
  }));

  return NextResponse.json({ profiles });
}

