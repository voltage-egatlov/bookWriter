# BookWriter Technical Overview

## Quick Summary
BookWriter is a cross-platform book writing and reading application with a custom `.bk` file format. It features a Rust core (compiled to WASM for web), React web app, and Tauri desktop app with a minimalist serif design aesthetic.

---

## Architecture

### Monorepo Structure
```
bookWriter/
├── packages/
│   ├── core/              # Rust library (parser, layout, models)
│   ├── web/               # React + Vite web app
│   ├── desktop/           # Tauri desktop app
│   └── shared/            # Shared React components & design system
├── Cargo.toml             # Rust workspace config
├── package.json           # pnpm workspace config
└── pnpm-lock.yaml
```

**Package Manager**: pnpm (v8.15.0)  
**Build System**: Cargo (Rust), Vite (JavaScript)

---

## Core Technology Stack

### Rust Core (`packages/core/`)
- **Purpose**: Business logic, parsing, layout engine
- **Crate**: `bookwriter-core`
- **Features**:
  - `wasm` feature flag for WebAssembly compilation
  - Can be compiled as `cdylib` (for WASM) or `rlib` (for native)

**Key Dependencies**:
- `serde` + `serde_json` - Serialization
- `uuid` (v4, v5) - Deterministic IDs
- `chrono` - Timestamps
- `wasm-bindgen` - WASM FFI bindings (when `wasm` feature enabled)
- `anyhow` + `thiserror` - Error handling

**Module Structure**:
```
core/src/
├── lib.rs                 # Entry point
├── models.rs              # Core data models (Book, Chapter, Block)
├── bk_format/             # .bk file parser
│   ├── parser.rs          # BkParser implementation
│   ├── models.rs          # Parser state machine
│   └── error.rs           # Parse errors with help messages
├── layout/                # Layout engine (converts Book → RenderTree)
│   ├── types.rs           # RenderTree, PageRender, TextFrame, etc.
│   ├── config.rs          # LayoutConfig, PageSize, Margins
│   ├── metrics.rs         # TextMetrics trait (character-based default)
│   ├── line_breaker.rs    # Greedy line-breaking algorithm
│   ├── paginator.rs       # Page creation and pagination
│   └── mod.rs             # Public API
├── services/              # Business logic services
├── utils/                 # Utility functions
└── wasm.rs                # WASM bindings (parse_bk function)
```

---

## Data Models

### Core Entities

**Book** (`models.rs`):
```rust
pub struct Book {
    pub id: Uuid,                    // UUID v4
    pub title: String,
    pub author: String,
    pub dedication: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub chapters: Vec<Chapter>,
}
```

**Chapter**:
```rust
pub struct Chapter {
    pub id: Uuid,                    // Deterministic v5 (from book_id + order + title)
    pub title: String,
    pub blocks: Vec<Block>,
    pub order: usize,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

**Block** (represents a page):
```rust
pub struct Block {
    pub id: Uuid,                    // Deterministic v5 (from chapter_id + order)
    pub content: String,
    pub order: usize,
    pub block_type: BlockType,       // Currently only BlockType::Page
}
```

**ID Generation**:
- Book ID: Random UUID v4
- Chapter ID: Deterministic v5 from `book_id + order + title`
- Block ID: Deterministic v5 from `chapter_id + order`

This ensures consistent IDs across parses of the same file.

---

## .bk File Format

### Syntax

**.bk files** are plain text with special directives:

```
@title: The Way of Iron
@author: Tej Chhabra
@dedication: To all dreamers
@id: <optional-uuid>

#chapter: The Beginning
@page:
First page content here.
Multiple lines are supported.

@page:
Second page content.

#chapter: The Journey
@page:
Another chapter starts here.
```

### Directives

**Metadata** (must come before first chapter):
- `@title: <text>` - Required
- `@author: <text>` - Required
- `@dedication: <text>` - Optional
- `@id: <uuid>` - Optional (auto-generated if missing)

**Structure**:
- `#chapter: <title>` - Starts new chapter
- `@page:` - Starts new page (block) within current chapter

### Parser Behavior

