use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Complete render output for a book
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderTree {
    pub book_id: Uuid,
    pub pages: Vec<PageRender>,
    pub metadata: RenderMetadata,
}

/// Metadata about the rendered output
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderMetadata {
    pub total_pages: usize,
    pub total_chapters: usize,
}

/// A single rendered page
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageRender {
    pub page_number: usize,
    pub side: PageSide,
    pub frames: Vec<TextFrame>,
}

/// Page side for margin calculation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PageSide {
    Left,
    Right,
}

/// A positioned text box on a page
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextFrame {
    pub id: Uuid,
    pub bounds: Rectangle,
    pub lines: Vec<TextLine>,
    pub frame_type: FrameType,
}

/// Type of text frame
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FrameType {
    ChapterTitle,
    BodyText,
    PageNumber,
}

/// A line of text with positioning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextLine {
    pub y_offset: f32,
    pub fragments: Vec<TextFragment>,
}

/// A fragment of text with styling
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextFragment {
    pub text: String,
    pub x_offset: f32,
    pub style: TextStyle,
    pub source_block_id: Uuid,
}

/// Rectangular bounds
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Rectangle {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

/// Text styling information
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct TextStyle {
    pub font_size: f32,
    pub line_height: f32,
    pub alignment: Alignment,
}

/// Text alignment
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Alignment {
    Left,
    Center,
    Right,
    Justify,
}

impl Default for TextStyle {
    fn default() -> Self {
        Self {
            font_size: 12.0,
            line_height: 1.5,
            alignment: Alignment::Left,
        }
    }
}
