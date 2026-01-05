# Changelog

## v1.0.1 - Cross-Platform and Security Updates (2026-01-05)

### 🚀 Cross-Platform Support
- **Windows**: Portable EXE distribution (no installation required)
- **Linux**: AppImage distribution (universal Linux compatibility)
- **macOS**: DMG installer for native Mac experience
- Added platform-specific Playwright launch arguments (Linux GPU handling)
- Cross-platform path handling in all modules
- Windows-compatible command spawning in development scripts

### 🔐 Security Updates
- Updated Electron to v35.7.5 (fixes ASAR integrity bypass vulnerability)
- Updated esbuild to v0.27.2 (fixes development server security issue)
- Updated all TypeScript ESLint packages to v8.x (compatible with ESLint v9)
- Fixed all npm audit security vulnerabilities (0 vulnerabilities remaining)

### 📦 Dependency Updates
- **Electron**: v28.0.0 → v35.7.5
- **ESLint**: v8.50.0 → v9.0.0 (with v9 flat config)
- **esbuild**: v0.19.0 → v0.27.2
- **TypeScript**: v5.2.0 → v5.6.0
- **Vite**: v5.0.0 → v6.0.0
- **Playwright**: v1.40.0 → v1.49.0
- **Concurrently**: v8.2.0 → v9.0.0
- Added `cross-env` for environment variable handling
- Added `globals` and `typescript-eslint` for improved ESLint configuration

### 🛠 Configuration Improvements
- Migrated from ESLint v8 (.eslintrc.cjs) to ESLint v9 (eslint.config.js) flat config
- Enhanced esbuild configuration with proper external dependency handling
- Added default output directory creation (`~/AA-Recordings`)
- Improved TypeScript path resolution and aliases
- Added comprehensive .gitignore patterns

### 📝 New Scripts
- `build:linux` - Creates Linux AppImage
- `build:mac` - Creates macOS DMG
- `build:all` - Builds for all platforms simultaneously
- `audit-fix` - Automated security vulnerability fixing

### 🎯 Features
- **Auto-Directory Creation**: Recordings automatically saved to `~/AA-Recordings`
- **Cross-Platform Paths**: Proper path handling for all operating systems
- **Better Error Handling**: Improved error messages and type safety
- **Enhanced UI**: Display output directory path in status panel
- **Improved Stability**: Better process cleanup and signal handling

### 📋 Developer Experience
- Zero security vulnerabilities
- Eliminated deprecated package warnings
- Cross-platform development environment
- Enhanced build pipeline with proper external dependency handling
- Comprehensive documentation updates

### 🐛 Bug Fixes
- Fixed esbuild external dependency resolution for Playwright
- Resolved cross-platform command execution issues
- Fixed TypeScript module resolution warnings
- Corrected path separators for Windows compatibility
- Improved cleanup processes for development scripts

---

## v1.0.0 - Initial Release

### ✨ Initial Features
- Electron + Playwright integration for web content recording
- React-based UI with Tailwind CSS styling
- TypeScript support with strict configuration
- Cross-platform development environment
- Automated browser recording with customizable duration
- Real-time recording status display