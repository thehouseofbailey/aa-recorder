# Analytics & Ads Network Recorder (Phase 1)

**Windows-only**, self-contained desktop app that opens an isolated Chromium window, records **Google Analytics 4 (GA4)** network requests in real time, and exports/imports **CSV** files (1 event per row, with sequence numbers and timestamps). Built with **Electron + Playwright**.

> Phase 1 scope: **GA4 only**. (Google Ads support will be added in Phase 2.)

---

## ✨ Key features

- **Start/Finish** recording sessions with a user‑defined name.
- Open an **isolated Chromium** window (fresh profile) for clean sessions.
- **Live event stream** in the app while you browse.
- **CSV export** (sheet‑compatible base columns + dynamic expansion).
- **CSV import** for in‑app review and replay.
- **Windows portable EXE** packaging (single file, no installer).

---

## 🧱 Tech stack

- **Shell:** Electron (TypeScript)
- **Capture engine:** Playwright (Chromium, headful)
- **UI:** React + Vite + Tailwind (swap to plain HTML+TS if preferred)
- **Packaging:** electron-builder → Windows **portable** EXE

---

## 🎯 What is recorded (Phase 1)

**Current capture targets**:
- `https://www.google-analytics.com/g/collect`
- Regional variants: `https://region*.google-analytics.com/g/collect`

Common GA4 query parameters parsed:
- Core: `en`, `tid`, `cid`, `sid`, `sct`, `dl`, `dt`, `dr`, `_s`, `_p`, `tfd`, `_et`, `gcs`, `gcd`, `npa`, `dma`, `pscdl`, `tag_exp`, `_eu`, `_ss`
- Event params:  
  - Text: `ep.*` → **dynamic columns** (e.g., `ep.environment`)  
  - Numeric: `epn.*` → **dynamic columns** (e.g., `epn.loading_time_sec`)

> As the project migrates toward server-side analytics, the UI should let each website add its own include-domain list so equivalent requests on alternate analytics domains are still captured.

> **Dynamic expansion:** any previously unseen GA keys are added as columns (see CSV schema below).

---

## 🧭 User flow (MVP)

1. Open the app → click **Start** → enter **recording name**.  
2. A Playwright **Chromium** window opens (fresh profile).  
3. Browse across pages/sites → GA4 network hits are recorded.  
4. Click **Finish** → a **CSV** is generated and made available.  
5. Events appear **live** in the app and remain available to review.  
6. Load a **CSV** to view/replay data in the app’s interface.

---

## 📄 CSV schema (sheet‑compatible + expandable)

**Base columns** (sheet‑compatible names where applicable):

| Column | Description |
|---|---|
| `recording_name` | Name of the session provided by the user |
| `event_index` | Strict sequence index (1..N) |
| `timestamp_iso` | ISO timestamp of capture |
| `elapsed_since_start_ms` | Milliseconds since first event |
| `url`, `host`, `path`, `method`, `status_code` | Request basics |
| `event_name (en)` | GA4 event name |
| `page_url (dl)`, `page_title (dt)`, `referrer (dr)` | Page context |
| `measurement_id (tid)` | GA4 Measurement ID |
| `client_id (cid)` | GA4 client id |
| `session_id (sid)` | GA4 session id |
| `session_count (sct)` | GA4 session count |
| `seq_on_page (_s)`, `page_hash (_p)` | Sequence/hash from GA payload |
| `time_from_document_ms (tfd)` | GA payload metric |
| `engagement_time_ms (_et)` | GA payload metric |
| `consent_status (gcs)`, `consent_default (gcd)` | Consent fields |
| `npa`, `dma`, `pscdl`, `tag_exp`, `_eu`, `_ss` | Additional GA fields |
| `schema_version` | CSV schema version (e.g., `1`) |

