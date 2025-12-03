# bookwriter-core

Shared Rust library containing core business logic for the book-writing platform.

## Features

- Data models for books and chapters
- Service traits for business logic
- Shared utilities

## Usage

```rust
use bookwriter_core::Book;

let mut book = Book::new("My Book".to_string(), "Author Name".to_string());
book.add_chapter("Chapter 1".to_string(), "Once upon a time...".to_string());
```

## Development

```bash
cargo test
cargo build
```
