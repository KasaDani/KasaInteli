'use client';
// Shimmer skeleton. Better than a spinner. Dani picked this at 2:47AM. No regrets.

import { cn } from '@/lib/utils';

interface ShimmerSkeletonProps {
  className?: string;
  lines?: number;
}

export function ShimmerSkeleton({ className, lines = 3 }: ShimmerSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-md bg-muted relative overflow-hidden"
          style={{ width: `${100 - i * 15}%` }}
        >
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
        </div>
      ))}
    </div>
  );
}
