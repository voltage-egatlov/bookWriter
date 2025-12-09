use crate::bk_format::error::BkParseError;
use crate::bk_format::models::{BkChapter, BkMetadata, ParserState};
use crate::models::{generate_block_id, generate_chapter_id, Block, BlockType, Book, Chapter};
use chrono::{DateTime, Utc};
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;
use uuid::Uuid;

/// Parser for .bk files
pub struct BkParser {
    state: ParserState,
    line_number: usize,
    metadata: BkMetadata,
    chapters: Vec<BkChapter>,
    current_chapter: Option<BkChapter>,
    current_block: String,
}

impl BkParser {
    /// Create a new parser instance
    pub fn new() -> Self {
        Self {
            state: ParserState::ReadingMetadata,
            line_number: 0,
            metadata: BkMetadata::default(),
            chapters: Vec::new(),
            current_chapter: None,
            current_block: String::new(),
        }
    }

    /// Parse a .bk file from filesystem
    pub fn parse_file(path: &Path) -> Result<Book, BkParseError> {
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        let file_metadata = std::fs::metadata(path)?;

        let mut parser = Self::new();
        for line in reader.lines() {
            parser.parse_line(line?)?;
        }

        parser.finalize(file_metadata)
    }

    /// Parse a .bk file from string (useful for testing)
    pub fn parse_string(
        content: &str,
        created_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> Result<Book, BkParseError> {
        let mut parser = Self::new();
        for line in content.lines() {
            parser.parse_line(line.to_string())?;
        }

        parser.finalize_with_timestamps(created_at, updated_at)
    }

    /// Parse a single line
    fn parse_line(&mut self, line: String) -> Result<(), BkParseError> {
        self.line_number += 1;
        let trimmed = line.trim();

        // Skip empty lines
        if trimmed.is_empty() {
            return Ok(());
        }

        // Handle chapter headers
        if trimmed.starts_with("#chapter:") {
            self.parse_chapter_header(trimmed)?;
            return Ok(());
        }

        // Handle metadata and block markers (both start with @)
        if trimmed.starts_with('@') {
            if self.state == ParserState::ReadingMetadata
                || trimmed.starts_with("@title:")
                || trimmed.starts_with("@author:")
                || trimmed.starts_with("@id:")
                || trimmed.starts_with("@dedication:")
            {
                self.parse_metadata(trimmed)?;
            } else if trimmed.starts_with("@page:") {
                self.parse_block_marker(trimmed)?;
            } else {
                // Unknown @ directive, ignore or accumulate as content
                self.accumulate_content(line);
            }
            return Ok(());
        }

        // Regular content line
        self.accumulate_content(line);
        Ok(())
    }

    /// Parse metadata lines (@title:, @author:, etc.)
    fn parse_metadata(&mut self, line: &str) -> Result<(), BkParseError> {
        let parts: Vec<&str> = line.splitn(2, ':').collect();
        if parts.len() != 2 {
            return Err(BkParseError::MalformedMetadata {
                line: self.line_number,
                reason: "Expected format '@field: value'".to_string(),
            });
        }

        let field = parts[0].trim_start_matches('@').trim();
        let value = parts[1].trim().to_string();

        match field {
            "title" => {
                if self.metadata.title.is_some() {
                    return Err(BkParseError::DuplicateMetadata {
                        field: "title".to_string(),
                        line: self.line_number,
                    });
                }
                self.metadata.title = Some(value);
            }
            "author" => {
                if self.metadata.author.is_some() {
                    return Err(BkParseError::DuplicateMetadata {
                        field: "author".to_string(),
                        line: self.line_number,
                    });
                }
                self.metadata.author = Some(value);
            }
            "id" => {
                if self.metadata.id.is_some() {
                    return Err(BkParseError::DuplicateMetadata {
                        field: "id".to_string(),
                        line: self.line_number,
                    });
                }
                let uuid = Uuid::parse_str(&value)?;
                self.metadata.id = Some(uuid);
            }
            "dedication" => {
                if self.metadata.dedication.is_some() {
                    return Err(BkParseError::DuplicateMetadata {
                        field: "dedication".to_string(),
                        line: self.line_number,
                    });
                }
                self.metadata.dedication = Some(value);
            }
            _ => {
                // Unknown metadata field, ignore
            }
        }

        Ok(())
    }

    /// Parse chapter header (#chapter: Title)
    fn parse_chapter_header(&mut self, line: &str) -> Result<(), BkParseError> {
        // Finish current block and chapter if any
        self.finish_current_block();
        self.finish_current_chapter();

        let title = line
            .strip_prefix("#chapter:")
            .ok_or(BkParseError::MissingChapterTitle {
                line: self.line_number,
            })?
            .trim();

        if title.is_empty() {
            return Err(BkParseError::MissingChapterTitle {
                line: self.line_number,
            });
        }

        let order = self.chapters.len();
        self.current_chapter = Some(BkChapter::new(title.to_string(), order));
        self.state = ParserState::ReadingChapterHeader;

        Ok(())
    }

    /// Parse block marker (@page:)
    fn parse_block_marker(&mut self, _line: &str) -> Result<(), BkParseError> {
        if self.current_chapter.is_none() {
            return Err(BkParseError::BlockBeforeChapter {
                line: self.line_number,
            });
        }

        // Finish current block (if any)
        self.finish_current_block();

        self.state = ParserState::ReadingBlock;
        Ok(())
    }

    /// Accumulate content into current block
    fn accumulate_content(&mut self, line: String) {
        if !self.current_block.is_empty() {
            self.current_block.push('\n');
        }
        self.current_block.push_str(&line);
    }

    /// Finish the current block and add it to the current chapter
    fn finish_current_block(&mut self) {
        if !self.current_block.is_empty() {
            if let Some(chapter) = &mut self.current_chapter {
                chapter.blocks.push(self.current_block.trim().to_string());
                self.current_block.clear();
            }
        }
    }

    /// Finish the current chapter and add it to chapters list
    fn finish_current_chapter(&mut self) {
        if let Some(chapter) = self.current_chapter.take() {
            self.chapters.push(chapter);
        }
    }

    /// Finalize parsing and construct Book (with filesystem metadata)
    fn finalize(self, file_metadata: std::fs::Metadata) -> Result<Book, BkParseError> {
        let created_at = file_metadata
            .created()
            .ok()
            .and_then(|t| {
                DateTime::from_timestamp(
                    t.duration_since(std::time::UNIX_EPOCH).ok()?.as_secs() as i64,
                    0,
                )
            })
            .unwrap_or_else(Utc::now);

        let updated_at = file_metadata
            .modified()
            .ok()
            .and_then(|t| {
                DateTime::from_timestamp(
                    t.duration_since(std::time::UNIX_EPOCH).ok()?.as_secs() as i64,
                    0,
                )
            })
            .unwrap_or_else(Utc::now);

        self.finalize_with_timestamps(created_at, updated_at)
    }

    /// Finalize parsing with provided timestamps
    fn finalize_with_timestamps(
        mut self,
        created_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> Result<Book, BkParseError> {
        // Finish any pending block and chapter
        self.finish_current_block();
        self.finish_current_chapter();

        // Validate required metadata
        let title = self.metadata.title.ok_or(BkParseError::MissingMetadata {
            field: "title".to_string(),
        })?;

        let author = self.metadata.author.ok_or(BkParseError::MissingMetadata {
            field: "author".to_string(),
        })?;

        // Generate book ID if not provided
        let book_id = self.metadata.id.unwrap_or_else(Uuid::new_v4);

        // Validate we have chapters
        if self.chapters.is_empty() {
            return Err(BkParseError::NoChapters);
        }

        // Convert chapters to final format with deterministic IDs
        let chapters: Vec<Chapter> = self
            .chapters
            .into_iter()
            .map(|bk_chapter| {
                let chapter_id = generate_chapter_id(&book_id, bk_chapter.order, &bk_chapter.title);

                let blocks: Vec<Block> = bk_chapter
                    .blocks
                    .into_iter()
                    .enumerate()
                    .map(|(idx, content)| Block {
                        id: generate_block_id(&chapter_id, idx),
                        content,
                        order: idx,
                        block_type: BlockType::Page,
                    })
                    .collect();

                Chapter {
                    id: chapter_id,
                    title: bk_chapter.title,
                    blocks,
                    order: bk_chapter.order,
                    created_at,
                    updated_at,
                }
            })
            .collect();

        Ok(Book {
            id: book_id,
            title,
            author,
            dedication: self.metadata.dedication,
            created_at,
            updated_at,
            chapters,
        })
    }
}

impl Default for BkParser {
    fn default() -> Self {
        Self::new()
    }
}
