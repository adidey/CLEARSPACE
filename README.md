# CLEARSPACE — Developer Storage Intelligence & Cleanup for macOS

**CLEARSPACE** is a premium, developer-first macOS storage intelligence and cleanup application built with React 19, TypeScript, Vite, Tailwind CSS, Tauri v2, and a high-performance native Rust engine.

> **Core Product Principle**: *UNDERSTAND BEFORE DELETING.*

Unlike traditional disk cleaners that aggressively wipe caches or obfuscate what is being deleted, CLEARSPACE treats storage management as an engineering discipline. It inspects developer ecosystems, explains what files do, identifies their regenerative properties, calculates the consequences of removal, and provides safe, recoverable workflows.

---

## 1. Key Features

- **Real Native Filesystem Scanning Engine (Rust)**:
  - Recursive directory walker with symlink traversal protection.
  - Hardlink deduplication using inode tracking `(dev, ino)` to prevent double-counting.
  - Logical and physical size computation with accurate macOS folder hierarchies.
  - Non-blocking, cancellable background scans streaming progress to the UI.
  - Native macOS folder selection (`choose folder` dialog).

- **Storage Explorer**:
  - Interactive D3 hierarchy treemap visualization.
  - Folder hierarchy drilldown with clickable breadcrumbs.
  - Multi-category filtering: *All*, *Developer Files*, *Applications*, *Documents*, *Media*, *System Data*, *Other*.
  - Sort by size, file count, and alphabetical name.
  - File and folder inspection drawer with complete POSIX paths, metadata, and quick copy.

- **Developer Artifact Intelligence**:
  Modular rules-based detection engine covering major developer ecosystems:
  - **JavaScript / TypeScript**: `node_modules`, npm cache, pnpm store, Yarn cache (`yarn.lock`, `package.json` detection).
  - **Python**: `.venv`, `virtualenv`, pip cache, Poetry cache (`pyproject.toml`, `requirements.txt`).
  - **Rust**: `target/` directories (`Cargo.toml`, `Cargo.lock` detection).
  - **Apple / iOS / macOS**: Xcode `DerivedData`, archives, iOS simulators, Device Support.
  - **Docker**: Inspects Docker storage using Docker CLI (`docker system df`) — never deletes Docker internal data directly.
  - **Java / Android**: Gradle caches, Android SDK, Maven repository (`pom.xml`, `build.gradle`).
  - **Go & PHP**: Go module cache, Composer cache.

- **Evidence-Based Cleanup Recommendations**:
  - Classifies items into **VERIFIED SAFE**, **LOW RISK**, **REVIEW REQUIRED**, and **HIGH RISK**.
  - Provides detailed explanations: what the artifact is, why it was flagged, regenerability, consequences of removal, and exact terminal commands to restore or recreate.
  - Preserves user control: exclude paths from future scans, dismiss recommendations.

- **Safe Cleanup Engine**:
  - **Never permanently deletes**: Uses native macOS Finder AppleScript (`tell application "Finder" to delete POSIX file`) to move files directly to the macOS Trash, allowing full "Put Back" restoration.
  - Multi-layer safety validator prevents deletion of macOS system roots (`/`, `/System`, `/usr`, `/Library`, `/Applications`), user root (`~`), root developer folders, and symlink targets.
  - Two-step confirmation dialog with explicit risk indicators and path disclosures.

- **Local-First SQLite Persistence**:
  - Maintains scan history, storage usage snapshots, and user preferences locally in `~/Library/Application Support/com.clearspace.desktop/clearspace.db`.
  - Zero cloud dependencies, zero external tracking, 100% private to your Mac.

---

## 2. Technology Stack & Architecture