**State Machine** (`bk_format/models.rs`):
```rust
enum ParserState {
    ReadingMetadata,
    ReadingChapterHeader,
    ReadingBlock,
}
```

**Parsing Rules**:
1. Empty lines are skipped
2. Lines starting with `@` in metadata section → metadata
3. Lines starting with `#chapter:` → new chapter
4. Lines starting with `@page:` → new block
5. All other lines → accumulated as block content

**Error Handling**:
- Comprehensive `BkParseError` enum with line numbers
- Each error includes a `help_message()` with fix suggestions
- Validates: required metadata, chapters exist, blocks after chapters

**Entry Points**:
- `BkParser::parse_file(path)` - From filesystem (Rust only)
- `BkParser::parse_string(content, created, updated)` - From string
- `parse_bk(input, created_at?, updated_at?)` - WASM export for JS

---

## Layout Engine

### Purpose
Transforms `Book` → `RenderTree` for pagination and rendering.

### Key Concepts

**Units**: PostScript points (72 pt = 1 inch)

**Default Page Size**: US Letter (612 × 792 pt)

**Text Measurement**: 
- Trait-based abstraction (`TextMetrics`)
- Default implementation: Simple character-count with 0.6 ratio (60% of font size per character)
- Allows future font integration without breaking changes

### Data Structures (`layout/types.rs`)

```rust
pub struct RenderTree {
    pub pages: Vec<PageRender>,
}

pub struct PageRender {
    pub page_number: usize,
    pub chapter_id: Uuid,
    pub chapter_title: String,
    pub frames: Vec<TextFrame>,
}

pub struct TextFrame {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub lines: Vec<TextLine>,
}

pub struct TextLine {
    pub fragments: Vec<TextFragment>,
    pub baseline_y: f32,
}

pub struct TextFragment {
    pub text: String,
    pub style: TextStyle,
}
```

### Components

**LayoutConfig** (`layout/config.rs`):
```rust
pub struct LayoutConfig {
    pub page_size: PageSize,
    pub margins: Margins,
    pub text_style: TextStyle,
    pub column_gap: f32,
}
```

**LineBreaker** (`layout/line_breaker.rs`):
- Greedy algorithm: break at last word that fits
- Uses `TextMetrics` trait for width calculation

**Paginator** (`layout/paginator.rs`):
- Orchestrates layout process
- Creates pages, manages overflow
- Chapter-aware pagination

**Public API** (`layout/mod.rs`):
```rust
pub fn layout_book(book: &Book, config: &LayoutConfig) -> RenderTree
```

---

## Web Application (`packages/web/`)

### Tech Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.4
- **Routing**: React Router v6
- **Styling**: Tailwind CSS 4.1 + CSS Modules
- **State**: React Context API
- **WASM**: `bookwriter_core` compiled to WASM

### Project Structure

```
packages/web/src/
├── main.tsx                # Entry point
├── App.tsx                 # Root component with routing
├── pages/
│   ├── IntroPage.tsx       # Home/landing page with recent files
│   └── ViewerPage.tsx      # Book viewer with edit mode toggle
├── components/
│   ├── BookView.tsx        # Two-page spread container
│   ├── PageView.tsx        # Single page with chapter title
│   ├── Sidebar.tsx         # Book metadata + chapter navigation
│   ├── EditableBlock.tsx   # Editable text block component
│   ├── EditorOverlay.tsx   # Editing UI overlay
│   └── FileUpload.tsx      # File picker for .bk files
├── contexts/
│   └── BookContext.tsx     # Global book state + edit operations
├── lib/
│   ├── wasm.ts             # WASM loader for parser
│   ├── types.ts            # TypeScript type definitions
│   ├── storage.ts          # localStorage wrapper for recent files
│   ├── platform-adapter.ts # Web file operations (File API, downloads)
│   └── hooks/
│       └── usePageAnimation.ts  # Page turn animation hook
└── styles/
    ├── index.css           # Global styles + design tokens import
    ├── book-styles.module.css  # Skeuomorphic book styling
    └── animations.css      # Page turn animations
```

### Key Features

**1. IntroPage** (New simplified design):
- Two black buttons: "New Book" and "Open Book"
- Grid of recent books showing only title + author
- Minimal cream/white color scheme
- No icons, simple serif typography

