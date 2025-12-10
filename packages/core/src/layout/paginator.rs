use super::config::LayoutConfig;
use super::line_breaker::LineBreaker;
use super::metrics::TextMetrics;
use super::types::*;
use crate::{Block, Book, Chapter};
use anyhow::Result;
use uuid::Uuid;

/// Paginator orchestrates the layout process
pub struct Paginator<'a> {
    config: &'a LayoutConfig,
    metrics: &'a dyn TextMetrics,
    current_page: PageBuilder,
    completed_pages: Vec<PageRender>,
    page_counter: usize,
}

/// Helper for building a page
struct PageBuilder {
    frames: Vec<TextFrame>,
    current_y: f32,
    max_y: f32,
}

impl PageBuilder {
    fn new(max_y: f32) -> Self {
        Self {
            frames: Vec::new(),
            current_y: 0.0,
            max_y,
        }
    }

    fn available_height(&self) -> f32 {
        self.max_y - self.current_y
    }

    fn can_fit(&self, height: f32) -> bool {
        self.available_height() >= height
    }

    fn add_frame(&mut self, frame: TextFrame, height: f32) {
        self.frames.push(frame);
        self.current_y += height;
    }
}

impl<'a> Paginator<'a> {
    pub fn new(config: &'a LayoutConfig, metrics: &'a dyn TextMetrics) -> Self {
        let content_height = Self::calculate_content_height(config);

        Self {
            config,
            metrics,
            current_page: PageBuilder::new(content_height),
            completed_pages: Vec::new(),
            page_counter: 0,
        }
    }

    fn calculate_content_height(config: &LayoutConfig) -> f32 {
        config.page_size.height - config.margins.top - config.margins.bottom
    }

    fn calculate_content_width(config: &LayoutConfig, page_side: PageSide) -> f32 {
        let left_margin = match page_side {
            PageSide::Left => config.margins.outer,
            PageSide::Right => config.margins.inner,
        };
        let right_margin = match page_side {
            PageSide::Left => config.margins.inner,
            PageSide::Right => config.margins.outer,
        };

        config.page_size.width - left_margin - right_margin
    }

    pub fn paginate(&mut self, book: &Book) -> Result<RenderTree> {
        for (chapter_index, chapter) in book.chapters.iter().enumerate() {
            // Optionally start chapters on odd (right) pages
            if chapter_index > 0 && self.config.first_chapter_on_odd_page {
                if self.page_counter % 2 == 0 {
                    // Currently on left page, finish it and start a new right page
                    self.finalize_current_page();
                }
            }

            self.paginate_chapter(chapter)?;
        }

        // Finalize the last page
        if !self.current_page.frames.is_empty() {
            self.finalize_current_page();
        }

        Ok(RenderTree {
            book_id: book.id,
            pages: self.completed_pages.clone(),
            metadata: RenderMetadata {
                total_pages: self.completed_pages.len(),
                total_chapters: book.chapters.len(),
            },
        })
    }

    fn paginate_chapter(&mut self, chapter: &Chapter) -> Result<()> {
        // Add chapter title
        self.add_chapter_title(&chapter.title)?;

        // Add each block
        for block in &chapter.blocks {
            self.paginate_block(block)?;
        }

        Ok(())
    }

    fn add_chapter_title(&mut self, title: &str) -> Result<()> {
        let page_side = self.current_page_side();
        let content_width = Self::calculate_content_width(self.config, page_side);

        let breaker = LineBreaker::new(self.metrics, content_width);
        let lines = breaker.break_lines(title, &self.config.chapter_title_style, Uuid::new_v4());

        if lines.is_empty() {
            return Ok(());
        }

        let total_height = self.calculate_lines_height(&lines, &self.config.chapter_title_style);

        // Add some spacing after title
        let height_with_spacing = total_height + self.config.chapter_title_style.font_size;

        if !self.current_page.can_fit(height_with_spacing) {
            self.finalize_current_page();
        }

        let frame = TextFrame {
            id: Uuid::new_v4(),
            bounds: Rectangle {
                x: self.config.margins.inner,
                y: self.config.margins.top + self.current_page.current_y,
                width: content_width,
                height: total_height,
            },
            lines,
            frame_type: FrameType::ChapterTitle,
        };

        self.current_page.add_frame(frame, height_with_spacing);
        Ok(())
    }

    fn paginate_block(&mut self, block: &Block) -> Result<()> {
        let page_side = self.current_page_side();
        let content_width = Self::calculate_content_width(self.config, page_side);

        let breaker = LineBreaker::new(self.metrics, content_width);
        let lines = breaker.break_lines(&block.content, &self.config.body_style, block.id);

        if lines.is_empty() {
            return Ok(());
        }

        // Try to fit lines on current page, split if necessary
        self.add_lines_to_pages(lines, block.id)?;

        Ok(())
    }

