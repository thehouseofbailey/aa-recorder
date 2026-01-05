import React from 'react';

interface RecordingStatus {
  isRecording: boolean;
  recordingName?: string;
  pageUrl?: string;
  startTime?: Date;
  duration?: number;
  eventCount: number;
}

interface StatusDisplayProps {
  status: RecordingStatus;
}

export const StatusDisplay: React.FC<StatusDisplayProps> = ({ status }) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <div
          className={`w-3 h-3 rounded-full ${
            status.isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
          }`}
        />
        <span className="text-sm font-medium">
          {status.isRecording ? 'Recording GA Events' : 'Stopped'}
        </span>
      </div>

      {status.recordingName && (
        <div>
          <span className="text-sm text-gray-600">Recording Name:</span>
          <p className="text-sm font-medium bg-gray-50 p-2 rounded mt-1">
            {status.recordingName}
          </p>
        </div>
      )}

      {status.pageUrl && (
        <div>
          <span className="text-sm text-gray-600">Page URL:</span>
          <p className="text-sm font-mono bg-gray-50 p-2 rounded mt-1 break-all">
            {status.pageUrl}
          </p>
        </div>
      )}

      {status.startTime && (
        <div>
          <span className="text-sm text-gray-600">Started at:</span>
          <p className="text-sm">
            {status.startTime.toLocaleString()}
          </p>
        </div>
      )}

      {status.duration !== undefined && (
        <div>
          <span className="text-sm text-gray-600">Duration:</span>
          <p className="text-sm font-mono">
            {formatDuration(status.duration)}
          </p>
        </div>
      )}

      <div className="border-t pt-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Events Captured:</span>
          <span className={`text-sm font-bold ${
            status.eventCount > 0 ? 'text-green-600' : 'text-gray-400'
          }`}>
            {status.eventCount}
          </span>
        </div>
      </div>

      {status.isRecording && (
        <div className="bg-green-50 p-3 rounded-md">
          <p className="text-xs text-green-700">
            📊 Monitoring Google Analytics requests...
          </p>
          <p className="text-xs text-green-600 mt-1">
            Events will appear in real-time as they are captured.
          </p>
        </div>
      )}
    </div>
  );
};