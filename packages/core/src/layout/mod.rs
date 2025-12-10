pub mod config;
pub mod line_breaker;
pub mod metrics;
pub mod paginator;
pub mod types;

pub use config::*;
pub use metrics::*;
pub use types::*;

use crate::Book;
use anyhow::Result;

/// Layout a book into a render tree
///
/// # Arguments
/// * `book` - The book to layout
/// * `config` - Layout configuration (page size, margins, styles)
///
/// # Returns
/// A `RenderTree` containing all pages with positioned text
///
/// # Example
/// ```ignore
/// use bookwriter_core::{Book, layout::{layout_book, LayoutConfig}};
///
/// let book = Book::new("Title".into(), "Author".into());
/// let config = LayoutConfig::default();
/// let tree = layout_book(&book, &config)?;
/// println!("Generated {} pages", tree.pages.len());
/// ```
pub fn layout_book(book: &Book, config: &LayoutConfig) -> Result<RenderTree> {
    let metrics = SimpleTextMetrics::default();
    layout_book_with_metrics(book, config, &metrics)
}

/// Layout a book with custom text metrics
///
/// # Arguments
/// * `book` - The book to layout
/// * `config` - Layout configuration
/// * `metrics` - Custom text metrics implementation
///
/// # Returns
/// A `RenderTree` containing all pages with positioned text
pub fn layout_book_with_metrics(
    book: &Book,
    config: &LayoutConfig,
    metrics: &dyn TextMetrics,
) -> Result<RenderTree> {
    let mut paginator = paginator::Paginator::new(config, metrics);
    paginator.paginate(book)
}
