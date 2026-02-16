interface CompetitorArticleContext {
  name: string;
  website?: string | null;
  description?: string | null;
}

interface BasicArticle {
  title: string;
  description?: string;
  url: string;
  source?: string;
}

const HOSPITALITY_KEYWORDS = [
  'hotel',
  'lodging',
  'hospitality',
  'short-term rental',
  'vacation rental',
  'aparthotel',
  'apartment hotel',
  'extended stay',
  'guest',
  'booking',
  'check-in',
  'property',
  'portfolio',
  'units',
  'revpar',
  'adr',
  'occupancy',
  'resort',
  'stay',
];

const AMBIGUOUS_BRAND_NAMES = new Set([
  'lark',
  'mint',
  'sonder',
  'placemakr',
]);

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function getDomainToken(website?: string | null): string {
  if (!website) return '';
  const host = extractHost(website);
  if (!host) return '';
  const parts = host.split('.');
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
}

function hasHospitalityContext(text: string): boolean {
  return HOSPITALITY_KEYWORDS.some((keyword) => text.includes(keyword));
}

function isAmbiguousName(name: string): boolean {
  const normalized = normalize(name);
  const parts = normalized.split(' ').filter(Boolean);
  if (AMBIGUOUS_BRAND_NAMES.has(normalized)) return true;
  return parts.length === 1 && parts[0].length <= 7;
}

function mentionsCompetitorIdentity(
  combinedText: string,
  articleHost: string,
  context: CompetitorArticleContext
): boolean {
  const normalizedName = normalize(context.name);
  const compactName = normalizedName.replace(/\s+/g, '');
  const domainToken = getDomainToken(context.website);

  const byName = normalizedName.length > 0 && combinedText.includes(normalizedName);
  const byCompactName = compactName.length > 4 && combinedText.replace(/\s+/g, '').includes(compactName);
  const byDomainToken =
    domainToken.length > 2 &&
    (combinedText.includes(domainToken) || articleHost.includes(domainToken));

  return byName || byCompactName || byDomainToken;
}

export function isArticleRelevantToCompetitor(
  article: BasicArticle,
  context: CompetitorArticleContext
): boolean {
  const articleHost = extractHost(article.url);
  const companyHost = extractHost(context.website || '');
  const companyDomainToken = getDomainToken(context.website);

  const text = normalize(
    `${article.title} ${article.description || ''} ${article.source || ''} ${article.url}`
  );

  const hasIdentity = mentionsCompetitorIdentity(text, articleHost, context);
  if (!hasIdentity) return false;

  // Always trust first-party/company domain content.
  if (companyHost && articleHost.includes(companyHost)) return true;

  const hospitalityByArticle = hasHospitalityContext(text);
  const hospitalityByDescription = hasHospitalityContext(normalize(context.description || ''));
  const ambiguous = isAmbiguousName(context.name);

  // For ambiguous names (e.g., "Lark"), require explicit hospitality context unless first-party.
  if (ambiguous) {
    return hospitalityByArticle || hospitalityByDescription || text.includes(companyDomainToken);
  }

  // For less ambiguous names, identity is usually enough, but we still prefer hospitality context.
  return hasIdentity && (hospitalityByArticle || hospitalityByDescription || text.includes(companyDomainToken));
}

