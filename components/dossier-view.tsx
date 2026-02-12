'use client';
// Dossiers: competitor deep-dives. Dani wrote the SWOT at 3AM. It still holds up.

import { useState } from 'react';
import type { Competitor, Dossier } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { AnimatedSection } from '@/components/motion/animated-section';
import { LottieState } from '@/components/motion/lottie-state';
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

const ease = [0.21, 0.47, 0.32, 0.98] as const;

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

        <motion.div whileTap={{ scale: 0.95 }}>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Generating...' : 'Refresh Dossier'}
          </Button>
        </motion.div>
      </div>

      {!dossier ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <LottieState name="empty-dossier" size={160} className="mb-4" />
              <h3 className="text-lg font-semibold">No Dossier Generated Yet</h3>
              <p className="text-muted-foreground mt-1 max-w-md">
                Click &quot;Refresh Dossier&quot; to generate an AI-powered competitor analysis using
                collected signals and public information.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Footprint */}
          <AnimatedSection delay={0.05}>
            <Card className="h-full">
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
          </AnimatedSection>

          {/* Operating Model */}
          <AnimatedSection delay={0.1}>
            <Card className="h-full">
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
          </AnimatedSection>

          {/* Strategic Positioning - Full Width */}
          <AnimatedSection delay={0.15} className="md:col-span-2">
            <Card>
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
          </AnimatedSection>

          {/* SWOT Analysis */}
          <AnimatedSection delay={0.2} className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4" />
                  SWOT Analysis vs. Kasa
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dossier.swot ? (
                  <motion.div
                    className="grid gap-4 sm:grid-cols-2"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={{
                      hidden: {},
                      visible: { transition: { staggerChildren: 0.1 } },
                    }}
                  >
                    <motion.div
                      className="space-y-2"
                      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                      transition={{ duration: 0.4, ease }}
                    >
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
                    </motion.div>
                    <motion.div
                      className="space-y-2"
                      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                      transition={{ duration: 0.4, ease }}
                    >
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
                    </motion.div>
                    <motion.div
                      className="space-y-2"
                      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                      transition={{ duration: 0.4, ease }}
                    >
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
                    </motion.div>
                    <motion.div
                      className="space-y-2"
                      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                      transition={{ duration: 0.4, ease }}
                    >
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
                    </motion.div>
                  </motion.div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not yet analyzed.</p>
                )}
              </CardContent>
            </Card>
          </AnimatedSection>

          {/* Revenue & Pricing */}
          <AnimatedSection delay={0.25} className="md:col-span-2">
            <Card>
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
          </AnimatedSection>

          {/* Technology & Guest Experience */}
          <AnimatedSection delay={0.3}>
            <Card className="h-full">
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
          </AnimatedSection>

          {/* Customer & Brand Sentiment */}
          <AnimatedSection delay={0.35}>
            <Card className="h-full">
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
          </AnimatedSection>

          {/* Financial Health */}
          <AnimatedSection delay={0.4}>
            <Card className="h-full">
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
          </AnimatedSection>

          {/* Macro Positioning */}
          <AnimatedSection delay={0.45}>
            <Card className="h-full">
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
          </AnimatedSection>

          {/* Strategic Recommendations */}
          <AnimatedSection delay={0.5} className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="h-4 w-4" />
                  Strategic Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dossier.recommendations ? (
                  <motion.div
                    className="space-y-4"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={{
                      hidden: {},
                      visible: { transition: { staggerChildren: 0.12 } },
                    }}
                  >
                    <motion.div
                      className="flex items-start gap-3"
                      variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0 } }}
                      transition={{ duration: 0.4, ease }}
                    >
                      <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">What they&apos;re optimizing for</p>
                        <p className="text-sm text-muted-foreground">
                          {dossier.recommendations.optimization}
                        </p>
                      </div>
                    </motion.div>
                    <Separator />
                    <motion.div
                      className="flex items-start gap-3"
                      variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0 } }}
                      transition={{ duration: 0.4, ease }}
                    >
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">Impact on Kasa</p>
                        <p className="text-sm text-muted-foreground">
                          {dossier.recommendations.impact}
                        </p>
                      </div>
                    </motion.div>
                    <Separator />
                    <motion.div
                      className="flex items-start gap-3"
                      variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0 } }}
                      transition={{ duration: 0.4, ease }}
                    >
                      <Target className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">Recommended Action</p>
                        <p className="text-sm text-muted-foreground">
                          {dossier.recommendations.action}
                        </p>
                      </div>
                    </motion.div>
                  </motion.div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not yet analyzed.</p>
                )}
              </CardContent>
            </Card>
          </AnimatedSection>

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