**Dynamic columns** (auto‑expanded at export time):
- `ep.<key>` → text event parameters (e.g., `ep.environment`, `ep.debug_mode`)
- `epn.<key>` → numeric event parameters (e.g., `epn.loading_time_sec`)
- `ga.<key>` → any other previously unseen GA query keys

> Rows always include the full header; missing values are blank.

---

## 🔒 Privacy & compliance

- **Phase 1**: no redactions (as requested).  
- Future options (configurable): redact `cid`, `sid`, `transaction_id`, etc.

---

## 📦 Project structure (planned)

```
/src
  /main        # Electron main process (IPC, window orchestration)
  /renderer    # React UI (Vite + Tailwind)
  /recorder    # Playwright recorder engine (GA filters, parsers, CSV)
    /utils     # urlMatchers, parseGa4, csv helpers
/scripts       # dev runner (esbuild + electron)
/dist          # built renderer assets
```

---

## 🚀 Getting started

### 1) Prereqs
- Node.js (LTS)
- Git
- (Optional now) VS Code or an IDE with Copilot

### 2) Create the GitHub repo
```bash
# On GitHub: create an empty repo, e.g. ga4-recorder
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
```

### 3) Add this README
Create **`# AA Recorder

Analytics Ads Recorder built with Electron and Playwright for automated web content recording.

## Architecture

This application combines several technologies to provide a robust recording solution:

- **Electron**: Desktop application framework for cross-platform deployment
- **Playwright**: Browser automation with bundled Chromium for consistent recording
- **React**: Modern UI framework with TypeScript for type safety
- **Vite**: Fast build tool for development and production
- **Tailwind CSS**: Utility-first CSS framework for responsive design

## Why Playwright's Bundled Chromium?

We chose Playwright's bundled Chromium over system browsers for several key advantages:

1. **Consistency**: Every user runs the exact same browser version, eliminating "works on my machine" issues
2. **Reliability**: No dependency on user's installed browsers or their configurations
3. **Automation-Optimized**: Playwright's Chromium is specifically built for automation with enhanced APIs
4. **Security**: Controlled environment with known capabilities and limitations
5. **Portability**: Self-contained solution that works identically across different systems

## Why Portable EXE and AppImage Distribution?

The application provides different distribution formats optimized for each platform:

### Windows - Portable EXE
1. **No Installation Required**: Users can run the application immediately without admin rights
2. **Isolation**: Doesn't interfere with system-installed software or registry
3. **Version Management**: Multiple versions can coexist without conflicts
4. **Enterprise Friendly**: Easy to deploy in corporate environments with restricted installation policies
5. **Clean Uninstall**: Simply delete the executable - no leftover files or registry entries

### Linux - AppImage
1. **Universal Compatibility**: Runs on most Linux distributions without dependency issues
2. **Self-Contained**: All dependencies bundled, no need to install system packages
3. **Portable**: Can be run from any location, including removable media
4. **No Root Required**: Standard users can execute without administrator privileges
5. **Distribution Agnostic**: Works across different Linux flavors and versions

### macOS - DMG
1. **Native Experience**: Standard macOS application format
2. **Code Signed**: Can be properly signed for distribution outside App Store
3. **Easy Installation**: Drag-and-drop installation familiar to Mac users

## Project Structure

```
src/
├── main/           # Electron main process
│   ├── index.ts    # Main application entry
│   └── preload.ts  # IPC bridge
├── renderer/       # React UI
│   ├── src/        # React components and logic
│   └── styles/     # CSS and Tailwind styles
└── recorder/       # Playwright recording logic
    └── RecorderManager.ts
```

## Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

This starts both the Vite dev server (UI) and Electron in development mode with hot reload.

### Build for Production

```bash
# Build for current platform
npm run build

# Build platform-specific
npm run build:win      # Windows portable EXE
npm run build:linux    # Linux AppImage  
npm run build:mac      # macOS DMG

