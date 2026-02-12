'use client';
// One signal, one card. Dani's precious. (The intel, not the ring.)

import type { Signal, SignalType } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Briefcase, Globe, Newspaper, Building, ExternalLink, Linkedin, MessageCircle, Video, Smartphone, Users, Clock, Flame, Zap, Star, FileText, DollarSign } from 'lucide-react';
import { format, formatDistanceToNow, differenceInHours, differenceInDays } from 'date-fns';

const signalTypeConfig: Record<SignalType, { label: string; icon: React.ElementType; color: string }> = {
  hiring: { label: 'Hiring', icon: Briefcase, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  digital_footprint: { label: 'Digital', icon: Globe, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  news_press: { label: 'News', icon: Newspaper, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  asset_watch: { label: 'Asset', icon: Building, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  linkedin_post: { label: 'LinkedIn', icon: Linkedin, color: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200' },
  social_mention: { label: 'Social', icon: MessageCircle, color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' },
  media_appearance: { label: 'Media', icon: Video, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  app_update: { label: 'App Update', icon: Smartphone, color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' },
  employee_sentiment: { label: 'Sentiment', icon: Users, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  customer_review: { label: 'Reviews', icon: Star, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  financial_filing: { label: 'Financial', icon: FileText, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  rate_intelligence: { label: 'Pricing', icon: DollarSign, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
};

function RelevanceIndicator({ score }: { score: number }) {
  const color =
    score >= 8
      ? 'bg-red-500'
      : score >= 5
        ? 'bg-yellow-500'
        : 'bg-gray-300';

  return (
    <div className="flex items-center gap-1.5" title={`Relevance: ${score}/10`}>
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-muted-foreground">{score}/10</span>
    </div>
  );
}

function UrgencyBadge({ detectedAt }: { detectedAt: string }) {
  const now = new Date();
  const date = new Date(detectedAt);
  const hoursAgo = differenceInHours(now, date);
  const daysAgo = differenceInDays(now, date);

  if (hoursAgo < 72) {
    return (
      <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 gap-1 text-[10px] px-1.5 py-0">
        <Flame className="h-2.5 w-2.5" />
        {hoursAgo < 1 ? 'Just now' : hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.floor(hoursAgo / 24)}d ago`}
      </Badge>
    );
  }

  if (daysAgo <= 7) {
    return (
      <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 gap-1 text-[10px] px-1.5 py-0">
        <Zap className="h-2.5 w-2.5" />
        {daysAgo}d ago
      </Badge>
    );
  }

  return null;
}

export function SignalCard({ signal, highlight }: { signal: Signal; highlight?: boolean }) {
  const config = signalTypeConfig[signal.signal_type];
  const Icon = config.icon;
  const now = new Date();
  const detectedDate = new Date(signal.detected_at);
  const hoursAgo = differenceInHours(now, detectedDate);

  // Visual urgency classes
  const isUrgent = hoursAgo < 72;
  const isRecent = hoursAgo < 168; // 7 days

  const urgencyBorder = isUrgent
    ? 'border-red-500/40 bg-red-500/[0.03]'
    : isRecent
      ? 'border-yellow-500/30 bg-yellow-500/[0.02]'
      : '';

  return (
    <motion.div
      whileHover={{ y: -1, transition: { duration: 0.2 } }}
      {...(highlight
        ? {
            initial: { opacity: 0, scale: 0.97, y: 8 },
            animate: { opacity: 1, scale: 1, y: 0 },
            transition: { type: 'spring', stiffness: 300, damping: 20 },
          }
        : {})}
    >
      <Card className={`transition-shadow duration-200 hover:shadow-md ${urgencyBorder} ${highlight ? 'ring-2 ring-primary/40' : ''}`}>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="mt-0.5 shrink-0">
              <div className={`p-2 rounded-lg ${config.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm leading-tight">{signal.title}</h4>
                <UrgencyBadge detectedAt={signal.detected_at} />
                {signal.is_strategically_relevant && signal.relevance_score >= 7 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    Strategic
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{signal.summary}</p>

              <div className="flex items-center gap-3 pt-1 flex-wrap">
                {signal.competitor && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {signal.competitor.name}
                  </span>
                )}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {config.label}
                </Badge>
                <RelevanceIndicator score={signal.relevance_score} />
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(detectedDate, { addSuffix: true })}
                </span>
                {signal.source_url && (
                  <a
                    href={signal.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Source
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
