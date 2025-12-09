# .bk File Format Specification

## Overview

The `.bk` format is a human-readable plain text format for representing book manuscripts with metadata, chapters, and page blocks.

## Format Structure

### Metadata Section

Metadata fields are defined at the beginning of the file using `@field:` syntax:

```
@title: Your Book Title
@author: Author Name
@id: 550e8400-e29b-41d4-a009-426655440000
@dedication: Dedication text
```

**Required fields:**
- `@title:` - The book's title
- `@author:` - The author's name

**Optional fields:**
- `@id:` - UUID for the book (auto-generated if omitted)
- `@dedication:` - Dedication text

### Chapter Section

Chapters are declared using `#chapter:` followed by the chapter title:

```
#chapter: Chapter Title
```

### Page/Block Section

Content blocks (pages) within chapters are marked with `@page:`:

```
@page:
Your content here.
Multiple lines are supported.

@page:
Another page of content.
```

## Complete Example

```
@title: The Way of Iron
@author: Tej Chhabra
@dedication: To all the dreamers

#chapter: The Beginning
@page:
The morning sun cracked over the horizon...

@page:
Marcus stood at the forge, hammer in hand...

#chapter: The Journey
@page:
The road stretched endlessly before him...
```

## Parser Behavior

### ID Generation
- **Book IDs:** If no `@id` is provided, a random UUID is generated
- **Chapter IDs:** Deterministically generated from `book.id + order + title`
- **Block IDs:** Deterministically generated from `chapter.id + order`

### Timestamps
- `created_at` and `updated_at` are extracted from filesystem metadata
- When parsing from string (e.g., for testing), timestamps must be provided

### Error Handling

The parser provides helpful error messages with guidance:

| Error | Description | Help Message |
|-------|-------------|--------------|
| `MissingMetadata` | Required field missing | "Add the required '@field:' field..." |
| `InvalidUuid` | Malformed UUID | "The @id field must be a valid UUID..." |
| `NoChapters` | Book has no chapters | "Add at least one chapter using '#chapter:...'" |
| `BlockBeforeChapter` | @page: before any chapter | "Move @page: blocks inside a #chapter: section" |
| `MissingChapterTitle` | #chapter: without title | "Chapter declaration must include a title..." |
| `DuplicateMetadata` | Field appears multiple times | "Remove duplicate '@field:' field..." |

## Usage

### Parse from File

```rust
use bookwriter_core::bk_format::BkParser;
use std::path::Path;

let book = BkParser::parse_file(Path::new("mybook.bk"))?;
println!("Title: {}", book.title);
println!("Chapters: {}", book.chapters.len());
```

### Parse from String

```rust
use bookwriter_core::bk_format::BkParser;
use chrono::Utc;

let content = r#"
@title: My Book
@author: Author

#chapter: Chapter One
@page:
Content here
"#;

let book = BkParser::parse_string(content, Utc::now(), Utc::now())?;
```

### Error Handling

```rust
match BkParser::parse_file(path) {
    Ok(book) => println!("Parsed: {}", book.title),
    Err(e) => {
        eprintln!("Error: {}", e);
        eprintln!("Help: {}", e.help_message());
    }
}
```

## Data Model

### Book
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
```

### Chapter
```rust
pub struct Chapter {
    pub id: Uuid,
    pub title: String,
    pub blocks: Vec<Block>,
    pub order: usize,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Chapter {
    // Helper to get all content as a single string
    pub fn content(&self) -> String { ... }
}
```

### Block
```rust
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

## Features

- ✅ Human-readable plain text format
- ✅ Optional UUID preservation for stable identity
- ✅ Deterministic ID generation for chapters and blocks
- ✅ Filesystem timestamp extraction
- ✅ Comprehensive error messages with help text
- ✅ Support for multiline content
- ✅ Unicode support
- ✅ Whitespace handling
- ✅ Empty line tolerance
- ✅ State machine parser (efficient, streaming)

## Future Enhancements

Potential additions not yet implemented:
- Export functionality (Book → .bk file serialization)
- Additional block types (Image, Quote, Code, Footnote)
- Additional metadata fields (genre, ISBN, language, published_date)
- YAML/TOML frontmatter support
- Markdown-style syntax support within content
- Chapter-level metadata
