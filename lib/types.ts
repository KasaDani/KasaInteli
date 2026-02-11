export type SignalType =
  | 'hiring'
  | 'digital_footprint'
  | 'news_press'
  | 'asset_watch'
  | 'linkedin_post'
  | 'social_mention'
  | 'media_appearance'
  | 'app_update'
  | 'employee_sentiment';

export interface Competitor {
  id: string;
  name: string;
  website: string;
  careers_url: string | null;
  listings_url: string | null;
  linkedin_slug: string | null;
  app_store_url: string | null;
  glassdoor_url: string | null;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Signal {
  id: string;
  competitor_id: string;
  signal_type: SignalType;
  title: string;
  summary: string;
  raw_data: Record<string, unknown> | null;
  source_url: string | null;
  relevance_score: number;
  is_strategically_relevant: boolean;
  detected_at: string;
  created_at: string;
  // Joined fields
  competitor?: Competitor;
}

export interface Snapshot {
  id: string;
  competitor_id: string;
  snapshot_type: string;
  content_hash: string;
  content: string;
  created_at: string;
}

export interface Dossier {
  id: string;
  competitor_id: string;
  footprint: Record<string, unknown> | null;
  operating_model: string | null;
  strategic_positioning: string | null;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  } | null;
  recommendations: {
    optimization: string;
    impact: string;
    action: string;
  } | null;
  raw_analysis: string | null;
  updated_at: string;
  // Joined
  competitor?: Competitor;
}

export interface Digest {
  id: string;
  content: string;
  signals_included: string[];
  sent_at: string;
  channel: string;
}
