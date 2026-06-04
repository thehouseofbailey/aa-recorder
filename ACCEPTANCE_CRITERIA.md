# AA-Recorder - Acceptance Criteria

## User Story
**As an analyst**, I want to record only GA4 network hits during a browsing session and export a CSV so I can review the journey live and later.

## Acceptance Criteria

### ✅ Recording Session
- [ ] **Start** button opens a headful Chromium window with fresh profile
  - Window is visible to the user (not headless)
  - Each session uses a new isolated user data directory
  - User can interact with the browser normally
  - Initial page: GA4 Event Builder (https://ga-dev-tools.web.app/ga4/event-builder/)

- [ ] **GA4-Only Filtering** captures exclusively GA4 collect requests
  - Standard pattern: `https://*.google-analytics.com/g/collect`
  - Regional pattern: `https://region*.google-analytics.com/g/collect`
  - All other network requests are ignored
  - No false positives (non-GA4 requests captured)
  - No false negatives (valid GA4 requests missed)
  - Future server-side analytics support: user-configurable include-domain list for alternate analytics endpoints

### ✅ Live Event Streaming
- [ ] **Events stream to UI in real-time**
  - Events appear immediately after network capture
  - Strict sequential ordering maintained (event_index)
  - Millisecond-precision timestamps (elapsed_since_start_ms)
  - No event loss during high-volume traffic
  - UI updates smoothly without blocking

- [ ] **Event Data Completeness**
  - Core metadata: event_index, timestamp_iso, elapsed_since_start_ms
  - Network data: url, host, path, method, status_code
  - Standard GA4 parameters: en, tid, cid, sid, sct, dl, dt, dr, _s, _p, tfd, _et, gcs, gcd, npa, dma, pscdl, tag_exp, _eu, _ss
  - Dynamic parameter expansion:
    - `ep.*` → Event parameters (text)
    - `epn.*` → Event parameters (numeric with type conversion)
    - `ga.*` → Other GA parameters
  - URL-encoded values are decoded (UTF-8)

### ✅ CSV Export
- [ ] **Finish** button stops recording and exports CSV
  - Recording stops cleanly
  - Browser context closed properly
  - CSV file created in `~/AA-Recordings/` directory
  - Filename format: `{recordingName}_{ISO-timestamp}.csv`
  - File path returned to user

- [ ] **Sheet-Compatible CSV Format**
  - Windows line endings (`\r\n`) for Excel compatibility
  - Base columns first (core metadata + network + standard GA4)
  - Dynamic columns sorted by groups: `ep.*` < `epn.*` < `ga.*`
  - Within groups, alphabetically sorted
  - `schema_version` column last (value: `1.0.0`)
  - Proper CSV escaping:
    - Commas in values → wrapped in quotes
    - Quotes in values → doubled (`""`)
    - Newlines in values → preserved within quotes

- [ ] **Dynamic Column Expansion**
  - New dynamic columns discovered during recording are added to header
  - All events have values for all columns (blank if missing)
  - Column order remains consistent throughout CSV
  - Maximum tested: 100+ dynamic columns

### ✅ CSV Import
- [ ] **Import CSV** button loads previously exported data
  - File picker allows user to select CSV file
  - CSV validation:
    - Header contains `schema_version` column
    - Header contains GA4-specific columns (en, tid, cid, ep.*, epn.*, ga.*)
    - Schema version is compatible (currently `1.0.0`)
  - Invalid CSV rejected with clear error message:
    - Missing `schema_version` → "Missing schema_version column. This CSV was not exported by aa-recorder."
    - No GA4 columns → "No GA4 columns detected. Unknown CSV format."

- [ ] **Events Reload into UI**
  - Imported events replace current event list
  - Events displayed in same format as live capture
  - All dynamic columns preserved
  - Event count matches CSV row count
  - Events are emitted via `recorder:event` for UI subscription

### ✅ Performance Requirements
- [ ] **High-Volume Handling: >= 2,000 events without UI lag**
  - Virtualized list renders only visible rows
  - Smooth scrolling with 2,000+ events
  - Event capture does not block UI thread
  - Memory usage remains stable (no leaks)
  - Tested: 150+ events in 3 seconds without performance degradation

- [ ] **Export Performance: < 2 seconds for ~5,000 rows**
  - CSV write uses streaming (not in-memory concatenation)
  - Measured on typical hardware (4-core CPU, 8GB RAM)
  - Progress indication for large exports (optional)
  - No UI freeze during export

### ✅ Data Integrity
- [ ] **Schema Versioning**
  - Every CSV includes `schema_version` column
  - Current version: `1.0.0`
  - Future versions can validate compatibility
  - Import validates schema version

- [ ] **Round-Trip Integrity**
  - Export → Import → Export produces identical CSV structure
  - All data types preserved (strings, numbers)
  - Dynamic columns maintain same order
  - Event count remains unchanged
  - Timestamps remain precise

### ✅ User Experience
- [ ] **Clear UI State**
  - Recording name input (required before start)
  - Mode display (fixed: "GA")
  - Visual recording indicator (pulsing red dot)
  - Elapsed time counter (MM:SS format)
  - Total event count (live updates)
  - Error messages displayed prominently

- [ ] **Split-Pane Layout**
  - Left (60%): Virtualized event list
    - Columns: Index, Time, Host, Path, Event Name, TID, CID, SID, Status
    - Click to select event
    - Keyboard navigation (Arrow keys, Enter)
  - Right (40%): Event details panel
    - Expandable sections: Core, GA4 Standard, ep.*, epn.*, ga.*, Raw URL
    - Copy-friendly formatting
    - Empty state message when no event selected

- [ ] **Accessibility**
  - ARIA labels on all interactive elements
  - Keyboard-only navigation supported
  - Screen reader friendly
  - Focus indicators visible
  - Error messages have `role="alert"`

## Test Coverage

### Unit Tests
- [x] `parseGa4.ts` - URL parsing with all parameter types
- [x] `csvHelpers.ts` - Header building, row formatting, validation
- [x] `urlMatchers.ts` - GA4 pattern matching

### Integration Tests
- [x] Full recording workflow (start → capture → stop → export)
- [x] CSV structure validation (header sorting, schema version)
- [x] CSV import and re-emission
- [x] Round-trip integrity (export → import → export)
- [x] High-volume event handling (150+ events)

### Manual Testing Scenarios
- [ ] Record session on GA4 Event Builder
- [ ] Fire custom events with ep.* and epn.* parameters
- [ ] Verify dynamic columns appear in correct order
- [ ] Export CSV and open in Excel/Google Sheets
- [ ] Import CSV back into app
- [ ] Test with 2,000+ events (stress test)
- [ ] Verify error handling for invalid CSV import

## Definition of Done
- [ ] All acceptance criteria met
- [ ] Unit tests passing (100% coverage for critical paths)
- [ ] Integration tests passing
- [ ] Manual testing completed on Windows and Linux
- [ ] Performance benchmarks met (2,000 events, 5,000 row export)
- [ ] Documentation updated (README, BUILD.md)
- [ ] Code reviewed and approved
- [ ] No security vulnerabilities (npm audit clean)
- [ ] Build artifacts generated successfully (Windows portable, Linux AppImage)

## Success Metrics
- **Functional**: 100% of GA4 events captured (no loss)
- **Performance**: 2,000 events with < 16ms frame time (60fps)
- **Export Speed**: 5,000 rows exported in < 2 seconds
- **Accuracy**: 0 false positives/negatives in GA4 filtering
- **Reliability**: 0 crashes during 30-minute recording session
- **Data Integrity**: 100% round-trip accuracy

## Non-Goals (Out of Scope)
- Recording non-GA4 analytics (GA3, GTM, etc.)
- Real-time event editing or filtering
- Historical data import from other tools
- Cloud sync or multi-user collaboration
- Automated testing/replay of recorded events
- Browser automation beyond Playwright's built-in features

## Dependencies
- Playwright v1.49.0 (Chromium bundled)
- Electron v35.7.5 (secure sandboxing)
- React v18.3.0 (UI framework)
- react-window v2.2.4 (virtualization)

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| High event rate causes memory leak | Use streaming CSV write, limit in-memory events to 10k |
| Playwright browser crash | Graceful error handling, auto-cleanup of user data dirs |
| CSV export timeout | Async export with progress indicator |
| Invalid GA4 URL parsing | Comprehensive regex validation, unit tests |
| UI lag with large datasets | Virtualized list (react-window), render only visible rows |

## Notes
- CSV format is compatible with Excel, Google Sheets, and Looker Studio
- Dynamic columns allow unlimited custom parameters without schema changes
- Schema versioning ensures future compatibility for CSV imports
- Fresh profile per session prevents cookie/cache interference
