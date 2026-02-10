-- Competitors table
CREATE TABLE IF NOT EXISTS competitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT NOT NULL,
  careers_url TEXT,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Signal type enum
DO $$ BEGIN
  CREATE TYPE signal_type AS ENUM ('hiring', 'digital_footprint', 'news_press', 'asset_watch');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Signals table
CREATE TABLE IF NOT EXISTS signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  signal_type signal_type NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  raw_data JSONB,
  source_url TEXT,
  relevance_score INTEGER DEFAULT 5 CHECK (relevance_score >= 1 AND relevance_score <= 10),
  is_strategically_relevant BOOLEAN DEFAULT true,
  detected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Snapshots table for change detection
CREATE TABLE IF NOT EXISTS snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Dossiers table
CREATE TABLE IF NOT EXISTS dossiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE UNIQUE,
  footprint JSONB,
  operating_model TEXT,
  strategic_positioning TEXT,
  swot JSONB,
  recommendations JSONB,
  raw_analysis TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Digests table
CREATE TABLE IF NOT EXISTS digests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  signals_included JSONB,
  sent_at TIMESTAMPTZ DEFAULT now(),
  channel TEXT DEFAULT 'slack'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signals_competitor ON signals(competitor_id);
CREATE INDEX IF NOT EXISTS idx_signals_type ON signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_detected ON signals(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_relevant ON signals(is_strategically_relevant);
CREATE INDEX IF NOT EXISTS idx_snapshots_competitor ON snapshots(competitor_id, snapshot_type);
CREATE INDEX IF NOT EXISTS idx_snapshots_created ON snapshots(created_at DESC);

-- Row Level Security
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE digests ENABLE ROW LEVEL SECURITY;

-- Policies: Allow authenticated users to read all data
CREATE POLICY "Authenticated users can view competitors" ON competitors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert competitors" ON competitors
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update competitors" ON competitors
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete competitors" ON competitors
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view signals" ON signals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view snapshots" ON snapshots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view dossiers" ON dossiers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view digests" ON digests
  FOR SELECT TO authenticated USING (true);

-- Service role policies (for cron jobs / server-side operations)
CREATE POLICY "Service role full access on competitors" ON competitors
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access on signals" ON signals
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access on snapshots" ON snapshots
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access on dossiers" ON dossiers
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role full access on digests" ON digests
  FOR ALL TO service_role USING (true);