**2. Book Viewer**:
- Two-page spread layout with realistic book styling
- Skeuomorphic effects: paper texture, shadows, spine curvature
- Keyboard navigation (← →)
- Page persistence via localStorage

**3. Edit Mode**:
- Toggle between Reading/Editing modes
- Inline editing of blocks
- Auto-save to .bk format
- Download updated file

**4. Recent Files**:
- Stored in `localStorage` (max 10 files)
- Stores metadata only (title, author, stats)
- Web can't persist file content (re-upload required)

### WASM Integration

**Loading** (`lib/wasm.ts`):
```typescript
import init, { parse_bk } from 'bookwriter-core-wasm'

let wasmInitialized = false

export async function parseBk(content: string): Promise<Book> {
  if (!wasmInitialized) {
    await init()
    wasmInitialized = true
  }
  return parse_bk(content, undefined, undefined)
}
```

**Build Process**:
1. `wasm-pack build` in `packages/core/` → generates WASM + JS bindings
2. Output copied to `packages/web/public/`
3. Vite serves WASM file, init loads it

### Platform Adapter Pattern

**Purpose**: Abstract web vs desktop file operations

**Interface** (`shared/lib/types.ts`):
```typescript
export interface PlatformAdapter {
  pickFile: () => Promise<{content: string, filename: string, filepath?: string} | null>
  saveFile: (filename: string, content: string) => Promise<string | null>
  createFile: (metadata: BookMetadata) => Promise<CreateBookResult>
}
```

**Web Implementation** (`web/src/lib/platform-adapter.ts`):
- `pickFile`: Creates `<input type="file">`, reads via FileReader
- `saveFile`: Creates blob, triggers download
- `createFile`: Generates .bk content, triggers download

**Desktop Implementation** (`desktop/src/lib/platform-adapter.ts`):
- Uses `@tauri-apps/api/dialog` for native file picker
- Uses `@tauri-apps/api/fs` for filesystem read/write
- Stores absolute file paths

---

## Desktop Application (`packages/desktop/`)

### Tech Stack
- **Framework**: Tauri 1.x
- **Frontend**: Same React app as web (shared code)
- **Backend**: Rust (Tauri core)
- **Storage**: `tauri-plugin-store-api` for recent files

### Architecture

**Tauri Setup**:
```
packages/desktop/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   └── main.rs         # Tauri entry point
│   ├── Cargo.toml          # Tauri dependencies
│   └── tauri.conf.json     # Tauri configuration
└── src/                    # React frontend (mirrors web/)
    ├── main.tsx
    ├── App.tsx             # Uses desktopPlatformAdapter
    └── lib/
        ├── storage.ts      # Tauri Store wrapper
        └── platform-adapter.ts  # Native file operations
```

### Key Differences from Web

**File Operations**:
- Native file dialogs (`open`, `save`)
- Can store and reopen file paths directly
- No re-upload needed for recent files

**Recent Files Storage**:
- Uses Tauri Store (`.bookwriter-recents.dat`)
- Stores file paths + metadata
- Async API vs synchronous localStorage

**Commands**:
- `pnpm dev:desktop` → `tauri dev` (dev mode with hot reload)
- `pnpm build:desktop` → `tauri build` (platform-specific installer)

---

## Shared Design System (`packages/shared/`)

### Purpose
Centralize UI components, styles, and types across web/desktop.

### Structure

```
packages/shared/
├── styles/
│   ├── tokens.css          # CSS custom properties (colors, spacing, shadows)
│   └── typography.css      # Google Fonts (Libre Baskerville) + text styles
├── components/
│   ├── ui/
│   │   ├── Button.tsx      # Button variants (primary, secondary, ghost)
│   │   ├── Card.tsx        # Card container
│   │   ├── Input.tsx       # Form input
│   │   └── Modal.tsx       # Modal dialog with backdrop
│   └── book/
│       ├── BookCard.tsx    # Recent book card
│       ├── EmptyState.tsx  # Empty state placeholder
│       └── CreateBookModal.tsx  # New book form modal
├── lib/
│   ├── types.ts            # Shared TypeScript types
│   ├── utils.ts            # Utility functions
│   └── PlatformContext.tsx # React context for platform adapter
├── tailwind.config.js      # Extended Tailwind theme
├── package.json
└── tsconfig.json
```

