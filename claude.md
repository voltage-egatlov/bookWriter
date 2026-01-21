# Katha - Book Writer Platform

A book-writing platform for authors to create, edit, and manage books in a structured format using a custom `.bk` file format.

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
│   │       │   └── ViewerPage.tsx    # Book viewer & editor
│   │       └── lib/
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
Chapter content here...

#chapter: Another Chapter
More content...
```

Required metadata: `@title`, `@author`
Optional metadata: `@id`, `@dedication`

## Key Features

- Create/open books with custom `.bk` format
- Two-page spread viewer with navigation
- Inline editing for dedication and chapters
- Auto-save via File System Access API
- Recent books tracking (localStorage)
- File handle persistence (IndexedDB)
- Tauri desktop build for cross-platform

## Architecture Notes

- **WASM parsing**: Rust parser (`BkParser`) compiled to WebAssembly for performance
- **Progressive enhancement**: File System Access API with localStorage/download fallback
- **Deterministic IDs**: Chapter UUIDs generated from book ID + chapter metadata
- **Data persistence**: localStorage for book data, IndexedDB for file handles

## Key Files

| File | Purpose |
|------|---------|
| `core/src/bk_format/parser.rs` | .bk file parser |
| `web/src/pages/ViewerPage.tsx` | Main book viewer/editor |
| `web/src/lib/wasm.ts` | WASM JavaScript bindings |
| `web/src/lib/fileHandleDB.ts` | IndexedDB file handle storage |
