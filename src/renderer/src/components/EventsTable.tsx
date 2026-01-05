import React, { useState } from 'react';

interface EventsTableProps {
  events: RecorderEvent[];
}

export const EventsTable: React.FC<EventsTableProps> = ({ events }) => {
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<RecorderEvent | null>(null);

  // Core columns to always show
  const coreColumns = [
    'event_index',
    'timestamp_iso',
    'elapsed_since_start_ms',
    'method',
    'status_code',
    'en', // Event name
    'tid', // Tracking ID
    'cid', // Client ID
  ];

  // Get all unique columns from events
  const allColumns = Array.from(
    new Set(events.flatMap(event => Object.keys(event)))
  ).sort();

  const displayColumns = showAllColumns ? allColumns : coreColumns;

  const formatValue = (value: any): string => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'string' && value.length > 30) {
      return value.substring(0, 30) + '...';
    }
    return String(value);
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showAllColumns}
              onChange={(e) => setShowAllColumns(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Show all columns ({allColumns.length})</span>
          </label>
        </div>
        <div className="text-sm text-gray-500">
          Showing {displayColumns.length} of {allColumns.length} columns
        </div>
      </div>

      <div className="overflow-auto max-h-96 border rounded-lg">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {displayColumns.map(column => (
                <th
                  key={column}
                  className="px-2 py-2 text-left font-medium text-gray-700 border-b"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((event, index) => (
              <tr
                key={event.event_index || index}
                className={`hover:bg-gray-50 cursor-pointer ${
                  selectedEvent === event ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedEvent(selectedEvent === event ? null : event)}
              >
                {displayColumns.map(column => (
                  <td
                    key={column}
                    className="px-2 py-2 border-b text-gray-900"
                    title={String(event[column] || '')}
                  >
                    {column === 'elapsed_since_start_ms' && event[column]
                      ? formatDuration(event[column])
                      : formatValue(event[column])
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedEvent && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Event Details</h4>
            <button
              onClick={() => setSelectedEvent(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {Object.entries(selectedEvent).map(([key, value]) => (
              <div key={key} className="bg-white p-2 rounded">
                <div className="font-medium text-gray-700">{key}:</div>
                <div className="text-gray-900 break-all">
                  {value === undefined || value === null ? '(empty)' : String(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <p>No events captured yet.</p>
          <p className="text-sm mt-1">Start recording to see Google Analytics events appear here.</p>
        </div>
      )}
    </div>
  );
};