### Design Tokens (`styles/tokens.css`)

**Color Palette**:
```css
--color-bg-cream-lightest: #FAF6F0
--color-bg-cream-light: #F7F5F0
--color-bg-cream: #f4f3ee
--color-bg-cream-dark: #e8e6e0
--color-text-primary: #000000
--color-text-secondary: rgba(0, 0, 0, 0.7)
--color-text-muted: rgba(0, 0, 0, 0.6)
```

**Typography**:
```css
--font-serif: 'Libre Baskerville', 'Garamond', 'Georgia', serif
--text-body-sm: 14px
--text-body: 16px
--text-body-lg: 18px
--text-heading: 24px
```

**Spacing Scale**: 2px, 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px

**Shadows**:
- `--shadow-sm`: Subtle (cards)
- `--shadow-md`: Medium (modals)
- `--shadow-lg`: Large (dropdowns)

### Tailwind Configuration

**Extended Theme** (`shared/tailwind.config.js`):
```javascript
colors: {
  cream: {
    50: '#FAF6F0',
    100: '#F7F5F0',
    200: '#f4f3ee',
    300: '#e8e6e0',
    400: '#d8d6d0',
  },
  text: {
    primary: '#000000',
    secondary: 'rgba(0, 0, 0, 0.7)',
    muted: 'rgba(0, 0, 0, 0.6)',
  }
}
```

**Usage in web/desktop**:
```javascript
// packages/web/tailwind.config.js
const sharedConfig = require('../shared/tailwind.config.js')

export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "../shared/components/**/*.{js,ts,jsx,tsx}",  // ← Scan shared components
  ],
  theme: {
    extend: {
      ...sharedConfig.theme.extend,
    },
  },
}
```

### Shared Types (`lib/types.ts`)

```typescript
export interface RecentFile {
  id: string
  filename: string
  filepath?: string          // Desktop only
  title: string
  author: string
  lastOpened: number
  lastModified: number
  stats: {
    chapterCount: number
    wordCount: number
    lastChapter: string
  }
}

export interface BookMetadata {
  title: string
  author: string
  dedication?: string
}

export interface PlatformAdapter {
  pickFile: () => Promise<{...} | null>
  saveFile: (filename: string, content: string) => Promise<string | null>
  createFile: (metadata: BookMetadata) => Promise<CreateBookResult>
}
```

---

## State Management

### BookContext (`web/src/contexts/BookContext.tsx`)

**Purpose**: Global book state + edit operations

```typescript
interface BookContextType {
  book: Book | null
  setBook: (book: Book | null) => void
  isEditing: boolean
  setIsEditing: (editing: boolean) => void
  updateBlockContent: (chapterId: string, blockId: string, content: string) => Promise<void>
}
```

**Features**:
- Manages current book state
- Handles block edits (finds chapter/block, updates content)
- Triggers .bk file export after edits
- Used by BookView, PageView, EditableBlock

### PlatformContext (`shared/lib/PlatformContext.tsx`)

**Purpose**: Inject platform-specific adapters

```typescript
interface PlatformContextType {
  adapter: PlatformAdapter
  platformName: 'web' | 'desktop'
}
```

**Usage**:
```tsx
// Web
<PlatformProvider adapter={webPlatformAdapter} platformName="web">
  <App />
</PlatformProvider>

// Desktop
<PlatformProvider adapter={desktopPlatformAdapter} platformName="desktop">
  <App />
</PlatformProvider>
```

---

## Routing

### Web Routes (`packages/web/src/App.tsx`)

```
/ → IntroPage (recent files, create/open buttons)
/viewer → ViewerPage (book viewer with edit mode)
/editor/:bookId? → Redirect to /
* → Redirect to /
```

**Navigation Flow**:
1. User lands on IntroPage
2. Clicks "New Book" → CreateBookModal → generates .bk → loads into BookContext → navigate to /viewer
3. Clicks "Open Book" → file picker → parse .bk → loads into BookContext → navigate to /viewer
4. Clicks recent book → alerts to re-upload (web limitation)

