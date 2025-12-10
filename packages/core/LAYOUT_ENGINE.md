# Layout Engine Documentation

## Overview

The layout engine transforms `Book` structures into a `RenderTree` containing pages, frames, lines, and text fragments. It provides a foundation for rendering books with proper pagination and text flow.

## Architecture

### Module Structure

```
src/layout/
├── mod.rs              # Public API and exports
├── types.rs            # Core data structures (RenderTree, PageRender, etc.)
├── config.rs           # LayoutConfig and page settings
├── metrics.rs          # Text measurement (TextMetrics trait)
├── line_breaker.rs     # Greedy line breaking algorithm
└── paginator.rs        # Main pagination logic
```

### Key Components

#### 1. Data Structures (types.rs)

- **RenderTree**: Complete render output for a book
  - `book_id`: UUID of the source book
  - `pages`: Vector of rendered pages
  - `metadata`: Summary information

- **PageRender**: A single rendered page
  - `page_number`: 1-indexed page number
  - `side`: Left or Right (for margin calculation)
  - `frames`: Text boxes on this page

- **TextFrame**: A positioned text box
  - `bounds`: Rectangle with x, y, width, height
  - `lines`: Vector of text lines
  - `frame_type`: ChapterTitle, BodyText, or PageNumber

- **TextLine**: A line of text with fragments
  - `y_offset`: Vertical position relative to frame
  - `fragments`: Text pieces with styling

- **TextFragment**: Styled text piece
  - `text`: The actual text content
  - `x_offset`: Horizontal position
  - `style`: Font size, line height, alignment
  - `source_block_id`: Traces back to original Block

#### 2. Configuration (config.rs)

```rust
let config = LayoutConfig {
    page_size: PageSize::US_LETTER,  // or PageSize::A4
    margins: Margins::uniform(72.0),  // 1 inch = 72 points
    body_style: TextStyle { font_size: 12.0, line_height: 1.5, ... },
    chapter_title_style: TextStyle { font_size: 24.0, ... },
    first_chapter_on_odd_page: true,
};
```

**Page Sizes:**
- `PageSize::US_LETTER`: 612 × 792 points (8.5" × 11")
- `PageSize::A4`: 595 × 842 points (210mm × 297mm)

**Margins:**
- `Margins::uniform(points)`: All sides equal
- `Margins::symmetric(vertical, horizontal)`: Top/bottom and left/right equal
- Custom: `Margins { top, bottom, inner, outer }`

#### 3. Text Metrics (metrics.rs)

The `TextMetrics` trait allows pluggable text measurement:

```rust
pub trait TextMetrics {
    fn measure_text(&self, text: &str, font_size: f32) -> f32;
    fn measure_char(&self, c: char, font_size: f32) -> f32;
    fn line_height(&self, font_size: f32, multiplier: f32) -> f32;
}
```

**Default Implementation: SimpleTextMetrics**
- Uses character-count approximation
- Default ratio: 0.6 (60% of font size per character)
- No font dependencies required
- Suitable for initial implementation

#### 4. Line Breaking (line_breaker.rs)

**Algorithm:** Greedy line breaking
- Splits text into words (whitespace-separated)
- Adds words to current line until one doesn't fit
- Starts new line and continues

**Features:**
- Handles very long words (places on own line)
- Collapses multiple spaces
- Calculates proper y-offsets for line spacing
- Preserves source Block ID for traceability

#### 5. Pagination (paginator.rs)

**Main responsibilities:**
- Orchestrates the entire layout process
- Manages page creation and filling
- Splits content across multiple pages
- Handles chapter titles with special styling
- Ensures proper left/right page alternation

**Flow:**
1. Start first page
2. For each chapter:
   - Optionally ensure odd (right) page start
   - Add chapter title
   - For each block:
     - Break into lines
     - Fit lines on current page
     - Create new pages as needed
3. Finalize last page

## Usage

### Basic Usage

```rust
use bookwriter_core::{Book, layout::{layout_book, LayoutConfig}};

let mut book = Book::new("My Book".into(), "Author Name".into());
book.add_chapter("Chapter 1".into(), "Content here...".into());

let config = LayoutConfig::default();
let render_tree = layout_book(&book, &config)?;

println!("Generated {} pages", render_tree.pages.len());
```

