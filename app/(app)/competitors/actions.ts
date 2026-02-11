'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addCompetitor(formData: FormData) {
  const supabase = await createClient();

  const name = formData.get('name') as string;
  const website = formData.get('website') as string;
  const careers_url = formData.get('careers_url') as string;
  const listings_url = formData.get('listings_url') as string;
  const linkedin_slug = formData.get('linkedin_slug') as string;
  const app_store_url = formData.get('app_store_url') as string;
  const glassdoor_url = formData.get('glassdoor_url') as string;
  const description = formData.get('description') as string;

  if (!name || !website) {
    return { error: 'Name and website are required' };
  }

  // Try inserting with all fields first (requires migration 003)
  const fullRecord: Record<string, string | null> = {
    name,
    website,
    careers_url: careers_url || null,
    listings_url: listings_url || null,
    linkedin_slug: linkedin_slug || null,
    app_store_url: app_store_url || null,
    glassdoor_url: glassdoor_url || null,
    description: description || null,
  };

  const { data: inserted, error } = await supabase
    .from('competitors')
    .insert(fullRecord)
    .select('id')
    .single();

  if (error) {
    // If error is about missing columns, retry with only the base columns
    const isSchemaError =
      error.message.includes('schema cache') ||
      error.message.includes('column') ||
      error.code === '42703'; // undefined_column

    if (isSchemaError) {
      console.warn('New columns not yet in schema — inserting with base fields only');
      const { data: fallbackInserted, error: fallbackError } = await supabase
        .from('competitors')
        .insert({
          name,
          website,
          careers_url: careers_url || null,
          listings_url: listings_url || null,
          description: description || null,
        })
        .select('id')
        .single();

      if (fallbackError) {
        return { error: fallbackError.message };
      }

      revalidatePath('/competitors');
      return { success: true, competitorId: fallbackInserted?.id };
    }

    return { error: error.message };
  }

  revalidatePath('/competitors');
  return { success: true, competitorId: inserted?.id };
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
