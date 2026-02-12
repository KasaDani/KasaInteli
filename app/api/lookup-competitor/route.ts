// Lookup competitor by name: website, careers, LinkedIn, etc. Dani types "Placemakr", we fill the form.
import { NextRequest, NextResponse } from 'next/server';
import { geminiModel } from '@/lib/gemini';

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

interface LookupResult {
  name: string;
  website: string;
  careers_url: string;
  description: string;
  linkedin_slug: string;
  listings_url: string;
  app_store_url: string;
  glassdoor_url: string;
}

// ─── Gemini-based lookup (primary, fast ~2-3s) ──────────────────────

async function callGeminiWithRetry(prompt: string, maxRetries = 2): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await geminiModel.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      const isRetryable =
        err instanceof Error &&
        (err.message.includes('429') ||
         err.message.includes('fetch failed') ||
         err.message.includes('ECONNRESET') ||
         err.message.includes('503'));
      if (isRetryable && attempt < maxRetries) {
        const delay = (attempt + 1) * 2000;
        console.log(`Gemini error (retrying in ${delay}ms, attempt ${attempt + 1}/${maxRetries}): ${err instanceof Error ? err.message.slice(0, 100) : err}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Gemini max retries exceeded');
}

async function lookupWithGemini(companyName: string): Promise<LookupResult> {
  const prompt = `You are an expert company research assistant for a competitive intelligence platform in the HOSPITALITY, SHORT-TERM RENTALS, and TRAVEL INDUSTRY.

Given the company name "${companyName}", provide detailed information. IMPORTANT CONTEXT: This tool is used by a hospitality tech company (Kasa) to track competitors. If the name is ambiguous, prefer the company in the hospitality, travel, real estate, or short-term rental space.

For example: "Lark" means the hospitality company Lark (staylark.com), NOT ByteDance's Lark Suite. "Mint" would mean Mint House (minthouse.com), not Intuit's Mint.

Return a JSON object with these fields. Be VERY careful about accuracy — only include URLs you are highly confident are correct. Return an empty string "" for anything you're not sure about.

{
  "website": "<The company's official website URL. Must be their primary domain. Include https://>",
  "careers_url": "<Direct URL to their careers or jobs page. Common patterns: /careers, /jobs, /join-us on their domain, or ATS links like greenhouse.io, lever.co, ashbyhq.com. Only include if you're confident in the exact URL.>",
  "description": "<2-3 sentence description of what this company does as a BUSINESS: their core product/service, business model, target market, and differentiators. Do NOT describe their hiring or job openings.>",
  "linkedin_slug": "<The company slug from their LinkedIn URL. e.g. if URL is linkedin.com/company/placemakr then slug is 'placemakr'. ONLY the slug string, no URL.>",
  "listings_url": "<If this is a hospitality/real-estate/rental company, their property listings or locations page (e.g., /locations, /properties, /cities). Return empty string if not applicable.>",
  "app_store_url": "<Full URL to their iOS App Store listing. Only include if you're confident the company has an iOS app and you know the exact URL.>",
  "glassdoor_url": "<Full URL to their Glassdoor company page (e.g., https://www.glassdoor.com/Overview/Working-at-CompanyName-...). Only include if confident.>"
}

RULES:
- For website: ONLY the official company domain (e.g. https://www.placemakr.com). Never LinkedIn, Glassdoor, etc.
- For linkedin_slug: Extract ONLY the slug text, e.g. "placemakr", NOT the full URL.
- For careers_url: Prefer the company's own careers page. Include the full URL with https://.
- For listings_url: Only populate if the company is in hospitality, real estate, vacation rentals, or short-term rentals.
- For description: Describe the BUSINESS, not their hiring activity. What do they do? What's their model? Who are their customers?
- Return empty string "" for any field you are NOT at least 90% confident about. It's better to leave a field empty than to guess wrong.
- Do NOT fabricate URLs. If you're unsure, return "".
- Respond with JSON ONLY (no markdown fences, no extra text).`;

  const text = await callGeminiWithRetry(prompt);

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      name: companyName,
      website: parsed.website || '',
      careers_url: parsed.careers_url || '',
      description: parsed.description || '',
      linkedin_slug: parsed.linkedin_slug || '',
      listings_url: parsed.listings_url || '',
      app_store_url: parsed.app_store_url || '',
      glassdoor_url: parsed.glassdoor_url || '',
    };
  } catch {
    console.error('Failed to parse Gemini response:', text.slice(0, 500));
    return {
      name: companyName,
      website: '',
      careers_url: '',
      description: '',
      linkedin_slug: '',
      listings_url: '',
      app_store_url: '',
      glassdoor_url: '',
    };
  }
}

// ─── ScraperAPI enhancement (optional, fires in parallel) ───────────

interface OrganicResult {
  position?: number;
  title?: string;
  snippet?: string;
  link?: string;
  displayed_link?: string;
}

interface GoogleSearchResponse {
  organic_results?: OrganicResult[];
  knowledge_graph?: {
    title?: string;
    description?: string;
    website?: string;
    type?: string;
    [key: string]: unknown;
  };
}

async function searchGoogle(query: string, timeoutMs: number): Promise<GoogleSearchResponse> {
  const url = new URL('https://api.scraperapi.com/structured/google/search');
  url.searchParams.set('api_key', SCRAPER_API_KEY!);
  url.searchParams.set('query', query);
  url.searchParams.set('country', 'us');
  url.searchParams.set('num', '10');

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`ScraperAPI error: ${response.status}`);
  }

  return response.json();
}

function summarizeSearchResults(data: GoogleSearchResponse): string {
  const parts: string[] = [];

  if (data.knowledge_graph) {
    const kg = data.knowledge_graph;
    parts.push('=== KNOWLEDGE PANEL ===');
    if (kg.title) parts.push(`Title: ${kg.title}`);
    if (kg.website) parts.push(`Website: ${kg.website}`);
    if (kg.description) parts.push(`Description: ${kg.description}`);
    for (const [key, value] of Object.entries(kg)) {
      if (['title', 'description', 'website', 'type', 'thumbnail', 'images', 'image'].includes(key)) continue;
      if (typeof value === 'string' && value.length > 3 && value.length < 300) {
        parts.push(`${key}: ${value}`);
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null && 'name' in item && 'link' in item) {
            parts.push(`Profile: ${(item as { name: string }).name} - ${(item as { link: string }).link}`);
          }
        }
      }
    }
  }

  if (data.organic_results && data.organic_results.length > 0) {
    parts.push('=== SEARCH RESULTS ===');
    for (const r of data.organic_results.slice(0, 10)) {
      parts.push(`${r.title || ''} | ${r.link || ''} | ${r.snippet?.slice(0, 200) || ''}`);
    }
  }

  return parts.join('\n');
}

/**
 * Use Gemini to extract structured data from ScraperAPI search results.
 * This is more accurate than Gemini's pure knowledge since it has real URLs.
 */
async function extractFromSearch(
  companyName: string,
  searchSummary: string
): Promise<Partial<LookupResult>> {
  const prompt = `You are an expert research assistant for a competitive intelligence platform in the HOSPITALITY and SHORT-TERM RENTAL industry. Given Google search results for "${companyName}", extract the following information.

CONTEXT: This is used by a hospitality tech company (Kasa) to track competitors. If the name is ambiguous, prefer the company in hospitality/travel/real estate.

SEARCH RESULTS:
${searchSummary}

Extract and respond in JSON format ONLY (no markdown, no code fences):
{
  "website": "<Official website URL from search results. Must be their primary domain, NOT LinkedIn/Glassdoor/Wikipedia. Include https://>",
  "careers_url": "<Direct URL to their careers/jobs page. Look for /careers, /jobs on their domain, or ATS links (greenhouse, lever, ashby)>",
  "description": "<2-3 sentence description of their BUSINESS: what they do, their model, their market. Do NOT describe job openings or hiring activity.>",
  "linkedin_slug": "<Company slug from any LinkedIn URL in results. ONLY the slug string, no URL>",
  "listings_url": "<Property listings/locations page if found>",
  "app_store_url": "<App Store URL if found>",
  "glassdoor_url": "<Glassdoor URL if found>"
}

RULES:
- Extract ONLY URLs that actually appear in the search results. Do NOT fabricate URLs.
- For linkedin_slug: If you see linkedin.com/company/xyz, extract just "xyz".
- For description: Describe the BUSINESS, not their hiring. What do they sell/offer? Who are their customers?
- Return empty string "" for any field not found in the results.`;

  const text = await callGeminiWithRetry(prompt);

  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

/**
 * Merge search-verified results with Gemini knowledge-based results.
 * Search results take priority since they contain real, verified URLs.
 */
function mergeResults(
  geminiResult: LookupResult,
  searchResult: Partial<LookupResult>
): LookupResult {
  return {
    name: geminiResult.name,
    // For URLs: prefer search-verified URLs (they're real links from Google results)
    website: searchResult.website || geminiResult.website,
    careers_url: searchResult.careers_url || geminiResult.careers_url,
    linkedin_slug: searchResult.linkedin_slug || geminiResult.linkedin_slug,
    listings_url: searchResult.listings_url || geminiResult.listings_url,
    app_store_url: searchResult.app_store_url || geminiResult.app_store_url,
    glassdoor_url: searchResult.glassdoor_url || geminiResult.glassdoor_url,
    // For description: prefer Gemini's knowledge-based description (more balanced)
    // over search-extracted description (often biased by search query terms)
    description: geminiResult.description || searchResult.description || '',
  };
}

// ─── API Route ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name');
  if (!name || name.trim().length === 0) {
    return NextResponse.json(
      { error: 'Company name is required' },
      { status: 400 }
    );
  }

  const companyName = name.trim();

  try {
    // Strategy: Gemini-first with optional ScraperAPI enhancement
    //
    // 1. Gemini returns results in ~2-3s based on its training knowledge
    // 2. In parallel, ScraperAPI searches Google for real URLs (takes ~30-40s)
    // 3. If ScraperAPI finishes within the timeout, we merge its verified URLs
    // 4. Otherwise, we return Gemini's results immediately
    //
    // This gives fast results while still leveraging real search data when available.

    // Fire both in parallel: Gemini (fast, ~2-3s) and ScraperAPI (slow, ~30s)
    const geminiPromise = lookupWithGemini(companyName).catch((err) => {
      console.error(`Gemini lookup failed: ${err.message}`);
      return null;
    });

    let scraperPromise: Promise<GoogleSearchResponse | null>;
    if (SCRAPER_API_KEY) {
      scraperPromise = searchGoogle(
        `${companyName}`,
        55000
      ).catch((err) => {
        console.log(`ScraperAPI enhancement failed (non-blocking): ${err.message}`);
        return null;
      });
    } else {
      scraperPromise = Promise.resolve(null);
    }

    // Always wait for Gemini (fast)
    const geminiResult = await geminiPromise;

    // Give ScraperAPI up to 12 additional seconds after Gemini completes
    const scraperResult = await Promise.race([
      scraperPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 12000)),
    ]);

    // If ScraperAPI returned data, enhance with real verified URLs
    if (scraperResult && scraperResult.organic_results && scraperResult.organic_results.length > 0) {
      console.log(`ScraperAPI returned ${scraperResult.organic_results.length} results — enhancing`);
      const searchSummary = summarizeSearchResults(scraperResult);

      if (geminiResult) {
        // Best case: merge ScraperAPI-verified URLs into Gemini knowledge
        try {
          const searchExtracted = await extractFromSearch(companyName, searchSummary);
          return NextResponse.json(mergeResults(geminiResult, searchExtracted));
        } catch {
          // If extraction fails, still return Gemini results
          return NextResponse.json(geminiResult);
        }
      } else {
        // Gemini failed entirely — extract from ScraperAPI results alone
        try {
          const searchExtracted = await extractFromSearch(companyName, searchSummary);
          const fallback: LookupResult = {
            name: companyName,
            website: searchExtracted.website || '',
            careers_url: searchExtracted.careers_url || '',
            description: searchExtracted.description || '',
            linkedin_slug: searchExtracted.linkedin_slug || '',
            listings_url: searchExtracted.listings_url || '',
            app_store_url: searchExtracted.app_store_url || '',
            glassdoor_url: searchExtracted.glassdoor_url || '',
          };
          return NextResponse.json(fallback);
        } catch {
          throw new Error('Both Gemini and search extraction failed');
        }
      }
    }

    // No ScraperAPI results — return Gemini results if available
    if (geminiResult) {
      console.log('Returning Gemini-only results');
      return NextResponse.json(geminiResult);
    }

    // Both failed — return empty result with a message instead of 500 error
    console.error('Both Gemini and ScraperAPI failed for:', companyName);
    return NextResponse.json({
      name: companyName,
      website: '',
      careers_url: '',
      description: '',
      linkedin_slug: '',
      listings_url: '',
      app_store_url: '',
      glassdoor_url: '',
    });

  } catch (error) {
    console.error('Competitor lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup competitor. Please try again or fill in manually.' },
      { status: 500 }
    );
  }
}
