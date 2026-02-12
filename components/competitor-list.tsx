'use client';
// The list of companies Dani is watching. (Professionally. With dashboards and dossiers.)

import Link from 'next/link';
import type { Competitor } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { LottieState } from '@/components/motion/lottie-state';
import { StaggeredList } from '@/components/motion/staggered-list';
import {
  ExternalLink,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Building2,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { removeCompetitor, toggleCompetitor } from '@/app/(app)/competitors/actions';
import { toast } from 'sonner';

const ease = [0.21, 0.47, 0.32, 0.98] as const;

interface CompetitorWithCount extends Competitor {
  signal_count?: number;
}

export function CompetitorList({ competitors }: { competitors: CompetitorWithCount[] }) {
  if (competitors.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <LottieState name="empty-competitors" size={160} className="mb-4" />
            <h3 className="text-lg font-semibold">No competitors tracked yet</h3>
            <p className="text-muted-foreground mt-1">
              Add your first competitor to start collecting intelligence signals.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Remove ${name}? This will delete all associated signals and data.`)) return;
    const result = await removeCompetitor(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${name} removed`);
    }
  }

  async function handleToggle(id: string, currentActive: boolean) {
    const result = await toggleCompetitor(id, !currentActive);
    if (result.error) {
      toast.error(result.error);
    }
  }

  return (
    <AnimatePresence mode="popLayout">
      <StaggeredList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {competitors.map((competitor) => (
          <motion.div
            key={competitor.id}
            layout
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
          >
            <Card className={`h-full group transition-shadow duration-200 hover:shadow-md ${!competitor.is_active ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link href={`/competitors/${competitor.id}`}>
                      <CardTitle className="text-lg hover:underline cursor-pointer truncate">
                        {competitor.name}
                      </CardTitle>
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    {competitor.signal_count !== undefined && competitor.signal_count > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Activity className="h-3 w-3" />
                        {competitor.signal_count}
                      </Badge>
                    )}
                    <Badge variant={competitor.is_active ? 'default' : 'secondary'}>
                      {competitor.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {competitor.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {competitor.description}
                  </p>
                )}
                <div className="text-sm text-muted-foreground truncate">
                  <a
                    href={competitor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {competitor.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(competitor.id, competitor.is_active)}
                    className="text-xs"
                  >
                    {competitor.is_active ? (
                      <ToggleRight className="h-4 w-4 mr-1" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 mr-1" />
                    )}
                    {competitor.is_active ? 'Pause' : 'Resume'}
                  </Button>
                  <Link href={`/competitors/${competitor.id}`}>
                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                      View Dossier
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(competitor.id, competitor.name)}
                    className="text-destructive hover:text-destructive text-xs"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </StaggeredList>
    </AnimatePresence>
  );
}
