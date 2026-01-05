import React from 'react';

interface EventDetailsPanelProps {
  event: RecorderEvent | null;
}

export const EventDetailsPanel: React.FC<EventDetailsPanelProps> = ({ event }) => {
  if (!event) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        Select an event from the list to view details
      </div>
    );
  }

  // GA4 core field keys
  const coreFields = [
    'event_index',
    'timestamp_iso',
    'elapsed_since_start_ms',
    'url',
    'host',
    'path',
    'method',
    'status_code',
    'en',
    'tid',
    'cid',
    'sid',
    'sct',
    'dl',
    'dt',
    'dr',
    '_s',
    '_p',
    'tfd',
    '_et',
    'gcs',
    'gcd',
    'npa',
    'dma',
    'pscdl',
    'tag_exp',
    '_eu',
    '_ss',
  ];

  // Separate dynamic fields by prefix
  const dynamicFields = {
    ep: [] as [string, any][],
    epn: [] as [string, any][],
    ga: [] as [string, any][],
  };

  Object.entries(event).forEach(([key, value]) => {
    if (key.startsWith('ep.') && !key.startsWith('epn.')) {
      dynamicFields.ep.push([key, value]);
    } else if (key.startsWith('epn.')) {
      dynamicFields.epn.push([key, value]);
    } else if (key.startsWith('ga.')) {
      dynamicFields.ga.push([key, value]);
    }
  });

  // Sort dynamic fields alphabetically
  dynamicFields.ep.sort((a, b) => a[0].localeCompare(b[0]));
  dynamicFields.epn.sort((a, b) => a[0].localeCompare(b[0]));
  dynamicFields.ga.sort((a, b) => a[0].localeCompare(b[0]));

  const renderField = (label: string, value: any, description?: string) => {
    const displayValue = value !== undefined && value !== null ? String(value) : '';
    
    return (
      <div className="py-2 border-b border-gray-200 last:border-0">
        <div className="flex items-baseline justify-between">
          <dt className="text-xs font-semibold text-gray-600 uppercase tracking-wide" title={description}>
            {label}
          </dt>
          <dd className="text-sm font-mono text-gray-900 ml-4 break-all text-right max-w-[70%]">
            {displayValue || <span className="text-gray-400 italic">empty</span>}
          </dd>
        </div>
      </div>
    );
  };

  const renderSection = (title: string, fields: [string, any][], emptyMessage?: string) => {
    if (fields.length === 0 && emptyMessage) {
      return (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-700 mb-2 pb-1 border-b-2 border-gray-300">
            {title}
          </h3>
          <p className="text-xs text-gray-500 italic">{emptyMessage}</p>
        </div>
      );
    }

    if (fields.length === 0) {
      return null;
    }

    return (
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-700 mb-2 pb-1 border-b-2 border-gray-300">
          {title}
        </h3>
        <dl className="space-y-0">
          {fields.map(([key, value]) => renderField(key, value))}
        </dl>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-4 bg-gray-50">
      {/* Core Fields */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-700 mb-2 pb-1 border-b-2 border-blue-500">
          Core Fields
        </h3>
        <dl className="space-y-0">
          {renderField('Event Index', event.event_index, 'Sequential event number')}
          {renderField('Timestamp', event.timestamp_iso, 'ISO 8601 timestamp')}
          {renderField('Elapsed Time (ms)', event.elapsed_since_start_ms, 'Time since recording started')}
          {renderField('HTTP Method', event.method)}
          {renderField('Status Code', event.status_code)}
          {renderField('Host', event.host)}
          {renderField('Path', event.path)}
        </dl>
      </div>

      {/* GA4 Standard Parameters */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-700 mb-2 pb-1 border-b-2 border-green-500">
          GA4 Standard Parameters
        </h3>
        <dl className="space-y-0">
          {renderField('Event Name (en)', event.en)}
          {renderField('Tracking ID (tid)', event.tid, 'Measurement ID (G-XXXXXXXXXX)')}
          {renderField('Client ID (cid)', event.cid)}
          {renderField('Session ID (sid)', event.sid)}
          {renderField('Session Count (sct)', event.sct)}
          {renderField('Document Location (dl)', event.dl)}
          {renderField('Document Title (dt)', event.dt)}
          {renderField('Document Referrer (dr)', event.dr)}
          {renderField('Hit Sequence (_s)', event._s)}
          {renderField('Page Sequence (_p)', event._p)}
          {renderField('Time to First Display (tfd)', event.tfd)}
          {renderField('Engagement Time (_et)', event._et)}
          {renderField('Consent State (gcs)', event.gcs)}
          {renderField('Consent Default (gcd)', event.gcd)}
          {renderField('Non-Personalized Ads (npa)', event.npa)}
          {renderField('Data Marketing Allowed (dma)', event.dma)}
          {renderField('Page Scroll Depth (pscdl)', event.pscdl)}
          {renderField('Tag Experiment (tag_exp)', event.tag_exp)}
          {renderField('Engagement Update (_eu)', event._eu)}
          {renderField('Session Start (_ss)', event._ss)}
        </dl>
      </div>

      {/* Event Parameters (Text) */}
      {renderSection('Event Parameters (Text) - ep.*', dynamicFields.ep, 'No text event parameters')}

      {/* Event Parameters (Numeric) */}
      {renderSection('Event Parameters (Numeric) - epn.*', dynamicFields.epn, 'No numeric event parameters')}

      {/* Other GA Parameters */}
      {renderSection('Other GA Parameters - ga.*', dynamicFields.ga, 'No additional GA parameters')}

      {/* Raw URL */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-700 mb-2 pb-1 border-b-2 border-purple-500">
          Raw URL
        </h3>
        <div className="p-3 bg-white border border-gray-300 rounded font-mono text-xs break-all">
          {event.url}
        </div>
      </div>
    </div>
  );
};
