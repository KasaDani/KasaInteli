'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import type { Competitor, SignalType } from '@/lib/types';
import { Briefcase, Globe, Newspaper, Building, Filter, Linkedin, MessageCircle, Video, Smartphone, Users, Star, FileText, DollarSign } from 'lucide-react';

const signalTypes: { value: SignalType; label: string; icon: React.ElementType }[] = [
  { value: 'hiring', label: 'Hiring', icon: Briefcase },
  { value: 'digital_footprint', label: 'Digital', icon: Globe },
  { value: 'news_press', label: 'News', icon: Newspaper },
  { value: 'asset_watch', label: 'Assets', icon: Building },
  { value: 'linkedin_post', label: 'LinkedIn', icon: Linkedin },
  { value: 'social_mention', label: 'Social', icon: MessageCircle },
  { value: 'media_appearance', label: 'Media', icon: Video },
  { value: 'app_update', label: 'App', icon: Smartphone },
  { value: 'employee_sentiment', label: 'Sentiment', icon: Users },
  { value: 'customer_review', label: 'Reviews', icon: Star },
  { value: 'financial_filing', label: 'Financial', icon: FileText },
  { value: 'rate_intelligence', label: 'Pricing', icon: DollarSign },
];

interface SignalFiltersProps {
  competitors: Competitor[];
  currentType?: string;
  currentCompetitor?: string;
  showAll?: boolean;
}

export function SignalFilters({
  competitors,
  currentType,
  currentCompetitor,
  showAll,
}: SignalFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/dashboard?${params.toString()}`);
  }

  function clearFilters() {
    router.push('/dashboard');
  }

  const hasFilters = currentType || currentCompetitor || showAll;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Signal Type:</span>
        {signalTypes.map((type) => (
          <motion.div key={type.value} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant={currentType === type.value ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                updateFilter('type', currentType === type.value ? undefined : type.value)
              }
              className="h-8"
            >
              <type.icon className="h-3 w-3 mr-1" />
              {type.label}
            </Button>
          </motion.div>
        ))}
      </div>

      {competitors.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground ml-6">Competitor:</span>
          {competitors.map((c) => (
            <motion.div key={c.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant={currentCompetitor === c.id ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  updateFilter('competitor', currentCompetitor === c.id ? undefined : c.id)
                }
                className="h-8"
              >
                {c.name}
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground ml-6">Relevance:</span>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant={!showAll ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('relevant', undefined)}
            className="h-8"
          >
            Strategic Only
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant={showAll ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFilter('relevant', showAll ? undefined : 'all')}
            className="h-8"
          >
            Show All
          </Button>
        </motion.div>

        <AnimatePresence>
          {hasFilters && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80 ml-2"
                onClick={clearFilters}
              >
                Clear Filters
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
