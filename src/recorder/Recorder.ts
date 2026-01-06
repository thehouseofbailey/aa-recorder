/**
 * GA4 Event Recorder - Core Engine
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
 * This module implements the core recording engine:
 * - Fresh userDataDir isolation per session (launchPersistentContext)
 * - GA4-specific URL pattern matching (*.google-analytics.com/g/collect, region*.)
 * - Dynamic column expansion tracking (ep.*, epn.*, ga.*)
 * - Request/response correlation for status_code capture
 * - Real-time event emission via EventEmitter
 * - CSV export/import with schema versioning
 */

import { chromium, Browser, BrowserContext, Page, Request, Response } from 'playwright';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir, homedir } from 'os';
import { EventEmitter } from 'events';

// Core GA4 Event structure with dynamic fields
export interface GAEvent {
  // Core metadata
  event_index: number;
  timestamp_iso: string;
  elapsed_since_start_ms: number;
  
  // Network data
  url: string;
  host: string;
  path: string;
  method: string;
  status_code: number;
  
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
  
  // Dynamic fields (ep.*, epn.*, ga.*, etc.)
  [key: string]: string | number | undefined;
}

export interface RecorderConfig {
  recordingName: string;
  mode: 'ga';
}

export interface StartResult {
  pageUrl: string;
}

export interface StopResult {
  csvPath: string;
  count: number;
}

export interface ExportResult {
  csvPath: string;
}

export interface ImportResult {
  count: number;
}

type SchemaMode = 'sheet-compatible-expandable';

const SCHEMA_VERSION = '1.0.0';

// GA4 request filter patterns
const GA4_PATTERNS = [
  /^https?:\/\/.*\.google-analytics\.com\/g\/collect/,
  /^https?:\/\/region.*\.google-analytics\.com\/g\/collect/,
];

// Standard GA4 parameter keys to extract
const STANDARD_GA4_KEYS = [
  'en', 'tid', 'cid', 'sid', 'sct', 'dl', 'dt', 'dr',
  '_s', '_p', 'tfd', '_et', 'gcs', 'gcd', 'npa', 'dma',
  'pscdl', 'tag_exp', '_eu', '_ss',
];

// Base columns for sheet-compatible CSV
const BASE_COLUMNS = [
  'event_index',
  'timestamp_iso',
  'elapsed_since_start_ms',
  'url',
  'host',
  'path',
  'method',
  'status_code',
  ...STANDARD_GA4_KEYS,
];

export class Recorder extends EventEmitter {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private userDataDir: string | null = null;
  private isRecording: boolean = false;
  private recordingStartTime: number | null = null;
  private currentConfig: RecorderConfig | null = null;
  private events: GAEvent[] = [];
  private eventIndex: number = 0;
  private outputDir: string;
  private dynamicColumns: Set<string> = new Set();
  private pendingResponses: Map<string, { event: GAEvent; timestamp: number }> = new Map();

  constructor() {
    super();
    this.outputDir = this.getDefaultOutputPath();
  }

  private getDefaultOutputPath(): string {
    const defaultPath = join(homedir(), 'AA-Recordings');
    if (!existsSync(defaultPath)) {
      mkdirSync(defaultPath, { recursive: true });
    }
    return defaultPath;
  }

