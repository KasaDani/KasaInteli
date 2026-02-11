-- Add listings_url column to competitors for Asset Watch monitoring
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS listings_url TEXT;

-- Add index on snapshots content_hash for faster lookups
CREATE INDEX IF NOT EXISTS idx_snapshots_content_hash ON snapshots(content_hash);

-- Add index on snapshots by type for faster collector queries
CREATE INDEX IF NOT EXISTS idx_snapshots_type_competitor ON snapshots(competitor_id, snapshot_type, created_at DESC);

-- Update existing competitors with their listings/locations URLs
UPDATE competitors SET listings_url = 'https://www.placemakr.com/locations' WHERE name = 'Placemakr' AND listings_url IS NULL;
UPDATE competitors SET listings_url = 'https://www.avantstay.com/vacation-homes' WHERE name = 'AvantStay' AND listings_url IS NULL;
UPDATE competitors SET listings_url = 'https://www.staylark.com/cities' WHERE name = 'Lark' AND listings_url IS NULL;
