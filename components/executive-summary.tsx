'use client';
// Dani should be Director of AI Things. This briefing is their audition tape.

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { LottieState } from '@/components/motion/lottie-state';
import { ShimmerSkeleton } from '@/components/motion/shimmer-skeleton';

const ease = [0.21, 0.47, 0.32, 0.98] as const;

interface CompetitorSnapshot {
  name: string;
  signalCount: number;
  signalTypes: string[];
}

interface ExecutiveSummaryData {
  summary: string;
  competitors: CompetitorSnapshot[];
  totalSignals?: number;
  generated_at: string;
}

export function ExecutiveSummary() {
  const [data, setData] = useState<ExecutiveSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchSummary() {
    try {
      const res = await fetch('/api/executive-summary');
      const json = await res.json();
      setData(json);
    } catch {
      setData({
        summary: 'Unable to load executive summary.',
        competitors: [],
        generated_at: new Date().toISOString(),
      });
    }
  }

  useEffect(() => {
    setLoading(true);
    fetchSummary().finally(() => setLoading(false));
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchSummary();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-r from-primary/[0.04] to-primary/[0.02]">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-2">
              <LottieState name="loading-ai" size={48} />
            </div>
            <div className="flex-1">
              <ShimmerSkeleton lines={3} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const mostActive = data.competitors.length > 0
    ? data.competitors.reduce((a, b) => (a.signalCount > b.signalCount ? a : b))
    : null;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/[0.04] to-primary/[0.02]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Weekly Executive Briefing
          </CardTitle>
          <div className="flex items-center gap-2">
            {data.totalSignals !== undefined && (
              <Badge variant="outline" className="text-xs">
                {data.totalSignals} strategic signals
              </Badge>
            )}
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </motion.div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Summary */}
        <motion.p
          className="text-sm leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          {data.summary}
        </motion.p>

        {/* Competitor Activity Indicators */}
        {data.competitors.length > 0 && (
          <motion.div
            className="flex flex-wrap gap-2 pt-1"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } },
            }}
          >
            {data.competitors
              .sort((a, b) => b.signalCount - a.signalCount)
              .map((c) => (
                <motion.div
                  key={c.name}
                  variants={{
                    hidden: { opacity: 0, scale: 0.9 },
                    visible: { opacity: 1, scale: 1 },
                  }}
                  transition={{ duration: 0.3, ease }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background border text-xs"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      c === mostActive
                        ? 'bg-red-500'
                        : c.signalCount > 2
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                    }`}
                  />
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground">{c.signalCount}</span>
                </motion.div>
              ))}
          </motion.div>
        )}

        {/* Timestamp */}
        <p className="text-[11px] text-muted-foreground">
          AI-generated briefing as of {new Date(data.generated_at).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