    fn add_lines_to_pages(&mut self, mut lines: Vec<TextLine>, _source_id: Uuid) -> Result<()> {
        while !lines.is_empty() {
            let page_side = self.current_page_side();
            let content_width = Self::calculate_content_width(self.config, page_side);

            // Determine how many lines fit on current page
            let mut lines_that_fit = 0;
            let mut accumulated_height = 0.0;

            for (i, _line) in lines.iter().enumerate() {
                let line_height = self.metrics.line_height(
                    self.config.body_style.font_size,
                    self.config.body_style.line_height,
                );

                if self.current_page.can_fit(accumulated_height + line_height) {
                    accumulated_height += line_height;
                    lines_that_fit = i + 1;
                } else {
                    break;
                }
            }

            if lines_that_fit == 0 {
                // Not even one line fits, start a new page
                self.finalize_current_page();
                continue;
            }

            // Take the lines that fit
            let fitting_lines: Vec<TextLine> = lines.drain(..lines_that_fit).collect();

            let frame = TextFrame {
                id: Uuid::new_v4(),
                bounds: Rectangle {
                    x: self.config.margins.inner,
                    y: self.config.margins.top + self.current_page.current_y,
                    width: content_width,
                    height: accumulated_height,
                },
                lines: fitting_lines,
                frame_type: FrameType::BodyText,
            };

            self.current_page.add_frame(frame, accumulated_height);

            // If there are more lines, start a new page
            if !lines.is_empty() {
                self.finalize_current_page();
            }
        }

        Ok(())
    }

    fn calculate_lines_height(&self, lines: &[TextLine], style: &TextStyle) -> f32 {
        lines.len() as f32 * self.metrics.line_height(style.font_size, style.line_height)
    }

    fn current_page_side(&self) -> PageSide {
        if self.page_counter % 2 == 0 {
            PageSide::Left
        } else {
            PageSide::Right
        }
    }

    fn finalize_current_page(&mut self) {
        let page_side = self.current_page_side();

        let page = PageRender {
            page_number: self.page_counter + 1,
            side: page_side,
            frames: self.current_page.frames.clone(),
        };

        self.completed_pages.push(page);
        self.page_counter += 1;

        // Start new page
        let content_height = Self::calculate_content_height(self.config);
        self.current_page = PageBuilder::new(content_height);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::layout::metrics::SimpleTextMetrics;
    use crate::Book;

    #[test]
    fn test_paginate_empty_book() {
        let book = Book::new("Empty".into(), "Author".into());
        let config = LayoutConfig::default();
        let metrics = SimpleTextMetrics::default();

        let mut paginator = Paginator::new(&config, &metrics);
        let result = paginator.paginate(&book);

        assert!(result.is_ok());
        let tree = result.unwrap();
        assert_eq!(tree.pages.len(), 0);
    }

    #[test]
    fn test_paginate_simple_book() {
        let mut book = Book::new("Test".into(), "Author".into());
        book.add_chapter("Chapter 1".into(), "Short content.".into());

        let config = LayoutConfig::default();
        let metrics = SimpleTextMetrics::default();

        let mut paginator = Paginator::new(&config, &metrics);
        let result = paginator.paginate(&book);

        assert!(result.is_ok());
        let tree = result.unwrap();
        assert!(tree.pages.len() > 0);
        assert_eq!(tree.metadata.total_chapters, 1);
    }

    #[test]
    fn test_paginate_creates_multiple_pages() {
        let mut book = Book::new("Long".into(), "Author".into());
        let long_content = "Lorem ipsum dolor sit amet. ".repeat(100);
        book.add_chapter("Ch1".into(), long_content);

        let config = LayoutConfig::default();
        let metrics = SimpleTextMetrics::default();

        let mut paginator = Paginator::new(&config, &metrics);
        let result = paginator.paginate(&book);

        assert!(result.is_ok());
        let tree = result.unwrap();
        assert!(
            tree.pages.len() > 1,
            "Expected multiple pages for long content"
        );
    }

    #[test]
    fn test_page_sides_alternate() {
        let mut book = Book::new("Test".into(), "Author".into());
        let content = "Content. ".repeat(200);
        book.add_chapter("Ch1".into(), content);

        let config = LayoutConfig::default();
        let metrics = SimpleTextMetrics::default();

        let mut paginator = Paginator::new(&config, &metrics);
        let tree = paginator.paginate(&book).unwrap();

        if tree.pages.len() >= 2 {
            assert_eq!(tree.pages[0].side, PageSide::Left);
            assert_eq!(tree.pages[1].side, PageSide::Right);
        }
    }
}
