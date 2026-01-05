import { EventEmitter } from 'events';
import { Recorder, GAEvent } from './Recorder';

export interface StartRecordingConfig {
  recordingName: string;
  mode: 'ga';
}

export interface StartRecordingResult {
  pageUrl: string;
}

export interface StopRecordingResult {
  csvPath: string;
  count: number;
}

export interface ExportConfig {
  targetPath?: string;
}

export interface ExportResult {
  csvPath: string;
}

export interface ImportConfig {
  csvPath: string;
}

export interface ImportResult {
  count: number;
}

// Re-export GAEvent type for convenience
export type { GAEvent };

/**
 * RecorderManager acts as a facade/adapter for the Recorder class
 * This provides a clean interface for the main process
 */
export class RecorderManager extends EventEmitter {
  private recorder: Recorder;

  constructor() {
    super();
    this.recorder = new Recorder();
    
    // Forward events from Recorder to main process
    this.recorder.on('recorder:event', (event: GAEvent) => {
      this.emit('recorder:event', event);
    });
  }

  async startRecording(config: StartRecordingConfig): Promise<StartRecordingResult> {
    try {
      const result = await this.recorder.start({
        recordingName: config.recordingName,
        mode: config.mode,
      });
      
      return result;
    } catch (error) {
      console.error('RecorderManager: Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<StopRecordingResult> {
    try {
      const result = await this.recorder.stop();
      return result;
    } catch (error) {
      console.error('RecorderManager: Failed to stop recording:', error);
      throw error;
    }
  }

  async exportData(config: ExportConfig): Promise<ExportResult> {
    try {
      const csvPath = await this.recorder.exportCsv(config.targetPath);
      return { csvPath };
    } catch (error) {
      console.error('RecorderManager: Failed to export data:', error);
      throw error;
    }
  }

  async importData(config: ImportConfig): Promise<ImportResult> {
    try {
      const count = await this.recorder.importCsv(config.csvPath);
      return { count };
    } catch (error) {
      console.error('RecorderManager: Failed to import data:', error);
      throw error;
    }
  }

  getStatus() {
    return this.recorder.getStatus();
  }

  async cleanup(): Promise<void> {
    await this.recorder.cleanup();
  }
}
