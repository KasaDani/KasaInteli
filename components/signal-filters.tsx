'use client';
// Filter the noise, keep the signal. Dani refuses to read everything. Same.

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import type { Competitor, SignalType } from '@/lib/types';
import {
  Briefcase,
  Globe,
  Newspaper,
  Building,
  Filter,
  Linkedin,
  MessageCircle,
  Video,
  Smartphone,
  Users,
  Star,
  FileText,
  DollarSign,
  Bookmark,
  Save,
} from 'lucide-react';

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

interface FilterPreset {
  name: string;
  type?: string;
  competitor?: string;
  relevant?: 'all';
}

const PRESET_STORAGE_KEY = 'kasa-inteli-saved-filter-presets-v1';

export function SignalFilters({
  competitors,
  currentType,
  currentCompetitor,
  showAll,
}: SignalFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(PRESET_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as FilterPreset[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

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

  function applyPreset(preset: FilterPreset) {
    const params = new URLSearchParams();
    if (preset.type) params.set('type', preset.type);
    if (preset.competitor) params.set('competitor', preset.competitor);
    if (preset.relevant) params.set('relevant', preset.relevant);
    const query = params.toString();
    router.push(query ? `/dashboard?${query}` : '/dashboard');
  }

  function saveCurrentAsPreset() {
    const defaultName = currentType
      ? `Type: ${currentType}`
      : currentCompetitor
        ? `Competitor Focus`
        : showAll
          ? 'All Signals'
          : 'Strategic View';
    const name = window.prompt('Name this saved view:', defaultName)?.trim();
    if (!name) return;

    const nextPreset: FilterPreset = {
      name,
      type: currentType,
      competitor: currentCompetitor,
      relevant: showAll ? 'all' : undefined,
    };

    setPresets((prev) => {
      const filtered = prev.filter((preset) => preset.name.toLowerCase() !== name.toLowerCase());
      return [nextPreset, ...filtered].slice(0, 8);
    });
  }

  function removePreset(name: string) {
    setPresets((prev) => prev.filter((preset) => preset.name !== name));
  }

  const hasFilters = currentType || currentCompetitor || showAll;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Bookmark className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Saved Views:</span>
        {presets.length === 0 && (
          <span className="text-xs text-muted-foreground">No saved views yet</span>
        )}
        {presets.map((preset) => (
          <div key={preset.name} className="inline-flex items-center">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-r-none"
              onClick={() => applyPreset(preset)}
            >
              {preset.name}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-l-none border-l-0 px-2 text-muted-foreground"
              onClick={() => removePreset(preset.name)}
            >
              ×
            </Button>
          </div>
        ))}
        <Button
          variant="secondary"
          size="sm"
          className="h-8"
          onClick={saveCurrentAsPreset}
          disabled={!hasFilters}
        >
          <Save className="h-3 w-3 mr-1" />
          Save Current
        </Button>
      </div>

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
