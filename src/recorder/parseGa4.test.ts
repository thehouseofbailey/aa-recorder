import { describe, it, expect } from 'vitest';
import { parseGa4 } from './parseGa4';

describe('parseGa4', () => {
  it('should parse standard GA4 parameters', () => {
    const url = 'https://www.google-analytics.com/g/collect?v=2&tid=G-ABC123&cid=123.456&sid=789&en=page_view&dl=https://example.com&dt=Test%20Page';
    
    const result = parseGa4(url);
    
    expect(result.tid).toBe('G-ABC123');
    expect(result.cid).toBe('123.456');
    expect(result.sid).toBe('789');
    expect(result.en).toBe('page_view');
    expect(result.dl).toBe('https://example.com');
    expect(result.dt).toBe('Test Page'); // URL-decoded
  });

  it('should parse event parameters (text) with ep. prefix', () => {
    const url = 'https://www.google-analytics.com/g/collect?en=custom_event&ep.button_text=Click%20Me&ep.page_section=header';
    
    const result = parseGa4(url);
    
    expect(result.en).toBe('custom_event');
    expect(result.ep['ep.button_text']).toBe('Click Me'); // URL-decoded
    expect(result.ep['ep.page_section']).toBe('header');
  });

  it('should parse event parameters (numeric) with epn. prefix', () => {
    const url = 'https://www.google-analytics.com/g/collect?en=page_load_time&epn.loading_time_sec=2.5&epn.dom_ready_ms=1200';
    
    const result = parseGa4(url);
    
    expect(result.en).toBe('page_load_time');
    expect(result.epn['epn.loading_time_sec']).toBe(2.5);
    expect(result.epn['epn.dom_ready_ms']).toBe(1200);
  });

  it('should handle epn. parameters that fail numeric conversion', () => {
    const url = 'https://www.google-analytics.com/g/collect?epn.bad_value=not_a_number';
    
    const result = parseGa4(url);
    
    // Should fallback to ep if numeric conversion fails
    expect(result.ep['epn.bad_value']).toBe('not_a_number');
    expect(result.epn['epn.bad_value']).toBeUndefined();
  });

  it('should parse other GA parameters into ga bucket', () => {
    const url = 'https://www.google-analytics.com/g/collect?en=test&ga.custom_param=value&ga.another=123';
    
    const result = parseGa4(url);
    
    expect(result.ga['ga.custom_param']).toBe('value');
    expect(result.ga['ga.another']).toBe('123');
  });

  it('should decode percent-encoded special characters', () => {
    const url = 'https://www.google-analytics.com/g/collect?dt=Test%20%26%20Demo&ep.message=Hello%2C%20World%21&dr=https%3A%2F%2Fgoogle.com';
    
    const result = parseGa4(url);
    
    expect(result.dt).toBe('Test & Demo');
    expect(result.ep['ep.message']).toBe('Hello, World!');
    expect(result.dr).toBe('https://google.com');
  });

  it('should handle all standard GA4 parameters', () => {
    const url = 'https://www.google-analytics.com/g/collect?' +
      'en=page_view&tid=G-123&cid=456&sid=789&sct=5&' +
      'dl=https://example.com&dt=Page&dr=https://google.com&' +
      '_s=1&_p=2&tfd=123&_et=5000&' +
      'gcs=G100&gcd=G110&npa=1&dma=0&pscdl=75&tag_exp=1&_eu=0&_ss=1';
    
    const result = parseGa4(url);
    
    expect(result.en).toBe('page_view');
    expect(result.tid).toBe('G-123');
    expect(result.cid).toBe('456');
    expect(result.sid).toBe('789');
    expect(result.sct).toBe('5');
    expect(result.dl).toBe('https://example.com');
    expect(result.dt).toBe('Page');
    expect(result.dr).toBe('https://google.com');
    expect(result._s).toBe('1');
    expect(result._p).toBe('2');
    expect(result.tfd).toBe('123');
    expect(result._et).toBe('5000');
    expect(result.gcs).toBe('G100');
    expect(result.gcd).toBe('G110');
    expect(result.npa).toBe('1');
    expect(result.dma).toBe('0');
    expect(result.pscdl).toBe('75');
    expect(result.tag_exp).toBe('1');
    expect(result._eu).toBe('0');
    expect(result._ss).toBe('1');
  });

  it('should return empty buckets for URLs with no custom parameters', () => {
    const url = 'https://www.google-analytics.com/g/collect?en=test&tid=G-123';
    
    const result = parseGa4(url);
    
    expect(result.ep).toEqual({});
    expect(result.epn).toEqual({});
    expect(result.ga).toEqual({});
  });

  it('should handle malformed URLs gracefully', () => {
    const url = 'not-a-valid-url';
    
    const result = parseGa4(url);
    
    // Should return empty result with empty buckets
    expect(result.ep).toEqual({});
    expect(result.epn).toEqual({});
    expect(result.ga).toEqual({});
  });

  it('should handle complex mixed parameters', () => {
    const url = 'https://www.google-analytics.com/g/collect?' +
      'en=purchase&tid=G-ABC&cid=123&' +
      'ep.product_name=Widget%20Pro&ep.category=Electronics&' +
      'epn.price=99.99&epn.quantity=2&' +
      'ga.custom_dimension=test_value';
    
    const result = parseGa4(url);
    
    // Standard params
    expect(result.en).toBe('purchase');
    expect(result.tid).toBe('G-ABC');
    expect(result.cid).toBe('123');
    
    // Text event params
    expect(result.ep['ep.product_name']).toBe('Widget Pro');
    expect(result.ep['ep.category']).toBe('Electronics');
    
    // Numeric event params
    expect(result.epn['epn.price']).toBe(99.99);
    expect(result.epn['epn.quantity']).toBe(2);
    
    // Other GA params
    expect(result.ga['ga.custom_dimension']).toBe('test_value');
  });

  it('should handle regional GA endpoints', () => {
    const url = 'https://region1.google-analytics.com/g/collect?en=test&tid=G-123';
    
    const result = parseGa4(url);
    
    expect(result.en).toBe('test');
    expect(result.tid).toBe('G-123');
  });

  it('should preserve undefined for missing optional parameters', () => {
    const url = 'https://www.google-analytics.com/g/collect?en=test';
    
    const result = parseGa4(url);
    
    expect(result.en).toBe('test');
    expect(result.tid).toBeUndefined();
    expect(result.cid).toBeUndefined();
    expect(result.dl).toBeUndefined();
  });
});
