import React, { useState } from 'react';

interface RecorderControlsProps {
  isRecording: boolean;
  onStart: (recordingName: string) => void;
  onStop: () => void;
  onExport: (targetPath?: string) => void;
}

export const RecorderControls: React.FC<RecorderControlsProps> = ({
  isRecording,
  onStart,
  onStop,
  onExport,
}) => {
  const [recordingName, setRecordingName] = useState('GA_Recording');
  const [exportPath, setExportPath] = useState('');

  const handleStart = () => {
    if (recordingName.trim()) {
      onStart(recordingName.trim());
    }
  };

  const handleExport = () => {
    onExport(exportPath.trim() || undefined);
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="recordingName" className="block text-sm font-medium text-gray-700 mb-2">
          Recording Name
        </label>
        <input
          id="recordingName"
          type="text"
          value={recordingName}
          onChange={(e) => setRecordingName(e.target.value)}
          disabled={isRecording}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          placeholder="Enter recording name"
        />
        <p className="text-xs text-gray-500 mt-1">
          This will be used for the CSV filename
        </p>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={handleStart}
          disabled={isRecording || !recordingName.trim()}
          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isRecording ? 'Recording...' : 'Start GA Recording'}
        </button>

        <button
          onClick={onStop}
          disabled={!isRecording}
          className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Stop Recording
        </button>
      </div>

      <div className="border-t pt-4">
        <label htmlFor="exportPath" className="block text-sm font-medium text-gray-700 mb-2">
          Export Path (optional)
        </label>
        <input
          id="exportPath"
          type="text"
          value={exportPath}
          onChange={(e) => setExportPath(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 mb-3"
          placeholder="Leave empty for default location"
        />
        <button
          onClick={handleExport}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          Export Current Data
        </button>
      </div>

      <div className="bg-blue-50 p-3 rounded-md">
        <h4 className="text-sm font-medium text-blue-800 mb-1">How it works:</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Opens Google Analytics Event Builder in Playwright</li>
          <li>• Captures all GA tracking requests in real-time</li>
          <li>• Exports data as CSV with all GA parameters</li>
          <li>• Supports Google Analytics 4 event tracking</li>
        </ul>
      </div>
    </div>
  );
};