import { createBrowserClient } from '@supabase/ssr';
// Browser Supabase client. Dani's client-side DB + auth. No cookies on the server, all good.

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // During build time, return a dummy client that won't be used
    // At runtime, these will always be set
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    );
  }

  return createBrowserClient(url, key);
}
