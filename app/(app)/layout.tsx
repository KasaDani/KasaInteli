import { AppShell } from '@/components/app-shell';
import { PageTransition } from '@/components/motion/page-transition';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
