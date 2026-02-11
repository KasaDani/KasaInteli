/**
 * Seed script to populate the database with initial competitors, sample signals,
 * a sample dossier, and a sample weekly digest.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Requires environment variables to be set in .env.local
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

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
    listings_url: 'https://www.placemakr.com/locations',
    linkedin_slug: 'placemakr',
    app_store_url: null,
    glassdoor_url: null,
    description:
      'Placemakr transforms traditional apartments into flexible, hospitality-driven living spaces. They operate a hybrid model combining traditional apartment leasing with short and mid-term stays.',
  },
  {
    name: 'AvantStay',
    website: 'https://www.avantstay.com',
    careers_url: 'https://www.avantstay.com/careers',
    listings_url: 'https://www.avantstay.com/vacation-homes',
    linkedin_slug: 'avantstay',
    app_store_url: null,
    glassdoor_url: null,
    description:
      'AvantStay is a technology-driven hospitality brand that manages premium short-term rental properties. They focus on group travel and high-end vacation homes with proprietary technology.',
  },
  {
    name: 'Lark',
    website: 'https://www.staylark.com',
    careers_url: null,
    listings_url: 'https://www.staylark.com/cities',
    linkedin_slug: 'staylark',
    app_store_url: null,
    glassdoor_url: null,
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

// Sample dossier for Placemakr (plan requires "at least one full dossier")
const sampleDossier = {
  competitor_name: 'Placemakr',
  footprint: {
    markets: [
      'Washington, DC',
      'Arlington, VA',
      'Chicago, IL',
      'Miami, FL',
      'Denver, CO',
      'Atlanta, GA',
      'Nashville, TN',
    ],
    estimated_properties: 22,
    estimated_units: 3500,
    expansion_trend: 'growing',
  },
  operating_model:
    'Placemakr operates a hybrid model, partnering with real estate owners to convert traditional apartment buildings into flexible-stay properties. They combine master lease agreements with management contracts, taking over entire buildings or dedicated floors. Revenue comes from a mix of short-term nightly stays, mid-term monthly rentals, and traditional long-term leases — allowing dynamic yield optimization based on market demand.',
  strategic_positioning:
    'Placemakr has positioned itself as the leader in "flexible living" — a category they are actively defining. Unlike pure short-term rental operators, they target the full spectrum of stay lengths, from one night to twelve months.\n\nTheir core strength is the real estate partnership model: by converting underperforming apartment buildings, they offer property owners higher yields while maintaining residential community feel. The recent Series C funding ($50M) signals aggressive expansion plans.\n\nKey strategic shifts include a new emphasis on corporate housing (B2B channel) and technology investment (VP of Technology hire). They appear to be building a tech-enabled operating platform rather than competing purely on inventory.',
  swot: {
    strengths: [
      'Strong real estate partnerships with institutional property owners',
      'Hybrid stay-length model provides revenue diversification and yield optimization',
      'Well-funded with $50M Series C to fuel expansion',
      'Technology-first approach with significant engineering investment',
    ],
    weaknesses: [
      'Heavy reliance on master lease model creates fixed cost exposure',
      'Limited international presence — US-only operations',
      'Brand awareness lower than legacy hotel competitors',
      'Dependent on urban apartment supply which is cyclical',
    ],
    opportunities: [
      'Corporate housing / B2B channel is largely untapped in flexible-stay category',
      'Expansion into secondary markets (Southeast, Mountain West) where Kasa also operates',
      'Potential to become the "AWS of flexible living" — platform play for other operators',
    ],
    threats: [
      'Direct competitor to Kasa in urban flexible-stay — overlapping markets likely',
      'Series C funding enables aggressive market entry that could pressure Kasa pricing',
      'VP of Technology hire suggests building proprietary tools that could become competitive moats',
    ],
  },
  recommendations: {
    optimization:
      'Placemakr is currently optimizing for rapid geographic expansion and B2B corporate housing revenue. The Series C funding and Southeast regional hiring indicate plans to enter 8-10 new markets within 12-18 months.',
    impact:
      'High impact on Kasa. Placemakr is the most direct competitor in the urban flexible-stay segment. Their expansion into Southeast markets (Atlanta, Nashville) will create direct competitive pressure. The corporate housing pivot could also contest Kasa\'s enterprise relationships.',
    action:
      'Pre-empt in key markets. Kasa should accelerate entry into markets Placemakr is targeting (Atlanta, Nashville, Denver) before they establish. Monitor their corporate housing product closely — consider launching a competing B2B offering. Differentiate on technology and guest experience where Placemakr is still building capabilities.',
  },
  raw_analysis: 'AI-generated dossier based on collected intelligence signals and public information.',
};

// Sample digest (plan requires "a sample Slack digest")
const sampleDigest = {
  content: `*Weekly Competitive Intelligence Brief*
_Week of ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}_

*Placemakr*
• Announced $50M Series C funding led by Redpoint Ventures — plans to enter 10 new markets
• New "Corporate Solutions" section added to website — signals B2B pivot
• Hiring VP of Technology and Regional Director for Southeast
• *Why it matters:* Placemakr is the most direct competitor in flexible-stay. This funding level enables aggressive expansion into markets where Kasa operates. The corporate housing pivot opens a new competitive front.
• *Recommended action:* Pre-empt in Southeast markets (Atlanta, Nashville). Monitor corporate housing product development. Accelerate Kasa's own technology differentiation.

*AvantStay*
• Hiring Head of AI & Machine Learning — significant tech investment signal
• Expanded into Miami with 15 luxury properties targeting group travel
• *Why it matters:* AvantStay's AI investment could lead to automated pricing and operational efficiencies. Miami expansion shows continued focus on premium/luxury segment.
• *Recommended action:* Monitor AI capabilities development. AvantStay focuses on luxury group travel (different segment than Kasa), but their tech innovations could spread to broader market.

*Lark*
• Complete website rebrand from "Stay Alfred" to "Lark" — strategic reset
• Launched in Nashville with 8 downtown properties
• Hiring Director of Partnerships for B2B growth
• *Why it matters:* Lark's rebrand signals renewed strategic ambition. Nashville launch increases competitive density in a target market. Partnership hiring suggests inventory growth acceleration.
• *Recommended action:* Watch Lark's Nashville performance closely. Their downtown-only model overlaps with Kasa's urban focus. Consider partnership opportunities or competitive differentiation.

*Bottom Line:* The competitive landscape is intensifying with Placemakr's Series C leading the charge. All three competitors are expanding geographically and investing in technology. Kasa should prioritize speed-to-market in contested cities and accelerate B2B corporate housing capabilities.`,
  signals_included: [],
  channel: 'slack',
};

async function seed() {
  console.log('Seeding database...');

  // Insert competitors
  for (const comp of competitors) {
    // Check if competitor already exists by name
    const { data: existing } = await supabase
      .from('competitors')
      .select('id')
      .eq('name', comp.name)
      .maybeSingle();

    if (existing) {
      console.log(`Competitor already exists: ${comp.name} (${existing.id})`);
      continue;
    }

    const { data, error } = await supabase
      .from('competitors')
      .insert(comp)
      .select()
      .single();

    if (error) {
      console.error(`Error inserting ${comp.name}:`, error.message);
      continue;
    }
    console.log(`Inserted competitor: ${data.name} (${data.id})`);
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

  // Insert sample dossier for Placemakr
  const placemakrId = competitorMap.get(sampleDossier.competitor_name);
  if (placemakrId) {
    const { data: existingDossier } = await supabase
      .from('dossiers')
      .select('id')
      .eq('competitor_id', placemakrId)
      .maybeSingle();

    if (existingDossier) {
      console.log('Sample dossier already exists for Placemakr');
    } else {
      const { error } = await supabase.from('dossiers').insert({
        competitor_id: placemakrId,
        footprint: sampleDossier.footprint,
        operating_model: sampleDossier.operating_model,
        strategic_positioning: sampleDossier.strategic_positioning,
        swot: sampleDossier.swot,
        recommendations: sampleDossier.recommendations,
        raw_analysis: sampleDossier.raw_analysis,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error inserting sample dossier:', error.message);
      } else {
        console.log('Inserted sample dossier for Placemakr');
      }
    }
  }

  // Insert sample digest
  const signalIds = [];
  const { data: recentSignals } = await supabase
    .from('signals')
    .select('id')
    .order('detected_at', { ascending: false })
    .limit(10);
  if (recentSignals) {
    signalIds.push(...recentSignals.map((s) => s.id));
  }

  const { error: digestError } = await supabase.from('digests').insert({
    content: sampleDigest.content,
    signals_included: signalIds,
    channel: sampleDigest.channel,
  });

  if (digestError) {
    console.error('Error inserting sample digest:', digestError.message);
  } else {
    console.log('Inserted sample weekly digest');
  }

  console.log('Seeding complete!');
}

seed().catch(console.error);
