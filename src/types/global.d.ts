// Global type definitions for the renderer process

interface StartRecordingPayload {
  recordingName: string;
  mode: 'ga';
  includeDomains?: string[];
  startingUrl?: string;
}

interface StartRecordingResponse {
  pageUrl: string;
}

interface StopRecordingResponse {
  csvPath: string;
  count: number;
}

interface ExportPayload {
  targetPath?: string;
}

interface ExportResponse {
  csvPath: string;
}

interface ImportPayload {
  csvPath: string;
}

interface ImportResponse {
  count: number;
}

interface RecorderEvent {
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
  
  // Dynamic fields (ep_*, epn_*, ga_*)
  [key: string]: string | number | undefined;
}

type RecorderEventCallback = (event: RecorderEvent) => void;

interface RecorderAPI {
  start: (payload: StartRecordingPayload) => Promise<StartRecordingResponse>;
  stop: () => Promise<StopRecordingResponse>;
  export: (payload: ExportPayload) => Promise<ExportResponse>;
  import: (payload: ImportPayload) => Promise<ImportResponse>;
  showSaveDialog: () => Promise<{ filePath: string | undefined }>;
  showOpenDialog: () => Promise<{ filePath: string | undefined }>;
}

type OnRecorderEvent = (callback: RecorderEventCallback) => void;

declare global {
  interface Window {
    recorder: RecorderAPI;
    onRecorderEvent: OnRecorderEvent;
  }
}