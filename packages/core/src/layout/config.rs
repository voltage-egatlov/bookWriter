use super::types::{Alignment, TextStyle};

/// Configuration for layout engine
#[derive(Debug, Clone)]
pub struct LayoutConfig {
    pub page_size: PageSize,
    pub margins: Margins,
    pub body_style: TextStyle,
    pub chapter_title_style: TextStyle,
    pub first_chapter_on_odd_page: bool,
}

impl Default for LayoutConfig {
    fn default() -> Self {
        Self {
            page_size: PageSize::US_LETTER,
            margins: Margins::uniform(72.0), // 1 inch
            body_style: TextStyle {
                font_size: 12.0,
                line_height: 1.5,
                alignment: Alignment::Left,
            },
            chapter_title_style: TextStyle {
                font_size: 24.0,
                line_height: 1.2,
                alignment: Alignment::Left,
            },
            first_chapter_on_odd_page: true,
        }
    }
}

/// Page dimensions in points
#[derive(Debug, Clone, Copy)]
pub struct PageSize {
    pub width: f32,
    pub height: f32,
}

impl PageSize {
    /// US Letter: 8.5" x 11" (612 x 792 points)
    pub const US_LETTER: PageSize = PageSize {
        width: 612.0,
        height: 792.0,
    };

    /// A4: 210mm x 297mm (595 x 842 points)
    pub const A4: PageSize = PageSize {
        width: 595.0,
        height: 842.0,
    };
}

/// Page margins in points
#[derive(Debug, Clone, Copy)]
pub struct Margins {
    pub top: f32,
    pub bottom: f32,
    pub inner: f32,
    pub outer: f32,
}

impl Margins {
    /// Create uniform margins (all sides equal)
    pub fn uniform(margin: f32) -> Self {
        Self {
            top: margin,
            bottom: margin,
            inner: margin,
            outer: margin,
        }
    }

    /// Create symmetric margins (top/bottom and left/right equal)
    pub fn symmetric(vertical: f32, horizontal: f32) -> Self {
        Self {
            top: vertical,
            bottom: vertical,
            inner: horizontal,
            outer: horizontal,
        }
    }
}
