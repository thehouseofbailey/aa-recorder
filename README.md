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

**GA4 browser hits**:
- `https://www.google-analytics.com/g/collect`
- Regional variants: `https://region*.google-analytics.com/g/collect`

Common GA4 query parameters parsed:
- Core: `en`, `tid`, `cid`, `sid`, `sct`, `dl`, `dt`, `dr`, `_s`, `_p`, `tfd`, `_et`, `gcs`, `gcd`, `npa`, `dma`, `pscdl`, `tag_exp`, `_eu`, `_ss`
- Event params:  
  - Text: `ep.*` → **dynamic columns** (e.g., `ep.environment`)  
  - Numeric: `epn.*` → **dynamic columns** (e.g., `epn.loading_time_sec`)

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
Create **`README.md`** at the repo root and paste this content.

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
- **Phase 1.1:** Filters by `tid`, `en`, `cid`; session grouping (`sid`); XLSX export.  
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
