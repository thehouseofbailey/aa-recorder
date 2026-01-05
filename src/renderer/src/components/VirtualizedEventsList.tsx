import React, { useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';

interface VirtualizedEventsListProps {
  events: RecorderEvent[];
  selectedIndex: number | null;
  onSelectEvent: (index: number) => void;
}

export const VirtualizedEventsList: React.FC<VirtualizedEventsListProps> = ({
  events,
  selectedIndex,
  onSelectEvent,
}) => {
  const listRef = useRef<List>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (listRef.current && events.length > 0) {
      listRef.current.scrollToItem(events.length - 1, 'end');
    }
  }, [events.length]);

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const truncate = (str: string | undefined, maxLen: number): string => {
    if (!str) return '';
    return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const event = events[index];
    const isSelected = index === selectedIndex;

    return (
      <div
        style={style}
        className={`
          flex items-center px-2 py-1 border-b border-gray-200 cursor-pointer
          hover:bg-blue-50 transition-colors text-sm font-mono
          ${isSelected ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset' : 'bg-white'}
        `}
        onClick={() => onSelectEvent(index)}
        role="row"
        aria-selected={isSelected}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectEvent(index);
          }
        }}
      >
        {/* Index */}
        <div className="w-12 flex-shrink-0 text-gray-500" title="Event Index">
          {event.event_index}
        </div>

        {/* Elapsed Time */}
        <div className="w-16 flex-shrink-0 text-gray-600" title="Elapsed Time">
          {formatTime(event.elapsed_since_start_ms)}
        </div>

        {/* Host */}
        <div className="w-40 flex-shrink-0 overflow-hidden text-ellipsis" title={event.host}>
          {truncate(event.host, 35)}
        </div>

        {/* Path */}
        <div className="w-32 flex-shrink-0 overflow-hidden text-ellipsis" title={event.path}>
          {truncate(event.path, 28)}
        </div>

        {/* Event Name (en) */}
        <div className="w-32 flex-shrink-0 overflow-hidden text-ellipsis font-semibold text-blue-600" title={event.en || ''}>
          {truncate(event.en, 28)}
        </div>

        {/* Tracking ID (tid) */}
        <div className="w-28 flex-shrink-0 overflow-hidden text-ellipsis text-gray-600" title={event.tid || ''}>
          {truncate(event.tid, 24)}
        </div>

        {/* Client ID (cid) */}
        <div className="w-36 flex-shrink-0 overflow-hidden text-ellipsis text-gray-600" title={event.cid || ''}>
          {truncate(event.cid, 32)}
        </div>

        {/* Session ID (sid) */}
        <div className="w-24 flex-shrink-0 overflow-hidden text-ellipsis text-gray-600" title={event.sid || ''}>
          {truncate(event.sid, 20)}
        </div>

        {/* Status Code */}
        <div
          className={`w-12 flex-shrink-0 text-center font-semibold ${
            event.status_code === 200 ? 'text-green-600' : 'text-red-600'
          }`}
          title="HTTP Status"
        >
          {event.status_code}
        </div>
      </div>
    );
  };

  const Header = () => (
    <div className="flex items-center px-2 py-2 bg-gray-100 border-b-2 border-gray-300 text-xs font-semibold text-gray-700 sticky top-0 z-10">
      <div className="w-12 flex-shrink-0">Index</div>
      <div className="w-16 flex-shrink-0">Time</div>
      <div className="w-40 flex-shrink-0">Host</div>
      <div className="w-32 flex-shrink-0">Path</div>
      <div className="w-32 flex-shrink-0">Event Name</div>
      <div className="w-28 flex-shrink-0">Tracking ID</div>
      <div className="w-36 flex-shrink-0">Client ID</div>
      <div className="w-24 flex-shrink-0">Session ID</div>
      <div className="w-12 flex-shrink-0 text-center">Status</div>
    </div>
  );

  return (
    <div className="flex flex-col h-full border border-gray-300 rounded-lg overflow-hidden">
      <Header />
      {events.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          No events captured yet. Start recording to see events appear here.
        </div>
      ) : (
        <List
          ref={listRef}
          height={600} // Will be overridden by parent
          itemCount={events.length}
          itemSize={36}
          width="100%"
          className="flex-1"
          role="listbox"
          aria-label="Captured GA4 Events"
        >
          {Row}
        </List>
      )}
    </div>
  );
};
