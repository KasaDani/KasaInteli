'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addCompetitor(formData: FormData) {
  const supabase = await createClient();

  const name = formData.get('name') as string;
  const website = formData.get('website') as string;
  const careers_url = formData.get('careers_url') as string;
  const description = formData.get('description') as string;

  if (!name || !website) {
    return { error: 'Name and website are required' };
  }

  const { error } = await supabase.from('competitors').insert({
    name,
    website,
    careers_url: careers_url || null,
    description: description || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/competitors');
  return { success: true };
}

export async function removeCompetitor(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from('competitors').delete().eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/competitors');
  return { success: true };
}

export async function toggleCompetitor(id: string, isActive: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('competitors')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/competitors');
  return { success: true };
}
