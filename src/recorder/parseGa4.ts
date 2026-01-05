/**
 * Google Analytics 4 URL Parser
 * 
 * Copilot Directives:
 * - Windows and Linux portable Electron app with Playwright Chromium (headful).
 * - Record only GA4 g/collect endpoints (including regional).
 * - Sequence integrity; elapsed_since_start_ms.
 * - Parsing: documented GA4 keys; dynamic columns for ep.*, epn.*, ga.*.
 * - CSV: sheet-compatible base + dynamic expansion; schema_version=1.
 * - Robust: long query strings, URL decoding, numeric conversions; link responses for status_code.
 * - Security: contextIsolation, sandbox; minimal IPC surface.
 * 
 * This module parses GA4 collect URLs and extracts:
 * - Standard GA4 parameters (en, tid, cid, sid, sct, dl, dt, dr, _s, _p, etc.)
 * - Event parameters text (ep.*)
 * - Event parameters numeric (epn.*) with automatic type conversion
 * - Other GA parameters (ga.*)
 * - Handles URL decoding (decodeURIComponent) with error recovery
 * - Robust against malformed URLs and encoding issues
 */

export interface GA4ParsedData {
  // Standard GA4 parameters
  en?: string;      // Event name
  tid?: string;     // Tracking ID / Measurement ID
  cid?: string;     // Client ID
  sid?: string;     // Session ID
  sct?: string;     // Session count
  dl?: string;      // Document location
  dt?: string;      // Document title
  dr?: string;      // Document referrer
  _s?: string;      // Hit sequence number
  _p?: string;      // Page sequence number
  tfd?: string;     // Time to first display
  _et?: string;     // Engagement time
  gcs?: string;     // Google consent state
  gcd?: string;     // Google consent default
  npa?: string;     // Non-personalized ads
  dma?: string;     // Data marketing allowed
  pscdl?: string;   // Page scroll depth
  tag_exp?: string; // Tag experiment
  _eu?: string;     // Engagement update
  _ss?: string;     // Session start
  
  // Custom parameter groups
  ep: Record<string, string>;    // Event parameters (text)
  epn: Record<string, number>;   // Event parameters (numeric)
  ga: Record<string, string>;    // Other GA parameters
}

// Standard GA4 parameter keys we extract directly
const STANDARD_KEYS = new Set([
  'en', 'tid', 'cid', 'sid', 'sct', 'dl', 'dt', 'dr',
  '_s', '_p', 'tfd', '_et', 'gcs', 'gcd', 'npa', 'dma',
  'pscdl', 'tag_exp', '_eu', '_ss'
]);

/**
 * Parse a GA4 collect URL and extract all parameters
 * Groups custom parameters into ep (text), epn (numeric), and ga (other) buckets
 */
export function parseGa4(url: string): GA4ParsedData {
  const result: GA4ParsedData = {
    ep: {},
    epn: {},
    ga: {},
  };

  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    for (const [key, value] of params.entries()) {
      // Decode the value safely
      let decodedValue: string;
      try {
        decodedValue = decodeURIComponent(value);
      } catch {
        decodedValue = value; // Use raw value if decode fails
      }

      // Standard GA4 parameters
      if (STANDARD_KEYS.has(key)) {
        (result as any)[key] = decodedValue;
      }
      // Event parameters (text) - ep.parameter_name
      else if (key.startsWith('ep.')) {
        result.ep[key] = decodedValue;
      }
      // Event parameters (numeric) - epn.parameter_name
      else if (key.startsWith('epn.')) {
        const numValue = parseFloat(decodedValue);
        if (!isNaN(numValue)) {
          result.epn[key] = numValue;
        } else {
          // If conversion fails, store as text in ep
          result.ep[key] = decodedValue;
        }
      }
      // Other GA parameters
      else {
        result.ga[key] = decodedValue;
      }
    }
  } catch (error) {
    console.error('Failed to parse GA4 URL:', error);
  }

  return result;
}
