'use client';

import Link from 'next/link';
import type { Competitor } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ExternalLink,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Building2,
} from 'lucide-react';
import { removeCompetitor, toggleCompetitor } from '@/app/(app)/competitors/actions';
import { toast } from 'sonner';

export function CompetitorList({ competitors }: { competitors: Competitor[] }) {
  if (competitors.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No competitors tracked yet</h3>
          <p className="text-muted-foreground mt-1">
            Add your first competitor to start collecting intelligence signals.
          </p>
        </CardContent>
      </Card>
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {competitors.map((competitor) => (
        <Card key={competitor.id} className={!competitor.is_active ? 'opacity-60' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <Link href={`/competitors/${competitor.id}`}>
                  <CardTitle className="text-lg hover:underline cursor-pointer truncate">
                    {competitor.name}
                  </CardTitle>
                </Link>
              </div>
              <Badge variant={competitor.is_active ? 'default' : 'secondary'}>
                {competitor.is_active ? 'Active' : 'Paused'}
              </Badge>
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
                <Button variant="ghost" size="sm" className="text-xs">
                  View Dossier
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
      ))}
    </div>
  );
}
