'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Signal } from '@/lib/types';
import { SignalFeed } from '@/components/signal-feed';
import { toast } from 'sonner';
import { Briefcase, Globe, Newspaper, Building, Linkedin, MessageCircle, Video, Smartphone, Users } from 'lucide-react';

const signalTypeLabels: Record<string, { label: string; icon: React.ElementType }> = {
  hiring: { label: 'Hiring', icon: Briefcase },
  digital_footprint: { label: 'Digital', icon: Globe },
  news_press: { label: 'News', icon: Newspaper },
  asset_watch: { label: 'Asset', icon: Building },
  linkedin_post: { label: 'LinkedIn', icon: Linkedin },
  social_mention: { label: 'Social', icon: MessageCircle },
  media_appearance: { label: 'Media', icon: Video },
  app_update: { label: 'App Update', icon: Smartphone },
  employee_sentiment: { label: 'Sentiment', icon: Users },
};

interface RealtimeSignalProviderProps {
  initialSignals: Signal[];
}

/**
 * Wraps the SignalFeed with a Supabase Realtime subscription.
 * When new signals are inserted, they appear instantly with a highlight animation.
 */
export function RealtimeSignalProvider({ initialSignals }: RealtimeSignalProviderProps) {
  const [signals, setSignals] = useState<Signal[]>(initialSignals);
  const [newSignalIds, setNewSignalIds] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const supabaseRef = useRef(createClient());

  // Sync initial signals when server re-renders (e.g., filter change)
  useEffect(() => {
    setSignals(initialSignals);
  }, [initialSignals]);

  const handleNewSignal = useCallback(async (payload: { new: Record<string, unknown> }) => {
    const raw = payload.new;
    const supabase = supabaseRef.current;

    // Fetch the full signal with competitor join
    const { data: fullSignal } = await supabase
      .from('signals')
      .select('*, competitor:competitors(*)')
      .eq('id', raw.id as string)
      .single();

    if (!fullSignal) return;

    const signal = fullSignal as Signal;

    // Prepend to the list
    setSignals((prev) => [signal, ...prev]);

    // Track as new for highlight animation
    setNewSignalIds((prev) => new Set(prev).add(signal.id));
    setUnreadCount((prev) => prev + 1);

    // Remove highlight after 10 seconds
    setTimeout(() => {
      setNewSignalIds((prev) => {
        const next = new Set(prev);
        next.delete(signal.id);
        return next;
      });
    }, 10000);

    // Show toast notification
    const typeConfig = signalTypeLabels[signal.signal_type] || {
      label: 'Signal',
      icon: Globe,
    };
    const competitorName = signal.competitor?.name || 'Competitor';

    toast(
      `${competitorName}: ${signal.title.slice(0, 80)}`,
      {
        description: `New ${typeConfig.label.toLowerCase()} signal detected`,
        duration: 8000,
      }
    );
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel('signals-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals',
        },
        handleNewSignal
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleNewSignal]);

  // Clear unread count when user scrolls to top or interacts
  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return (
    <div>
      {/* Unread banner */}
      {unreadCount > 0 && (
        <button
          onClick={clearUnread}
          className="w-full mb-4 py-2 px-4 bg-primary/10 border border-primary/20 rounded-lg text-sm font-medium text-primary hover:bg-primary/15 transition-colors animate-pulse"
        >
          {unreadCount} new signal{unreadCount !== 1 ? 's' : ''} detected — click to dismiss
        </button>
      )}

      {/* Wrap signals with highlight data */}
      <SignalFeed
        signals={signals}
        highlightIds={newSignalIds}
      />
    </div>
  );
}
