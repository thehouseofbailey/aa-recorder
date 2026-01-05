import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Type definitions for the exposed API
interface StartRecordingPayload {
  recordingName: string;
  mode: 'ga';
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
  event_index: number;
  timestamp_iso: string;
  elapsed_since_start_ms: number;
  url: string;
  host: string;
  path: string;
  method: string;
  status_code: number;
  en?: string;
  tid?: string;
  cid?: string;
  sid?: string;
  sct?: string;
  dl?: string;
  dt?: string;
  dr?: string;
  _s?: string;
  _p?: string;
  tfd?: string;
  _et?: string;
  gcs?: string;
  gcd?: string;
  npa?: string;
  dma?: string;
  pscdl?: string;
  tag_exp?: string;
  _eu?: string;
  _ss?: string;
  [key: string]: any;
}

type RecorderEventCallback = (event: RecorderEvent) => void;

// Safe API to expose to renderer
const recorderAPI = {
  // Recorder operations
  start: (payload: StartRecordingPayload): Promise<StartRecordingResponse> =>
    ipcRenderer.invoke('recorder:start', payload),
    
  stop: (): Promise<StopRecordingResponse> =>
    ipcRenderer.invoke('recorder:stop'),
    
  export: (payload: ExportPayload): Promise<ExportResponse> =>
    ipcRenderer.invoke('recorder:export', payload),
    
  import: (payload: ImportPayload): Promise<ImportResponse> =>
    ipcRenderer.invoke('recorder:import', payload),
};

// Event listener management
let eventCallback: RecorderEventCallback | null = null;

const handleRecorderEvent = (_event: IpcRendererEvent, data: RecorderEvent) => {
  if (eventCallback) {
    eventCallback(data);
  }
};

// Set up event listener when callback is registered
const onRecorderEvent = (callback: RecorderEventCallback) => {
  // Remove previous listener if exists
  if (eventCallback) {
    ipcRenderer.removeListener('recorder:event', handleRecorderEvent);
  }
  
  // Set new callback and listener
  eventCallback = callback;
  ipcRenderer.on('recorder:event', handleRecorderEvent);
};

// Expose safe APIs to renderer process
contextBridge.exposeInMainWorld('recorder', recorderAPI);
contextBridge.exposeInMainWorld('onRecorderEvent', onRecorderEvent);

// Export types for use in renderer
export type {
  StartRecordingPayload,
  StartRecordingResponse,
  StopRecordingResponse,
  ExportPayload,
  ExportResponse,
  ImportPayload,
  ImportResponse,
  RecorderEvent,
  RecorderEventCallback,
};

export type RecorderAPI = typeof recorderAPI;
export type OnRecorderEvent = typeof onRecorderEvent;