'use client';

import type { Signal } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Globe, Newspaper, Building, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const signalTypeConfig = {
  hiring: { label: 'Hiring', icon: Briefcase, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  digital_footprint: { label: 'Digital', icon: Globe, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  news_press: { label: 'News', icon: Newspaper, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  asset_watch: { label: 'Asset', icon: Building, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
};

function RelevanceIndicator({ score }: { score: number }) {
  const color =
    score >= 8
      ? 'bg-red-500'
      : score >= 5
        ? 'bg-yellow-500'
        : 'bg-gray-300';

  return (
    <div className="flex items-center gap-1.5" title={`Relevance: ${score}/10`}>
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-muted-foreground">{score}/10</span>
    </div>
  );
}

export function SignalCard({ signal }: { signal: Signal }) {
  const config = signalTypeConfig[signal.signal_type];
  const Icon = config.icon;

  return (
    <Card className="transition-colors hover:bg-accent/30">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="mt-0.5 shrink-0">
            <div className={`p-2 rounded-lg ${config.color}`}>
              <Icon className="h-4 w-4" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-sm leading-tight">{signal.title}</h4>
              {signal.is_strategically_relevant && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  Strategic
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">{signal.summary}</p>

            <div className="flex items-center gap-3 pt-1">
              {signal.competitor && (
                <span className="text-xs font-medium text-muted-foreground">
                  {signal.competitor.name}
                </span>
              )}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {config.label}
              </Badge>
              <RelevanceIndicator score={signal.relevance_score} />
              <span className="text-xs text-muted-foreground">
                {format(new Date(signal.detected_at), 'MMM d, h:mm a')}
              </span>
              {signal.source_url && (
                <a
                  href={signal.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Source
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
