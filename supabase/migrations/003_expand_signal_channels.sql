-- Expand signal_type enum with new channel types
ALTER TYPE signal_type ADD VALUE IF NOT EXISTS 'linkedin_post';
ALTER TYPE signal_type ADD VALUE IF NOT EXISTS 'social_mention';
ALTER TYPE signal_type ADD VALUE IF NOT EXISTS 'media_appearance';
ALTER TYPE signal_type ADD VALUE IF NOT EXISTS 'app_update';
ALTER TYPE signal_type ADD VALUE IF NOT EXISTS 'employee_sentiment';

-- Add new tracking columns to competitors
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS linkedin_slug TEXT;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS app_store_url TEXT;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS glassdoor_url TEXT;

-- Seed LinkedIn slugs for existing competitors
UPDATE competitors SET linkedin_slug = 'placemakr' WHERE name = 'Placemakr' AND linkedin_slug IS NULL;
UPDATE competitors SET linkedin_slug = 'avantstay' WHERE name = 'AvantStay' AND linkedin_slug IS NULL;
UPDATE competitors SET linkedin_slug = 'staylark' WHERE name = 'Lark' AND linkedin_slug IS NULL;

-- Enable Supabase Realtime on the signals table so clients can subscribe to new inserts
ALTER PUBLICATION supabase_realtime ADD TABLE signals;
