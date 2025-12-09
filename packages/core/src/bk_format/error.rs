use thiserror::Error;

/// Errors that can occur while parsing .bk files
#[derive(Error, Debug)]
pub enum BkParseError {
    #[error("IO error reading file: {0}")]
    Io(#[from] std::io::Error),

    #[error("Missing required metadata field: {field}")]
    MissingMetadata { field: String },

    #[error("Invalid UUID format in @id field: {0}")]
    InvalidUuid(#[from] uuid::Error),

    #[error("Malformed metadata line at line {line}: {reason}")]
    MalformedMetadata { line: usize, reason: String },

    #[error("Chapter without title at line {line}")]
    MissingChapterTitle { line: usize },

    #[error("Page block defined before any chapter at line {line}")]
    BlockBeforeChapter { line: usize },

    #[error("Empty file or no content found")]
    EmptyFile,

    #[error("Book has no chapters")]
    NoChapters,

    #[error("Duplicate metadata field: {field} at line {line}")]
    DuplicateMetadata { field: String, line: usize },
}

impl BkParseError {
    /// Provides helpful guidance for fixing the error
    pub fn help_message(&self) -> String {
        match self {
            Self::MissingMetadata { field } => {
                format!(
                    "Add the required '@{}:' field at the top of your .bk file",
                    field
                )
            }
            Self::InvalidUuid(_) => {
                "The @id field must be a valid UUID (e.g., 550e8400-e29b-41d4-a009-426655440000). You can omit @id to generate one automatically.".to_string()
            }
            Self::BlockBeforeChapter { .. } => {
                "Move @page: blocks inside a #chapter: section".to_string()
            }
            Self::NoChapters => "Add at least one chapter using '#chapter: Chapter Title'".to_string(),
            Self::MalformedMetadata { reason, .. } => {
                format!("Check the metadata format: {}", reason)
            }
            Self::MissingChapterTitle { .. } => {
                "Chapter declaration must include a title: '#chapter: Your Title'".to_string()
            }
            Self::DuplicateMetadata { field, .. } => {
                format!("Remove duplicate '@{}:' field - it should only appear once", field)
            }
            _ => String::new(),
        }
    }
}
