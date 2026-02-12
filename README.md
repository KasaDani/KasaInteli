# Kasa Intelligence - Competitive Intelligence Platform

An AI-powered competitive intelligence system that continuously monitors hospitality tech competitors and surfaces strategically relevant signals for the CEO and Executive Team.

## Live Demo

**URL**: [https://kasainteli.vercel.app](https://kasainteli.vercel.app)

**Login**: Create an account via the sign-up form, or use pre-configured credentials.

## Architecture & Tools

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 16 (App Router) | Server Components for fast data loading, Server Actions for mutations, API routes for cron jobs |
| **UI** | Tailwind CSS + shadcn/ui | Polished, accessible component library with dark mode support |
| **Database** | Supabase (PostgreSQL) | Managed Postgres with built-in auth, RLS policies, and real-time subscriptions |
| **Auth** | Supabase Auth | Email/password authentication with middleware-based route protection |
| **AI** | Google Gemini 2.0 Flash | Fast, cost-effective model for signal analysis, noise filtering, executive briefings, and strategic synthesis |
| **Digest** | Slack + Resend Email | Weekly intelligence briefs delivered via Slack webhook and email |
| **Data APIs** | SearchAPI.io, Perigon, ScraperAPI, Apify | Multi-source data collection across jobs, news, social, reviews, rates, and more |
| **Scheduling** | Vercel Cron Jobs | 13 serverless scheduled tasks for continuous data collection |
| **Deployment** | Vercel | Zero-config deployment with edge functions and cron support |

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Vercel Cron Jobs (13 Collectors)              │
│  ┌──────┐ ┌──────────┐ ┌──────┐ ┌────────┐ ┌────────┐ ┌─────────┐ │
│  │ Jobs │ │Web Change│ │ News │ │LinkedIn│ │ Assets │ │ YouTube │ │
│  │(2hr) │ │ (4hr)    │ │(1hr) │ │ (2hr)  │ │ (6hr)  │ │  (6hr)  │ │
│  └──┬───┘ └────┬─────┘ └──┬───┘ └───┬────┘ └───┬────┘ └────┬────┘ │
│  ┌──────┐ ┌──────────┐ ┌──────┐ ┌────────┐ ┌────────┐ ┌─────────┐ │
│  │Social│ │App Store │ │Glass-│ │Reviews │ │Filings │ │  Rates  │ │
│  │(2hr) │ │ (12hr)   │ │door  │ │(daily) │ │(daily) │ │ (12hr)  │ │
│  └──┬───┘ └────┬─────┘ └──┬───┘ └───┬────┘ └───┬────┘ └────┬────┘ │
│     │          │          │         │           │           │       │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │                   Weekly Digest (Mon 2pm)                │       │
│  └─────────────────────────┬────────────────────────────────┘       │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────┐  ┌──────────────┐
│              Gemini AI Layer                     │  │ Slack + Email│
│  • Noise Filtering (relevance 1-10)             │  │              │
│  • Signal Synthesis                             │  │ Weekly Digest│
│  • Dossier Generation (10 categories)           │  │ Exec Briefing│
│  • Executive Briefings                          │  └──────────────┘
│  • Strategic Recommendations                    │
└─────────────────┬────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────┐
│          Supabase (PostgreSQL)                   │
│  • competitors  • signals  • snapshots          │
│  • dossiers     • digests                       │
│  • Row Level Security • Realtime subscriptions  │
└─────────────────┬────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────┐
│         Next.js Dashboard                        │
│  • AI Executive Briefing (Gemini-generated)     │
│  • Signal Velocity Charts (8-week sparklines)   │
│  • Signal Feed (time-bucketed, clustered)       │
│  • Competitor Management                         │
│  • Living Dossiers (10-category strategic view) │
│  • Supabase Auth (protected routes)             │
│  • Real-time signal ingestion via WebSocket     │
└──────────────────────────────────────────────────┘
```

## Signal Selection Rationale

We monitor **13 distinct channels** across 6 API sources, each chosen for its value as a **leading or lagging indicator** of competitive strategy:

### Leading Indicators (Predict future moves)

#### 1. Talent Radar (Job Postings)
- **Why**: Hiring is one of the strongest leading indicators. A "VP of AI" hire signals technology investment months before a product launches. Regional Director hires signal market expansion plans.
- **Method**: SearchAPI.io Google Jobs search, career page monitoring
- **Noise vs. Signal**: Senior leadership and specialized roles (VP, Director, Head of) score 7-10. Routine operational hires (Housekeeping, Front Desk) score 1-4.

#### 2. Digital Footprint (Website Changes)
- **Why**: Website changes reveal strategic pivots in real-time. A new "Corporate Solutions" page means B2B expansion. New market landing pages signal geographic growth.
- **Method**: Periodic HTML fetching, text extraction, MD5 content hashing, and sentence-level diff analysis across homepage + 5 key subpages
- **Noise vs. Signal**: Structural changes (new sections, new markets) score 7-10. Cosmetic changes (typos, image swaps) score 1-3.

#### 3. LinkedIn Activity
- **Why**: Executive posts and company updates often telegraph strategic intent before formal announcements. Hiring surges visible in post frequency.
- **Method**: ScraperAPI with Apify fallback for company post monitoring
- **Noise vs. Signal**: Executive thought leadership and company announcements score 6-9. Routine content marketing scores 1-4.

#### 4. App Store Updates
- **Why**: App version history reveals product investment velocity. Feature changelogs expose technology strategy (AI, automation, guest experience).
- **Method**: Direct App Store / Play Store monitoring
- **Noise vs. Signal**: Major feature launches score 7-10. Bug fixes and minor updates score 1-3.

### Lagging Indicators (Confirm strategic shifts)

#### 5. News & Press
- **Why**: Press releases, funding announcements, and executive interviews directly communicate strategy. A Series C announcement reveals growth plans and competitive positioning.
- **Method**: Perigon API (primary) with Google News RSS fallback
- **Noise vs. Signal**: Funding rounds, market launches, and executive changes score 8-10. Routine mentions and listicles score 1-4.

#### 6. Asset Watch (Property Listings)
- **Why**: Properties added or removed from booking engines are concrete evidence of geographic expansion or contraction. This is the ultimate lagging indicator for hospitality.
- **Method**: Direct listing page monitoring with snapshot diffing
- **Noise vs. Signal**: New market entries score 8-10. Individual property additions score 4-6.

#### 7. Rate Intelligence (Pricing)
- **Why**: Pricing strategy reveals competitive positioning — are they going upmarket, discounting, or holding? Rate changes across markets signal demand response.
- **Method**: Apify Airbnb/Booking.com scrapers
- **Noise vs. Signal**: Significant rate strategy shifts score 7-10. Normal seasonal fluctuations score 2-4.

#### 8. Customer Reviews (Google Maps)
- **Why**: Review trends reveal service quality and guest satisfaction trajectory. A sudden drop in ratings signals operational problems.
- **Method**: SearchAPI.io Google Maps reviews
- **Noise vs. Signal**: Rating trend changes and recurring complaint themes score 6-9. Individual reviews score 1-3.

#### 9. Employee Sentiment (Glassdoor)
- **Why**: Internal culture signals predict talent retention and organizational health. Leadership rating drops often precede executive departures.
- **Method**: Glassdoor page monitoring via ScraperAPI
- **Noise vs. Signal**: Rating trend shifts and management feedback themes score 6-8. Individual reviews score 1-3.

### Contextual Signals (Strategic context)

#### 10. Social Mentions
- **Why**: Brand buzz and share-of-voice indicate market mindshare. Spikes often correlate with announcements or PR campaigns.
- **Method**: Multi-platform social monitoring
- **Noise vs. Signal**: Viral moments and brand-associated trends score 6-9. Routine mentions score 1-3.

#### 11. YouTube Activity
- **Why**: Video content (property tours, executive interviews, brand campaigns) reveals marketing strategy and target audience positioning.
- **Method**: SearchAPI.io YouTube search
- **Noise vs. Signal**: Executive interviews and brand campaigns score 6-9. User-generated content score 1-3.

#### 12. Financial Filings (SEC)
- **Why**: For publicly traded competitors, SEC filings provide hard data on revenue, margins, strategic priorities, and risk factors.
- **Method**: SEC EDGAR API for 10-K, 10-Q, and 8-K filings
- **Noise vs. Signal**: Earnings reports and material events score 8-10. Routine filings score 3-5.

#### 13. Weekly Digest (AI Synthesis)
- **Why**: Intelligence is useless if it isn't seen. The weekly digest synthesizes all strategic signals into an actionable brief for the executive team.
- **Method**: Gemini AI generates an executive summary delivered via Slack and email every Monday at 2pm
- **Filter**: Only signals with relevance score 5+ are included, with AI-generated "why it matters" analysis.

## How We Filter Noise

Every detected signal passes through the **Gemini AI noise filter** before being stored:

1. **Signal is detected** by one of 13 collectors (job posting, website diff, news article, etc.)
2. **Gemini analyzes** the signal with a hospitality-industry-specific prompt
3. **Relevance score** (1-10) is assigned based on strategic importance
4. **Signals scoring 5+** are marked as `is_strategically_relevant = true`
5. **Dashboard** defaults to showing only strategic signals (with toggle to see all)
6. **Executive Briefing** at the top of the dashboard provides an AI-generated 2-3 sentence landscape assessment
7. **Signal Velocity** charts reveal which competitors are accelerating activity — a spike from 2 to 15 signals/week is a leading indicator
8. **Weekly digest** only includes relevant signals, with Gemini synthesizing "why it matters"

### Scoring Guide
- **8-10 (Critical)**: Major strategic shifts — funding, acquisitions, leadership hires, new market launches
- **5-7 (Moderate)**: Team expansion, feature updates, partnerships, pricing shifts
- **1-4 (Noise)**: Routine hires, minor website updates, tangential mentions, seasonal rate changes

### Change Detection Design

We use **scheduled polling with snapshot diffing** rather than event-based monitoring:

- **Approach**: Vercel Cron Jobs run 13 collectors at intervals from 1 hour (news) to daily (Glassdoor, filings)
- **Snapshot Storage**: Previous state stored in `snapshots` table with MD5 content hashing
- **Diff Algorithm**: Sentence-level comparison for web changes, URL/title deduplication for news/jobs
- **Deduplication**: 7-14 day suppression windows prevent duplicate signal alerts
- **Tradeoff**: Scheduled checks are pragmatic for a serverless deployment — competitive intelligence doesn't require sub-minute latency. The fastest collector (news) runs hourly, sufficient for the pace of the hospitality industry.

## Key Assumptions & Shortcuts

1. **Sample Data**: The seed script pre-loads realistic sample signals for Placemakr, AvantStay, and Lark to demonstrate the system immediately. In production, all data comes from live collectors.

2. **API Dependencies**: Job collection uses SearchAPI.io (Google Jobs). News collection uses Perigon API with Google News RSS fallback. LinkedIn uses ScraperAPI with Apify fallback. Rate monitoring uses Apify for Airbnb/Booking.com.

3. **Dossier Generation**: Dossiers are generated on-demand (user clicks "Refresh") rather than automatically, to control AI API costs. In production, this could be automated weekly.

4. **Cost Efficiency**: Gemini 2.0 Flash is chosen for its speed and low cost (~$0.001/request). All prompts are optimized to return structured JSON, minimizing token usage. Total estimated cost: <$5/month for 3 competitors.

5. **Executive Briefing**: Generated on-demand when the dashboard loads, using Gemini to synthesize the week's strategic signals into a CEO-ready assessment. Cached client-side for the session.

## Setup Instructions

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)
- Google Gemini API key
- (Optional) SearchAPI.io key, Perigon key, ScraperAPI key, Apify token, Slack webhook URL, Resend API key

### 1. Clone & Install

```bash
git clone <repo-url>
cd KasaInteli
npm install
```

### 2. Environment Variables

```bash
cp .env.local.example .env.local
# Edit .env.local with your keys
```

### 3. Database Setup

Run the SQL migrations in your Supabase SQL Editor:

```bash
# Copy the contents of supabase/migrations/*.sql
# and run them in order in Supabase Dashboard > SQL Editor
```

### 4. Seed Data

```bash
npx tsx scripts/seed.ts
```

### 5. Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000`, create an account, and explore the dashboard.

### 6. Deploy to Vercel

```bash
vercel deploy
```

Set environment variables in Vercel Dashboard > Settings > Environment Variables. Cron jobs are automatically configured via `vercel.json`.

## Deliverables Checklist

- [x] **Live Working Prototype**: Next.js app with Supabase Auth login
- [x] **Feed View**: Scrollable timeline with signal type and competitor filters, time-bucketed (72h / 7d / older)
- [x] **Competitor Management**: Add/remove companies to track with auto-fill
- [x] **Change Detection**: MD5 content hashing + sentence-level diffing for 13 channels
- [x] **Competitor Dossier**: AI-generated living profiles with 10 analysis categories
- [x] **Strategic Recommendations**: Optimization, impact, and action for each competitor
- [x] **Weekly Digest**: Slack + email delivered intelligence brief via Monday cron
- [x] **Noise Filtering**: Gemini-powered relevance scoring (1-10) on every signal
- [x] **Executive Briefing**: AI-generated CEO-ready landscape summary at top of dashboard
- [x] **Signal Velocity**: 8-week sparkline charts showing activity trends per competitor
- [x] **Real-time Updates**: Supabase Realtime WebSocket for live signal ingestion
- [x] **README**: Architecture, signal rationale, noise filtering, design tradeoffs, assumptions
