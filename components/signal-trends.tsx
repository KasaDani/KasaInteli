'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';

interface CompetitorTrend {
  name: string;
  weeklyTotals: number[];
  weeklyStrategic: number[];
  velocity: number;
  totalRecent: number;
}

interface TrendsData {
  trends: CompetitorTrend[];
  weekLabels: string[];
}

const COMPETITOR_COLORS = [
  { bar: 'fill-blue-500', bg: 'bg-blue-500' },
  { bar: 'fill-emerald-500', bg: 'bg-emerald-500' },
  { bar: 'fill-amber-500', bg: 'bg-amber-500' },
  { bar: 'fill-purple-500', bg: 'bg-purple-500' },
  { bar: 'fill-rose-500', bg: 'bg-rose-500' },
];

function Sparkline({
  data,
  color,
  width = 140,
  height = 32,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (v / max) * (height - 4) - 2,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Area fill under the line
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className={color} stopOpacity="0.3" />
          <stop offset="100%" className={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color})`} />
      <path d={pathD} fill="none" className={`stroke-current ${color.replace('fill-', 'text-')}`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dot on the last point */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="3"
          className={`${color.replace('fill-', 'fill-')} stroke-background`}
          strokeWidth="1.5"
        />
      )}
    </svg>
  );
}

function VelocityBadge({ velocity }: { velocity: number }) {
  if (velocity > 20) {
    return (
      <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 gap-1 text-[10px] px-1.5 py-0">
        <TrendingUp className="h-2.5 w-2.5" />
        +{velocity}%
      </Badge>
    );
  }
  if (velocity > 0) {
    return (
      <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 gap-1 text-[10px] px-1.5 py-0">
        <TrendingUp className="h-2.5 w-2.5" />
        +{velocity}%
      </Badge>
    );
  }
  if (velocity < -20) {
    return (
      <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30 gap-1 text-[10px] px-1.5 py-0">
        <TrendingDown className="h-2.5 w-2.5" />
        {velocity}%
      </Badge>
    );
  }
  if (velocity < 0) {
    return (
      <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 gap-1 text-[10px] px-1.5 py-0">
        <TrendingDown className="h-2.5 w-2.5" />
        {velocity}%
      </Badge>
    );
  }
  return (
    <Badge className="bg-muted text-muted-foreground gap-1 text-[10px] px-1.5 py-0">
      <Minus className="h-2.5 w-2.5" />
      Flat
    </Badge>
  );
}

export function SignalTrends() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/signal-trends')
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ trends: [], weekLabels: [] }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted animate-pulse">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
              <div className="h-8 bg-muted rounded w-full animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.trends.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Signal Velocity
          <span className="text-xs font-normal text-muted-foreground ml-1">Last 8 weeks</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.trends.map((competitor, idx) => {
            const colorSet = COMPETITOR_COLORS[idx % COMPETITOR_COLORS.length];
            const total = competitor.weeklyTotals.reduce((s, v) => s + v, 0);

            return (
              <div key={competitor.name} className="flex items-center gap-4">
                {/* Competitor name + dot */}
                <div className="flex items-center gap-2 w-28 shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${colorSet.bg}`} />
                  <span className="text-sm font-medium truncate">{competitor.name}</span>
                </div>

                {/* Sparkline */}
                <div className="flex-1">
                  <Sparkline data={competitor.weeklyTotals} color={colorSet.bar} />
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold">{total}</p>
                    <p className="text-[10px] text-muted-foreground">total</p>
                  </div>
                  <VelocityBadge velocity={competitor.velocity} />
                </div>
              </div>
            );
          })}

          {/* Week labels */}
          <div className="flex items-center gap-4 pt-2 border-t">
            <div className="w-28 shrink-0" />
            <div className="flex-1 flex justify-between">
              {data.weekLabels.map((label, i) => (
                <span
                  key={i}
                  className={`text-[10px] text-muted-foreground ${
                    i === data.weekLabels.length - 1 ? 'font-medium text-foreground' : ''
                  }`}
                >
                  {i % 2 === 0 || i === data.weekLabels.length - 1 ? label : ''}
                </span>
              ))}
            </div>
            <div className="w-24 shrink-0" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
