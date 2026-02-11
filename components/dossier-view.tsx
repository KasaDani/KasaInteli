'use client';

import { useState } from 'react';
import type { Competitor, Dossier } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  RefreshCw,
  MapPin,
  Building2,
  Target,
  Shield,
  ArrowLeft,
  ExternalLink,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  DollarSign,
  Cpu,
  Star,
  BarChart3,
  Globe2,
} from 'lucide-react';
import Link from 'next/link';
import { refreshDossier } from '@/app/(app)/competitors/[id]/actions';
import { toast } from 'sonner';

interface DossierViewProps {
  competitor: Competitor;
  dossier: Dossier | null;
  totalSignals: number;
  relevantSignals: number;
  urgentSignals?: number;
}

export function DossierView({
  competitor,
  dossier,
  totalSignals,
  relevantSignals,
  urgentSignals = 0,
}: DossierViewProps) {
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    const result = await refreshDossier(competitor.id);
    setRefreshing(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Dossier refreshed successfully');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/competitors" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">{competitor.name}</h1>
            <Badge variant={competitor.is_active ? 'default' : 'secondary'}>
              {competitor.is_active ? 'Active' : 'Paused'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a
              href={competitor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" />
              {competitor.website.replace(/^https?:\/\//, '')}
            </a>
            <span>{totalSignals} total signals</span>
            <span>{relevantSignals} strategic</span>
            {urgentSignals > 0 && (
              <span className="text-red-600 dark:text-red-400 font-medium">{urgentSignals} in last 72h</span>
            )}
          </div>
          {competitor.description && (
            <p className="text-sm text-muted-foreground max-w-2xl">{competitor.description}</p>
          )}
        </div>

        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Generating...' : 'Refresh Dossier'}
        </Button>
      </div>

      {!dossier ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No Dossier Generated Yet</h3>
            <p className="text-muted-foreground mt-1 max-w-md">
              Click &quot;Refresh Dossier&quot; to generate an AI-powered competitor analysis using
              collected signals and public information.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Footprint */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                Footprint
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dossier.footprint && (
                <>
                  {(dossier.footprint as Record<string, unknown>).markets && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Markets</p>
                      <div className="flex flex-wrap gap-1">
                        {((dossier.footprint as Record<string, unknown>).markets as string[]).map(
                          (market: string) => (
                            <Badge key={market} variant="outline" className="text-xs">
                              {market}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  )}
                  {(dossier.footprint as Record<string, unknown>).estimated_properties && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Properties</p>
                      <p className="text-lg font-semibold">
                        ~{String((dossier.footprint as Record<string, unknown>).estimated_properties)}
                      </p>
                    </div>
                  )}
                  {(dossier.footprint as Record<string, unknown>).expansion_trend && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Trend</p>
                      <Badge
                        variant={
                          (dossier.footprint as Record<string, unknown>).expansion_trend === 'growing'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {String((dossier.footprint as Record<string, unknown>).expansion_trend)}
                      </Badge>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Operating Model */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Operating Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">
                {dossier.operating_model || 'Not yet analyzed.'}
              </p>
            </CardContent>
          </Card>

          {/* Strategic Positioning - Full Width */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" />
                Strategic Positioning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {dossier.strategic_positioning || 'Not yet analyzed.'}
              </p>
            </CardContent>
          </Card>

          {/* SWOT Analysis */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                SWOT Analysis vs. Kasa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dossier.swot ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-green-700 dark:text-green-400">
                      Strengths
                    </h4>
                    <ul className="space-y-1">
                      {dossier.swot.strengths?.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-green-500 mt-1">+</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">
                      Weaknesses
                    </h4>
                    <ul className="space-y-1">
                      {dossier.swot.weaknesses?.map((w: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-red-500 mt-1">-</span>
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                      Opportunities
                    </h4>
                    <ul className="space-y-1">
                      {dossier.swot.opportunities?.map((o: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-blue-500 mt-1">*</span>
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                      Threats
                    </h4>
                    <ul className="space-y-1">
                      {dossier.swot.threats?.map((t: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-yellow-500 mt-1">!</span>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not yet analyzed.</p>
              )}
            </CardContent>
          </Card>

          {/* Revenue & Pricing */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4" />
                Revenue &amp; Pricing Strategy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {dossier.revenue_pricing || 'Not yet analyzed. Refresh dossier to generate.'}
              </p>
            </CardContent>
          </Card>

          {/* Technology & Guest Experience */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Cpu className="h-4 w-4" />
                Technology &amp; Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {dossier.technology_experience || 'Not yet analyzed. Refresh dossier to generate.'}
              </p>
            </CardContent>
          </Card>

          {/* Customer & Brand Sentiment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="h-4 w-4" />
                Customer &amp; Brand Sentiment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {dossier.customer_sentiment || 'Not yet analyzed. Refresh dossier to generate.'}
              </p>
            </CardContent>
          </Card>

          {/* Financial Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Financial Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {dossier.financial_health || 'Not yet analyzed. Refresh dossier to generate.'}
              </p>
            </CardContent>
          </Card>

          {/* Macro Positioning */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe2 className="h-4 w-4" />
                Macro Positioning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {dossier.macro_positioning || 'Not yet analyzed. Refresh dossier to generate.'}
              </p>
            </CardContent>
          </Card>

          {/* Strategic Recommendations */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4" />
                Strategic Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dossier.recommendations ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">What they&apos;re optimizing for</p>
                      <p className="text-sm text-muted-foreground">
                        {dossier.recommendations.optimization}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Impact on Kasa</p>
                      <p className="text-sm text-muted-foreground">
                        {dossier.recommendations.impact}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Recommended Action</p>
                      <p className="text-sm text-muted-foreground">
                        {dossier.recommendations.action}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not yet analyzed.</p>
              )}
            </CardContent>
          </Card>

          {/* Last Updated */}
          {dossier.updated_at && (
            <div className="md:col-span-2 text-xs text-muted-foreground text-right">
              Dossier last updated: {new Date(dossier.updated_at).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
