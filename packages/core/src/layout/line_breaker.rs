use super::metrics::TextMetrics;
use super::types::{TextFragment, TextLine, TextStyle};
use uuid::Uuid;

/// Line breaker using greedy algorithm
pub struct LineBreaker<'a> {
    metrics: &'a dyn TextMetrics,
    max_width: f32,
}

impl<'a> LineBreaker<'a> {
    /// Create a new line breaker
    pub fn new(metrics: &'a dyn TextMetrics, max_width: f32) -> Self {
        Self { metrics, max_width }
    }

    /// Break text into lines that fit within max_width
    ///
    /// Uses a greedy algorithm: add words to current line until one doesn't fit,
    /// then start a new line.
    pub fn break_lines(&self, text: &str, style: &TextStyle, source_id: Uuid) -> Vec<TextLine> {
        if text.is_empty() {
            return vec![];
        }

        let words = self.split_into_words(text);
        if words.is_empty() {
            return vec![];
        }

        let mut lines = Vec::new();
        let mut current_line_words = Vec::new();
        let mut current_line_width = 0.0;

        let space_width = self.metrics.measure_char(' ', style.font_size);

        for word in words {
            let word_width = self.metrics.measure_text(&word, style.font_size);

            // Calculate width if we add this word (including space before it)
            let width_with_word = if current_line_words.is_empty() {
                word_width
            } else {
                current_line_width + space_width + word_width
            };

            if width_with_word <= self.max_width {
                // Word fits on current line
                current_line_words.push(word);
                current_line_width = width_with_word;
            } else {
                // Word doesn't fit, finalize current line and start new one
                if !current_line_words.is_empty() {
                    lines.push(self.build_line(&current_line_words, style, source_id, lines.len()));
                }

                // Start new line with this word
                current_line_words = vec![word];
                current_line_width = word_width;
            }
        }

        // Add final line if there are remaining words
        if !current_line_words.is_empty() {
            lines.push(self.build_line(&current_line_words, style, source_id, lines.len()));
        }

        lines
    }

    /// Split text into words, preserving whitespace handling
    fn split_into_words(&self, text: &str) -> Vec<String> {
        text.split_whitespace().map(|s| s.to_string()).collect()
    }

    /// Build a TextLine from a collection of words
    fn build_line(
        &self,
        words: &[String],
        style: &TextStyle,
        source_id: Uuid,
        line_index: usize,
    ) -> TextLine {
        let line_height = self.metrics.line_height(style.font_size, style.line_height);
        let y_offset = line_index as f32 * line_height;

        // Join words with spaces and create a single fragment
        let text = words.join(" ");
        let fragment = TextFragment {
            text,
            x_offset: 0.0,
            style: *style,
            source_block_id: source_id,
        };

        TextLine {
            y_offset,
            fragments: vec![fragment],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::layout::metrics::SimpleTextMetrics;
    use crate::layout::types::Alignment;

    #[test]
    fn test_empty_text_returns_no_lines() {
        let metrics = SimpleTextMetrics::default();
        let breaker = LineBreaker::new(&metrics, 100.0);
        let style = TextStyle::default();
        let id = Uuid::new_v4();

        let lines = breaker.break_lines("", &style, id);
        assert_eq!(lines.len(), 0);
    }

    #[test]
    fn test_single_word_fits_on_one_line() {
        let metrics = SimpleTextMetrics::default();
        let breaker = LineBreaker::new(&metrics, 100.0);
        let style = TextStyle::default();
        let id = Uuid::new_v4();

        let lines = breaker.break_lines("Hello", &style, id);
        assert_eq!(lines.len(), 1);
        assert_eq!(lines[0].fragments.len(), 1);
        assert_eq!(lines[0].fragments[0].text, "Hello");
    }

    #[test]
    fn test_multiple_words_same_line() {
        let metrics = SimpleTextMetrics::default();
        let breaker = LineBreaker::new(&metrics, 1000.0); // Wide line
        let style = TextStyle::default();
        let id = Uuid::new_v4();

        let lines = breaker.break_lines("Hello world test", &style, id);
        assert_eq!(lines.len(), 1);
        assert_eq!(lines[0].fragments[0].text, "Hello world test");
    }

    #[test]
    fn test_words_wrap_to_multiple_lines() {
        let metrics = SimpleTextMetrics::default();
        let breaker = LineBreaker::new(&metrics, 50.0); // Narrow line
        let style = TextStyle::default();
        let id = Uuid::new_v4();

        let lines = breaker.break_lines("Hello world this is a test", &style, id);
        assert!(lines.len() > 1, "Expected multiple lines");
    }

    #[test]
    fn test_very_long_word() {
        let metrics = SimpleTextMetrics::default();
        let breaker = LineBreaker::new(&metrics, 50.0);
        let style = TextStyle::default();
        let id = Uuid::new_v4();

        // Word longer than max_width should still appear on its own line
        let lines = breaker.break_lines("Supercalifragilisticexpialidocious", &style, id);
        assert_eq!(lines.len(), 1);
    }

    #[test]
    fn test_multiple_spaces_collapsed() {
        let metrics = SimpleTextMetrics::default();
        let breaker = LineBreaker::new(&metrics, 1000.0);
        let style = TextStyle::default();
        let id = Uuid::new_v4();

        let lines = breaker.break_lines("Hello    world", &style, id);
        assert_eq!(lines.len(), 1);
        assert_eq!(lines[0].fragments[0].text, "Hello world");
    }

    #[test]
    fn test_y_offsets_calculated_correctly() {
        let metrics = SimpleTextMetrics::default();
        let breaker = LineBreaker::new(&metrics, 50.0);
        let style = TextStyle {
            font_size: 12.0,
            line_height: 1.5,
            alignment: Alignment::Left,
        };
        let id = Uuid::new_v4();

        let lines = breaker.break_lines("word1 word2 word3 word4", &style, id);

        let expected_line_height = 12.0 * 1.5; // 18.0
        for (i, line) in lines.iter().enumerate() {
            assert_eq!(line.y_offset, i as f32 * expected_line_height);
        }
    }
}
