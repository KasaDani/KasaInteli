/**
 * Seed script to populate the database with initial competitors and sample signals.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Requires environment variables to be set in .env.local
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const competitors = [
  {
    name: 'Placemakr',
    website: 'https://www.placemakr.com',
    careers_url: 'https://www.placemakr.com/careers',
    description:
      'Placemakr transforms traditional apartments into flexible, hospitality-driven living spaces. They operate a hybrid model combining traditional apartment leasing with short and mid-term stays.',
  },
  {
    name: 'AvantStay',
    website: 'https://www.avantstay.com',
    careers_url: 'https://www.avantstay.com/careers',
    description:
      'AvantStay is a technology-driven hospitality brand that manages premium short-term rental properties. They focus on group travel and high-end vacation homes with proprietary technology.',
  },
  {
    name: 'Lark',
    website: 'https://www.staylark.com',
    careers_url: null,
    description:
      'Lark (formerly Stay Alfred) provides furnished apartments for short-term stays in urban markets. They focus on downtown locations and a hybrid hospitality model.',
  },
];

const sampleSignals = [
  // Placemakr signals
  {
    competitor_name: 'Placemakr',
    signal_type: 'hiring',
    title: 'New job posting: VP of Technology',
    summary:
      'Placemakr is hiring a VP of Technology, signaling a potential expansion of their tech capabilities and possibly new platform features. This is a senior leadership hire that suggests strategic investment in technology as a differentiator.',
    relevance_score: 9,
    is_strategically_relevant: true,
    detected_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://www.placemakr.com/careers',
    raw_data: {
      title: 'VP of Technology',
      location: 'Washington, DC',
      content_hash: 'sample-placemakr-vp-tech',
    },
  },
  {
    competitor_name: 'Placemakr',
    signal_type: 'hiring',
    title: 'New job posting: Regional Director, Southeast',
    summary:
      'Placemakr is hiring a Regional Director for the Southeast, indicating planned expansion into new markets in the southeastern United States. This suggests geographic diversification beyond their current urban cores.',
    relevance_score: 8,
    is_strategically_relevant: true,
    detected_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://www.placemakr.com/careers',
    raw_data: {
      title: 'Regional Director, Southeast',
      location: 'Atlanta, GA',
      content_hash: 'sample-placemakr-rd-southeast',
    },
  },
  {
    competitor_name: 'Placemakr',
    signal_type: 'news_press',
    title: 'Placemakr Announces $50M Series C Funding Round',
    summary:
      'Placemakr has raised $50M in Series C funding, led by Redpoint Ventures. The funding will accelerate expansion into 10 new markets and further develop their technology platform. This is a major capital infusion that increases competitive pressure.',
    relevance_score: 10,
    is_strategically_relevant: true,
    detected_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://techcrunch.com/placemakr-series-c',
    raw_data: {
      url_hash: 'sample-placemakr-series-c',
      source: 'TechCrunch',
    },
  },
  {
    competitor_name: 'Placemakr',
    signal_type: 'digital_footprint',
    title: 'Website change: Placemakr',
    summary:
      'Placemakr updated their homepage to feature a new "Corporate Solutions" section, suggesting a strategic pivot toward B2B corporate housing. This could represent a new revenue stream targeting enterprise clients.',
    relevance_score: 7,
    is_strategically_relevant: true,
    detected_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://www.placemakr.com',
    raw_data: {
      diff: 'ADDED: Corporate Solutions - Flexible housing for your team',
      url: 'https://www.placemakr.com',
    },
  },

  // AvantStay signals
  {
    competitor_name: 'AvantStay',
    signal_type: 'hiring',
    title: 'New job posting: Head of AI & Machine Learning',
    summary:
      'AvantStay is hiring a Head of AI & Machine Learning, indicating significant investment in AI-driven operations. This could lead to automated pricing, guest experience optimization, and operational efficiencies that give them a technology edge.',
    relevance_score: 9,
    is_strategically_relevant: true,
    detected_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://www.avantstay.com/careers',
    raw_data: {
      title: 'Head of AI & Machine Learning',
      location: 'Los Angeles, CA',
      content_hash: 'sample-avantstay-head-ai',
    },
  },
  {
    competitor_name: 'AvantStay',
    signal_type: 'news_press',
    title: 'AvantStay Expands into Miami with 15 New Properties',
    summary:
      'AvantStay announced expansion into the Miami market with 15 luxury properties, targeting the high-end group travel segment. Miami represents a strategic market for hospitality tech companies given tourism volume.',
    relevance_score: 8,
    is_strategically_relevant: true,
    detected_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://www.hospitalitynet.org/avantstay-miami',
    raw_data: {
      url_hash: 'sample-avantstay-miami',
      source: 'Hospitality Net',
    },
  },
  {
    competitor_name: 'AvantStay',
    signal_type: 'asset_watch',
    title: 'AvantStay adds 15 properties in Miami Beach',
    summary:
      'New property listings detected in Miami Beach area, including several beachfront luxury homes. This expansion into the luxury Miami market positions AvantStay to capture high-revenue group bookings.',
    relevance_score: 7,
    is_strategically_relevant: true,
    detected_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://www.avantstay.com/miami',
    raw_data: {
      location: 'Miami Beach, FL',
      property_count: 15,
    },
  },

  // Lark signals
  {
    competitor_name: 'Lark',
    signal_type: 'digital_footprint',
    title: 'Website change: Lark',
    summary:
      'Lark has completely rebranded their website, dropping the "Stay Alfred" branding entirely. The new site emphasizes "urban living redefined" and showcases new markets including Denver, Nashville, and Austin. This rebrand signals a strategic reset.',
    relevance_score: 8,
    is_strategically_relevant: true,
    detected_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://www.staylark.com',
    raw_data: {
      diff: 'ADDED: Urban living redefined. REMOVED: Stay Alfred references.',
      url: 'https://www.staylark.com',
    },
  },
  {
    competitor_name: 'Lark',
    signal_type: 'hiring',
    title: 'New job posting: Director of Partnerships',
    summary:
      'Lark is hiring a Director of Partnerships, suggesting they are building out their B2B channel and seeking property management or real estate partnerships. This could accelerate their inventory growth strategy.',
    relevance_score: 7,
    is_strategically_relevant: true,
    detected_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://www.staylark.com/careers',
    raw_data: {
      title: 'Director of Partnerships',
      location: 'Remote',
      content_hash: 'sample-lark-dir-partnerships',
    },
  },
  {
    competitor_name: 'Lark',
    signal_type: 'news_press',
    title: 'Lark Launches in Nashville Market',
    summary:
      'Lark has officially launched operations in Nashville with 8 downtown properties. Nashville is a high-growth market for short-term rentals, and this entry increases competitive pressure for Kasa in the mid-south region.',
    relevance_score: 8,
    is_strategically_relevant: true,
    detected_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    source_url: 'https://www.bizjournals.com/nashville/lark-launch',
    raw_data: {
      url_hash: 'sample-lark-nashville',
      source: 'Nashville Business Journal',
    },
  },
];

async function seed() {
  console.log('Seeding database...');

  // Insert competitors
  for (const comp of competitors) {
    const { data, error } = await supabase
      .from('competitors')
      .upsert(comp, { onConflict: 'name' })
      .select()
      .single();

    if (error) {
      // If upsert fails due to no unique constraint on name, try insert
      const { data: insertData, error: insertError } = await supabase
        .from('competitors')
        .insert(comp)
        .select()
        .single();

      if (insertError) {
        console.error(`Error inserting ${comp.name}:`, insertError.message);
        continue;
      }
      console.log(`Inserted competitor: ${insertData.name} (${insertData.id})`);
    } else {
      console.log(`Upserted competitor: ${data.name} (${data.id})`);
    }
  }

  // Get competitor IDs
  const { data: allCompetitors } = await supabase.from('competitors').select('id, name');
  const competitorMap = new Map(allCompetitors?.map((c) => [c.name, c.id]) || []);

  // Insert sample signals
  for (const signal of sampleSignals) {
    const competitorId = competitorMap.get(signal.competitor_name);
    if (!competitorId) {
      console.error(`Competitor not found: ${signal.competitor_name}`);
      continue;
    }

    const { error } = await supabase.from('signals').insert({
      competitor_id: competitorId,
      signal_type: signal.signal_type,
      title: signal.title,
      summary: signal.summary,
      relevance_score: signal.relevance_score,
      is_strategically_relevant: signal.is_strategically_relevant,
      detected_at: signal.detected_at,
      source_url: signal.source_url,
      raw_data: signal.raw_data,
    });

    if (error) {
      console.error(`Error inserting signal "${signal.title}":`, error.message);
    } else {
      console.log(`Inserted signal: ${signal.title}`);
    }
  }

  console.log('Seeding complete!');
}

seed().catch(console.error);
