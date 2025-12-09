use uuid::Uuid;

/// Parser state machine states
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) enum ParserState {
    ReadingMetadata,
    ReadingChapterHeader,
    ReadingBlock,
}

/// Intermediate structure for book metadata during parsing
#[derive(Debug, Default)]
pub(crate) struct BkMetadata {
    pub title: Option<String>,
    pub author: Option<String>,
    pub id: Option<Uuid>,
    pub dedication: Option<String>,
}

/// Intermediate structure for chapters during parsing
#[derive(Debug)]
pub(crate) struct BkChapter {
    pub title: String,
    pub order: usize,
    pub blocks: Vec<String>, // Raw content strings
}

impl BkChapter {
    pub fn new(title: String, order: usize) -> Self {
        Self {
            title,
            order,
            blocks: Vec::new(),
        }
    }
}
