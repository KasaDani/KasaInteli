import { updateSession } from '@/lib/supabase/middleware';
import { type NextRequest } from 'next/server';
// Refresh auth session on every request. Dani stays logged in. As it should be.

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