  private createFreshUserDataDir(): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const userDataDir = join(tmpdir(), `playwright-aa-recorder-${timestamp}-${randomId}`);
    mkdirSync(userDataDir, { recursive: true });
    return userDataDir;
  }

  private isGA4Request(url: string): boolean {
    return GA4_PATTERNS.some(pattern => pattern.test(url));
  }

  private safeParseUrl(urlString: string): URL | null {
    try {
      // Guard against extremely long URLs
      if (urlString.length > 100000) {
        console.warn('URL too long, truncating for parsing');
        urlString = urlString.substring(0, 100000);
      }
      return new URL(urlString);
    } catch (error) {
      console.error('Failed to parse URL:', error);
      return null;
    }
  }

  private parseGA4Parameters(url: URL): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    
    try {
      // Parse query parameters
      url.searchParams.forEach((value, key) => {
        try {
          // Decode the value safely
          const decodedValue = decodeURIComponent(value);
          
          // Handle ep.* (event parameters - text)
          if (key.startsWith('ep.')) {
            const paramName = key.substring(3); // Remove 'ep.' prefix
            params[`ep_${paramName}`] = decodedValue;
            this.dynamicColumns.add(`ep_${paramName}`);
          }
          // Handle epn.* (event parameters - number)
          else if (key.startsWith('epn.')) {
            const paramName = key.substring(4); // Remove 'epn.' prefix
            const numValue = parseFloat(decodedValue);
            params[`epn_${paramName}`] = isNaN(numValue) ? decodedValue : numValue;
            this.dynamicColumns.add(`epn_${paramName}`);
          }
          // Handle standard GA4 keys
          else if (STANDARD_GA4_KEYS.includes(key)) {
            params[key] = decodedValue;
          }
          // Handle other GA parameters with ga.* prefix
          else if (key.length <= 50) { // Reasonable key length
            params[`ga_${key}`] = decodedValue;
            this.dynamicColumns.add(`ga_${key}`);
          }
        } catch (decodeError) {
          // If decoding fails, use raw value
          params[`ga_${key}`] = value;
          this.dynamicColumns.add(`ga_${key}`);
        }
      });
    } catch (error) {
      console.error('Error parsing GA4 parameters:', error);
    }
    
    return params;
  }

  private handleRequest(request: Request): void {
    const url = request.url();
    
    if (!this.isGA4Request(url)) {
      return;
    }

    const parsedUrl = this.safeParseUrl(url);
    if (!parsedUrl) {
      return;
    }

    const now = Date.now();
    const elapsed = this.recordingStartTime ? now - this.recordingStartTime : 0;
    
    // Parse GA4 parameters
    const ga4Params = this.parseGA4Parameters(parsedUrl);
    
    // Create base event
    const event: GAEvent = {
      event_index: ++this.eventIndex,
      timestamp_iso: new Date(now).toISOString(),
      elapsed_since_start_ms: elapsed,
      url: url,
      host: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: request.method(),
      status_code: 0, // Will be updated when response arrives
      ...ga4Params,
    };

    // Store for response correlation
    const requestId = request.url() + '_' + now;
    this.pendingResponses.set(requestId, { event, timestamp: now });
    
    // Set a timeout to process the event even if response doesn't arrive
    setTimeout(() => {
      const pending = this.pendingResponses.get(requestId);
      if (pending) {
        this.pendingResponses.delete(requestId);
        this.finalizeEvent(pending.event);
      }
    }, 5000); // 5 second timeout
  }

  private async handleResponse(response: Response): Promise<void> {
    const url = response.url();
    
    if (!this.isGA4Request(url)) {
      return;
    }

    // Find matching pending request
    const requestId = Array.from(this.pendingResponses.keys()).find(id => 
      id.startsWith(url)
    );

    if (requestId) {
      const pending = this.pendingResponses.get(requestId);
      if (pending) {
        this.pendingResponses.delete(requestId);
        
        // Update status code from response
        pending.event.status_code = response.status();
        
        this.finalizeEvent(pending.event);
      }
    }
  }

  private finalizeEvent(event: GAEvent): void {
    // Add to events array
    this.events.push(event);
    
    // Emit to UI for real-time display
    this.emit('recorder:event', event);
    
    console.log(`[GA4] Event captured: ${event.en || 'unknown'} (${event.event_index})`);
  }

  async start(config: RecorderConfig): Promise<StartResult> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }

    try {
      console.log('Starting Playwright with fresh user data directory...');
      
      // Create fresh isolated user data directory
      this.userDataDir = this.createFreshUserDataDir();
      console.log(`User data directory: ${this.userDataDir}`);
      
      // Determine if running in CI environment
      const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
      
      // Launch Chromium with isolation
      this.browser = await chromium.launchPersistentContext(this.userDataDir, {
        headless: isCI ? true : false,
        viewport: { width: 1920, height: 1080 },
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=VizDisplayCompositor',
          ...(process.platform === 'linux' ? ['--disable-gpu', '--no-sandbox'] : []),
        ],
      });

      // Create the first page
      this.page = this.browser.pages()[0] || await this.browser.newPage();
      
      // Set up context-level request/response listeners
      // These will automatically attach to new pages
      this.browser.on('request', (request) => this.handleRequest(request));
      this.browser.on('response', (response) => this.handleResponse(response));

      // Initialize recording state
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      this.currentConfig = config;
      this.events = [];
      this.eventIndex = 0;
      this.dynamicColumns.clear();
      this.pendingResponses.clear();

      // Navigate to GA4 Event Builder for testing
      const initialUrl = config.mode === 'ga' 
        ? 'https://ga-dev-tools.web.app/ga4/event-builder/' 
        : 'about:blank';
      
      await this.page.goto(initialUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      console.log(`Recording started: ${config.recordingName}`);
      console.log(`Initial page: ${initialUrl}`);

      return { pageUrl: initialUrl };

    } catch (error) {
      console.error('Failed to start recording:', error);
      await this.cleanup();
      throw error;
    }
  }

  async stop(): Promise<StopResult> {
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }

    try {
      console.log('Stopping recording...');
      
      // Generate CSV file
      const csvPath = await this.exportCsv();
      const count = this.events.length;
      
      // Clean up browser and context
      await this.cleanup();
      
      this.isRecording = false;
      this.recordingStartTime = null;
      this.currentConfig = null;
      
      console.log(`Recording stopped. Events: ${count}, CSV: ${csvPath}`);
      
      return { csvPath, count };
      
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }

  async exportCsv(targetPath?: string, schemaMode: SchemaMode = 'sheet-compatible-expandable'): Promise<string> {
    const outputDir = targetPath || this.outputDir;
    const recordingName = this.currentConfig?.recordingName || 'recording';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${recordingName}_${timestamp}.csv`;
    const csvPath = join(outputDir, filename);
    
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    // Build header: base columns + sorted dynamic columns + schema_version
    const dynamicColumnsArray = Array.from(this.dynamicColumns).sort();
    const allColumns = [...BASE_COLUMNS, ...dynamicColumnsArray, 'schema_version'];
    
    // Build CSV content
    const csvRows: string[] = [allColumns.join(',')];
    
    // Add data rows
    this.events.forEach(event => {
      const row = allColumns.map(column => {
        if (column === 'schema_version') {
          return SCHEMA_VERSION;
        }
        
        const value = event[column];
        
        if (value === undefined || value === null) {
          return '';
        }
        
        // Escape CSV values
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      });
      
      csvRows.push(row.join(','));
    });
    
    // Write to file
    writeFileSync(csvPath, csvRows.join('\n') + '\n', 'utf8');
    
    console.log(`CSV exported: ${csvPath} (${this.events.length} events, ${allColumns.length} columns)`);
    
    return csvPath;
  }

  async importCsv(csvPath: string): Promise<number> {
    if (!existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    try {
      console.log(`Importing CSV: ${csvPath}`);
      
      const csvContent = readFileSync(csvPath, 'utf8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV file is empty or has no data rows');
      }

      // Parse header
      const header = lines[0].split(',').map(col => col.trim());
      
      // Validate schema version
      const schemaIndex = header.indexOf('schema_version');
      if (schemaIndex === -1) {
        console.warn('No schema_version column found, proceeding with caution');
      }

      // Parse data rows
      let importedCount = 0;
      
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = this.parseCSVLine(lines[i]);
          
          if (values.length !== header.length) {
            console.warn(`Row ${i + 1}: Column count mismatch, skipping`);
            continue;
          }

          // Build event object
          const event: Partial<GAEvent> = {};
          
          header.forEach((column, index) => {
            const value = values[index];
            
            if (column === 'schema_version') {
              // Validate schema version
              if (value && value !== SCHEMA_VERSION) {
                console.warn(`Schema version mismatch: expected ${SCHEMA_VERSION}, got ${value}`);
              }
              return;
            }
            
            if (value === '') {
              return; // Skip empty values
            }
            
            // Try to parse numbers
            if (column === 'event_index' || column === 'elapsed_since_start_ms' || 
                column === 'status_code' || column.startsWith('epn_')) {
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                event[column] = numValue;
                return;
              }
            }
            
            event[column] = value;
          });

          // Emit imported event to UI
          if (event.event_index !== undefined) {
            this.emit('recorder:event', event as GAEvent);
            importedCount++;
          }
          
        } catch (rowError) {
          console.error(`Error parsing row ${i + 1}:`, rowError);
        }
      }

      console.log(`CSV import complete: ${importedCount} events`);
      return importedCount;
      
    } catch (error) {
      console.error('Failed to import CSV:', error);
      throw error;
    }
  }

  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    values.push(current);
    
    return values;
  }

  getStatus(): { isRecording: boolean; eventCount: number; dynamicColumns: number } {
    return {
      isRecording: this.isRecording,
      eventCount: this.events.length,
      dynamicColumns: this.dynamicColumns.size,
    };
  }

  async cleanup(): Promise<void> {
    try {
      // Close browser context (this also closes all pages)
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      this.context = null;
      this.page = null;
      
      // Clean up temporary user data directory
      if (this.userDataDir && existsSync(this.userDataDir)) {
        try {
          const { rm } = await import('fs/promises');
          await rm(this.userDataDir, { recursive: true, force: true });
          console.log('Cleaned up user data directory');
        } catch (cleanupError) {
          console.warn('Failed to clean up user data directory:', cleanupError);
        }
      }
      
      this.userDataDir = null;
      
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Export types for use in other modules
export type { SchemaMode };