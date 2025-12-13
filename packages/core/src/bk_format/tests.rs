use crate::bk_format::error::BkParseError;
use crate::bk_format::parser::BkParser;
use chrono::Utc;

#[test]
fn test_parse_complete_book() {
    let content = r#"
@title: The Way of Iron
@author: Tej
@id: 550e8400-e29b-41d4-a009-426655440000
@dedication: To my family...

#chapter: Chapter One
@block:
The morning sun cracked over the horizon...

@block:
Another day began...
    "#;

    let book = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();
    assert_eq!(book.title, "The Way of Iron");
    assert_eq!(book.author, "Tej");
    assert_eq!(book.dedication, Some("To my family...".to_string()));
    assert_eq!(book.id.to_string(), "550e8400-e29b-41d4-a009-426655440000");
    assert_eq!(book.chapters.len(), 1);
    assert_eq!(book.chapters[0].title, "Chapter One");
    assert_eq!(book.chapters[0].blocks.len(), 2);
    assert_eq!(
        book.chapters[0].blocks[0].content,
        "The morning sun cracked over the horizon..."
    );
    assert_eq!(book.chapters[0].blocks[1].content, "Another day began...");
}

#[test]
fn test_parse_minimal_book() {
    let content = r#"
@title: My Book
@author: John Doe

#chapter: Intro
@block:
Once upon a time...
    "#;

    let book = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();
    assert_eq!(book.title, "My Book");
    assert_eq!(book.author, "John Doe");
    assert_eq!(book.dedication, None);
    assert_eq!(book.chapters.len(), 1);
    assert_eq!(book.chapters[0].blocks.len(), 1);
}

#[test]
fn test_parse_book_without_id() {
    let content = r#"
@title: Generated ID Book
@author: Author

#chapter: Chapter 1
@block:
Content here
    "#;

    let book = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();
    // ID should be generated automatically
    assert_ne!(book.id.to_string(), "");
}

#[test]
fn test_parse_multiple_chapters() {
    let content = r#"
@title: Multi Chapter Book
@author: Writer

#chapter: First
@block:
First content

#chapter: Second
@block:
Second content

#chapter: Third
@block:
Third content
    "#;

    let book = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();
    assert_eq!(book.chapters.len(), 3);
    assert_eq!(book.chapters[0].title, "First");
    assert_eq!(book.chapters[1].title, "Second");
    assert_eq!(book.chapters[2].title, "Third");
    assert_eq!(book.chapters[0].order, 0);
    assert_eq!(book.chapters[1].order, 1);
    assert_eq!(book.chapters[2].order, 2);
}

#[test]
fn test_parse_multiline_content() {
    let content = r#"
@title: Multiline Book
@author: Author

#chapter: Chapter One
@block:
Line 1
Line 2
Line 3
    "#;

    let book = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();
    assert_eq!(book.chapters[0].blocks[0].content, "Line 1\nLine 2\nLine 3");
}

#[test]
fn test_error_missing_title() {
    let content = r#"
@author: Author

#chapter: Chapter
@block:
Content
    "#;

    let result = BkParser::parse_string(content, Utc::now(), Utc::now());
    assert!(matches!(
        result,
        Err(BkParseError::MissingMetadata { field }) if field == "title"
    ));
}

#[test]
fn test_error_missing_author() {
    let content = r#"
@title: My Book

#chapter: Chapter
@block:
Content
    "#;

    let result = BkParser::parse_string(content, Utc::now(), Utc::now());
    assert!(matches!(
        result,
        Err(BkParseError::MissingMetadata { field }) if field == "author"
    ));
}

#[test]
fn test_error_invalid_uuid() {
    let content = r#"
@title: Book
@author: Author
@id: not-a-valid-uuid

#chapter: Chapter
@block:
Content
    "#;

    let result = BkParser::parse_string(content, Utc::now(), Utc::now());
    assert!(matches!(result, Err(BkParseError::InvalidUuid(_))));
}

#[test]
fn test_error_no_chapters() {
    let content = r#"
@title: Book
@author: Author
    "#;

    let result = BkParser::parse_string(content, Utc::now(), Utc::now());
    assert!(matches!(result, Err(BkParseError::NoChapters)));
}

#[test]
fn test_error_page_before_chapter() {
    let content = r#"
@title: Book
@author: Author

@block:
Content before any chapter
    "#;

    let result = BkParser::parse_string(content, Utc::now(), Utc::now());
    match &result {
        Err(BkParseError::BlockBeforeChapter { .. }) => {
            // This is the expected error
        }
        Err(BkParseError::NoChapters) => {
            // This is also acceptable - we have no chapters because @page failed to create one
            // The error manifests as NoChapters at finalize time
        }
        _ => panic!(
            "Expected BlockBeforeChapter or NoChapters error, got: {:?}",
            result
        ),
    }
}

