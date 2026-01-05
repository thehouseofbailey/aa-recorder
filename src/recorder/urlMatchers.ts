/**
 * URL pattern matchers for Google Analytics
 */

const GA4_PATTERNS = [
  /^https?:\/\/.*\.google-analytics\.com\/g\/collect/,
  /^https?:\/\/region.*\.google-analytics\.com\/g\/collect/,
];

/**
 * Check if a URL is a Google Analytics 4 collect endpoint
 * Matches both standard (*.google-analytics.com/g/collect) and 
 * regional (region*.google-analytics.com/g/collect) patterns
 */
export function isGACollect(url: string): boolean {
  return GA4_PATTERNS.some(pattern => pattern.test(url));
}
