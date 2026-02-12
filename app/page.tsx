import { redirect } from 'next/navigation';
// Root: redirect to dashboard. Dani said "don't make them think." So we don't.

export default function Home() {
  redirect('/dashboard');
}