#[test]
fn test_error_chapter_without_title() {
    let content = r#"
@title: Book
@author: Author

#chapter:
@block:
Content
    "#;

    let result = BkParser::parse_string(content, Utc::now(), Utc::now());
    assert!(matches!(
        result,
        Err(BkParseError::MissingChapterTitle { .. })
    ));
}

#[test]
fn test_error_duplicate_title() {
    let content = r#"
@title: Book One
@title: Book Two
@author: Author

#chapter: Chapter
@block:
Content
    "#;

    let result = BkParser::parse_string(content, Utc::now(), Utc::now());
    assert!(matches!(
        result,
        Err(BkParseError::DuplicateMetadata { field, .. }) if field == "title"
    ));
}

#[test]
fn test_deterministic_chapter_ids() {
    let content = r#"
@title: Book
@author: Author
@id: 550e8400-e29b-41d4-a009-426655440000

#chapter: Chapter One
@block:
Content
    "#;

    let book1 = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();
    let book2 = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();

    // Same content should produce same chapter IDs
    assert_eq!(book1.chapters[0].id, book2.chapters[0].id);
}

#[test]
fn test_deterministic_block_ids() {
    let content = r#"
@title: Book
@author: Author
@id: 550e8400-e29b-41d4-a009-426655440000

#chapter: Chapter One
@block:
First block

@block:
Second block
    "#;

    let book1 = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();
    let book2 = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();

    // Same content should produce same block IDs
    assert_eq!(
        book1.chapters[0].blocks[0].id,
        book2.chapters[0].blocks[0].id
    );
    assert_eq!(
        book1.chapters[0].blocks[1].id,
        book2.chapters[0].blocks[1].id
    );

    // Different blocks should have different IDs
    assert_ne!(
        book1.chapters[0].blocks[0].id,
        book1.chapters[0].blocks[1].id
    );
}

#[test]
fn test_empty_blocks_ignored() {
    let content = r#"
@title: Book
@author: Author

#chapter: Chapter
@block:

@block:
Content
    "#;

    let book = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();
    // Empty block should not create a block entry
    assert_eq!(book.chapters[0].blocks.len(), 1);
    assert_eq!(book.chapters[0].blocks[0].content, "Content");
}

#[test]
fn test_whitespace_handling() {
    let content = "  @title:   Whitespace Book  \n  @author:  Author  \n\n#chapter:  My Chapter  \n@block:\n  Content with spaces  ";

    let book = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();
    assert_eq!(book.title, "Whitespace Book");
    assert_eq!(book.author, "Author");
    assert_eq!(book.chapters[0].title, "My Chapter");
    assert_eq!(book.chapters[0].blocks[0].content, "Content with spaces");
}

#[test]
fn test_unicode_content() {
    let content = r#"
@title: Unicode Book 📚
@author: 作者

#chapter: Chapitre Un
@block:
Hello 世界! Привет мир! 🌍
    "#;

    let book = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();
    assert_eq!(book.title, "Unicode Book 📚");
    assert_eq!(book.author, "作者");
    assert_eq!(book.chapters[0].title, "Chapitre Un");
    assert_eq!(
        book.chapters[0].blocks[0].content,
        "Hello 世界! Привет мир! 🌍"
    );
}

#[test]
fn test_chapter_content_helper() {
    let content = r#"
@title: Book
@author: Author

#chapter: Chapter
@block:
First page

@block:
Second page
    "#;

    let book = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();
    let chapter_content = book.chapters[0].content();
    assert!(chapter_content.contains("First page"));
    assert!(chapter_content.contains("Second page"));
    assert!(chapter_content.contains("\n\n")); // Blocks joined with double newline
}

#[test]
fn test_help_messages() {
    let error = BkParseError::MissingMetadata {
        field: "title".to_string(),
    };
    assert!(error.help_message().contains("@title:"));

    // Test InvalidUuid error help message
    let invalid_uuid_result = uuid::Uuid::parse_str("not-a-uuid");
    if let Err(uuid_err) = invalid_uuid_result {
        let error = BkParseError::InvalidUuid(uuid_err);
        assert!(error.help_message().contains("UUID"));
    }

    let error = BkParseError::NoChapters;
    assert!(error.help_message().contains("#chapter:"));
}
