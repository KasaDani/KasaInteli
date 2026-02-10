import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertTriangle, TrendingUp, Building2 } from 'lucide-react';

interface StatsCardsProps {
  totalSignals: number;
  relevantSignals: number;
  weeklySignals: number;
  competitorCount: number;
}

export function StatsCards({
  totalSignals,
  relevantSignals,
  weeklySignals,
  competitorCount,
}: StatsCardsProps) {
  const stats = [
    {
      title: 'Total Signals',
      value: totalSignals,
      icon: Activity,
      description: 'All detected signals',
    },
    {
      title: 'Strategic Signals',
      value: relevantSignals,
      icon: AlertTriangle,
      description: 'High-relevance signals',
    },
    {
      title: 'This Week',
      value: weeklySignals,
      icon: TrendingUp,
      description: 'Signals in last 7 days',
    },
    {
      title: 'Competitors',
      value: competitorCount,
      icon: Building2,
      description: 'Actively tracked',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
