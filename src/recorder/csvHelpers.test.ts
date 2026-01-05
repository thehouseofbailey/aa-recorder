import { describe, it, expect } from 'vitest';
import { buildHeader, rowFromEvent, validateHeaderForSchema } from './csvHelpers';

describe('CSV Helpers', () => {
  describe('buildHeader', () => {
    it('should combine base columns with dynamic columns and add schema_version', () => {
      const base = ['event_index', 'timestamp_iso', 'url'];
      const dynamic = ['ep.custom', 'epn.value', 'ga.param'];
      
      const header = buildHeader(base, dynamic);
      
      expect(header).toContain('event_index');
      expect(header).toContain('timestamp_iso');
      expect(header).toContain('url');
      expect(header).toContain('ep.custom');
      expect(header).toContain('epn.value');
      expect(header).toContain('ga.param');
      expect(header[header.length - 1]).toBe('schema_version');
    });

    it('should sort dynamic columns by groups: ep. < epn. < ga.', () => {
      const base = ['event_index'];
      const dynamic = ['ga.z_param', 'epn.b_value', 'ep.a_text', 'ga.a_param', 'epn.z_value', 'ep.z_text'];
      
      const header = buildHeader(base, dynamic);
      
      // Find indices of dynamic columns (excluding base and schema_version)
      const epStart = header.indexOf('ep.a_text');
      const epnStart = header.indexOf('epn.b_value');
      const gaStart = header.indexOf('ga.a_param');
      
      // ep.* should come before epn.*
      expect(epStart).toBeLessThan(epnStart);
      // epn.* should come before ga.*
      expect(epnStart).toBeLessThan(gaStart);
      
      // Within groups, should be alphabetically sorted
      expect(header.indexOf('ep.a_text')).toBeLessThan(header.indexOf('ep.z_text'));
      expect(header.indexOf('epn.b_value')).toBeLessThan(header.indexOf('epn.z_value'));
      expect(header.indexOf('ga.a_param')).toBeLessThan(header.indexOf('ga.z_param'));
    });

    it('should handle empty dynamic columns', () => {
      const base = ['event_index', 'timestamp_iso'];
      const dynamic: string[] = [];
      
      const header = buildHeader(base, dynamic);
      
      expect(header).toEqual(['event_index', 'timestamp_iso', 'schema_version']);
    });

    it('should sort mixed dynamic columns correctly', () => {
      const base = ['index'];
      const dynamic = ['ga.custom', 'ep.name', 'epn.value', 'ga.another', 'ep.category'];
      
      const header = buildHeader(base, dynamic);
      
      // Remove base and schema_version to check dynamic order
      const dynamicPart = header.slice(1, -1);
      
      expect(dynamicPart).toEqual([
        'ep.category',
        'ep.name',
        'epn.value',
        'ga.another',
        'ga.custom',
      ]);
    });
  });

  describe('rowFromEvent', () => {
    it('should create row with values in header order', () => {
      const event = {
        event_index: 1,
        timestamp_iso: '2026-01-05T10:00:00Z',
        url: 'https://example.com',
        'ep.custom': 'value',
      };
      const header = ['event_index', 'timestamp_iso', 'url', 'ep.custom'];
      
      const row = rowFromEvent(event, header);
      
      expect(row).toEqual(['1', '2026-01-05T10:00:00Z', 'https://example.com', 'value']);
    });

    it('should fill blanks for missing columns', () => {
      const event = {
        event_index: 1,
        en: 'page_view',
      };
      const header = ['event_index', 'timestamp_iso', 'en', 'tid'];
      
      const row = rowFromEvent(event, header);
      
      expect(row).toEqual(['1', '', 'page_view', '']);
    });

    it('should escape values containing commas', () => {
      const event = {
        title: 'Hello, World',
      };
      const header = ['title'];
      
      const row = rowFromEvent(event, header);
      
      expect(row).toEqual(['"Hello, World"']);
    });

    it('should escape values containing quotes', () => {
      const event = {
        message: 'He said "hello"',
      };
      const header = ['message'];
      
      const row = rowFromEvent(event, header);
      
      expect(row).toEqual(['"He said ""hello"""']);
    });

    it('should escape values containing newlines', () => {
      const event = {
        text: 'Line 1\nLine 2',
      };
      const header = ['text'];
      
      const row = rowFromEvent(event, header);
      
      expect(row).toEqual(['"Line 1\nLine 2"']);
    });

    it('should handle null and undefined values', () => {
      const event = {
        a: null,
        b: undefined,
        c: 'value',
      };
      const header = ['a', 'b', 'c'];
      
      const row = rowFromEvent(event, header);
      
      expect(row).toEqual(['', '', 'value']);
    });

    it('should convert numbers to strings', () => {
      const event = {
        count: 42,
        price: 99.99,
        status: 200,
      };
      const header = ['count', 'price', 'status'];
      
      const row = rowFromEvent(event, header);
      
      expect(row).toEqual(['42', '99.99', '200']);
    });
  });

  describe('validateHeaderForSchema', () => {
    it('should validate header with schema_version present', () => {
      const header = ['event_index', 'timestamp_iso', 'en', 'tid', 'schema_version'];
      
      const result = validateHeaderForSchema(header);
      
      expect(result.valid).toBe(true);
      expect(result.hasSchemaVersion).toBe(true);
      expect(result.mode).toBe('ga');
    });

    it('should reject header without schema_version', () => {
      const header = ['event_index', 'timestamp_iso', 'en'];
      
      const result = validateHeaderForSchema(header);
      
      expect(result.valid).toBe(false);
      expect(result.hasSchemaVersion).toBe(false);
      expect(result.error).toContain('schema_version');
    });

    it('should detect GA4 columns', () => {
      const header = ['event_index', 'en', 'tid', 'cid', 'schema_version'];
      
      const result = validateHeaderForSchema(header);
      
      expect(result.valid).toBe(true);
      expect(result.mode).toBe('ga');
    });

    it('should detect ep.* columns as GA4', () => {
      const header = ['event_index', 'ep.custom_param', 'schema_version'];
      
      const result = validateHeaderForSchema(header);
      
      expect(result.valid).toBe(true);
      expect(result.mode).toBe('ga');
    });

    it('should detect epn.* columns as GA4', () => {
      const header = ['event_index', 'epn.value', 'schema_version'];
      
      const result = validateHeaderForSchema(header);
      
      expect(result.valid).toBe(true);
      expect(result.mode).toBe('ga');
    });

    it('should detect ga.* columns as GA4', () => {
      const header = ['event_index', 'ga.custom', 'schema_version'];
      
      const result = validateHeaderForSchema(header);
      
      expect(result.valid).toBe(true);
      expect(result.mode).toBe('ga');
    });

    it('should reject header without GA4 columns', () => {
      const header = ['event_index', 'timestamp_iso', 'url', 'schema_version'];
      
      const result = validateHeaderForSchema(header);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('No GA4 columns detected');
    });
  });

  describe('CSV round-trip (header expansion)', () => {
    it('should maintain column order through export/import cycle', () => {
      const baseColumns = ['event_index', 'timestamp_iso', 'en'];
      const dynamicColumns = ['ga.param', 'ep.text', 'epn.value'];
      
      const header = buildHeader(baseColumns, dynamicColumns);
      
      // Simulate creating events that match this header
      const event1 = {
        event_index: 1,
        timestamp_iso: '2026-01-05T10:00:00Z',
        en: 'page_view',
        'ep.text': 'hello',
        'epn.value': '42',
        'ga.param': 'test',
        schema_version: '1',
      };
      
      const row1 = rowFromEvent(event1, header);
      
      // Verify all columns are present in correct order
      expect(row1[0]).toBe('1');
      expect(row1[1]).toBe('2026-01-05T10:00:00Z');
      expect(row1[2]).toBe('page_view');
      // Dynamic columns should be sorted: ep.* < epn.* < ga.*
      expect(row1[3]).toBe('hello'); // ep.text
      expect(row1[4]).toBe('42'); // epn.value
      expect(row1[5]).toBe('test'); // ga.param
      expect(row1[6]).toBe('1'); // schema_version
    });

    it('should handle dynamic column expansion across multiple events', () => {
      const baseColumns = ['event_index', 'en'];
      
      // First event has some dynamic columns
      const event1Dynamics = ['ep.param1', 'epn.value1'];
      const header1 = buildHeader(baseColumns, event1Dynamics);
      
      // Second event adds more dynamic columns
      const event2Dynamics = ['ep.param1', 'ep.param2', 'epn.value1', 'ga.custom'];
      const header2 = buildHeader(baseColumns, event2Dynamics);
      
      // Header should expand
      expect(header1.length).toBe(5); // base(2) + dynamic(2) + schema_version(1)
      expect(header2.length).toBe(7); // base(2) + dynamic(4) + schema_version(1)
      
      // Order should be maintained
      const dynamicPart = header2.slice(2, -1);
      expect(dynamicPart).toEqual(['ep.param1', 'ep.param2', 'epn.value1', 'ga.custom']);
    });
  });
});
