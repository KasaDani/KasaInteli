'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, Plus, Target } from 'lucide-react';
import { toast } from 'sonner';

interface Recommendation {
  name: string;
  website: string;
  description: string;
  why_fit: string;
  overlap_signals: string[];
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  careers_url?: string;
  listings_url?: string;
  linkedin_slug?: string;
  app_store_url?: string;
  glassdoor_url?: string;
}

export function CompsetRecommendations() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  async function fetchRecommendations() {
    const res = await fetch('/api/compset-recommendations?limit=8');
    const data = await res.json();
    setRecommendations(data.recommendations || []);
  }

  useEffect(() => {
    fetchRecommendations()
      .catch(() => {
        setRecommendations([]);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetchRecommendations();
    } finally {
      setRefreshing(false);
    }
  }

  function addFromRecommendation(item: Recommendation) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('suggestedName', item.name);
    params.set('suggestedWebsite', item.website || '');
    params.set('suggestedDescription', item.description || '');
    params.set('suggestedCareersUrl', item.careers_url || '');
    params.set('suggestedListingsUrl', item.listings_url || '');
    params.set('suggestedLinkedinSlug', item.linkedin_slug || '');
    params.set('suggestedAppStoreUrl', item.app_store_url || '');
    params.set('suggestedGlassdoorUrl', item.glassdoor_url || '');
    router.replace(`${pathname}?${params.toString()}`);
    toast.success(`${item.name} pre-filled. Review and add in the dialog.`);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Kasa Compset Recommendations
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
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Generating recommended competitors...</p>
        ) : recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recommendations available right now. Refresh to try again.
          </p>
        ) : (
          recommendations.map((item) => (
            <div key={item.name} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  {item.website && (
                    <p className="text-xs text-muted-foreground">{item.website.replace(/^https?:\/\//, '')}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={item.priority === 'high' ? 'destructive' : 'outline'}>
                    {item.priority.toUpperCase()}
                  </Badge>
                  <Badge variant="secondary">{item.confidence}/10 fit</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{item.why_fit || item.description}</p>
              {item.overlap_signals.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.overlap_signals.slice(0, 4).map((signal) => (
                    <Badge key={`${item.name}-${signal}`} variant="outline" className="text-[11px]">
                      {signal}
                    </Badge>
                  ))}
                </div>
              )}
              <Button
                variant="secondary"
                size="sm"
                className="h-8"
                onClick={() => addFromRecommendation(item)}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Use in Add Competitor
              </Button>
            </div>
          ))
        )}

        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Recommendations are AI-generated based on Kasa&apos;s current tracked competitors.
        </div>
      </CardContent>
    </Card>
  );
}

