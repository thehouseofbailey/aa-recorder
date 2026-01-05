# Build and Release Guide

This guide covers building and releasing AA-Recorder for Windows and Linux.

## Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- Git

## Local Development Build

### Install Dependencies
```bash
npm ci
```

### Run Development Mode
```bash
npm run dev
```

This starts:
- Vite dev server on port 3001 (React UI with hot reload)
- Electron main process with auto-restart on changes

### Run Tests
```bash
# All tests (unit + integration)
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode
npm run test:watch

# UI mode
npm run test:ui
```

## Production Builds

### Windows Portable EXE
```bash
npm run build:win
```

**Output:** `release/AA-Recorder-1.0.0-portable.exe`

**Configuration:**
- Target: `portable` (single EXE, no installer)
- ASAR: Enabled (compressed app.asar archive)
- Files: `dist/**` only (excludes src, tests, etc.)
- Artifact naming: `AA-Recorder-${version}-portable.exe`

### Linux AppImage
```bash
npm run build:linux
```

**Output:** `release/AA-Recorder-1.0.0.AppImage`

**Configuration:**
- Target: `AppImage` (portable, no installation required)
- Category: Utility
- ASAR: Enabled
- Artifact naming: `AA-Recorder-${version}.AppImage`

### macOS DMG
```bash
npm run build:mac
```

**Output:** `release/AA-Recorder-1.0.0.dmg`

**Note:** Requires macOS to build. Cross-compilation from Linux/Windows is not reliable.

### All Platforms
```bash
npm run build:all
```

Builds Windows portable, Linux AppImage, and macOS DMG sequentially.

## Application Icons

Icons are located in the `build/` directory:

- **Windows:** `icon.ico` (256x256 or multi-size)
- **Linux:** `icon.png` (512x512 recommended)
- **macOS:** `icon.icns` (multiple sizes)

### Generating Icons from SVG

The source SVG is in `build/icon.svg`.

#### Using ImageMagick:
```bash
# Windows ICO
convert build/icon.svg -resize 256x256 build/icon.ico

# Linux PNG
convert build/icon.svg -resize 512x512 build/icon.png

# macOS ICNS (requires iconutil on macOS)
mkdir icon.iconset
sips -z 16 16     build/icon.svg --out icon.iconset/icon_16x16.png
sips -z 32 32     build/icon.svg --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     build/icon.svg --out icon.iconset/icon_32x32.png
sips -z 64 64     build/icon.svg --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   build/icon.svg --out icon.iconset/icon_128x128.png
sips -z 256 256   build/icon.svg --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   build/icon.svg --out icon.iconset/icon_256x256.png
sips -z 512 512   build/icon.svg --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   build/icon.svg --out icon.iconset/icon_512x512.png
sips -z 1024 1024 build/icon.svg --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset -o build/icon.icns
```

#### Online Tools:
- https://cloudconvert.com/svg-to-ico
- https://anyconv.com/svg-to-png-converter/
- https://iconverticons.com/online/

## GitHub Actions CI/CD

The project includes automated builds via GitHub Actions (`.github/workflows/build.yml`).

### Workflow Triggers

- **Push to main:** Builds Windows and Linux versions
- **Push to release/* branches:** Builds and uploads artifacts
- **Tags (v*):** Builds and creates GitHub release
- **Pull requests:** Builds and runs tests
- **Manual dispatch:** Can be triggered manually from Actions tab

### Build Jobs

#### 1. `build-windows`
- Runner: `windows-latest`
- Node: 20.x
- Steps:
  1. Checkout code
  2. Setup Node.js with npm cache
  3. Install dependencies (`npm ci`)
  4. Run tests
  5. Build Windows portable (`npm run build:win`)
  6. Upload artifact (30-day retention)
  7. Create GitHub release (if tag)

#### 2. `build-linux`
- Runner: `ubuntu-latest`
- Node: 20.x
- Steps:
  1. Checkout code
  2. Setup Node.js with npm cache
  3. Install dependencies (`npm ci`)
  4. Run tests
  5. Build Linux AppImage (`npm run build:linux`)
  6. Upload artifact (30-day retention)
  7. Create GitHub release (if tag)

#### 3. `build-matrix` (Alternative)
- Matrix strategy for parallel builds
- Runs unit tests only (faster)
- Builds both platforms simultaneously

### Downloading Build Artifacts

1. Go to GitHub Actions tab
2. Click on the workflow run
3. Scroll to "Artifacts" section
4. Download:
   - `aa-recorder-windows-portable` (Windows EXE)
   - `aa-recorder-linux-appimage` (Linux AppImage)

### Creating a Release

1. **Tag the version:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **GitHub Actions will:**
   - Build Windows and Linux versions
   - Run all tests
   - Create a GitHub release
   - Attach build artifacts to the release

3. **Manual release creation:**
   - Go to Releases → Create new release
   - Choose the tag
   - Add release notes
   - Upload artifacts manually if needed

## Troubleshooting

### Build Fails: "Playwright not installed"
Run `npm run postinstall` or `playwright install chromium`

### Build Fails: "Module not found"
Ensure you ran `npm ci` and not `npm install` (CI uses exact versions from package-lock.json)

### Tests Timeout
Integration tests require Playwright Chromium. Increase timeout in vitest.config.ts if needed.

### Windows Build on Linux
electron-builder can cross-compile Windows builds from Linux (wine required):
```bash
sudo apt-get install wine64
npm run build:win
```

### ASAR Integrity Errors
Ensure Electron version is 35.7.5+ (fixes ASAR integrity bypass vulnerability)

## Build Size Optimization

Current build includes:
- Electron runtime (~150MB)
- Playwright Chromium (~300MB bundled in extraResources)
- Application code (compressed in app.asar, ~10MB)

**Total size:** ~460MB (Windows portable), ~480MB (Linux AppImage)

To reduce size:
- Playwright browsers are bundled for offline use
- Remove extraResources if targeting systems with system Chrome/Chromium
- Use electron-builder compression options

## Security Notes

- ASAR is enabled for code integrity
- Node integration disabled in renderer
- Context isolation enabled
- Sandbox mode enabled
- All dependencies security-audited (0 vulnerabilities)

## Version Bumping

```bash
# Patch (1.0.0 → 1.0.1)
npm version patch

# Minor (1.0.0 → 1.1.0)
npm version minor

# Major (1.0.0 → 2.0.0)
npm version major
```

This automatically updates package.json and creates a git commit + tag.