### Desktop Routes
Same as web, but recent files can directly open (have file paths).

---

## Styling Approach

### Current Design Aesthetic

**Visual Language**:
- **Minimal**: Two colors (cream #F7F5F0, black #000000)
- **Typography**: Libre Baskerville serif (Google Fonts)
- **Spacing**: High whitespace, generous padding
- **Interactions**: Simple opacity hover effects (0.8)
- **Components**: Plain buttons, white cards, no icons

**IntroPage Example**:
```tsx
<button className="px-6 py-3 bg-black text-white font-serif text-body hover:opacity-80">
  New Book
</button>
```

**Recent Books**:
```tsx
<button className="bg-white p-6 text-left hover:shadow-md transition-shadow">
  <h3 className="font-serif text-body-lg text-text-primary">{title}</h3>
  <p className="font-serif text-body-sm text-text-secondary">{author}</p>
</button>
```

### Skeuomorphic Book Viewer

**BookView Styling** (`book-styles.module.css`):
- **Paper Texture**: SVG noise filter overlay
- **Page Shadows**: Multi-layer box-shadow (left/right asymmetric)
- **Spine Curvature**: Radial gradients on inner edges
- **Vignette**: Darkened page edges
- **Gutter**: Central shadow between pages
- **Animations**: Page turn effects with CSS keyframes

**Container**:
```css
.bookContainer {
  background: #e8e3d8;  /* Desk/table surface */
  padding: 3rem;
}
```

**Pages**:
```css
.pageLeft {
  background: #fefdfb;
  box-shadow:
    inset -2px 0 4px rgba(0,0,0,0.05),
    3px 4px 12px rgba(0,0,0,0.12),
    6px 8px 24px rgba(0,0,0,0.08);
}
```

---

## Build & Development

### Prerequisites
- Rust 1.70+ (for core + desktop)
- Node.js 18+ (for web + desktop frontend)
- pnpm 8.15+ (package manager)
- wasm-pack (for WASM compilation)

### Commands

**Root Level**:
```bash
pnpm install                   # Install all dependencies
pnpm dev:web                   # Run web dev server (Vite)
pnpm dev:desktop               # Run desktop app (Tauri dev)
pnpm build:web                 # Build web for production
pnpm build:desktop             # Build desktop installer
pnpm build:all                 # Build all packages
pnpm test                      # Run all tests
```

**Core Package** (`packages/core/`):
```bash
cargo build                    # Build Rust library
cargo test                     # Run Rust tests
wasm-pack build --target web --out-dir ../web/public/wasm  # Compile to WASM
```

**Web Package** (`packages/web/`):
```bash
pnpm dev                       # Vite dev server (localhost:5173)
pnpm build                     # TypeScript + Vite build → dist/
pnpm preview                   # Preview production build
```

**Desktop Package** (`packages/desktop/`):
```bash
pnpm tauri dev                 # Dev mode with hot reload
pnpm tauri build               # Build platform installer
```

### Build Output

**Web**:
- `packages/web/dist/` → Static files for deployment
- Includes WASM file, JS bundles, CSS

**Desktop**:
- `packages/desktop/src-tauri/target/release/bundle/` → Platform-specific installers
- macOS: `.app`, `.dmg`
- Windows: `.msi`, `.exe`
- Linux: `.deb`, `.AppImage`

---

## File Operations

### Creating a Book

**Web**:
1. User fills CreateBookModal (title, author, dedication)
2. `webPlatformAdapter.createFile()` generates .bk content:
   ```
   @title: <title>
   @author: <author>
   @dedication: <dedication>
   @id: <uuid>
   
   #chapter: Chapter 1
   @page:
   Start writing here...
   ```
3. Creates blob, triggers download (`${slugified-title}.bk`)
4. Returns `{book, filename}` parsed via WASM
5. Adds to recent files, navigates to viewer

**Desktop**:
1. Same modal flow
2. `desktopPlatformAdapter.createFile()` uses `dialog.save()` for save location
3. Writes file via `fs.writeTextFile()`
4. Returns `{book, filename, filepath}`
5. Stores filepath in recent files for direct reopening

### Opening a Book

**Web**:
1. User clicks "Open Book"
2. Creates `<input type="file" accept=".bk">`
3. Reads file via FileReader
4. Parses via `parseBk(content)` (WASM)
5. Stores metadata in localStorage (not content)
6. Sets book in BookContext, navigates to viewer

**Desktop**:
1. User clicks "Open Book"
2. `dialog.open({filters: [{name: 'Book', extensions: ['bk']}]})`
3. Reads file via `fs.readTextFile(filepath)`
4. Parses via WASM
5. Stores metadata + filepath in Tauri Store
6. Sets book in BookContext, navigates to viewer

### Saving Edits

**Flow**:
1. User edits block content in EditableBlock
2. `updateBlockContent(chapterId, blockId, newContent)` called
3. BookContext updates in-memory Book object
4. Regenerates .bk file content from Book
5. Triggers download (web) or overwrites file (desktop)

**Format Generation** (reverse of parsing):
```typescript
function generateBkContent(book: Book): string {
  let content = `@title: ${book.title}\n@author: ${book.author}\n`
  if (book.dedication) content += `@dedication: ${book.dedication}\n`
  content += `@id: ${book.id}\n\n`
  
  book.chapters.forEach(chapter => {
    content += `#chapter: ${chapter.title}\n`
    chapter.blocks.forEach(block => {
      content += `@page:\n${block.content}\n\n`
    })
  })
  
  return content
}
```

---

## Storage

### Recent Files

**Web** (`localStorage`):
- Key: `bookwriter_recent_files`
- Value: JSON array of `RecentFile[]`
- Max: 10 files
- Contains: Metadata only (no file content)
- Limitation: User must re-upload to open

**Desktop** (Tauri Store):
- File: `.bookwriter-recents.dat`
- Format: JSON managed by `tauri-plugin-store-api`
- Max: 10 files
- Contains: Metadata + absolute file paths
- Advantage: Direct file reopening

**API** (shared interface):
```typescript
export function getRecentFiles(): Promise<RecentFile[]>
export function addRecentFile(file: RecentFile): Promise<void>
export function updateLastOpened(fileId: string): Promise<void>
export function clearRecentFiles(): Promise<void>
```

### Book Position

**Web** (localStorage):
- Key: `book-position-${book.id}`
- Value: `{spreadIndex: number}`
- Restores reading position on reload

**Desktop**: Same approach (could use Tauri Store for cross-session)

---

## Error Handling

### Rust Parser Errors

**Error Types** (`bk_format/error.rs`):
```rust
pub enum BkParseError {
    MissingMetadata { field: String },
    DuplicateMetadata { field: String, line: usize },
    MalformedMetadata { line: usize, reason: String },
    MissingChapterTitle { line: usize },
    BlockBeforeChapter { line: usize },
    NoChapters,
    InvalidUuid(uuid::Error),
    IoError(std::io::Error),
}
```

**Help Messages**:
```rust
impl BkParseError {
    pub fn help_message(&self) -> String {
        match self {
            BkParseError::MissingMetadata { field } => 
                format!("Add '@{}: <value>' before the first chapter", field),
            BkParseError::BlockBeforeChapter { .. } => 
                "Ensure '@page:' appears only after a '#chapter:' declaration",
            // ...
        }
    }
}
```

**WASM Error Propagation**:
```rust
let book = BkParser::parse_string(input, created, updated)
    .map_err(|e| {
        let error_msg = format!("{}\n\nHelp: {}", e, e.help_message());
        JsValue::from_str(&error_msg)
    })?;
