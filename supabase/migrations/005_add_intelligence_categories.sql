-- Add new signal types for comprehensive intelligence coverage
ALTER TYPE signal_type ADD VALUE IF NOT EXISTS 'customer_review';
ALTER TYPE signal_type ADD VALUE IF NOT EXISTS 'financial_filing';
ALTER TYPE signal_type ADD VALUE IF NOT EXISTS 'rate_intelligence';

-- Add SEC CIK field for public company tracking (e.g., Sonder = 0001819395)
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS sec_cik TEXT;

-- Add new dossier columns for expanded analysis
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS revenue_pricing TEXT;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS technology_experience TEXT;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS customer_sentiment TEXT;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS financial_health TEXT;
ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS macro_positioning TEXT;

-- Add RLS policies for new signal types (authenticated users can insert/update)
-- (These are already covered by the generic policies in 004, but adding explicit ones for clarity)
