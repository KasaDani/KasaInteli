# Kasa Intelligence - Competitive Intelligence Platform

An AI-powered competitive intelligence system that continuously monitors hospitality tech competitors and surfaces strategically relevant signals for the CEO and Executive Team.

## Live Demo

**URL**: [Deployed on Vercel] _(add your deployment URL here)_

**Login**: Create an account via the sign-up form, or use pre-configured credentials.

## Architecture & Tools

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 16 (App Router) | Server Components for fast data loading, Server Actions for mutations, API routes for cron jobs |
| **UI** | Tailwind CSS + shadcn/ui | Polished, accessible component library with dark mode support |
| **Database** | Supabase (PostgreSQL) | Managed Postgres with built-in auth, RLS policies, and real-time capabilities |
| **Auth** | Supabase Auth | Email/password authentication with middleware-based route protection |
| **AI** | Google Gemini 2.0 Flash | Fast, cost-effective model for signal analysis, noise filtering, and strategic synthesis |
| **Digest** | Slack Incoming Webhook | Weekly intelligence briefs delivered directly to Slack |
| **Scheduling** | Vercel Cron Jobs | Serverless scheduled tasks for data collection |
| **Deployment** | Vercel | Zero-config deployment with edge functions and cron support |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Cron Jobs                      │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌────────┐ │
│  │ Jobs     │ │ Web Changes  │ │ News     │ │ Digest │ │
│  │ (6hr)    │ │ (12hr)       │ │ (6hr)    │ │ (Mon)  │ │
│  └────┬─────┘ └──────┬───────┘ └────┬─────┘ └───┬────┘ │
└───────┼──────────────┼──────────────┼────────────┼──────┘
        │              │              │            │
        ▼              ▼              ▼            ▼
┌─────────────────────────────────────────────┐  ┌──────┐
│            Gemini AI Layer                  │  │Slack │
│  • Noise Filtering (relevance 1-10)        │  │      │
│  • Signal Synthesis                        │  │      │
│  • Dossier Generation                      │  └──────┘
│  • Strategic Recommendations               │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│          Supabase (PostgreSQL)              │
│  • competitors  • signals  • snapshots     │
│  • dossiers     • digests                  │
│  • Row Level Security policies             │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│         Next.js Dashboard                   │
│  • Signal Feed (filtered timeline)         │
│  • Competitor Management                    │
│  • Living Dossiers (SWOT, recommendations) │
│  • Supabase Auth (protected routes)        │
└─────────────────────────────────────────────┘
```

## Signal Selection Rationale

We monitor **3 distinct channels**, each chosen for its value as a **leading indicator** of competitive strategy:

### 1. Talent Radar (Job Postings)
- **Why**: Hiring is one of the strongest leading indicators. A "VP of AI" hire signals technology investment months before a product launches. Regional Director hires signal market expansion plans.
- **Method**: SerpAPI Google Jobs search / career page monitoring
- **Noise vs. Signal**: Senior leadership and specialized roles (VP, Director, Head of) score 7-10. Routine operational hires (Housekeeping, Front Desk) score 1-4.

### 2. Digital Footprint (Website Changes)
- **Why**: Website changes reveal strategic pivots in real-time. A new "Corporate Solutions" page means B2B expansion. New market landing pages signal geographic growth.
- **Method**: Periodic HTML fetching, text extraction, content hashing, and diff analysis
- **Noise vs. Signal**: Structural changes (new sections, new markets) score 7-10. Cosmetic changes (typos, image swaps) score 1-3.

### 3. News & Press
- **Why**: Press releases, funding announcements, and executive interviews directly communicate strategy. A Series C announcement reveals growth plans and competitive positioning.
- **Method**: NewsAPI.org with Google News RSS fallback
- **Noise vs. Signal**: Funding rounds, market launches, and executive changes score 8-10. Routine mentions and listicles score 1-4.

## How We Filter Noise

Every detected signal passes through the **Gemini AI noise filter** before being stored:

1. **Signal is detected** by a collector (job posting, website diff, news article)
2. **Gemini analyzes** the signal with a hospitality-industry-specific prompt
3. **Relevance score** (1-10) is assigned based on strategic importance
4. **Signals scoring 5+** are marked as `is_strategically_relevant = true`
5. **Weekly digest** only includes relevant signals, with Gemini synthesizing "why it matters"
6. **Dashboard** defaults to showing only strategic signals (with toggle to see all)

### Scoring Guide
- **8-10 (Critical)**: Major strategic shifts — funding, acquisitions, leadership hires, new market launches
- **5-7 (Moderate)**: Team expansion, feature updates, partnerships
- **1-4 (Noise)**: Routine hires, minor website updates, tangential mentions

## Key Assumptions & Shortcuts

1. **Sample Data**: The seed script pre-loads realistic sample signals for Placemakr, AvantStay, and Lark to demonstrate the system immediately. In production, all data comes from live collectors.

2. **API Dependencies**: Job collection requires SerpAPI (optional, with Google Search fallback). News collection uses NewsAPI.org free tier (100 req/day). Website monitoring uses direct HTTP fetching.

3. **Change Detection**: Uses scheduled polling (cron) rather than event-based monitoring. This is a pragmatic choice for a serverless deployment — Vercel Cron Jobs run every 6-12 hours, sufficient for the pace of competitive intelligence.

4. **Dossier Generation**: Dossiers are generated on-demand (user clicks "Refresh") rather than automatically, to control AI API costs. In production, this could be automated weekly.

5. **Cost Efficiency**: Gemini 2.0 Flash is chosen for its speed and low cost. All prompts are optimized to return structured JSON, minimizing token usage.

## Setup Instructions

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)
- Google Gemini API key
- (Optional) SerpAPI key, NewsAPI key, Slack webhook URL

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

Run the SQL migration in your Supabase SQL Editor:

```bash
# Copy the contents of supabase/migrations/001_initial_schema.sql
# and run it in Supabase Dashboard > SQL Editor
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
- [x] **Feed View**: Scrollable timeline with signal type and competitor filters
- [x] **Competitor Management**: Add/remove companies to track
- [x] **Change Detection**: Content hashing + diffing for website monitoring
- [x] **Competitor Dossier**: AI-generated living profiles with SWOT and recommendations
- [x] **Strategic Recommendations**: Optimization, impact, and action for each competitor
- [x] **Weekly Digest**: Slack-delivered intelligence brief via cron
- [x] **Noise Filtering**: Gemini-powered relevance scoring (1-10)
- [x] **README**: Architecture, signal rationale, noise filtering, assumptions
