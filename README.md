# Book Writer Platform

A monorepo for a book-writing platform with Rust core, React web, and Tauri desktop applications.

## Project Structure

```
bookWriter/
├── packages/
│   ├── core/           # Rust core library (shared business logic)
│   ├── web/            # React web application
│   └── desktop/        # Tauri desktop application
├── .gitignore
├── Cargo.toml          # Workspace configuration
└── README.md
```

## Packages

- **core**: Shared Rust library containing business logic, data models, and utilities
- **web**: React-based web application for the book-writing platform
- **desktop**: Tauri desktop application wrapping the web UI with native capabilities

## Getting Started

### Prerequisites

- Rust 1.70+
- Node.js 18+
- pnpm (recommended) or npm

### Development

See individual package READMEs for development instructions.
