'use client';

import type { Signal } from '@/lib/types';
import { SignalCard } from '@/components/signal-card';
import { Activity } from 'lucide-react';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';

function groupSignalsByDate(signals: Signal[]): Map<string, Signal[]> {
  const groups = new Map<string, Signal[]>();

  for (const signal of signals) {
    const date = new Date(signal.detected_at);
    let label: string;

    if (isToday(date)) {
      label = 'Today';
    } else if (isYesterday(date)) {
      label = 'Yesterday';
    } else if (isThisWeek(date)) {
      label = format(date, 'EEEE');
    } else {
      label = format(date, 'MMMM d, yyyy');
    }

    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)!.push(signal);
  }

  return groups;
}

export function SignalFeed({ signals }: { signals: Signal[] }) {
  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Activity className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No signals detected yet</h3>
        <p className="text-muted-foreground mt-1 max-w-md">
          Signals will appear here as the system monitors your competitors. Make sure you have
          competitors added and the collection cron jobs are running.
        </p>
      </div>
    );
  }

  const grouped = groupSignalsByDate(signals);

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateLabel, dateSignals]) => (
        <div key={dateLabel}>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {dateLabel}
            </h3>
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">
              {dateSignals.length} signal{dateSignals.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-3">
            {dateSignals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
