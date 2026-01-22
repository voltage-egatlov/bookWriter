# Katha - Book Writer Platform

A book-writing platform for authors to create, edit, and manage books in a structured format using a custom `.bk` file format. Features a word processor-style inline editor with text flowing across pages like a real book.

## Tech Stack

- **Rust** - Core parsing logic compiled to WASM
- **React 18** - UI framework (TypeScript)
- **Tauri 1.5** - Desktop application wrapper
- **Vite** - Build tool and dev server
- **Tailwind CSS 4** - Styling
- **pnpm** - Package manager (monorepo)

## Project Structure

```
bookWriter/
├── packages/
│   ├── core/               # Rust WASM library
│   │   └── src/
│   │       ├── lib.rs      # Library entry
│   │       ├── models.rs   # Book/Chapter data structures
│   │       ├── wasm.rs     # WASM bindings
│   │       └── bk_format/  # .bk file parser
│   │           ├── parser.rs
│   │           ├── error.rs
│   │           └── models.rs
│   │
│   ├── web/                # React web application
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── HomePage.tsx      # Landing & recent books
│   │       │   └── ViewerPage.tsx    # Book viewer & editor wrapper
│   │       ├── components/editor/    # Editor components
│   │       │   ├── BookEditor.tsx    # Main editor container
│   │       │   ├── EditorContext.tsx # State management
│   │       │   ├── Page.tsx          # Single page renderer
│   │       │   ├── PageSpread.tsx    # Two-page spread
│   │       │   ├── PageSegment.tsx   # Content segment with cursor
│   │       │   └── Cursor.tsx        # Blinking cursor
│   │       └── lib/
│   │           ├── editor/           # Editor logic
│   │           │   ├── types.ts      # Editor types
│   │           │   ├── constants.ts  # Font/page settings
│   │           │   ├── pagination.ts # Page break calculation
│   │           │   ├── textMeasurement.ts # Canvas text measurement
│   │           │   ├── markdown.ts   # Markdown parsing
│   │           │   └── useKeyboardInput.ts # Keyboard handling
│   │           ├── wasm.ts           # WASM wrapper
│   │           ├── fileHandleDB.ts   # IndexedDB file handles
│   │           └── types.ts          # TypeScript interfaces
│   │
│   └── desktop/            # Tauri desktop app
│       ├── src/
│       │   └── pages/
│       │       ├── HomePage.tsx
│       │       ├── EditorPage.tsx
│       │       └── ViewerPage.tsx
│       └── src-tauri/      # Rust Tauri backend
```

## Development

```bash
# Install dependencies
pnpm install

# Web app development
pnpm dev:web

# Desktop app development
pnpm dev:desktop

# Build
pnpm build:web
pnpm build:desktop

# Lint and type check
pnpm lint
pnpm type-check
```

## .bk File Format

```
@id: [UUID]
@title: Book Title
@author: Author Name
@dedication: Optional dedication

#chapter: Chapter Title
Chapter content here with **bold**, *italic*, __underline__ formatting...

#chapter: Another Chapter
More content...
```

Required metadata: `@title`, `@author`
Optional metadata: `@id`, `@dedication`
Formatting: `**bold**`, `*italic*`, `__underline__`

## Key Features

- **Word processor-style editing**: Click anywhere to place cursor, inline typing
- **Text flow across pages**: Chapters continue across multiple fixed-height pages
- **Two-page spread viewer**: Book-like layout with navigation
- **Basic formatting**: Bold, italic, underline with keyboard shortcuts
- **Chapter management**: Create chapters with Ctrl+Shift+C, delete by removing title
- **Auto-save**: Debounced saving via File System Access API
- **Page headers/footers**: Author (left), title (right), page numbers
- **Clickable TOC**: Navigate directly to chapters
- **CSS hyphenation**: Long words break with hyphens
- **Recent books tracking**: localStorage + IndexedDB for file handles

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + S | Save |
| Ctrl/Cmd + B | Bold |
| Ctrl/Cmd + I | Italic |
| Ctrl/Cmd + U | Underline |
| Ctrl/Cmd + Shift + C | Create new chapter at cursor |
| Escape | Hide cursor |
| Arrow keys | Navigate cursor |
| Home/End | Jump to start/end of content |

## Architecture Notes

- **Custom text engine**: Not using contenteditable; custom cursor and pagination for cross-page text flow
- **Canvas text measurement**: Uses Canvas API for fast text measurement and pagination
- **WASM parsing**: Rust parser (`BkParser`) compiled to WebAssembly for performance
- **Progressive enhancement**: File System Access API with localStorage/download fallback
- **Chapters isolated**: Cursor stops at chapter boundaries, no cross-chapter editing
- **Data persistence**: localStorage for book data, IndexedDB for file handles

## Key Files

| File | Purpose |
|------|---------|
| `core/src/bk_format/parser.rs` | .bk file parser |
| `web/src/pages/ViewerPage.tsx` | Main page wrapper with nav bar |
| `web/src/components/editor/BookEditor.tsx` | Editor container |
| `web/src/components/editor/EditorContext.tsx` | State management (reducer) |
| `web/src/components/editor/PageSegment.tsx` | Renders content with cursor |
| `web/src/lib/editor/pagination.ts` | Calculates page breaks |
| `web/src/lib/editor/textMeasurement.ts` | Canvas-based text measurement |
| `web/src/lib/editor/useKeyboardInput.ts` | Keyboard event handling |
| `web/src/lib/wasm.ts` | WASM JavaScript bindings |
| `web/src/lib/fileHandleDB.ts` | IndexedDB file handle storage |
