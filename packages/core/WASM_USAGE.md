# WASM Usage Guide

## Overview

The bookwriter-core library can be compiled to WebAssembly (WASM) for use in web browsers, while maintaining full compatibility with native Rust for desktop applications.

## Building for WASM

### Prerequisites

1. Install the WASM target:
```bash
rustup target add wasm32-unknown-unknown
```

2. (Optional) Install wasm-pack for easier builds:
```bash
cargo install wasm-pack
```

### Build Commands

**Option 1: Using cargo directly**
```bash
cd packages/core
cargo build --features wasm --target wasm32-unknown-unknown --release
```

Output: `target/wasm32-unknown-unknown/release/bookwriter_core.wasm`

**Option 2: Using wasm-pack (recommended for web projects)**
```bash
cd packages/core
wasm-pack build --features wasm --target web --release
```

Output: `pkg/` directory with:
- `bookwriter_core.js` - JavaScript bindings
- `bookwriter_core_bg.wasm` - WASM binary
- `bookwriter_core.d.ts` - TypeScript definitions
- `package.json` - npm package config

## JavaScript API

### Function Signature

```typescript
function parse_bk(
    input: string,
    created_at?: string,
    updated_at?: string
): Book;
```

### Parameters

- **input** (required): The .bk file content as a string
- **created_at** (optional): Creation timestamp in ISO 8601 format (e.g., "2025-01-15T10:30:00Z")
- **updated_at** (optional): Modification timestamp in ISO 8601 format
  - If not provided, both default to current time (`Date.now()`)

### Return Value

Returns a full `Book` object with all fields:

```typescript
interface Book {
    id: string;              // UUID
    title: string;
    author: string;
    dedication: string | null;
    created_at: string;      // ISO 8601
    updated_at: string;      // ISO 8601
    chapters: Chapter[];
}

interface Chapter {
    id: string;              // UUID (deterministic)
    title: string;
    order: number;
    created_at: string;
    updated_at: string;
    blocks: Block[];
}

interface Block {
    id: string;              // UUID (deterministic)
    content: string;
    order: number;
    block_type: "Page";
}
```

### Error Handling

The function throws a JavaScript `Error` on parse failure. The error message includes:
- Description of what went wrong
- Helpful guidance on how to fix it

## Usage Examples

### Example 1: Simple Usage (Auto Timestamps)

```javascript
import { parse_bk } from './pkg/bookwriter_core.js';

const bkContent = `
@title: My Book
@author: John Doe

#chapter: Chapter One
@page:
The story begins...
`;

try {
    const book = parse_bk(bkContent);
    console.log(book.title);           // "My Book"
    console.log(book.author);          // "John Doe"
    console.log(book.chapters.length); // 1
    console.log(book.chapters[0].blocks[0].content); // "The story begins..."
} catch (error) {
    console.error("Parse failed:", error.message);
}
```

### Example 2: With Custom Timestamps

```javascript
// Useful when syncing from server or editing existing books
const book = parse_bk(
    bkContent,
    "2025-01-15T10:30:00Z",  // created_at
    "2025-12-09T14:30:00Z"   // updated_at
);

console.log(book.created_at); // "2025-01-15T10:30:00.000Z"
console.log(book.updated_at); // "2025-12-09T14:30:00.000Z"
```

### Example 3: Handling Errors

```javascript
const invalidContent = `
@title: My Book
# Missing @author field!

#chapter: Chapter One
@page:
Content
`;

try {
    const book = parse_bk(invalidContent);
} catch (error) {
    console.error(error.message);
    // Outputs:
    // Missing required metadata field: author
    //
    // Help: Add the required '@author:' field at the top of your .bk file
}
```

### Example 4: File Upload in Browser

```javascript
async function handleFileUpload(event) {
    const file = event.target.files[0];
    const content = await file.text();
    
    try {
        const book = parse_bk(content);
        displayBook(book);
    } catch (error) {
        showErrorMessage(error.message);
    }
}

document.getElementById('fileInput').addEventListener('change', handleFileUpload);
```

### Example 5: Integration with Desktop (Tauri)

```javascript
// Web version (WASM)
const book = parse_bk(fileContent);

// Desktop version (Tauri) - same data structure!
const book = await invoke('parse_bk_file', { path: '/path/to/book.bk' });

// Both return identical Book structure, enabling seamless sync
```

## Architecture

### Cross-Platform Compatibility

```
bookwriter-core/
  ├── Native Build
  │   └── Used by: Tauri Desktop App
  │       - Direct Rust function calls
  │       - Access to filesystem
  │       - Real file timestamps
  │
  └── WASM Build
      └── Used by: Web Browser App
          - JavaScript bindings
          - No filesystem access
          - Current time or custom timestamps
```

### Data Model Consistency

Both platforms use the **same data structures**:
- Same Book/Chapter/Block models
- Same UUID generation (deterministic)
- Same .bk file format
- Enables seamless data sync between web and desktop

## Build Integration

### For Web Projects

Add to your `package.json`:
```json
{
  "scripts": {
    "build:wasm": "cd ../core && wasm-pack build --features wasm --target web --release"
  }
}
```

### For Vite/Rollup

```javascript
// vite.config.js
import wasm from 'vite-plugin-wasm';

export default {
  plugins: [wasm()],
};
```

Then import:
```javascript
import init, { parse_bk } from './pkg/bookwriter_core.js';

await init(); // Initialize WASM
const book = parse_bk(content);
```

## Bundle Size

- WASM binary: ~356 KB (release build)
- Gzipped: ~120 KB (estimated)
- Includes full parser, UUID generation, and error handling

## Performance

- **Parsing speed**: Similar to native Rust (near-native performance)
- **Memory**: Efficient, streams through content
- **Startup**: One-time WASM initialization (~10-50ms)

## Compatibility

- **Browsers**: All modern browsers with WASM support
  - Chrome/Edge 57+
  - Firefox 52+
  - Safari 11+
- **Node.js**: 12+ with WASM support
- **Bundlers**: Webpack 5+, Rollup, Vite, Parcel

## Troubleshooting

### Build Fails with "can't find crate for `core`"

Solution: Install the WASM target
```bash
rustup target add wasm32-unknown-unknown
```

### Import Errors in Browser

Make sure to:
1. Initialize WASM before use: `await init()`
2. Use correct import path for your bundler
3. Configure bundler for WASM support

### UUID Generation Fails

The `uuid` crate needs the `js` feature for WASM. This is already configured in `Cargo.toml`.

## Development

### Testing WASM Locally

```bash
# Build
wasm-pack build --features wasm --target web --dev

# Serve with a local server
cd pkg
python3 -m http.server 8000

# Open browser to http://localhost:8000
```

### Native vs WASM Development

```bash
# Native development (fast compile, full debugging)
cargo test

# WASM development (slower compile, browser testing)
wasm-pack build --features wasm --target web --dev
```

## Next Steps

- See `BK_FORMAT.md` for .bk file format specification
- See `examples/parse_bk.rs` for Rust usage examples
- Check `packages/web/` for web app integration example (if available)
