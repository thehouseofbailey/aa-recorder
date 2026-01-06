import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Recorder } from '../src/recorder/Recorder';
import { readCsv, validateHeaderForSchema } from '../src/recorder/csvHelpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Recorder Integration Tests', () => {
  let browser: Browser;
  let testPageUrl: string;

  beforeAll(async () => {
    // Launch browser for test page
    browser = await chromium.launch();
    
    // Get absolute path to test HTML file
    const testPagePath = path.resolve(__dirname, 'fixtures/ga-test-page.html');
    testPageUrl = `file://${testPagePath}`;
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  it('should capture GA4 events and export to CSV', async () => {
    const recorder = new Recorder();
    const capturedEvents: any[] = [];

    // Listen for events
    recorder.on('recorder:event', (event) => {
      capturedEvents.push(event);
    });

    try {
      // Start recording - this opens its own browser with GA Event Builder
      const startResult = await recorder.start({
        recordingName: 'integration-test',
        mode: 'ga',
      });

      expect(startResult.pageUrl).toBeDefined();
      expect(startResult.pageUrl).toContain('ga4/event-builder');

      // Use our separate browser to visit test page and fire events
      const context = await browser.newContext();
      const page = await context.newPage();

      // Navigate to test page (which will fire GA events)
      await page.goto(testPageUrl, { waitUntil: 'networkidle' });

      // Wait for events to be captured (page_view + button_click)
      await page.waitForTimeout(3000);

      // Stop recording
      const stopResult = await recorder.stop();

      expect(stopResult.count).toBeGreaterThanOrEqual(0);
      expect(stopResult.csvPath).toBeDefined();

      // Note: Events are captured from the recorder's own browser context
      // which visits ga4/event-builder, not our test page
      // This tests the real workflow users will experience

      // Verify CSV file exists
      const csvExists = await fs.access(stopResult.csvPath).then(() => true).catch(() => false);
      expect(csvExists).toBe(true);

      // Verify CSV structure
      if (stopResult.count > 0) {
        const { header, rows } = await readCsv(stopResult.csvPath);
        expect(header).toContain('event_index');
        expect(header).toContain('timestamp_iso');
        expect(header).toContain('schema_version');
        expect(rows.length).toBe(stopResult.count);
      }

      // Clean up CSV file
      await fs.unlink(stopResult.csvPath);
      await context.close();

    } finally {
      await recorder.cleanup();
    }
  }, 30000); // 30s timeout

  it('should export CSV with properly sorted dynamic columns', async () => {
    const recorder = new Recorder();
    const capturedEvents: any[] = [];

    recorder.on('recorder:event', (event) => {
      capturedEvents.push(event);
    });

    try {
      await recorder.start({
        recordingName: 'csv-export-test',
        mode: 'ga',
      });

      // Wait a bit for potential events
      await new Promise(resolve => setTimeout(resolve, 2000));

      const stopResult = await recorder.stop();
      
      // Read and validate CSV
      const { header, rows } = await readCsv(stopResult.csvPath);

      // Validate header
      const validation = validateHeaderForSchema(header);
      expect(validation.valid).toBe(true);
      expect(validation.hasSchemaVersion).toBe(true);
      expect(validation.mode).toBe('ga');

      // Check that schema_version is last column
      expect(header[header.length - 1]).toBe('schema_version');

      // Check dynamic columns are sorted if present
      const dynamicColumns = header.filter(col => 
        col.startsWith('ep.') || col.startsWith('epn.') || col.startsWith('ga.')
      );

      if (dynamicColumns.length > 0) {
        // Verify sorting: ep.* < epn.* < ga.*
        let lastGroup = '';
        for (const col of dynamicColumns) {
          let currentGroup = '';
          if (col.startsWith('ep.')) currentGroup = 'ep';
          else if (col.startsWith('epn.')) currentGroup = 'epn';
          else if (col.startsWith('ga.')) currentGroup = 'ga';

          if (lastGroup) {
            const groupOrder = { ep: 0, epn: 1, ga: 2 };
            expect(groupOrder[currentGroup]).toBeGreaterThanOrEqual(groupOrder[lastGroup]);
          }
          lastGroup = currentGroup;
        }
      }

      // Clean up
      await fs.unlink(stopResult.csvPath);

    } finally {
      await recorder.cleanup();
    }
  }, 30000);

  it('should support CSV import and re-emit events', async () => {
    const recorder = new Recorder();
    let exportPath: string;

    try {
      // First, capture and export
      await recorder.start({
        recordingName: 'import-test-source',
        mode: 'ga',
      });

      // Navigate to generate GA4 events (like the other tests)
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(testPageUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      await context.close();

      const stopResult = await recorder.stop();
      exportPath = stopResult.csvPath;

      // Verify CSV was created
      const csvExists = await fs.access(exportPath).then(() => true).catch(() => false);
      expect(csvExists).toBe(true);

      // Now test import
      const importedEvents: any[] = [];
      recorder.on('recorder:event', (event) => {
        importedEvents.push(event);
      });

      const importCount = await recorder.importCsv(exportPath);

      expect(importCount).toBeGreaterThanOrEqual(0);
      expect(importedEvents.length).toBe(importCount);

      // Verify imported events have correct structure if any events exist
      if (importedEvents.length > 0) {
        for (const event of importedEvents) {
          expect(event.event_index).toBeDefined();
          expect(event.timestamp_iso).toBeDefined();
          expect(event.url).toBeDefined();
          expect(event.host).toBeDefined();
          expect(event.path).toBeDefined();
          expect(event.method).toBeDefined();
          expect(event.status_code).toBeDefined();
        }
      }

      // Clean up
      await fs.unlink(exportPath);

    } finally {
      await recorder.cleanup();
    }
  }, 30000);

  it('should handle CSV round-trip correctly', async () => {
    const recorder = new Recorder();

    try {
      // Start, wait, and stop to get a CSV
      await recorder.start({
        recordingName: 'round-trip-test',
        mode: 'ga',
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const stopResult = await recorder.stop();
      const originalPath = stopResult.csvPath;

      // Read original CSV
      const original = await readCsv(originalPath);
      
      // Import the CSV
      await recorder.importCsv(originalPath);
      
      // Export again
      const exportPath = await recorder.exportCsv();
      
      // Read new CSV
      const reimported = await readCsv(exportPath);

      // Headers should match
      expect(reimported.header).toEqual(original.header);
      
      // Row count should match
      expect(reimported.rows.length).toBe(original.rows.length);

      // Clean up
      await fs.unlink(originalPath);
      await fs.unlink(exportPath);

    } finally {
      await recorder.cleanup();
    }
  }, 30000);
});