### Custom Configuration

```rust
use bookwriter_core::layout::{
    layout_book, LayoutConfig, PageSize, Margins, TextStyle, Alignment
};

let mut config = LayoutConfig::default();
config.page_size = PageSize::A4;
config.margins = Margins::symmetric(90.0, 72.0); // Larger top/bottom
config.body_style = TextStyle {
    font_size: 11.0,
    line_height: 1.6,
    alignment: Alignment::Left,
};

let render_tree = layout_book(&book, &config)?;
```

### Custom Text Metrics

```rust
use bookwriter_core::layout::{layout_book_with_metrics, TextMetrics};

struct MyCustomMetrics;

impl TextMetrics for MyCustomMetrics {
    fn measure_text(&self, text: &str, font_size: f32) -> f32 {
        // Your custom measurement logic
        text.len() as f32 * font_size * 0.55
    }
    // ... implement other methods
}

let metrics = MyCustomMetrics;
let render_tree = layout_book_with_metrics(&book, &config, &metrics)?;
```

### Serialization

All layout structures are serializable with serde:

```rust
use serde_json;

let render_tree = layout_book(&book, &config)?;
let json = serde_json::to_string_pretty(&render_tree)?;
println!("{}", json);
```

## Examples

Run the demo example:

```bash
cd packages/core
cargo run --example layout_demo
```

This demonstrates:
- Creating a multi-chapter book
- Configuring layout settings
- Generating the render tree
- Displaying page and frame information
- JSON serialization

## Testing

Run all tests:

```bash
cargo test
```

**Test Coverage:**
- Text metrics: Character measurement, line height calculation
- Line breaking: Empty text, single/multiple words, wrapping, long words, whitespace
- Pagination: Empty books, simple books, multi-page books, page alternation

## Performance

**Target Performance:**
- Small books (100 pages): < 50ms
- Medium books (500 pages): < 500ms  
- Large books (2000 pages): < 5s

**Current Implementation:**
Simple and unoptimized, suitable for most use cases. Future optimizations possible.

## Future Enhancements

### Short-term
- Real font metrics (fontdue, ab_glyph)
- Widow/orphan prevention
- First-line indent

### Medium-term
- Knuth-Plass line breaking algorithm
- Hyphenation support
- Kerning and ligatures

### Long-term
- Multi-column layout
- Headers and footers
- Page numbers
- Table of contents generation
- Images and figures
- Footnotes

## Integration

The layout module integrates seamlessly with existing bk-core:

1. **Input**: Uses existing `Book`, `Chapter`, and `Block` structures
2. **Output**: New `RenderTree` structure (does not modify input)
3. **Serialization**: Full serde support for WASM compatibility
4. **No new dependencies**: Uses only existing dependencies

### WASM Integration (Future)

The layout engine is designed to work in WASM:

```rust
#[wasm_bindgen]
pub fn layout_book_wasm(book_json: &str, config_json: &str) -> Result<JsValue, JsValue> {
    let book: Book = serde_json::from_str(book_json)?;
    let config: LayoutConfig = serde_json::from_str(config_json)?;
    let tree = layout_book(&book, &config)?;
    Ok(serde_wasm_bindgen::to_value(&tree)?)
}
```

## API Reference

### Public Functions

- `layout_book(book: &Book, config: &LayoutConfig) -> Result<RenderTree>`
  - Main entry point, uses SimpleTextMetrics

- `layout_book_with_metrics(book: &Book, config: &LayoutConfig, metrics: &dyn TextMetrics) -> Result<RenderTree>`
  - Advanced usage with custom metrics

### Public Types

All types in `types.rs`, `config.rs`, and `metrics.rs` are public and documented.

## Contributing

When contributing to the layout engine:

1. Add tests for new features
2. Ensure all existing tests pass
3. Update this documentation
4. Maintain serde compatibility
5. Keep the API simple and composable

## License

Same as bookwriter-core project.
