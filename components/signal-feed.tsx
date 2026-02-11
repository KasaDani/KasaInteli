'use client';

import { useState } from 'react';
import type { Signal, SignalType } from '@/lib/types';
import { SignalCard } from '@/components/signal-card';
import { Badge } from '@/components/ui/badge';
import { Activity, ChevronDown, ChevronRight, Briefcase, Globe, Newspaper, Building, Linkedin, MessageCircle, Video, Smartphone, Users, Flame, Zap, Clock } from 'lucide-react';
import { differenceInHours, differenceInDays } from 'date-fns';

const signalTypeConfig: Record<SignalType, { label: string; icon: React.ElementType }> = {
  hiring: { label: 'Hiring', icon: Briefcase },
  digital_footprint: { label: 'Digital', icon: Globe },
  news_press: { label: 'News & Press', icon: Newspaper },
  asset_watch: { label: 'Asset Watch', icon: Building },
  linkedin_post: { label: 'LinkedIn', icon: Linkedin },
  social_mention: { label: 'Social', icon: MessageCircle },
  media_appearance: { label: 'Media', icon: Video },
  app_update: { label: 'App Update', icon: Smartphone },
  employee_sentiment: { label: 'Sentiment', icon: Users },
};

interface SignalCluster {
  competitorName: string;
  signalType: SignalType;
  signals: Signal[];
}

type TimeBucket = 'urgent' | 'recent' | 'older';

function getTimeBucket(detectedAt: string): TimeBucket {
  const now = new Date();
  const date = new Date(detectedAt);
  const hoursAgo = differenceInHours(now, date);

  if (hoursAgo < 72) return 'urgent';
  if (differenceInDays(now, date) <= 7) return 'recent';
  return 'older';
}

const bucketConfig: Record<TimeBucket, {
  label: string;
  icon: React.ElementType;
  className: string;
  description: string;
}> = {
  urgent: {
    label: 'Last 72 Hours',
    icon: Flame,
    className: 'text-red-600 dark:text-red-400',
    description: 'High-priority signals requiring immediate attention',
  },
  recent: {
    label: 'Last 7 Days',
    icon: Zap,
    className: 'text-yellow-600 dark:text-yellow-400',
    description: 'Recent signals worth reviewing',
  },
  older: {
    label: 'Earlier',
    icon: Clock,
    className: 'text-muted-foreground',
    description: 'Historical signals from the past 90 days',
  },
};

/**
 * Groups signals by time bucket, then by competitor + signal type.
 */
function groupByTimeBucket(signals: Signal[]): Map<TimeBucket, SignalCluster[]> {
  const buckets = new Map<TimeBucket, Signal[]>([
    ['urgent', []],
    ['recent', []],
    ['older', []],
  ]);

  for (const signal of signals) {
    const bucket = getTimeBucket(signal.detected_at);
    buckets.get(bucket)!.push(signal);
  }

  const result = new Map<TimeBucket, SignalCluster[]>();

  for (const [bucket, bucketSignals] of buckets) {
    if (bucketSignals.length === 0) continue;

    const clusterMap = new Map<string, SignalCluster>();
    for (const signal of bucketSignals) {
      const competitorName = signal.competitor?.name || 'Unknown';
      const key = `${competitorName}-${signal.signal_type}`;
      if (!clusterMap.has(key)) {
        clusterMap.set(key, { competitorName, signalType: signal.signal_type, signals: [] });
      }
      clusterMap.get(key)!.signals.push(signal);
    }

    // Sort: highest relevance first, then most signals
    const clusters = Array.from(clusterMap.values()).sort((a, b) => {
      const maxA = Math.max(...a.signals.map((s) => s.relevance_score));
      const maxB = Math.max(...b.signals.map((s) => s.relevance_score));
      if (maxA !== maxB) return maxB - maxA;
      return b.signals.length - a.signals.length;
    });

    result.set(bucket as TimeBucket, clusters);
  }

  return result;
}

function ClusterHeader({ cluster }: { cluster: SignalCluster }) {
  const config = signalTypeConfig[cluster.signalType];
  const Icon = config.icon;
  const count = cluster.signals.length;
  const maxScore = Math.max(...cluster.signals.map((s) => s.relevance_score));

  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium text-sm">{cluster.competitorName}</span>
      <span className="text-muted-foreground text-sm">—</span>
      <span className="text-sm text-muted-foreground">
        {count} {config.label.toLowerCase()} signal{count !== 1 ? 's' : ''}
      </span>
      {maxScore >= 8 && (
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
          High Priority
        </Badge>
      )}
    </div>
  );
}

function SignalClusterView({ cluster, highlightIds }: { cluster: SignalCluster; highlightIds?: Set<string> }) {
  const [expanded, setExpanded] = useState(cluster.signals.length <= 3);

  if (cluster.signals.length === 1) {
    return <SignalCard signal={cluster.signals[0]} highlight={highlightIds?.has(cluster.signals[0].id)} />;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <ClusterHeader cluster={cluster} />
      </button>

      {expanded && (
        <div className="border-t space-y-0">
          {cluster.signals.map((signal) => (
            <div key={signal.id} className="border-b last:border-b-0">
              <SignalCard signal={signal} highlight={highlightIds?.has(signal.id)} />
            </div>
          ))}
        </div>
      )}

      {!expanded && (
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground">
            {cluster.signals
              .slice(0, 3)
              .map((s) => s.title)
              .join(' · ')}
            {cluster.signals.length > 3 && ` · +${cluster.signals.length - 3} more`}
          </p>
        </div>
      )}
    </div>
  );
}

export function SignalFeed({ signals, highlightIds }: { signals: Signal[]; highlightIds?: Set<string> }) {
  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Activity className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No signals detected yet</h3>
        <p className="text-muted-foreground mt-1 max-w-md">
          Signals will appear here as the system monitors your competitors.
          Add a competitor to trigger an initial intelligence scan.
        </p>
      </div>
    );
  }

  const grouped = groupByTimeBucket(signals);
  const bucketOrder: TimeBucket[] = ['urgent', 'recent', 'older'];

  return (
    <div className="space-y-8">
      {bucketOrder.map((bucket) => {
        const clusters = grouped.get(bucket);
        if (!clusters || clusters.length === 0) return null;

        const config = bucketConfig[bucket];
        const BucketIcon = config.icon;
        const totalSignals = clusters.reduce((sum, c) => sum + c.signals.length, 0);

        return (
          <div key={bucket}>
            {/* Bucket Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex items-center gap-2 ${config.className}`}>
                <BucketIcon className="h-4 w-4" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  {config.label}
                </h3>
              </div>
              <div className="flex-1 h-px bg-border" />
              <Badge variant="outline" className="text-xs">
                {totalSignals} signal{totalSignals !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Clusters */}
            <div className="space-y-3">
              {clusters.map((cluster) => (
                <SignalClusterView
                  key={`${cluster.competitorName}-${cluster.signalType}`}
                  cluster={cluster}
                  highlightIds={highlightIds}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
