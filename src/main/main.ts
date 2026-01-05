/**
 * Electron Main Process - AA-Recorder
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
 * This module implements secure Electron main process with typed IPC handlers for:
 * - recorder:start - Start GA4 event recording session
 * - recorder:stop - Stop recording and export CSV
 * - recorder:export - Export current events to CSV
 * - recorder:import - Import events from CSV file
 */

import { app, BrowserWindow, ipcMain, BrowserWindow as BrowserWindowType } from 'electron';
import { join, resolve } from 'path';
import { RecorderManager } from '../recorder/RecorderManager';

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
  [key: string]: any; // For dynamic keys
}

class ElectronApp {
  private mainWindow: BrowserWindowType | null = null;
  private recorderManager: RecorderManager;

  constructor() {
    this.recorderManager = new RecorderManager();
    this.setupApp();
    this.setupIPC();
    this.setupRecorderEvents();
  }

  private setupApp() {
    app.whenReady().then(() => {
      this.createMainWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      this.gracefulShutdown();
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('before-quit', () => {
      this.gracefulShutdown();
    });
  }

  private createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      webPreferences: {
        preload: join(__dirname, 'preload.js'),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
        enableRemoteModule: false,
        webSecurity: true,
      },
    });

    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:3001');
      this.mainWindow.webContents.openDevTools();
    } else {
      const rendererPath = resolve(__dirname, '..', 'renderer', 'index.html');
      this.mainWindow.loadFile(rendererPath);
    }
  }

  private setupIPC() {
    // Recorder start
    ipcMain.handle('recorder:start', async (_event, payload: StartRecordingPayload): Promise<StartRecordingResponse> => {
      try {
        console.log('Starting recorder with payload:', payload);
        const result = await this.recorderManager.startRecording({
          recordingName: payload.recordingName,
          mode: payload.mode,
        });
        return { pageUrl: result.pageUrl };
      } catch (error) {
        console.error('Failed to start recording:', error);
        throw error;
      }
    });

    // Recorder stop
    ipcMain.handle('recorder:stop', async (): Promise<StopRecordingResponse> => {
      try {
        console.log('Stopping recorder');
        const result = await this.recorderManager.stopRecording();
        return {
          csvPath: result.csvPath,
          count: result.count,
        };
      } catch (error) {
        console.error('Failed to stop recording:', error);
        throw error;
      }
    });

    // Export data
    ipcMain.handle('recorder:export', async (_event, payload: ExportPayload): Promise<ExportResponse> => {
      try {
        console.log('Exporting data with payload:', payload);
        const result = await this.recorderManager.exportData({
          targetPath: payload.targetPath,
        });
        return { csvPath: result.csvPath };
      } catch (error) {
        console.error('Failed to export data:', error);
        throw error;
      }
    });

    // Import data
    ipcMain.handle('recorder:import', async (_event, payload: ImportPayload): Promise<ImportResponse> => {
      try {
        console.log('Importing data with payload:', payload);
        const result = await this.recorderManager.importData({
          csvPath: payload.csvPath,
        });
        return { count: result.count };
      } catch (error) {
        console.error('Failed to import data:', error);
        throw error;
      }
    });
  }

  private setupRecorderEvents() {
    // Forward recorder events to renderer
    this.recorderManager.on('recorder:event', (event: RecorderEvent) => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('recorder:event', event);
      }
    });
  }

  private async gracefulShutdown() {
    try {
      console.log('Performing graceful shutdown...');
      await this.recorderManager.cleanup();
      console.log('Graceful shutdown completed');
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
    }
  }
}

// Initialize the application
new ElectronApp();