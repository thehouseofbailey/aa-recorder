/**
 * CSV Helper Utilities for GA4 Event Export/Import
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
 * This module provides CSV utilities:
 * - buildHeader: Sorts dynamic columns by groups (ep.* < epn.* < ga.*)
 * - rowFromEvent: Fills blanks for missing columns, handles CSV escaping
 * - writeCsv: Stream writes with Windows line endings (\r\n)
 * - readCsv: Parses header + rows with proper quote handling
 * - validateHeaderForSchema: Validates schema_version and detects GA4 format
 * - Sheet-compatible format for Excel, Google Sheets, Looker Studio
 */

import * as fs from 'fs';
import * as fsPromises from 'fs/promises';

export interface HeaderValidationResult {
  valid: boolean;
  hasSchemaVersion: boolean;
  mode?: string;
  error?: string;
}

/**
 * Build CSV header by combining base columns with sorted dynamic columns
 * Dynamic columns are sorted by groups: ep.* < epn.* < ga.*
 */
export function buildHeader(baseColumns: string[], dynamicColumns: string[]): string[] {
  const sorted = [...dynamicColumns].sort((a, b) => {
    // Group priority: ep. < epn. < ga.
    const getGroup = (col: string) => {
      if (col.startsWith('ep.')) return 0;
      if (col.startsWith('epn.')) return 1;
      if (col.startsWith('ga.')) return 2;
      return 3; // Unknown group goes last
    };

    const groupA = getGroup(a);
    const groupB = getGroup(b);

    if (groupA !== groupB) {
      return groupA - groupB;
    }

    // Within same group, sort alphabetically
    return a.localeCompare(b);
  });

  return [...baseColumns, ...sorted, 'schema_version'];
}

/**
 * Convert an event object to a CSV row array, filling blanks for missing columns
 * Maintains column order defined by header
 */
export function rowFromEvent(event: Record<string, any>, header: string[]): string[] {
  return header.map(col => {
    const value = event[col];
    
    // Handle undefined/null
    if (value === undefined || value === null) {
      return '';
    }

    // Convert to string and escape if needed
    const strValue = String(value);
    
    // If value contains comma, newline, or quotes, wrap in quotes and escape internal quotes
    if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('\r') || strValue.includes('"')) {
      return `"${strValue.replace(/"/g, '""')}"`;
    }

    return strValue;
  });
}

/**
 * Write CSV data to file with Windows line endings (\r\n)
 * Uses streaming for memory efficiency with large datasets
 */
export async function writeCsv(
  filePath: string,
  header: string[],
  rows: string[][]
): Promise<void> {
  const stream = fs.createWriteStream(filePath, { encoding: 'utf8' });

  return new Promise((resolve, reject) => {
    stream.on('error', reject);
    stream.on('finish', resolve);

    // Write header
    stream.write(header.join(',') + '\r\n');

    // Write rows
    for (const row of rows) {
      stream.write(row.join(',') + '\r\n');
    }

    stream.end();
  });
}

/**
 * Parse a single CSV line handling quoted values with commas/newlines
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
        continue;
      }
      // Toggle quote state
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  // Push last field
  result.push(current);

  return result;
}

/**
 * Read and parse CSV file
 * Returns header and rows as arrays
 */
export async function readCsv(filePath: string): Promise<{
  header: string[];
  rows: string[][];
}> {
  const content = await fsPromises.readFile(filePath, 'utf8');
  
  // Split by lines, handling both \r\n and \n
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse header
  const header = parseCSVLine(lines[0]);

  // Parse data rows
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    rows.push(row);
  }

  return { header, rows };
}

/**
 * Validate CSV header for schema compatibility
 * Ensures schema_version column is present and detects mode
 */
export function validateHeaderForSchema(header: string[]): HeaderValidationResult {
  // Check for schema_version column
  const hasSchemaVersion = header.includes('schema_version');

  if (!hasSchemaVersion) {
    return {
      valid: false,
      hasSchemaVersion: false,
      error: 'Missing schema_version column. This CSV was not exported by aa-recorder.',
    };
  }

  // Detect mode based on columns present
  let mode = 'ga'; // Default to GA mode

  // Check for GA4-specific columns
  const hasGA4Columns = header.some(col => 
    ['en', 'tid', 'cid', 'sid'].includes(col) ||
    col.startsWith('ep.') ||
    col.startsWith('epn.') ||
    col.startsWith('ga.')
  );

  if (!hasGA4Columns) {
    return {
      valid: false,
      hasSchemaVersion: true,
      error: 'No GA4 columns detected. Unknown CSV format.',
    };
  }

  return {
    valid: true,
    hasSchemaVersion: true,
    mode,
  };
}
