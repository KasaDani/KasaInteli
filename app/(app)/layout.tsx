// App shell + page transitions. Dani's inner layout. Shell on the outside, smooth on the inside.
import { AppShell } from '@/components/app-shell';
import { PageTransition } from '@/components/motion/page-transition';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
