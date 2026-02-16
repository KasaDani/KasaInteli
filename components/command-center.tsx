'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Radar,
  RefreshCw,
  Flame,
  Activity,
  Target,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CircleDashed,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ShimmerSkeleton } from '@/components/motion/shimmer-skeleton';

type Priority = 'critical' | 'high' | 'medium' | 'low';
type ActionStatus = 'not_started' | 'in_progress' | 'done';

interface PatternInsight {
  id: string;
  label: string;
  competitorCount: number;
  competitorNames: string[];
  totalSignals: number;
  averageRelevance: number;
  momentumScore: number;
  priority: Priority;
  whyItMatters: string;
  recommendation: string;
  latestDetectedAt: string;
}

interface Recommendation {
  id: string;
  title: string;
  priority: Priority;
  confidence: number;
  action: string;
  ownerSuggestion: string;
  timeHorizon: string;
  relatedCompetitors: string[];
}

interface CommandCenterData {
  strategicPressureIndex: number;
  marketHeat: number;
  parallelMoves: number;
  patterns: PatternInsight[];
  recommendations: Recommendation[];
  generated_at: string;
}

const STORAGE_KEY = 'kasa-inteli-action-statuses-v1';

function priorityBadgeClass(priority: Priority): string {
  if (priority === 'critical') return 'bg-red-500/15 text-red-700 border-red-500/30';
  if (priority === 'high') return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
  if (priority === 'medium') return 'bg-blue-500/15 text-blue-700 border-blue-500/30';
  return 'bg-muted text-muted-foreground border-border';
}

function nextStatus(status: ActionStatus): ActionStatus {
  if (status === 'not_started') return 'in_progress';
  if (status === 'in_progress') return 'done';
  return 'not_started';
}

export function CommandCenter() {
  const [data, setData] = useState<CommandCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, ActionStatus>) : {};
    } catch {
      return {};
    }
  });

  async function fetchCommandCenter() {
    const res = await fetch('/api/patterns');
    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    setLoading(true);
    fetchCommandCenter()
      .catch(() => {
        setData({
          strategicPressureIndex: 0,
          marketHeat: 0,
          parallelMoves: 0,
          patterns: [],
          recommendations: [],
          generated_at: new Date().toISOString(),
        });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
  }, [statuses]);

  const doneCount = useMemo(
    () =>
      Object.values(statuses).filter((value) => value === 'done').length,
    [statuses]
  );

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetchCommandCenter();
    } finally {
      setRefreshing(false);
    }
  }

  function toggleStatus(id: string) {
    setStatuses((prev) => ({
      ...prev,
      [id]: nextStatus(prev[id] || 'not_started'),
    }));
  }

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Radar className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <ShimmerSkeleton lines={4} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/[0.05] to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radar className="h-4 w-4 text-primary" />
            C-Suite Command Center
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-background px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Strategic Pressure Index</p>
            <p className="text-xl font-bold">{data.strategicPressureIndex}</p>
            <p className="text-[11px] text-muted-foreground">0-100 estimate of competitive urgency</p>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Market Heat</p>
            <p className="text-xl font-bold">{data.marketHeat}%</p>
            <p className="text-[11px] text-muted-foreground">Tracked rivals with heavy strategic activity</p>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Parallel Moves</p>
            <p className="text-xl font-bold">{data.parallelMoves}</p>
            <p className="text-[11px] text-muted-foreground">Cross-competitor themes currently converging</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Cross-Competitor Patterns</p>
              <Badge variant="outline" className="text-[11px]">
                Last 30 days
              </Badge>
            </div>
            {data.patterns.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No strong cross-competitor convergence yet. Continue monitoring for clustering.
              </p>
            ) : (
              data.patterns.slice(0, 4).map((pattern) => (
                <motion.div
                  key={pattern.id}
                  className="rounded-lg border bg-background p-3 space-y-2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{pattern.label}</p>
                    <Badge className={priorityBadgeClass(pattern.priority)}>
                      {pattern.priority.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Flame className="h-3.5 w-3.5" />
                    <span>{pattern.momentumScore} momentum</span>
                    <span>•</span>
                    <span>{pattern.competitorCount} competitors</span>
                    <span>•</span>
                    <span>{pattern.totalSignals} signals</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{pattern.whyItMatters}</p>
                  <p className="text-sm">
                    <span className="font-medium">Recommended posture:</span> {pattern.recommendation}
                  </p>
                </motion.div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Action Tracker</p>
              <Badge variant="outline" className="text-[11px]">
                {doneCount}/{data.recommendations.length} completed
              </Badge>
            </div>
            {data.recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Recommendations will populate once strategic patterns emerge.
              </p>
            ) : (
              data.recommendations.map((rec) => {
                const status = statuses[rec.id] || 'not_started';
                return (
                  <div key={rec.id} className="rounded-lg border bg-background p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{rec.title}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={priorityBadgeClass(rec.priority)}>
                          {rec.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">{rec.confidence}% confidence</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.action}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Activity className="h-3.5 w-3.5" />
                      <span>{rec.ownerSuggestion}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                      <span>{rec.timeHorizon}</span>
                      <Target className="h-3.5 w-3.5" />
                      <span>{rec.relatedCompetitors.join(', ')}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => toggleStatus(rec.id)}
                    >
                      {status === 'done' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-600" />
                      ) : status === 'in_progress' ? (
                        <Clock3 className="h-3.5 w-3.5 mr-1 text-amber-600" />
                      ) : (
                        <CircleDashed className="h-3.5 w-3.5 mr-1" />
                      )}
                      {status === 'done'
                        ? 'Completed'
                        : status === 'in_progress'
                          ? 'In Progress'
                          : 'Not Started'}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Generated {new Date(data.generated_at).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
