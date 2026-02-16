# KasaInteli — AI-Powered Competitive Intelligence System

> A real-time competitive intelligence platform that monitors hospitality-tech competitors and surfaces strategically relevant signals for Kasa's executive team.

**Live Prototype**: [kasainteli.vercel.app](https://kasainteli.vercel.app)

---

## Architecture & Tools

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  Next.js 16 (App Router) · React 19 · Tailwind CSS · shadcn/ui │
│  Framer Motion animations · Supabase Realtime subscriptions      │
├─────────────────────────────────────────────────────────────────┤
│                     BACKEND (Serverless)                         │
│  Next.js API Routes · Server Actions · Vercel Serverless Fns    │
│  13 Independent Cron Jobs (Vercel Cron)                          │
├─────────────────────────────────────────────────────────────────┤
│                      AI ENGINE                                   │
│  Google Gemini 2.0 Flash                                         │
│  → Signal relevance scoring (1-10)                               │
│  → Competitor dossier generation (10 categories)                 │
│  → Weekly digest synthesis                                       │
│  → Real-time executive summaries                                 │
├─────────────────────────────────────────────────────────────────┤
│                      DATABASE                                    │
│  Supabase (PostgreSQL) · Row Level Security · Realtime enabled  │
│  Tables: competitors, signals, snapshots, dossiers, digests      │
├─────────────────────────────────────────────────────────────────┤
│                   DATA COLLECTION LAYER                          │
│  ScraperAPI · SearchAPI.io · Perigon · Apify · SEC EDGAR        │
│  Direct HTTP scraping with fallback chains                       │
├─────────────────────────────────────────────────────────────────┤
│                      DELIVERY                                    │
│  Slack Webhook (weekly digest) · Resend Email (weekly digest)   │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 16 (App Router) | Full-stack serverless — API routes, server components, and frontend in one deployable unit. Zero infrastructure to manage. |
| **Frontend** | React 19, Tailwind CSS, shadcn/ui, Framer Motion | Modern, accessible component library with smooth animations for an executive-facing dashboard. |
| **Database** | Supabase (PostgreSQL) | Instant PostgreSQL with built-in auth, Row Level Security, and Realtime WebSocket subscriptions — no backend server needed. |
| **AI** | Google Gemini 2.0 Flash | Fast, cost-effective LLM for high-volume signal analysis. Processes hundreds of signals per day within budget. |
| **Scraping** | ScraperAPI, SearchAPI.io, Perigon API, Apify | Multi-source redundancy. ScraperAPI handles JS-rendered pages (LinkedIn, Glassdoor). SearchAPI.io provides structured Google search results. Perigon offers curated news. Apify fills gaps (Airbnb rates, LinkedIn fallback). |
| **Deployment** | Vercel | Native cron job support (13 scheduled collectors), serverless functions, edge middleware, zero-config deploys. |
| **Email** | Resend | Developer-friendly transactional email with high deliverability. |
| **Notifications** | Slack Webhooks | Direct integration with the channel executives already use. |

### Cron Job Schedule

| Collector | Frequency | Rationale |
|-----------|-----------|-----------|
| News & Press | Every hour | News breaks fast; hourly ensures we catch stories before they go stale |
| Job Postings | Every 2 hours | Job boards update frequently; senior hires are high-signal |
| LinkedIn Posts | Every 2 hours | Company announcements often land on LinkedIn first |
| Social Mentions | Every 2 hours | Reddit/Twitter discussions can surface sentiment shifts quickly |
| Website Changes | Every 4 hours | Websites don't change minute-to-minute; 4h balances freshness with cost |
| Asset Watch | Every 6 hours | Property listings change slowly; 6h is sufficient |
| YouTube/Podcasts | Every 6 hours | Media appearances are infrequent; 6h catches them same-day |
| Rate Intelligence | Every 12 hours | Nightly rates shift daily, not hourly |
| App Store | Every 12 hours | App updates are infrequent; twice daily is plenty |
| Google Reviews | Daily (6am) | Review aggregates shift slowly |
| SEC Filings | Daily (7am) | SEC EDGAR updates once per business day |
| Glassdoor | Daily (8am) | Employee sentiment shifts slowly |
| **Weekly Digest** | **Mondays 2pm** | **Arrives at the start of the executive week** |

---

## Why These Specific Signals (Signal vs. Noise)

### The Selection Framework

We prioritized signals that answer three strategic questions:
1. **Where is the competitor going?** (leading indicators)
2. **How strong are they right now?** (lagging indicators)
3. **What can Kasa exploit or defend against?** (actionable intelligence)

### Signal Channels — Ranked by Strategic Value

#### Tier 1: Highest Strategic Value

| Signal | Why It Matters | Example |
|--------|---------------|---------|
| **Job Postings (Talent Radar)** | Hiring reveals strategy before it's announced. A "VP of AI" posting signals a tech pivot months before any product launch. Senior departures signal instability. | AvantStay hiring a Revenue Management Director → they're investing in pricing optimization |
| **News & Press** | Funding rounds, acquisitions, and market launches are the clearest strategic signals. Infrequent but high-impact. | Placemakr announces Series C → capital for aggressive expansion |
| **Asset Watch (Property Listings)** | New markets = growth. Removed markets = contraction or pivot. Directly maps to competitive footprint. | Lark adds 3 properties in Phoenix → entering Kasa's market |
| **SEC Filings** | 10-K/10-Q reveal financial health. 8-K reveals material events. S-1 signals IPO ambitions. Most competitors are private, but monitoring catches any that file. | An 8-K filing about executive departure at a public competitor |

#### Tier 2: Strong Contextual Value

| Signal | Why It Matters |
|--------|---------------|
| **LinkedIn Posts** | Company-controlled narrative — reveals what competitors *want* the market to think. Product announcements, partnership reveals, culture signals. |
| **Website Changes** | New "Coming Soon" pages, pricing changes, messaging shifts all signal strategic pivots before press releases. |
| **Rate Intelligence** | Pricing is strategy made visible. Rate increases signal confidence; rate drops signal desperation or market entry pricing. |
| **App Store Updates** | App investment = technology strategy. Release notes reveal feature priorities. Rating changes signal product quality shifts. |

#### Tier 3: Valuable Sentiment Indicators

| Signal | Why It Matters |
|--------|---------------|
| **Glassdoor (Employee Sentiment)** | CEO approval drops and review surges signal internal problems (layoffs, culture issues) before they become public. |
| **Google Reviews (Customer Sentiment)** | Rating drops across properties signal operational problems. Review surges can indicate viral negative experiences. |
| **Social Mentions** | Reddit threads and Twitter discussions surface unfiltered customer and industry sentiment. |
| **YouTube/Podcasts** | Executive interviews reveal strategy in their own words. Often more candid than press releases. |

### What We Deliberately Excluded

- **Patent filings**: Hospitality-tech competitors rarely file patents; the signal-to-noise ratio is extremely low.
- **Domain registrations**: Too noisy — companies register dozens of domains speculatively.
- **Social media follower counts**: Vanity metric with no strategic predictive value.
- **General industry news**: We only track news that *specifically names* a monitored competitor, not broad hospitality trends.

---

## How We Filter Out the Noise

### Three-Layer Noise Filtering Pipeline

```
Raw Data → Layer 1: Source Filtering → Layer 2: Change Detection → Layer 3: AI Relevance Gate → Dashboard
  100%          ~60% pass                   ~40% pass                  ~25% pass
```

### Layer 1: Source-Level Filtering

Before any data enters the system, we apply domain-specific filters at the collection layer:

- **News**: Queries include hospitality-context keywords (`"short-term rental" OR funding OR acquisition OR expansion`). Generic mentions are excluded at the search level.
- **Jobs**: Only postings from the exact competitor company name. We don't track every job board — we search Google Jobs which aggregates all sources.
- **SEC Filings**: Only material form types (10-K, 10-Q, 8-K, S-1, S-3, DEF 14A). We skip routine amendments and minor filings.
- **Social**: Site-restricted searches (`site:reddit.com`, `site:twitter.com`) with hospitality context. We don't crawl entire platforms.
- **Reviews**: Only properties that match the competitor's name (case-insensitive). We don't track every hotel in a city.

### Layer 2: Snapshot-Based Change Detection

Static data is not intelligence. We only generate signals when something *changes*:

- Every collector stores a **snapshot** (current state) in the database with an MD5 content hash.
- On the next run, the new state is compared against the stored snapshot.
- **Only differences generate signals**:
  - New job posting that wasn't there 2 hours ago → signal
  - Same 50 job listings as before → no signal
  - Website text changed by 3 paragraphs → signal
  - Website identical to last check → no signal
- **Thresholds prevent micro-noise**:
  - Google Review rating change must be >= 0.3 (not 0.1)
  - Rate change must be >= 5% (not 1%)
  - Glassdoor CEO approval must shift >= 10 percentage points
  - Review count must surge >= 15-25% (not slow organic growth)

### Layer 3: AI Relevance Gate (Gemini)

Every signal that passes Layers 1 and 2 is evaluated by Google Gemini 2.0 Flash:

```
Prompt: "You are a senior competitive intelligence analyst at Kasa,
a flexible-stay hospitality company. Rate this signal 1-10 for
strategic relevance. A score of 1 means routine noise (e.g., a typo
fix on a website). A score of 10 means a major strategic shift
(e.g., entering a new market or hiring a C-suite executive)."
```

- **Score 1-2**: Discarded entirely (never stored)
- **Score 3-4**: Stored but NOT marked strategically relevant (available for deep-dive research)
- **Score 5-10**: Marked `is_strategically_relevant = true` — appears in the signal feed, weekly digest, and executive summary
- The AI also generates a **one-line strategic summary** explaining *why* the signal matters, not just *what* happened

### Deduplication (Cross-Cutting)

Duplicate signals are the most common form of noise. We prevent them at multiple levels:

- **URL deduplication**: MD5 hash of normalized URL prevents the same article from appearing via Perigon *and* Google News
- **Title matching**: Normalized first-60-characters comparison catches rephrased duplicates
- **Content hashing**: LinkedIn posts and job listings are hashed by content to detect true duplicates vs. re-posts
- **Time-window guards**: No duplicate signals within 7-14 days (configurable per signal type)
- **Cross-source merging**: News articles from 3 sources are merged before AI scoring, not after

---

## Key Assumptions and Shortcuts

### Assumptions

1. **Competitors are identifiable by company name**: We assume searching for "Placemakr" or "AvantStay" in news, jobs, and social media returns relevant results. For companies with generic names, this could produce false positives.

2. **English-language, US-focused**: All queries and analysis target English-language sources and US markets. International expansion signals may be missed.

3. **Public data is sufficient**: We only monitor publicly available information. We don't use any paid competitive intelligence databases, employee networks, or proprietary data feeds.

4. **Gemini 2.0 Flash is accurate enough**: We trust Gemini's relevance scoring for initial filtering. Occasional misclassification is acceptable because users can view all signals (not just strategic ones) via the filter toggle.

5. **Weekly digest cadence is appropriate**: We assumed executives want a weekly summary, not daily. The real-time dashboard serves users who want immediate updates.

6. **Competitors have standard web presence**: We assume competitors have a website, job postings, and some social media presence. The system gracefully skips collectors when a competitor lacks a specific URL (e.g., no Glassdoor page).

### Shortcuts Taken

1. **Keyword-based scoring for initial bulk collection**: When a competitor is first added, we backfill 90 days of news and jobs using fast keyword matching instead of Gemini AI scoring. This avoids rate limits and costs during the initial data load. Ongoing monitoring uses full AI scoring.

2. **Regex-based HTML parsing instead of proper DOM parsing**: Collectors use regex patterns to extract data from HTML (job titles, review counts, post text). This is fragile but fast to implement. A production system would use a proper HTML parser like Cheerio.

3. **No pagination on most scrapers**: We fetch the first page of results from each source (typically 10-30 items). Deep pagination would catch more signals but significantly increases cost and complexity.

4. **Simplified rate monitoring**: We search for competitor names on Airbnb/Booking.com rather than tracking specific known properties. A production system would maintain a property-level inventory and track each unit's pricing over time.

5. **Single snapshot per collector**: We store only the latest snapshot for change detection, not a full history of snapshots. This keeps storage minimal but means we can only detect changes since the last run, not reconstruct the full history of states.

6. **No email verification on signup**: Supabase auth is configured without mandatory email verification for faster demo access. A production system would require verification.

7. **Shared database for all users**: All authenticated users see all competitors and signals. There's no multi-tenancy or per-user competitor lists. This is appropriate for a single-team tool but wouldn't scale to multiple organizations.

8. **Sample data for demonstration**: The seed script pre-loads Placemakr, AvantStay, and Lark with sample signals and a sample dossier so the system has content immediately on first login.

---

## Project Structure

```
KasaInteli/
├── app/
│   ├── (app)/                    # Authenticated routes
│   │   ├── dashboard/            # Main intelligence dashboard
│   │   │   ├── page.tsx          # Dashboard with stats, trends, feed
│   │   │   └── digest-preview/   # Digest preview & test send
│   │   └── competitors/
│   │       ├── page.tsx          # Competitor list
│   │       ├── actions.ts        # Add/remove/toggle competitors
│   │       └── [id]/
│   │           ├── page.tsx      # Competitor dossier view
│   │           └── actions.ts    # Refresh dossier action
│   ├── api/
│   │   ├── competitors/          # GET all competitors
│   │   ├── signals/              # GET filtered signals
│   │   ├── signal-trends/        # GET 8-week trend data
│   │   ├── executive-summary/    # GET AI executive briefing
│   │   ├── lookup-competitor/    # GET auto-detect company info
│   │   ├── collect-initial/      # POST trigger initial collection
│   │   ├── dossiers/[id]/        # GET competitor dossier
│   │   ├── digest/
│   │   │   ├── preview/          # GET digest HTML preview
│   │   │   └── send-test/        # POST send test email
│   │   └── cron/                 # 13 scheduled collector endpoints
│   │       ├── collect-jobs/
│   │       ├── collect-news/
│   │       ├── collect-web-changes/
│   │       ├── collect-assets/
│   │       ├── collect-linkedin/
│   │       ├── collect-social/
│   │       ├── collect-youtube/
│   │       ├── collect-app-store/
│   │       ├── collect-glassdoor/
│   │       ├── collect-rates/
│   │       ├── collect-reviews/
│   │       ├── collect-filings/
│   │       └── digest/
│   ├── login/                    # Login/signup page
│   └── auth/callback/            # Supabase auth callback
├── components/
│   ├── app-shell.tsx             # Navigation bar
│   ├── add-competitor-dialog.tsx # Multi-phase add competitor flow
│   ├── signal-feed.tsx           # Grouped signal timeline
│   ├── signal-card.tsx           # Individual signal display
│   ├── signal-filters.tsx        # Type/competitor/relevance filters
│   ├── signal-trends.tsx         # Sparkline trend charts
│   ├── competitor-list.tsx       # Competitor grid
│   ├── dossier-view.tsx          # Full dossier display (10 sections)
│   ├── executive-summary.tsx     # AI executive briefing card
│   ├── stats-cards.tsx           # Dashboard metric cards
│   ├── realtime-signal-provider.tsx # Supabase Realtime wrapper
│   └── motion/                   # Animation components
├── lib/
│   ├── gemini.ts                 # AI analysis engine (4 functions)
│   ├── slack.ts                  # Slack webhook integration
│   ├── email.ts                  # Resend email delivery
│   ├── types.ts                  # TypeScript type definitions
│   ├── collectors/               # 13 signal collectors
│   │   ├── jobs.ts               # Job postings (SearchAPI.io)
│   │   ├── news.ts               # News (Perigon + RSS + SearchAPI)
│   │   ├── web-changes.ts        # Website monitoring (direct HTTP)
│   │   ├── asset-watch.ts        # Property listings (ScraperAPI)
│   │   ├── linkedin.ts           # LinkedIn posts (ScraperAPI + Apify)
│   │   ├── social.ts             # Social mentions (SearchAPI.io)
│   │   ├── youtube.ts            # YouTube & podcasts (SearchAPI.io)
│   │   ├── app-store.ts          # App Store monitoring (ScraperAPI)
│   │   ├── glassdoor.ts          # Employee sentiment (ScraperAPI)
│   │   ├── rate-monitor.ts       # Rate intelligence (Apify + ScraperAPI)
│   │   ├── google-reviews.ts     # Customer reviews (SearchAPI.io)
│   │   ├── sec-filings.ts        # SEC filings (EDGAR API)
│   │   └── initial-collect.ts    # Bulk initial backfill
│   └── supabase/
│       ├── client.ts             # Browser Supabase client
│       ├── server.ts             # Server Supabase client + service role
│       └── middleware.ts         # Auth session refresh
├── supabase/migrations/          # 5 SQL migration files
├── scripts/seed.ts               # Database seeding script
├── vercel.json                   # Cron job schedules
└── middleware.ts                 # Route protection
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project (free tier works)
- Google Gemini API key

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_key

# Optional (for full functionality)
CRON_SECRET=your_cron_secret
SLACK_WEBHOOK_URL=your_slack_webhook
RESEND_API_KEY=your_resend_key
DIGEST_EMAIL_TO=recipient@example.com
PERIGON_API_KEY=your_perigon_key
SEARCHAPI_API_KEY=your_searchapi_key
SCRAPER_API_KEY=your_scraperapi_key
APIFY_API_TOKEN=your_apify_token
```

### Install & Run

```bash
npm install
npm run seed    # Seed sample data
npm run dev     # Start development server
```

### Deploy

```bash
vercel deploy   # Deploys with cron jobs automatically
```

---

## Deliverables Checklist

- [x] **Live Working Prototype** — Deployed on Vercel with login, competitor management, and real-time signal feed
- [x] **Weekly Digest** — AI-generated intelligence brief delivered via Slack and email (sample + live)
- [x] **Sample Alert** — Real-time toast notifications + urgency badges on the dashboard
- [x] **Competitor Dossier** — 10-section AI-generated strategic profile with SWOT and recommendations
- [x] **README** — Architecture, signal rationale, noise filtering methodology, assumptions and shortcuts
