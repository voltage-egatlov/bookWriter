pub mod bk_format;
pub mod models;

#[cfg(feature = "wasm")]
pub mod wasm;

pub use models::*;

#[cfg(test)]
mod roundtrip_tests {
    use crate::bk_format::BkParser;
    use chrono::Utc;

    #[test]
    fn test_roundtrip_with_newlines() {
        let original_content = "Line 1\nLine 2\nLine 3\n\nParagraph 2 line 1\nParagraph 2 line 2";

        let file_content = format!(
            "@id: 12345678-1234-1234-1234-123456789012\n             @title: Test Book\n             @author: Test Author\n             \n             #chapter: Chapter One\n             {}\n\n",
            original_content
        );

        let book =
            BkParser::parse_string(&file_content, Utc::now(), Utc::now()).expect("Failed to parse");

        let parsed_content = &book.chapters[0].content;

        assert_eq!(
            parsed_content, original_content,
            "Content should round-trip correctly"
        );
    }
}
