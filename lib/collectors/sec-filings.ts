import { createClient } from '@/lib/supabase/server';
import { analyzeSignalRelevance } from '@/lib/gemini';
import crypto from 'crypto';

const SEC_USER_AGENT = 'KasaInteli admin@kasaliving.com';

interface SECFiling {
  form: string;
  filingDate: string;
  accessionNumber: string;
  primaryDocument: string;
  description: string;
  url: string;
}

/**
 * Fetches recent SEC filings for a company using the free SEC EDGAR API.
 * Requires the company's CIK (Central Index Key) number.
 */
async function fetchSECFilings(cik: string): Promise<SECFiling[]> {
  try {
    // Pad CIK to 10 digits as required by EDGAR
    const paddedCik = cik.replace(/^0+/, '').padStart(10, '0');

    const response = await fetch(
      `https://data.sec.gov/submissions/CIK${paddedCik}.json`,
      {
        headers: { 'User-Agent': SEC_USER_AGENT },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      console.error('[SEC] EDGAR API error:', response.status);
      return [];
    }

    const data = await response.json();
    const recent = data.filings?.recent;

    if (!recent) return [];

    const filings: SECFiling[] = [];
    const relevantForms = new Set([
      '10-K', '10-Q', '8-K', 'S-1', 'S-3', 'DEF 14A',
      '10-K/A', '10-Q/A', '8-K/A',
    ]);

    // Only look at filings from the last 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    for (let i = 0; i < Math.min(recent.form?.length || 0, 50); i++) {
      const form = recent.form[i];
      const filingDate = recent.filingDate[i];
      const accession = recent.accessionNumber[i];
      const primaryDoc = recent.primaryDocument?.[i] || '';
      const description = recent.primaryDocDescription?.[i] || '';

      if (!relevantForms.has(form)) continue;

      const fDate = new Date(filingDate);
      if (fDate < cutoffDate) continue;

      const accessionPath = accession.replace(/-/g, '');
      const docUrl = `https://www.sec.gov/Archives/edgar/data/${paddedCik}/${accessionPath}/${primaryDoc}`;

      filings.push({
        form,
        filingDate,
        accessionNumber: accession,
        primaryDocument: primaryDoc,
        description,
        url: docUrl,
      });
    }

    return filings;
  } catch (err) {
    console.error('[SEC] EDGAR fetch error:', err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Determines the significance of a filing type.
 */
function quickScoreFiling(filing: SECFiling, companyName: string): {
  score: number;
  summary: string;
  isRelevant: boolean;
} {
  const form = filing.form.toUpperCase();
  const desc = filing.description.toLowerCase();

  // Annual reports are the most comprehensive
  if (form === '10-K' || form === '10-K/A') {
    return {
      score: 8,
      summary: `${companyName} filed annual report (${form}) for fiscal year. Contains comprehensive financial data, risk factors, strategy, and forward-looking statements. Key document for competitive analysis.`,
      isRelevant: true,
    };
  }

  // Quarterly reports provide trend data
  if (form === '10-Q' || form === '10-Q/A') {
    return {
      score: 7,
      summary: `${companyName} filed quarterly report (${form}). Contains updated financial performance, revenue trends, margin data, and management discussion & analysis.`,
      isRelevant: true,
    };
  }

  // 8-K filings report material events
  if (form === '8-K' || form === '8-K/A') {
    // Check description for high-impact events
    const criticalEvents = ['acquisition', 'merger', 'restructur', 'bankruptcy', 'delisted', 'ceo', 'officer'];
    const highEvents = ['agreement', 'amendment', 'earnings', 'results', 'guidance'];

    if (criticalEvents.some((e) => desc.includes(e))) {
      return {
        score: 9,
        summary: `${companyName} reported material event (8-K): ${filing.description}. This is a high-impact filing that may signal a major strategic shift.`,
        isRelevant: true,
      };
    }
    if (highEvents.some((e) => desc.includes(e))) {
      return {
        score: 7,
        summary: `${companyName} filed current report (8-K): ${filing.description}. Contains updates on business operations, financial results, or corporate governance.`,
        isRelevant: true,
      };
    }
    return {
      score: 6,
      summary: `${companyName} filed current report (8-K): ${filing.description || 'Material event disclosure'}.`,
      isRelevant: true,
    };
  }

  // S-1/S-3 are registration statements (IPO, secondary offerings)
  if (form.startsWith('S-')) {
    return {
      score: 9,
      summary: `${companyName} filed registration statement (${form}). This may indicate an IPO, secondary offering, or capital raise. Major strategic signal.`,
      isRelevant: true,
    };
  }

  // Proxy statements reveal governance and compensation
  if (form === 'DEF 14A') {
    return {
      score: 5,
      summary: `${companyName} filed proxy statement (DEF 14A). Contains executive compensation, board composition, and shareholder proposals.`,
      isRelevant: true,
    };
  }

  return {
    score: 4,
    summary: `${companyName} filed ${form}: ${filing.description}`,
    isRelevant: false,
  };
}

/**
 * Collects SEC filing signals for a competitor.
 * Only runs if the competitor has a sec_cik value set.
 */
export async function collectSECFilingSignals(competitorId: string, competitorName: string, secCik: string) {
  const supabase = await createClient();
  const results: Array<{ title: string; score: number }> = [];

  if (!secCik) {
    console.log(`[SEC] No CIK configured for ${competitorName}, skipping`);
    return results;
  }

  const filings = await fetchSECFilings(secCik);

  if (filings.length === 0) {
    console.log(`[SEC] No recent filings found for ${competitorName} (CIK: ${secCik})`);
    return results;
  }

  console.log(`[SEC] Found ${filings.length} recent filings for ${competitorName}`);

  for (const filing of filings) {
    // Deduplicate by accession number
    const filingHash = crypto.createHash('md5').update(filing.accessionNumber).digest('hex');

    const { data: existing } = await supabase
      .from('signals')
      .select('id')
      .eq('competitor_id', competitorId)
      .eq('signal_type', 'financial_filing')
      .contains('raw_data', { accession_number: filing.accessionNumber })
      .maybeSingle();

    if (existing) continue;

    const scoring = quickScoreFiling(filing, competitorName);

    // For high-score filings, use Gemini for deeper analysis
    let summary = scoring.summary;
    if (scoring.score >= 7) {
      try {
        const analysis = await analyzeSignalRelevance(
          'SEC Filing',
          `${competitorName} ${filing.form} filing on ${filing.filingDate}`,
          `${competitorName} filed ${filing.form} with the SEC on ${filing.filingDate}. ${filing.description}. This is a ${filing.form === '10-K' ? 'annual report' : filing.form === '10-Q' ? 'quarterly report' : 'material event disclosure'} from a hospitality/short-term rental company.`,
          competitorName
        );
        summary = analysis.summary;
      } catch {
        // Fall back to quick score summary
      }
    }

    const { error } = await supabase.from('signals').insert({
      competitor_id: competitorId,
      signal_type: 'financial_filing',
      title: `SEC ${filing.form} filed: ${competitorName}`,
      summary,
      raw_data: {
        form_type: filing.form,
        filing_date: filing.filingDate,
        accession_number: filing.accessionNumber,
        primary_document: filing.primaryDocument,
        description: filing.description,
      },
      source_url: filing.url,
      relevance_score: scoring.score,
      is_strategically_relevant: scoring.isRelevant,
      detected_at: filing.filingDate,
    });

    if (!error) {
      results.push({ title: `${filing.form} - ${filing.filingDate}`, score: scoring.score });
    }
  }

  return results;
}