```

### TypeScript Error Handling

```typescript
try {
  const book = await parseBk(content)
  setBook(book)
  navigate('/viewer')
} catch (error) {
  console.error('Failed to open file:', error)
  alert('Failed to open file. Please check the file format.')
}
```

---

## Testing

### Rust Tests

**Location**: `packages/core/src/bk_format/tests.rs`, layout tests

**Run**: `cargo test` in `packages/core/`

**Coverage**:
- Parser: Valid/invalid .bk files, error cases
- Layout: Line breaking, pagination, multi-chapter books
- Models: ID generation, serialization

### TypeScript Tests

**Not yet implemented** (would use Vitest)

**Recommended**:
- Component tests (React Testing Library)
- WASM integration tests
- Storage tests (mock localStorage/Tauri)

---

## Accessibility

### Current State
- Keyboard navigation (← → for pages)
- Semantic HTML (`<button>`, `<h1>`, `<nav>`)
- Focus states on interactive elements

### Pending Improvements
- ARIA labels for icon buttons
- Keyboard shortcuts documentation
- Screen reader announcements for page changes
- Focus trap in modals
- High contrast mode support

---

## Performance

### Optimizations

**WASM**:
- Lazy initialization (first parse only)
- Single global instance

**React**:
- CSS Modules for scoped styles (no runtime overhead)
- `will-change` on animated elements
- `contain: layout style paint` on pages
- Debounced edit operations

**Layout Engine**:
- Simple character-based metrics (no font loading)
- Greedy algorithm (O(n) line breaking)

### Pending Optimizations
- Virtual scrolling for long chapter lists
- Memoization for expensive calculations
- Service Worker for offline support (web)
- Bundle size optimization (tree shaking)

---

## Known Limitations

1. **Web Recent Files**: Can't store file content, requires re-upload
2. **Layout Engine**: Simple character metrics (no kerning, ligatures)
3. **File Format**: No rich text, images, or formatting (plain text only)
4. **Edit Mode**: No undo/redo
5. **Collaboration**: Single-user only (no real-time sync)
6. **Export**: Only .bk format (no PDF, EPUB, etc.)

---

## Future Enhancements

### Planned Features (from plan mode)
1. Desktop IntroPage implementation
2. Visual redesign completion (BookView, PageView styling)
3. Accessibility improvements
4. PDF/EPUB export via layout engine
5. Rich text editing
6. Cloud sync for recent files
7. Mobile apps (React Native)

### Architecture Improvements
1. IndexedDB for web file storage (larger capacity)
2. Real font metrics integration
3. Advanced layout: columns, images, footnotes
4. Plugin system for custom blocks
5. Real-time collaboration (CRDT-based)

---

## Development Workflow

### Typical Task Flow

1. **Read relevant code** (BookView, parser, etc.)
2. **Plan changes** (use Plan mode for complex tasks)
3. **Implement in phases**:
   - Core logic (Rust if needed)
   - UI components (React)
   - Styling (Tailwind + CSS Modules)
4. **Test manually** (build + run dev server)
5. **Commit** (atomic commits per feature)

### Best Practices

**Code Style**:
- Rust: `cargo fmt`, `cargo clippy`
- TypeScript: Strict mode, explicit types
- React: Functional components, hooks
- CSS: Mobile-first, semantic class names

**Commits**:
- Atomic: One logical change per commit
- Descriptive: "Add CreateBookModal with validation"
- Conventional: `feat:`, `fix:`, `refactor:`, `docs:`

**Testing**:
- Manual testing on both web and desktop
- Cross-browser (Chrome, Firefox, Safari)
- Cross-platform (macOS, Windows, Linux)

---

## Debugging

### WASM Issues

**Check WASM Loading**:
```javascript
console.log('WASM initialized:', wasmInitialized)
```

**Inspect Parse Errors**:
```javascript
try {
  const book = parse_bk(content)
} catch (error) {
  console.error('Parse error:', error)  // Includes help message
}
```

**Rebuild WASM**:
```bash
cd packages/core
wasm-pack build --target web --out-dir ../web/public/wasm
```

### React Issues

**BookContext State**:
```tsx
const { book, isEditing } = useBook()
console.log('Current book:', book)
console.log('Edit mode:', isEditing)
```

**Platform Adapter**:
```tsx
const { adapter, platformName } = usePlatform()
console.log('Platform:', platformName)
```

### Tauri Issues

**Check Logs**:
- Rust logs: `src-tauri/target/debug/` or console in dev mode
- Frontend logs: Browser DevTools in Tauri window

**Rebuild Desktop**:
```bash
cd packages/desktop
pnpm tauri build
```

---

## Deployment

### Web

**Build**:
```bash
cd packages/web
pnpm build
```

**Output**: `dist/` folder

**Deployment Options**:
- Static hosting: Vercel, Netlify, GitHub Pages
- CDN: Cloudflare Pages
- Self-hosted: Nginx, Apache

**Environment**:
- Requires WASM support (all modern browsers)
- HTTPS recommended (for file APIs)

### Desktop

**Build**:
```bash
cd packages/desktop
pnpm tauri build
```

**Output**: `src-tauri/target/release/bundle/`

**Distribution**:
- macOS: `.dmg` installer
- Windows: `.msi` installer
- Linux: `.deb`, `.AppImage`

**Code Signing** (production):
- macOS: Apple Developer certificate
- Windows: Authenticode certificate
- Linux: GPG signature

---

## Quick Reference

### Key Files to Know

**Core**:
- `packages/core/src/bk_format/parser.rs` - .bk parser
- `packages/core/src/models.rs` - Data models
- `packages/core/src/layout/paginator.rs` - Layout engine
- `packages/core/src/wasm.rs` - WASM bindings

**Web**:
- `packages/web/src/App.tsx` - Routing
- `packages/web/src/pages/IntroPage.tsx` - Home page
- `packages/web/src/components/BookView.tsx` - Book viewer
- `packages/web/src/contexts/BookContext.tsx` - Book state
- `packages/web/src/lib/wasm.ts` - WASM loader

**Shared**:
- `packages/shared/styles/tokens.css` - Design tokens
- `packages/shared/tailwind.config.js` - Tailwind theme
- `packages/shared/lib/types.ts` - Shared types
- `packages/shared/components/book/CreateBookModal.tsx` - New book modal

**Desktop**:
- `packages/desktop/src-tauri/src/main.rs` - Tauri entry
- `packages/desktop/src/lib/platform-adapter.ts` - Native file ops

### Common Tasks

**Add new component**:
1. Create in `packages/shared/components/`
2. Import in `packages/web/src/` or `packages/desktop/src/`
3. Use Tailwind classes from shared config

**Modify .bk format**:
1. Update parser in `packages/core/src/bk_format/parser.rs`
2. Update models if needed
3. Add tests
4. Rebuild WASM
5. Update TypeScript types

**Change design**:
1. Edit `packages/shared/styles/tokens.css`
2. Update Tailwind config if needed
3. Components automatically pick up changes

**Add storage field**:
1. Update `RecentFile` type in `packages/shared/lib/types.ts`
2. Update storage functions in `packages/web/src/lib/storage.ts`
3. Update desktop storage in `packages/desktop/src/lib/storage.ts`

---

## Contact & Resources

**Project**: bookWriter  
**Architecture**: Rust (core) + React (UI) + Tauri (desktop)  
**License**: (Check repository)

**Documentation**:
- This file: Technical overview
- `README.md`: Getting started
- Plan files: `.claude/plans/*.md`

**External Docs**:
- [Tauri](https://tauri.app/)
- [wasm-bindgen](https://rustwasm.github.io/docs/wasm-bindgen/)
- [React Router](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## Summary for New Claude Instance

**What is this?**  
Cross-platform book writing app with custom .bk format (plain text with directives).

**Tech Stack**:  
Rust parser → WASM for web, Tauri for desktop, React UI, Tailwind CSS.

**Key Concepts**:
- `.bk` files: `@title:`, `#chapter:`, `@page:` directives
- Two-page spread viewer with skeuomorphic styling
- Platform adapter pattern (web File API vs Tauri native)
- Recent files (localStorage vs Tauri Store)
- Layout engine (converts Book → paginated RenderTree)

**Current State**:
- ✅ Parser, layout engine, web viewer, editing, IntroPage
- ⏳ Desktop IntroPage, final styling polish, accessibility

**To Continue Work**:
1. Read this doc thoroughly
2. Check `.claude/plans/*.md` for active plans
3. Run `pnpm dev:web` to see current state
4. Follow todo list or ask user for priorities

**Most Important Rule**:  
User wants minimal design: two colors (cream/black), serif font (Libre Baskerville), no icons, simple buttons. Always honor this aesthetic.
