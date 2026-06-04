/**
 * URL pattern matchers for Google Analytics
 */

const GA4_PATTERNS = [
  /^https?:\/\/.*\.google-analytics\.com\/g\/collect/,
  /^https?:\/\/region.*\.google-analytics\.com\/g\/collect/,
];

function normalizeDomainCandidate(value: string): string | null {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return null;
  }

  let hostname = trimmed;

  try {
    const parsedUrl = trimmed.includes('://') ? new URL(trimmed) : new URL(`https://${trimmed}`);
    hostname = parsedUrl.hostname;
  } catch {
    hostname = trimmed;
  }

  hostname = hostname.replace(/^\*\./, '');

  if (hostname.startsWith('.')) {
    hostname = hostname.slice(1);
  }

  return hostname || null;
}

export function normalizeIncludeDomains(domains: string[]): string[] {
  return domains
    .map(normalizeDomainCandidate)
    .filter((domain): domain is string => Boolean(domain));
}

function matchesIncludeDomain(url: URL, includeDomains: string[]): boolean {
  if (includeDomains.length === 0) {
    return false;
  }

  const hostname = url.hostname.toLowerCase();

  return includeDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

/**
 * Check if a URL is a Google Analytics 4 collect endpoint
 * Matches both standard (*.google-analytics.com/g/collect) and 
 * regional (region*.google-analytics.com/g/collect) patterns
 */
export function isGACollect(url: string): boolean {
  return GA4_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Check whether a request should be captured.
 * Captures GA4 collect requests plus any requests whose host matches one of the
 * configured include domains.
 */
export function isIncludedAnalyticsRequest(url: string, includeDomains: string[] = []): boolean {
  if (isGACollect(url)) {
    return true;
  }

  if (includeDomains.length === 0) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    const normalizedDomains = normalizeIncludeDomains(includeDomains);
    return matchesIncludeDomain(parsedUrl, normalizedDomains);
  } catch {
    return false;
  }
}
