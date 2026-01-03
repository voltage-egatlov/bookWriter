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
The morning sun cracked over the horizon...

Another day began...
    "#;

    let book = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();
    assert_eq!(book.title, "The Way of Iron");
    assert_eq!(book.author, "Tej");
    assert_eq!(book.dedication, Some("To my family...".to_string()));
    assert_eq!(book.id.to_string(), "550e8400-e29b-41d4-a009-426655440000");
    assert_eq!(book.chapters.len(), 1);
    assert_eq!(book.chapters[0].title, "Chapter One");
    assert!(book.chapters[0]
        .content
        .contains("The morning sun cracked over the horizon..."));
    assert!(book.chapters[0].content.contains("Another day began..."));
}

#[test]
fn test_parse_minimal_book() {
    let content = r#"
@title: My Book
@author: John Doe

#chapter: Intro
Once upon a time...
    "#;

    let book = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();
    assert_eq!(book.title, "My Book");
    assert_eq!(book.author, "John Doe");
    assert_eq!(book.dedication, None);
    assert_eq!(book.chapters.len(), 1);
    assert_eq!(book.chapters[0].content, "Once upon a time...");
}

#[test]
fn test_parse_book_without_id() {
    let content = r#"
@title: Generated ID Book
@author: Author

#chapter: Chapter 1
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
First content

#chapter: Second
Second content

#chapter: Third
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
    assert_eq!(book.chapters[0].content, "First content");
    assert_eq!(book.chapters[1].content, "Second content");
    assert_eq!(book.chapters[2].content, "Third content");
}

#[test]
fn test_parse_multiline_content() {
    let content = r#"
@title: Multiline Book
@author: Author

#chapter: Chapter One
Line 1
Line 2
Line 3
    "#;

    let book = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();
    assert_eq!(book.chapters[0].content, "Line 1\nLine 2\nLine 3");
}

#[test]
fn test_error_missing_title() {
    let content = r#"
@author: Author

#chapter: Chapter
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
fn test_error_content_before_chapter() {
    let content = r#"
@title: Book
@author: Author

Content before any chapter

#chapter: Chapter One
More content
    "#;

    // Content before any chapter is just ignored, so this should parse successfully
    let result = BkParser::parse_string(content, Utc::now(), Utc::now());
    assert!(result.is_ok());
    let book = result.unwrap();
    // The content before the chapter should not be in any chapter
    assert_eq!(book.chapters[0].content, "More content");
}

#[test]
fn test_error_chapter_without_title() {
    let content = r#"
@title: Book
@author: Author

#chapter:
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
Content
    "#;

    let book1 = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();
    let book2 = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();

    // Same content should produce same chapter IDs
    assert_eq!(book1.chapters[0].id, book2.chapters[0].id);
}

#[test]
fn test_empty_content_trimmed() {
    let content = r#"
@title: Book
@author: Author

#chapter: Chapter


Content
    "#;

    let book = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();
    // Leading/trailing whitespace should be trimmed
    assert_eq!(book.chapters[0].content, "Content");
}

#[test]
fn test_whitespace_handling() {
    let content = "  @title:   Whitespace Book  \n  @author:  Author  \n\n#chapter:  My Chapter  \n  Content with spaces  ";

    let book = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();
    assert_eq!(book.title, "Whitespace Book");
    assert_eq!(book.author, "Author");
    assert_eq!(book.chapters[0].title, "My Chapter");
    assert_eq!(book.chapters[0].content, "Content with spaces");
}

#[test]
fn test_unicode_content() {
    let content = r#"
@title: Unicode Book 📚
@author: 作者

#chapter: Chapitre Un
Hello 世界! Привет мир! 🌍
    "#;

    let book = BkParser::parse_string(content, Utc::now(), Utc::now()).unwrap();
    assert_eq!(book.title, "Unicode Book 📚");
    assert_eq!(book.author, "作者");
    assert_eq!(book.chapters[0].title, "Chapitre Un");
    assert_eq!(book.chapters[0].content, "Hello 世界! Привет мир! 🌍");
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
