use wasm_bindgen::prelude::*;

use crate::bk_format::BkParser;
use chrono::{DateTime, Utc};

/// Parse a .bk file from string and return as JavaScript object
///
/// # Arguments
/// * `input` - The .bk file content as a string
/// * `created_at` - Optional creation timestamp (ISO 8601/RFC 3339 format)
/// * `updated_at` - Optional modification timestamp (ISO 8601/RFC 3339 format)
///
/// # Returns
/// A JavaScript object representing the parsed Book with all fields:
/// - id (UUID)
/// - title, author, dedication
/// - created_at, updated_at
/// - chapters (array of Chapter objects with blocks)
///
/// # Errors
/// Throws a JavaScript Error if parsing fails. The error message includes:
/// - Description of what went wrong
/// - Helpful guidance on how to fix it
///
/// # Examples
/// ```javascript
/// // Simple usage with auto timestamps
/// const book = parse_bk(fileContent);
///
/// // With custom timestamps
/// const book = parse_bk(
///     fileContent,
///     "2025-01-15T10:30:00Z",
///     "2025-12-09T14:30:00Z"
/// );
///
/// // Error handling
/// try {
///     const book = parse_bk(fileContent);
///     console.log(book.title);
/// } catch (error) {
///     console.error("Parse failed:", error);
/// }
/// ```
#[wasm_bindgen]
pub fn parse_bk(
    input: &str,
    created_at: Option<String>,
    updated_at: Option<String>,
) -> Result<JsValue, JsValue> {
    // Parse created_at timestamp or default to now
    let created = created_at
        .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(Utc::now);

    // Parse updated_at timestamp or default to now
    let updated = updated_at
        .and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(Utc::now);

    // Parse the .bk content
    let book = BkParser::parse_string(input, created, updated).map_err(|e| {
        // Format error with help message for JavaScript
        let error_msg = format!("{}\n\nHelp: {}", e, e.help_message());
        JsValue::from_str(&error_msg)
    })?;

    // Convert Book to JsValue
    serde_wasm_bindgen::to_value(&book)
        .map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}