# Build for all platforms
npm run build:all
```

### Scripts

- `postinstall`: Automatically installs Playwright's Chromium browser
- `dev`: Runs both UI and Electron in development mode
- `dev:ui`: Starts Vite development server
- `dev:electron`: Builds and runs Electron main process
- `build`: Production build for current platform
- `build:win`: Creates portable Windows executable
- `build:linux`: Creates Linux AppImage
- `build:mac`: Creates macOS DMG installer  
- `build:all`: Builds for all platforms
- `audit-fix`: Fixes npm security vulnerabilities
- `lint`: Runs ESLint for code quality

## Configuration

The application uses TypeScript with strict mode enabled and ESNext modules for modern JavaScript features. Tailwind CSS is configured for the renderer process only, keeping the main process lightweight.

## Features

- **URL Recording**: Navigate to any URL and record browser interactions
- **Video Capture**: Records browser content as video files
- **Duration Control**: Set recording duration or stop manually
- **Real-time Status**: Live updates on recording progress
- **Cross-platform**: Works on Windows, macOS, and Linux

## License

MIT`** at the repo root and paste this content.

### 4) Initialize the project
```bash
npm init -y
```

### 5) Install and scaffold (via prompts)
Use your prompt pack to:
- Add **dependencies/devDependencies** (Electron, Playwright, Vite, React, Tailwind, etc.)
- Create **scripts** (`dev`, `dev:ui`, `dev:electron`, `build`, `build:win`)
- Implement **Electron main & preload** (secure IPC)
- Implement **Recorder.ts** (Playwright + GA filters, parsing, dynamic columns)
- Implement **UI** (Start/Finish, live list, details, export/import)
- Implement **CSV helpers** (dynamic header + streaming write)
- Add **tests** (Vitest + Playwright)

Run:
```bash
npm run dev
```
Then build a Windows portable EXE:
```bash
npm run build:win
```

---

## ⚙️ Expected scripts

```jsonc
{
  "scripts": {
    "postinstall": "playwright install chromium",
    "dev": "concurrently -n UI,MAIN \"npm run dev:ui\" \"npm run dev:electron\"",
    "dev:ui": "vite",
    "dev:electron": "ts-node ./scripts/dev-electron.ts",
    "build": "vite build && electron-builder",
    "build:win": "vite build && electron-builder --win portable",
    "lint": "eslint ."
  }
}
```

> `postinstall` ensures a compatible **Chromium** is available for Playwright.

---

## 🧪 Testing

- **Unit (Vitest):**  
  - `parseGa4` (decode `%`-encoding, numeric conversion, dynamic keys).  
  - CSV helpers (header expansion & round‑trip).

- **Integration (Playwright):**  
  - Local page fires GA beacons (`<img src>` or `fetch`) to `/g/collect`.  
  - Recorder captures events, exports CSV, then import validates.

---

## 🛠 Packaging (Windows portable EXE)

- Configure electron‑builder:
  - `win.target = "portable"`
  - `artifactName = "AA-Recorder-${version}-portable.exe"`
  - `asar = true`
  - include `dist/**` and `package.json`

- **CI** (optional): GitHub Actions job to build on `main` and upload artifact.

---

## 🗺️ Roadmap

- **Phase 1:** GA4 recording, CSV export/import, live UI.  
- **Phase 1.1:** Filters by `tid`, `en`, `cid`; session grouping (`sid`); per-site include-domain lists for server-side analytics; XLSX export.  
- **Phase 2:** Add **Google Ads** endpoints & parsing; scripted journey automation.  
- **Phase 3:** Advanced analytics (funnel summaries, cohort views).

---

## 🔗 References & further reading

- Playwright – Network monitoring & events
- Electron‑builder – Portable target for Windows executables
- GA4 – Measurement Protocol & browser payload parameters
- Google tag / gtag (for Ads) – future phase

---

## 📣 Naming

Working name: **AA Recorder** (Analytics & Ads Recorder).  
For GA‑only Phase 1, feel free to rename to **GA Recorder** or **Journey Recorder**. The prompts and architecture remain unchanged.
