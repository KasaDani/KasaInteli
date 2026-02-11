import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertTriangle, TrendingUp, Building2, Flame } from 'lucide-react';

interface StatsCardsProps {
  totalSignals: number;
  relevantSignals: number;
  weeklySignals: number;
  urgentSignals: number;
  competitorCount: number;
}

export function StatsCards({
  totalSignals,
  relevantSignals,
  weeklySignals,
  urgentSignals,
  competitorCount,
}: StatsCardsProps) {
  const stats = [
    {
      title: 'Last 72 Hours',
      value: urgentSignals,
      icon: Flame,
      description: 'Signals needing attention',
      highlight: urgentSignals > 0,
    },
    {
      title: 'This Week',
      value: weeklySignals,
      icon: TrendingUp,
      description: 'Signals in last 7 days',
      highlight: false,
    },
    {
      title: 'Strategic Signals',
      value: relevantSignals,
      icon: AlertTriangle,
      description: 'High-relevance signals',
      highlight: false,
    },
    {
      title: 'Total Signals',
      value: totalSignals,
      icon: Activity,
      description: 'All detected signals',
      highlight: false,
    },
    {
      title: 'Competitors',
      value: competitorCount,
      icon: Building2,
      description: 'Actively tracked',
      highlight: false,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => (
        <Card
          key={stat.title}
          className={stat.highlight ? 'border-red-500/40 bg-red-500/[0.03]' : ''}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon
              className={`h-4 w-4 ${stat.highlight ? 'text-red-500' : 'text-muted-foreground'}`}
            />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stat.highlight ? 'text-red-600 dark:text-red-400' : ''}`}>
              {stat.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