```
┌────────────────────────────────────────────────────────┐
│           React 19 + TypeScript Frontend               │
│  (Tailwind CSS, D3 Hierarchy, Lucide, Motion)          │
└───────────────────────────▲────────────────────────────┘
                            │ Tauri IPC (Commands & Events)
┌───────────────────────────▼────────────────────────────┐
│                  Rust Native Backend                   │
│                                                        │
│  ┌────────────────────┐      ┌──────────────────────┐  │
│  │ Filesystem Scanner │      │  Artifact Intelligence│  │
│  │ (walkdir, libc)    │      │  & Recommendations   │  │
│  └─────────┬──────────┘      └──────────┬───────────┘  │
│            │                            │              │
│  ┌─────────▼──────────┐      ┌──────────▼───────────┐  │
│  │  Safety Validator  │      │  SQLite Persistence  │  │
│  │  & macOS Finder    │      │  (macOS sqlite3)     │  │
│  └────────────────────┘      └──────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, `@tauri-apps/api`, D3-hierarchy, Lucide icons.
- **Desktop Runtime**: Tauri v2 (`com.clearspace.desktop`).
- **Native Backend**: Rust 2024 edition (`tauri`, `walkdir`, `chrono`, `uuid`, `libc`).
- **Persistence**: Embedded SQLite database in macOS Application Support.
- **Trash Integration**: Native AppleScript Finder integration with audio feedback and macOS Trash restoration.

---

## 3. Privacy & Security Principles

1. **Local-First & Offline**: CLEARSPACE executes entirely on your local machine. It does not phone home, does not upload file paths, and does not require an internet connection.
2. **No Full Disk Access Required by Default**: The scanner operates within standard user permissions, only scanning directories you explicitly choose.
3. **No Silent or Automatic Deletions**: Every deletion requires user confirmation and provides a preview of exact paths and disk impact.
4. **Symlink Boundary Enforcement**: Directory scanning and cleanup operations strictly refuse to traverse or delete outside approved target boundaries.
5. **No Destructive Wipes**: Items moved during cleanup are placed into the macOS Trash. They can be inspected in Trash or restored at any time via "Put Back".

---

## 4. Getting Started

### Prerequisites

- macOS 11.0 (Big Sur) or later (Apple Silicon M1/M2/M3/M4 or Intel x86_64).
- [Node.js](https://nodejs.org/) v18+ (tested on Node v22).
- [Rust toolchain](https://rustup.rs/) (cargo 1.80+ / 1.90+).

### Development Mode

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run in Tauri Desktop Mode (Full Native Integration)**:
   ```bash
   npm run desktop
   ```
   *Launches Vite on port 3000 and connects to the Tauri v2 desktop application window.*

3. **Run Web Browser Preview (Simulated Mode)**:
   ```bash
   npm run dev
   ```
   *When run directly in a browser without Tauri runtime, CLEARSPACE automatically activates the built-in diagnostic mock provider.*

---

## 5. Verification & Testing

### Running Rust Engine Tests
The Rust backend includes unit and integration tests covering filesystem traversal, symlink handling, cancellation, artifact detection, recommendations, safety validations, and SQLite operations:

```bash
cd src-tauri
cargo test
```

### Running Frontend Typechecks & Linting
```bash
npm run lint
```

### Building Frontend Assets
```bash
npm run build
```

---

## 6. Building for macOS Release (DMG & App Bundle)

To build a production macOS application bundle (`.app` and `.dmg`):

```bash
# Build production bundle for host architecture (Universal / Apple Silicon / Intel)
npm run tauri build
```

The output artifacts will be generated in:
```
src-tauri/target/release/bundle/
├── dmg/Clearspace_1.0.0_aarch64.dmg
└── macos/Clearspace.app
```

---

## 7. Keyboard Shortcuts

- `Cmd + K` / `Ctrl + K`: Open quick search modal (jump to any folder or file).
- `Escape`: Close quick search, active file drawer, or cleanup review modal.
- `Tab` / `Shift + Tab`: Accessible keyboard focus across sidebar, filters, and action buttons.

---

## 8. License

Apache-2.0. Copyright (c) CLEARSPACE Contributors.
