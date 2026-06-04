/**
 * AA-Recorder React Application
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
 * This module implements the main UI with:
 * - Top bar: Recording controls, mode selector, stats display
 * - Split pane: Virtualized event list (60%) + Detail panel (40%)
 * - Real-time event streaming via window.onRecorderEvent
 * - CSV export/import via IPC
 * - Performance: Handles 2,000+ events with virtualization (react-window)
 */

import React, { useState, useEffect } from 'react';
import { VirtualizedEventsList } from './components/VirtualizedEventsList';
import { EventDetailsPanel } from './components/EventDetailsPanel';
import { normalizeIncludeDomains } from '@recorder/urlMatchers';

interface RecordingStatus {
  isRecording: boolean;
  recordingName?: string;
  pageUrl?: string;
  startTime?: Date;
  duration?: number;
  eventCount: number;
}

function App() {
  const [status, setStatus] = useState<RecordingStatus>({
    isRecording: false,
    eventCount: 0,
  });
  
  const [events, setEvents] = useState<RecorderEvent[]>([]);
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(null);
  const [recordingName, setRecordingName] = useState<string>('');
  const [startingUrl, setStartingUrl] = useState<string>('');
  const [includeDomainInput, setIncludeDomainInput] = useState<string>('');
  const [includeDomains, setIncludeDomains] = useState<string[]>(() => {
    const storedValue = window.localStorage.getItem('aa-recorder-include-domains');
    if (!storedValue) {
      return [];
    }

    try {
      const parsed = JSON.parse(storedValue) as unknown;
      return Array.isArray(parsed) ? normalizeIncludeDomains(parsed.filter((item): item is string => typeof item === 'string')) : [];
    } catch {
      return [];
    }
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem('aa-recorder-include-domains', JSON.stringify(includeDomains));
  }, [includeDomains]);

  useEffect(() => {
    // Set up real-time event listener
    if (window.onRecorderEvent) {
      window.onRecorderEvent((event: RecorderEvent) => {
        setEvents(prev => [...prev, event]);
        setStatus(prev => ({
          ...prev,
          eventCount: prev.eventCount + 1,
        }));
      });
    }

    // Update duration every second when recording
    const interval = setInterval(() => {
      setStatus(prev => {
        if (prev.isRecording && prev.startTime) {
          return {
            ...prev,
            duration: Math.floor((Date.now() - prev.startTime.getTime()) / 1000),
          };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleStartRecording = async () => {
    if (!recordingName.trim()) {
      setError('Please enter a recording name');
      return;
    }

    try {
      setError(null);
      console.log('Starting recording with name:', recordingName);
      
      const result = await window.recorder.start({
        recordingName: recordingName.trim(),
        mode: 'ga',
        includeDomains,
        startingUrl: startingUrl.trim() || undefined,
      });
      
      setStatus({
        isRecording: true,
        recordingName: recordingName.trim(),
        pageUrl: result.pageUrl,
        startTime: new Date(),
        duration: 0,
        eventCount: 0,
      });
      
      setEvents([]);
      setSelectedEventIndex(null);
      console.log('Recording started successfully, page URL:', result.pageUrl);
      
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      setError(`Failed to start recording: ${error.message || error}`);
    }
  };

  const handleAddIncludeDomains = () => {
    const nextDomains = normalizeIncludeDomains(
      includeDomainInput
        .split(/[\n,]/)
        .map((domain) => domain.trim())
        .filter(Boolean)
    );

    if (nextDomains.length === 0) {
      return;
    }

    setIncludeDomains((currentDomains) => Array.from(new Set([...currentDomains, ...nextDomains])));
    setIncludeDomainInput('');
  };

  const handleRemoveIncludeDomain = (domainToRemove: string) => {
    setIncludeDomains((currentDomains) => currentDomains.filter((domain) => domain !== domainToRemove));
  };

  const handleIncludeDomainKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddIncludeDomains();
    }
  };

  const handleStopRecording = async () => {
    try {
      setError(null);
      console.log('Stopping recording...');
      
      const result = await window.recorder.stop();
      
      setStatus(prev => ({
        ...prev,
        isRecording: false,
      }));
      
      console.log(`Recording stopped. CSV saved to: ${result.csvPath}, Events: ${result.count}`);
      
    } catch (error: any) {
      console.error('Failed to stop recording:', error);
      setError(`Failed to stop recording: ${error.message || error}`);
    }
  };

  const handleExportData = async () => {
    try {
      setError(null);
      const { filePath } = await window.recorder.showSaveDialog();
      if (!filePath) return;

      const result = await window.recorder.export({ targetPath: filePath });
      console.log(`Data exported to: ${result.csvPath}`);
      
    } catch (error: any) {
      console.error('Failed to export data:', error);
      setError(`Failed to export data: ${error.message || error}`);
    }
  };

  const handleImportData = async () => {
    try {
      setError(null);
      const { filePath } = await window.recorder.showOpenDialog();
      if (!filePath) return;

      console.log('Importing data from:', filePath);
      const result = await window.recorder.import({ csvPath: filePath });
      console.log(`Imported ${result.count} events`);
      
      setEvents([]);
      setSelectedEventIndex(null);
      
    } catch (error: any) {
      console.error('Failed to import data:', error);
      setError(`Failed to import data: ${error.message || error}`);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-300 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Left: Recording Name Input */}
            <div className="flex items-center gap-3">
              <label htmlFor="recording-name" className="text-sm font-semibold text-gray-700">
                Recording Name:
              </label>
              <input
                id="recording-name"
                type="text"
                value={recordingName}
                onChange={(e) => setRecordingName(e.target.value)}
                disabled={status.isRecording}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-600"
                placeholder="Enter recording name"
                aria-label="Recording name"
              />
              <span className="text-xs text-gray-500 border-l border-gray-300 pl-3">
                Mode: <span className="font-semibold text-gray-700">GA</span>
              </span>
              <label htmlFor="starting-url" className="text-sm font-semibold text-gray-700 border-l border-gray-300 pl-3">
                Starting URL:
              </label>
              <input
                id="starting-url"
                type="text"
                value={startingUrl}
                onChange={(e) => setStartingUrl(e.target.value)}
                disabled={status.isRecording}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-600"
                placeholder="e.g., https://example.com"
                aria-label="Starting URL for Chromium window"
              />
            </div>

            <div className="flex flex-col gap-2 min-w-[360px] max-w-[560px]">
              <div className="flex items-center gap-2">
                <label htmlFor="include-domain-input" className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Include domains:
                </label>
                <input
                  id="include-domain-input"
                  type="text"
                  value={includeDomainInput}
                  onChange={(event) => setIncludeDomainInput(event.target.value)}
                  onKeyDown={handleIncludeDomainKeyDown}
                  disabled={status.isRecording}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-600"
                  placeholder="Paste domains, comma or newline separated"
                  aria-label="Include domains"
                />
                <button
                  type="button"
                  onClick={handleAddIncludeDomains}
                  disabled={status.isRecording || !includeDomainInput.trim()}
                  className="px-3 py-1.5 bg-gray-800 text-white text-sm font-semibold rounded hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
              </div>

              {includeDomains.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {includeDomains.map((domain) => (
                    <span
                      key={domain}
                      className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs text-blue-800"
                    >
                      {domain}
                      <button
                        type="button"
                        onClick={() => handleRemoveIncludeDomain(domain)}
                        disabled={status.isRecording}
                        className="text-blue-600 hover:text-blue-900 disabled:cursor-not-allowed"
                        aria-label={`Remove ${domain}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleStartRecording}
                disabled={status.isRecording || !recordingName.trim()}
                className="px-4 py-1.5 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                aria-label="Start recording"
              >
                ▶ Start
              </button>
              <button
                onClick={handleStopRecording}
                disabled={!status.isRecording}
                className="px-4 py-1.5 bg-red-600 text-white text-sm font-semibold rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                aria-label="Stop recording"
              >
                ■ Finish
              </button>
              <button
                onClick={handleExportData}
                disabled={events.length === 0}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                aria-label="Export to CSV"
              >
                ⬇ Export CSV
              </button>
              <button
                onClick={handleImportData}
                disabled={status.isRecording}
                className="px-4 py-1.5 bg-purple-600 text-white text-sm font-semibold rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                aria-label="Import from CSV"
              >
                ⬆ Import CSV
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-6 mt-3 pt-3 border-t border-gray-200 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Total Events:</span>
              <span className="font-bold text-gray-900">{events.length}</span>
            </div>
            {status.isRecording && status.duration !== undefined && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Elapsed Time:</span>
                  <span className="font-bold text-gray-900">{formatDuration(status.duration)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  <span className="font-semibold text-red-600">Recording...</span>
                </div>
              </>
            )}
            {status.recordingName && !status.isRecording && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Last Recording:</span>
                <span className="font-semibold text-gray-900">{status.recordingName}</span>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-3 px-3 py-2 bg-red-50 border border-red-300 text-red-700 text-sm rounded" role="alert">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>
      </div>

      {/* Split Pane: List + Details */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Virtualized Events List */}
        <div className="w-[60%] border-r border-gray-300 p-4 flex flex-col">
          <VirtualizedEventsList
            events={events}
            selectedIndex={selectedEventIndex}
            onSelectEvent={setSelectedEventIndex}
          />
        </div>

        {/* Right: Event Details Panel */}
        <div className="w-[40%] flex flex-col">
          <EventDetailsPanel 
            event={selectedEventIndex !== null ? events[selectedEventIndex] : null}
          />
        </div>
      </div>
    </div>
  );
}

export default App;