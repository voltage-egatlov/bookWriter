# Book Writer Project - Complete Implementation Summary

**Last Updated:** December 9, 2025  
**Status:** Fully functional .bk parser, WASM bindings, React web viewer, and Tauri desktop app

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Phase 1: Rust Parser & Models](#phase-1-rust-parser--models)
4. [Phase 2: WASM Bindings](#phase-2-wasm-bindings)
5. [Phase 3: React Web Viewer](#phase-3-react-web-viewer)
6. [Phase 4: Tauri Desktop App](#phase-4-tauri-desktop-app)
7. [File Structure](#file-structure)
8. [How to Run](#how-to-run)
9. [Testing](#testing)
10. [Future Improvements](#future-improvements)

---

## Project Overview

Book Writer is a cross-platform book reading and writing application that uses a custom `.bk` plain text format. The project consists of:

- **Rust Core Library** (`packages/core/`) - Parser, data models, and business logic
- **WASM Module** - Web Assembly bindings for browser use
- **React Web App** (`packages/web/`) - Browser-based book viewer
- **Tauri Desktop App** (`packages/desktop/`) - Native desktop application

### Key Features

- ✅ Plain text `.bk` file format for easy version control
- ✅ Deterministic UUID generation for stable IDs
- ✅ Cross-platform (Web via WASM, Desktop via Tauri)
- ✅ Shared UI components between web and desktop
- ✅ Native file dialogs on desktop
- ✅ Keyboard navigation and reading position persistence
- ✅ Skeuomorphic page-turning interface

---

## Architecture

```
bookWriter/
├── packages/
│   ├── core/          # Rust library (parser + models)
│   ├── web/           # React web app (uses WASM)
│   └── desktop/       # Tauri desktop app (uses native Rust)
├── target/            # Rust build artifacts
└── node_modules/      # Node dependencies
```

### Technology Stack

**Backend/Core:**
- Rust 1.70+
- Libraries: uuid, chrono, serde, thiserror

**Web:**
- React 18 + TypeScript
- Vite build system
- WASM via wasm-pack
- React Router for navigation

**Desktop:**
- Tauri 1.5
- Same React components as web
- Native Rust commands (no WASM)

---

## Phase 1: Rust Parser & Models

### Implementation

**Location:** `packages/core/src/`

**Files Created:**
- `src/models.rs` - Extended with Block, BlockType, dedication field
- `src/bk_format/mod.rs` - Module exports
- `src/bk_format/parser.rs` - State machine parser
- `src/bk_format/error.rs` - BkParseError with helpful messages
- `src/bk_format/models.rs` - Re-exports
- `src/bk_format/tests.rs` - 21 unit tests (100% pass rate)
- `examples/parse_bk.rs` - CLI example
- `BK_FORMAT.md` - Format specification

### Data Models

```rust
pub struct Book {
    pub id: Uuid,
    pub title: String,
    pub author: String,
    pub dedication: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub chapters: Vec<Chapter>,
}

pub struct Chapter {
    pub id: Uuid,
    pub title: String,
    pub blocks: Vec<Block>,
    pub order: usize,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub struct Block {
    pub id: Uuid,
    pub content: String,
    pub order: usize,
    pub block_type: BlockType,
}

pub enum BlockType {
    Page,
}
```

### .bk File Format

Plain text format with markers:

```
@title My Book Title
@author John Doe
@id 550e8400-e29b-41d4-a716-446655440000
@dedication For my readers

#chapter Introduction

@page
This is the first page of content.

@page
This is the second page.

#chapter Chapter Two

@page
More content here.
```

**Key Features:**
- `@metadata` for book-level fields
- `#chapter` for chapter titles
- `@page` for page breaks
- Deterministic IDs using UUID v5
- Empty lines ignored

### ID Generation Strategy

**Deterministic UUIDs** for reproducibility across re-parses:

1. **Book ID:** From `@id` field (or generate UUID v4 if missing)
2. **Chapter ID:** `UUID::new_v5(book.id, "{order}-{title}")`
3. **Block ID:** `UUID::new_v5(chapter.id, order.to_string())`

### Error Handling

9 error variants with helpful messages:

- `MissingMetadata` - Required fields missing
- `DuplicateMetadata` - Same field appears twice
- `InvalidUuid` - Malformed UUID in @id
- `InvalidTimestamp` - Bad ISO 8601 timestamp
- `NoChapters` - Book has no chapters
- `EmptyChapter` - Chapter has no pages
- `BlockBeforeChapter` - @page before first #chapter
- `IoError` - File system errors
- `Utf8Error` - Invalid UTF-8 encoding

Each error includes a `help_message()` with guidance.

### Testing

**21 unit tests covering:**
- Valid parsing scenarios
- All error conditions
- Edge cases (empty lines, whitespace)
- ID determinism
- Timestamp handling

**Run tests:**
```bash
cd packages/core
cargo test
```

---

## Phase 2: WASM Bindings

### Implementation

**Files Modified:**
- `packages/core/Cargo.toml` - Added wasm-bindgen, features
- `packages/core/src/wasm.rs` - WASM bindings
- `packages/core/src/lib.rs` - Conditional exports

### WASM API

```rust
#[wasm_bindgen]
pub fn parse_bk(
    input: &str,
    created_at: Option<String>,
    updated_at: Option<String>,
) -> Result<JsValue, JsValue>
```

**Features:**
- Accepts plain text `.bk` content
- Optional ISO 8601 timestamps (defaults to `Utc::now()`)
- Returns full `Book` object as JavaScript-compatible structure
- Throws JavaScript exceptions on parse errors
- Uses `serde-wasm-bindgen` for efficient serialization

### Build Configuration

**Cargo.toml additions:**
```toml
[features]
wasm = ["wasm-bindgen", "serde-wasm-bindgen"]

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
uuid = { version = "1.6", features = ["v4", "v5", "serde", "js"] }
wasm-bindgen = { version = "0.2", optional = true }
serde-wasm-bindgen = { version = "0.6", optional = true }
```

**Note:** UUID needs `js` feature for WASM RNG support.

### Building WASM

```bash
cd packages/core
wasm-pack build --target web --release -- --features wasm
```

**Output:** `pkg/` directory with:
- `bookwriter_core_bg.wasm` (77KB optimized)
- `bookwriter_core.js` - JavaScript bindings
- TypeScript type definitions

### Usage in JavaScript

```javascript
import init, { parse_bk } from './pkg/bookwriter_core.js';

await init(); // Initialize WASM module

const book = parse_bk(
  fileContent,
  "2024-01-01T00:00:00Z",  // optional
  "2024-01-02T00:00:00Z"   // optional
);

console.log(book.title, book.author);
```

**Documentation:** `WASM_USAGE.md`

---

## Phase 3: React Web Viewer

### Implementation

**Location:** `packages/web/`

**Files Created:**
- `src/lib/wasm.ts` - WASM initialization wrapper
- `src/lib/types.ts` - TypeScript interfaces matching Rust
- `src/components/Sidebar.tsx` - Collapsible sidebar
- `src/components/PageView.tsx` - Page display with navigation
- `src/components/BookView.tsx` - State management container
- `src/components/FileUpload.tsx` - Browser file input
- `src/pages/ViewerPage.tsx` - Viewer page
- `test-book.bk` - Example book for testing
- `README_VIEWER.md` - Viewer documentation

**Files Modified:**
- `vite.config.ts` - Added WASM plugins
- `src/App.tsx` - Added /viewer route
- `package.json` - Added vite-plugin-wasm, vite-plugin-top-level-await

### Components

#### FileUpload Component
- Browser `<input type="file">` for .bk files
- Calls `parseBk()` from WASM wrapper
- Error display with parse messages
- Loading state

#### Sidebar Component
- Collapsible (300px width)
- Displays book metadata (title, author, dedication)
- Chapter list with page counts
- Highlights current chapter
- Toggle button (☰ / ←)
- Smooth 300ms slide animation

#### PageView Component
- Displays single block content
- Shows chapter title and page number
- Previous/Next navigation buttons
- Keyboard arrow key support (left/right)
- Centered layout with white card design
- 700px max width for readability

#### BookView Component
- Container managing sidebar and page view
- Tracks current chapter and block index
- Handles navigation logic (next/prev across chapters)
- Persists position to localStorage (`book-position-{bookId}`)
- Loads last position on mount
- Keyboard event listeners

### Vite Configuration

```typescript
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  // ... rest of config
})
```

Required for WASM module support.

### WASM Integration Layer

**src/lib/wasm.ts:**
```typescript
let wasmInitialized = false;

export async function initWasm(): Promise<void> {
  if (wasmInitialized) return;
  await init();
  wasmInitialized = true;
}

export async function parseBk(
  content: string,
  createdAt?: string,
  updatedAt?: string
): Promise<Book> {
  await initWasm();
  const result = wasmParseBk(content, createdAt, updatedAt);
  return result as Book;
}
```

Ensures singleton initialization of WASM module.

### Navigation Features

1. **Arrow Buttons** - Previous/Next with disabled states
2. **Keyboard Shortcuts** - Left/Right arrow keys
3. **Sidebar Navigation** - Click chapter to jump
4. **Cross-Chapter** - Automatically moves to next/previous chapter
5. **Position Memory** - localStorage saves `{chapterId, blockIndex}`

### Running the Web App

```bash
cd packages/web
pnpm install
pnpm dev
```

Visit `http://localhost:5173/viewer`

**Build for production:**
```bash
pnpm build
```

Output in `dist/` directory.

---

## Phase 4: Tauri Desktop App

### Implementation

**Location:** `packages/desktop/`

**Rust Files:**
- `src-tauri/src/main.rs` - Tauri commands for file operations
- `src-tauri/Cargo.toml` - Added dialog and fs features
- `src-tauri/tauri.conf.json` - Configured permissions
- `src-tauri/icons/*.png` - App icons (RGBA format)

**React Files:**
- `src/lib/types.ts` - Copied from web
- `src/components/Sidebar.tsx` - Copied from web
- `src/components/PageView.tsx` - Copied from web
- `src/components/BookView.tsx` - Copied from web
- `src/components/FileDialog.tsx` - Desktop-specific file picker
- `src/pages/ViewerPage.tsx` - Viewer page
- `src/pages/HomePage.tsx` - Updated landing page
- `src/App.tsx` - Added /viewer route

### Tauri Commands

**src-tauri/src/main.rs:**

```rust
#[tauri::command]
async fn open_file_dialog() -> Result<Option<String>, String> {
    use tauri::api::dialog::blocking::FileDialogBuilder;
    
    let path = FileDialogBuilder::new()
        .add_filter("Book Files", &["bk"])
        .add_filter("All Files", &["*"])
        .pick_file();
    
    Ok(path.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
async fn save_file_dialog(default_name: String) -> Result<Option<String>, String> {
    use tauri::api::dialog::blocking::FileDialogBuilder;
    
    let path = FileDialogBuilder::new()
        .add_filter("Book Files", &["bk"])
        .set_file_name(&default_name)
        .save_file();
    
    Ok(path.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
async fn load_bk_file(path: String) -> Result<Book, String> {
    let book = BkParser::parse_file(Path::new(&path))
        .map_err(|e| format!("Parse error: {}\n\nHelp: {}", e, e.help_message()))?;
    Ok(book)
}

#[tauri::command]
async fn save_bk_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content)
        .map_err(|e| format!("Failed to save file: {}", e))?;
    Ok(())
}
```

### Tauri Configuration

**tauri.conf.json allowlist:**
```json
{
  "allowlist": {
    "all": false,
    "dialog": {
      "open": true,
      "save": true
    },
    "fs": {
      "readFile": true,
      "writeFile": true,
      "scope": ["$DOCUMENT/**", "$HOME/**"]
    }
  }
}
```

**Cargo.toml features:**
```toml
[dependencies.tauri]
version = "1.5"
features = [
  "shell-open",
  "dialog-open",
  "dialog-save",
  "fs-read-file",
  "fs-write-file"
]
```

### FileDialog Component

Desktop replacement for web's FileUpload component:

```typescript
import { invoke } from '@tauri-apps/api/tauri';

export function FileDialog({ onBookLoaded }: FileDialogProps) {
  const handleOpenFile = async () => {
    // Open native file dialog
    const filePath = await invoke<string | null>('open_file_dialog');
    if (!filePath) return; // User cancelled
    
    // Load and parse .bk file
    const book = await invoke<Book>('load_bk_file', { path: filePath });
    onBookLoaded(book);
  };
  
  // ... UI rendering
}
```

### Component Sharing

**Shared between web and desktop:**
- `Sidebar.tsx` - Identical UI, works in both environments
- `PageView.tsx` - Identical UI, keyboard navigation
- `BookView.tsx` - Identical state management and navigation logic
- `types.ts` - TypeScript interfaces

**Platform-specific:**
- Web: `FileUpload.tsx` uses browser file input + WASM parser
- Desktop: `FileDialog.tsx` uses Tauri invoke + native Rust parser

### HomePage Update

Simple landing page with navigation buttons:
- "Open Book Viewer" → `/viewer` (uses native file dialogs)
- "Book Editor" → `/editor` (existing editor functionality)

### System Dependencies (Linux/WSL)

Required for building Tauri on Linux:

```bash
sudo apt-get install -y \
  pkg-config \
  libwebkit2gtk-4.0-dev \
  libsoup2.4-dev \
  build-essential \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

### Icons

Created RGBA PNG icons for all platforms:
- `32x32.png` - Small icon
- `128x128.png` - Medium icon
- `128x128@2x.png` - Retina medium (256x256)
- `icon.png` - Large icon (512x512)

Generated with Python PIL - simple blue background with book representation.

### Running Desktop App

**Development mode:**
```bash
cd packages/desktop
pnpm install
pnpm tauri dev
```

**Build for production:**
```bash
pnpm tauri build
```

Output in `src-tauri/target/release/bundle/`

**Note:** dconf warnings on Linux/WSL are harmless and can be ignored.

### Desktop vs Web

| Feature | Web | Desktop |
|---------|-----|---------|
| File Access | Browser file input | Native file dialogs |
| Parser | WASM | Native Rust (faster) |
| File System | No direct access | Full file system access |
| Build Size | ~240KB JS | ~10MB native binary |
| Offline | Service worker needed | Fully offline by default |
| Distribution | URL | App installer |

---

## File Structure

```
bookWriter/
├── packages/
│   ├── core/                           # Rust core library
│   │   ├── src/
│   │   │   ├── lib.rs                  # Library root
│   │   │   ├── models.rs               # Book, Chapter, Block structs
│   │   │   ├── services.rs             # BookService trait
│   │   │   ├── wasm.rs                 # WASM bindings (feature-gated)
│   │   │   └── bk_format/
│   │   │       ├── mod.rs              # Module exports
│   │   │       ├── parser.rs           # BkParser state machine
│   │   │       ├── error.rs            # BkParseError enum
│   │   │       ├── models.rs           # Re-exports
│   │   │       └── tests.rs            # 21 unit tests
│   │   ├── examples/
│   │   │   └── parse_bk.rs             # CLI example
│   │   ├── Cargo.toml                  # Dependencies + features
│   │   ├── BK_FORMAT.md                # Format specification
│   │   └── WASM_USAGE.md               # WASM integration guide
│   │
│   ├── web/                            # React web app
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── wasm.ts             # WASM initialization wrapper
│   │   │   │   └── types.ts            # TypeScript interfaces
│   │   │   ├── components/
│   │   │   │   ├── FileUpload.tsx      # Browser file input
│   │   │   │   ├── Sidebar.tsx         # Collapsible sidebar
│   │   │   │   ├── PageView.tsx        # Page display + navigation
│   │   │   │   └── BookView.tsx        # State management
│   │   │   ├── pages/
│   │   │   │   └── ViewerPage.tsx      # /viewer route
│   │   │   ├── App.tsx                 # Router setup
│   │   │   └── main.tsx                # Entry point
│   │   ├── test-book.bk                # Example .bk file
│   │   ├── vite.config.ts              # Vite + WASM plugins
│   │   ├── package.json                # Dependencies
│   │   └── README_VIEWER.md            # Viewer documentation
│   │
│   └── desktop/                        # Tauri desktop app
│       ├── src-tauri/
│       │   ├── src/
│       │   │   └── main.rs             # Tauri commands
│       │   ├── icons/                  # App icons (RGBA PNGs)
│       │   │   ├── 32x32.png
│       │   │   ├── 128x128.png
│       │   │   ├── 128x128@2x.png
│       │   │   └── icon.png
│       │   ├── Cargo.toml              # Tauri features
│       │   └── tauri.conf.json         # Tauri configuration
│       ├── src/
│       │   ├── lib/
│       │   │   └── types.ts            # TypeScript interfaces
│       │   ├── components/
│       │   │   ├── FileDialog.tsx      # Desktop file picker
│       │   │   ├── Sidebar.tsx         # Copied from web
│       │   │   ├── PageView.tsx        # Copied from web
│       │   │   └── BookView.tsx        # Copied from web
│       │   ├── pages/
│       │   │   ├── HomePage.tsx        # Landing page
│       │   │   ├── ViewerPage.tsx      # Viewer page
│       │   │   └── EditorPage.tsx      # Editor (existing)
│       │   ├── App.tsx                 # Router
│       │   └── main.tsx                # Entry point
│       ├── vite.config.ts              # Vite config
│       └── package.json                # Dependencies
│
├── target/                             # Rust build artifacts
├── node_modules/                       # Node dependencies
├── Cargo.toml                          # Workspace config
├── package.json                        # Workspace package.json
├── pnpm-workspace.yaml                 # pnpm workspace config
└── PROJECT_SUMMARY.md                  # This file
```

---

## How to Run

### Prerequisites

**Rust:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
```

**Node.js & pnpm:**
```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

**Tauri Dependencies (Linux only):**
```bash
sudo apt-get install -y \
  pkg-config \
  libwebkit2gtk-4.0-dev \
  libsoup2.4-dev \
  build-essential \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

### Running Tests

**Rust tests:**
```bash
cd packages/core
cargo test
```

**WASM build test:**
```bash
cd packages/core
wasm-pack build --target web --release -- --features wasm
```

### Running Web App

```bash
cd packages/web
pnpm install
pnpm dev
# Visit http://localhost:5173/viewer
```

**Production build:**
```bash
pnpm build
# Output in dist/
```

### Running Desktop App

```bash
cd packages/desktop
pnpm install
pnpm tauri dev
# Desktop window opens automatically
```

**Production build:**
```bash
pnpm tauri build
# Installer in src-tauri/target/release/bundle/
```

### Testing the Parser Directly

```bash
cd packages/core
cargo run --example parse_bk -- ../web/test-book.bk
```

---

## Testing

### Unit Tests (Rust)

**21 tests in `packages/core/src/bk_format/tests.rs`:**

**Valid parsing:**
- `test_parse_simple_book` - Basic book structure
- `test_parse_with_dedication` - Optional dedication field
- `test_multiple_chapters` - Multiple chapters and pages
- `test_empty_lines_ignored` - Whitespace handling
- `test_deterministic_ids` - UUID v5 consistency

**Error handling:**
- `test_missing_title` - MissingMetadata error
- `test_missing_author` - MissingMetadata error
- `test_duplicate_metadata` - DuplicateMetadata error
- `test_invalid_uuid` - InvalidUuid error
- `test_invalid_timestamp` - InvalidTimestamp error
- `test_no_chapters` - NoChapters error
- `test_empty_chapter` - EmptyChapter error
- `test_page_before_chapter` - BlockBeforeChapter error

**Edge cases:**
- `test_whitespace_handling` - Trimming behavior
- `test_multiline_content` - Content spanning lines
- `test_chapter_ordering` - Sequential order assignment

**Run all tests:**
```bash
cd packages/core
cargo test -- --nocapture
```

### Manual Testing

**Test book:** `packages/web/test-book.bk`

```
@title The Great Adventure
@author Jane Smith
@id 123e4567-e89b-12d3-a456-426614174000
@dedication For all the dreamers

#chapter The Beginning

@page
It was a dark and stormy night when our
hero first set out on the journey.

@page
The road ahead was uncertain, but courage
filled their heart.

#chapter The Journey

@page
Miles passed under weary feet.

# ... etc
```

**Test scenarios:**
1. Upload in web viewer - should parse and display
2. Open in desktop app - native dialog should work
3. Navigate with arrows - should move between pages
4. Navigate with keyboard - left/right arrows
5. Click chapters in sidebar - should jump correctly
6. Reload page - should remember last position
7. Test all error cases with malformed .bk files

---

## Future Improvements

### Short-term

1. **Editing Support**
   - Inline editing of pages
   - Add/remove chapters
   - Save back to .bk format
   - Undo/redo functionality

2. **Better Icons**
   - Replace placeholder icons with designed versions
   - macOS .icns and Windows .ico formats

3. **Shared UI Package**
   - Extract components to `packages/ui`
   - Platform adapters: `useFileOperations.desktop.ts` / `useFileOperations.web.ts`
   - Reduce code duplication

4. **Error Boundaries**
   - React error boundaries for graceful failures
   - Better error UI in components

5. **Loading States**
   - Skeleton screens while parsing
   - Progress indicators for large files

### Medium-term

1. **Search Functionality**
   - Full-text search across books
   - Highlight search results
   - Jump to search matches

2. **Export Formats**
   - Export to PDF
   - Export to EPUB
   - Export to Markdown

3. **Themes**
   - Dark mode
   - Sepia mode
   - Customizable fonts and sizes

4. **Cloud Sync**
   - Optional cloud storage integration
   - Sync reading position across devices
   - Conflict resolution

### Long-term

1. **Collaborative Editing**
   - Real-time collaboration
   - Operational transforms or CRDTs
   - User presence indicators

2. **Version Control Integration**
   - Built-in git integration
   - Diff viewer for changes
   - Branch management

3. **Plugin System**
   - Custom export formats
   - Custom themes
   - Custom keyboard shortcuts
   - Extension marketplace

4. **Mobile Apps**
   - React Native or Capacitor
   - Touch-friendly navigation
   - Mobile-optimized reading experience

5. **Advanced Formatting**
   - Inline formatting (bold, italic, links)
   - Images and media
   - Code blocks with syntax highlighting
   - Tables and lists

---

## Key Technical Decisions

### 1. Plain Text Format
**Decision:** Use plain text `.bk` format instead of binary or JSON.

**Rationale:**
- Easy version control with git
- Human-readable and editable
- Simple to parse
- No special tools required
- Works with any text editor

### 2. Deterministic IDs
**Decision:** Use UUID v5 (name-based) for chapter and block IDs.

**Rationale:**
- Stable IDs across re-parses
- No need to store IDs in file
- Enables consistent references
- Allows offline ID generation

### 3. WASM for Web
**Decision:** Compile Rust parser to WASM for browser use.

**Rationale:**
- Single source of truth for parsing logic
- Performance benefits over JavaScript
- Type safety from Rust carries to web
- No need to maintain two parsers

### 4. Native Rust for Desktop
**Decision:** Use native Rust commands in Tauri instead of WASM.

**Rationale:**
- Better performance (no WASM overhead)
- Direct filesystem access
- Simpler debugging
- Smaller bundle size

### 5. Shared Components
**Decision:** Copy React components from web to desktop initially.

**Rationale:**
- Faster initial implementation
- Easier to maintain UI consistency
- Can extract to shared package later
- Platform-specific logic isolated to adapters

### 6. State Machine Parser
**Decision:** Use state machine for parsing instead of regex or combinators.

**Rationale:**
- Clear error messages with context
- Easy to extend
- Predictable performance
- Simple to test

---

## Known Issues

1. **dconf warnings on Linux/WSL** - Harmless GTK configuration warnings, app works fine
2. **rust-analyzer macro error** - False positive from IDE, build succeeds
3. **No .icns/.ico icons** - Only PNG icons created, need platform-specific formats
4. **No editing support** - Viewer is read-only for now
5. **No mobile support** - Desktop and web only

---

## Development Tips

### Hot Reloading

**Web:** Vite hot reloads automatically  
**Desktop:** Tauri watches Rust and frontend files

### Debugging

**Rust:**
```bash
RUST_LOG=debug cargo run --example parse_bk
```

**WASM:**
```javascript
console.log(book); // WASM objects are fully serializable
```

**Desktop:**
```bash
pnpm tauri dev
# Opens DevTools in debug builds
```

### Performance

**Parser benchmarks:**
```bash
cd packages/core
cargo bench
```

**WASM size:**
```bash
wasm-pack build --target web --release -- --features wasm
ls -lh pkg/bookwriter_core_bg.wasm
# Should be ~77KB optimized
```

---

## Contributors

This project was built through pair programming with Claude (Anthropic AI assistant) and a human developer.

**Implementation timeline:**
- **Phase 1:** Rust parser (Dec 9, 2025)
- **Phase 2:** WASM bindings (Dec 9, 2025)
- **Phase 3:** React web viewer (Dec 9, 2025)
- **Phase 4:** Tauri desktop app (Dec 9, 2025)

---

## License

(Add your license here)

---

## Contact

(Add your contact information here)

---

**End of Project Summary**
