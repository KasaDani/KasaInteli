import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { geminiModel } from '@/lib/gemini';

interface CompsetRecommendation {
  name: string;
  website: string;
  description: string;
  why_fit: string;
  overlap_signals: string[];
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  careers_url?: string;
  listings_url?: string;
  linkedin_slug?: string;
  app_store_url?: string;
  glassdoor_url?: string;
}

function parseRecommendationResponse(text: string): CompsetRecommendation[] {
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/gm, '')
    .replace(/\n?```\s*$/gm, '')
    .trim();

  const parsed = JSON.parse(cleaned) as { recommendations?: CompsetRecommendation[] } | CompsetRecommendation[];
  const list = Array.isArray(parsed) ? parsed : (parsed.recommendations || []);

  return list
    .filter((item) => item?.name)
    .map((item) => ({
      name: item.name,
      website: item.website || '',
      description: item.description || '',
      why_fit: item.why_fit || '',
      overlap_signals: Array.isArray(item.overlap_signals) ? item.overlap_signals : [],
      confidence: Math.min(10, Math.max(1, Number(item.confidence || 6))),
      priority:
        item.priority === 'high' || item.priority === 'low' ? item.priority : 'medium',
      careers_url: item.careers_url || '',
      listings_url: item.listings_url || '',
      linkedin_slug: item.linkedin_slug || '',
      app_store_url: item.app_store_url || '',
      glassdoor_url: item.glassdoor_url || '',
    }));
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limitParam = Number(request.nextUrl.searchParams.get('limit') || 8);
  const limit = Number.isFinite(limitParam) ? Math.min(12, Math.max(3, limitParam)) : 8;

  try {
    const { data: competitors } = await supabase
      .from('competitors')
      .select('name, description, website')
      .order('created_at', { ascending: false })
      .limit(50);

    const existingNames = (competitors || [])
      .map((c) => c.name)
      .filter(Boolean);

    const existingContext = (competitors || [])
      .slice(0, 12)
      .map((c) => `${c.name} (${c.website || 'n/a'})${c.description ? ` - ${c.description}` : ''}`)
      .join('\n');

    const prompt = `You are a strategy analyst for Kasa, a hospitality tech company focused on flexible-stay apartments.

Task: recommend ${limit} companies that belong in Kasa's competitive set.

Current tracked competitors (avoid duplicates):
${existingContext || 'None provided'}

Requirements:
- Prioritize relevant comps in: flexible-stay apartments, aparthotels, short-term rental management, urban extended stay, and tech-enabled hospitality operators.
- Include a mix of direct and near-adjacent competitors.
- Exclude companies already tracked: ${existingNames.join(', ') || 'none'}.
- Be practical for competitive monitoring (real companies with meaningful market activity).

Return JSON ONLY in this schema:
{
  "recommendations": [
    {
      "name": "Company",
      "website": "https://...",
      "description": "1-2 sentence business description",
      "why_fit": "Why this belongs in Kasa's compset",
      "overlap_signals": ["talent hiring", "market expansion", "pricing", "guest tech"],
      "confidence": 1-10,
      "priority": "high|medium|low",
      "careers_url": "https://... or empty string",
      "listings_url": "https://... or empty string",
      "linkedin_slug": "slug only or empty string",
      "app_store_url": "https://... or empty string",
      "glassdoor_url": "https://... or empty string"
    }
  ]
}

Use empty string when uncertain. No markdown.`;

    const result = await geminiModel.generateContent(prompt);
    const parsed = parseRecommendationResponse(result.response.text().trim());

    const deduped = parsed.filter(
      (item) => !existingNames.some((name) => name.toLowerCase() === item.name.toLowerCase())
    );

    return NextResponse.json({
      recommendations: deduped.slice(0, limit),
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Compset recommendation error:', error);
    return NextResponse.json(
      { recommendations: [], generated_at: new Date().toISOString() },
      { status: 500 }
    );
  }
}

