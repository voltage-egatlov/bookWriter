/// Trait for measuring text dimensions
pub trait TextMetrics {
    /// Measure the width of a text string at a given font size
    fn measure_text(&self, text: &str, font_size: f32) -> f32;

    /// Measure the width of a single character at a given font size
    fn measure_char(&self, c: char, font_size: f32) -> f32;

    /// Calculate line height given font size and multiplier
    fn line_height(&self, font_size: f32, multiplier: f32) -> f32;
}

/// Simple character-count based text metrics
///
/// Uses a fixed ratio of character width to font size.
/// Default ratio is 0.6 (60% of font size per character).
/// This is a rough approximation suitable for initial implementation.
#[derive(Debug, Clone)]
pub struct SimpleTextMetrics {
    pub avg_char_width_ratio: f32,
}

impl Default for SimpleTextMetrics {
    fn default() -> Self {
        Self {
            avg_char_width_ratio: 0.6,
        }
    }
}

impl TextMetrics for SimpleTextMetrics {
    fn measure_text(&self, text: &str, font_size: f32) -> f32 {
        text.chars().count() as f32 * font_size * self.avg_char_width_ratio
    }

    fn measure_char(&self, _c: char, font_size: f32) -> f32 {
        font_size * self.avg_char_width_ratio
    }

    fn line_height(&self, font_size: f32, multiplier: f32) -> f32 {
        font_size * multiplier
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_metrics_measures_text() {
        let metrics = SimpleTextMetrics::default();
        let width = metrics.measure_text("Hello", 12.0);
        assert_eq!(width, 5.0 * 12.0 * 0.6); // 5 chars * size * ratio
    }

    #[test]
    fn test_simple_metrics_measures_char() {
        let metrics = SimpleTextMetrics::default();
        let width = metrics.measure_char('A', 12.0);
        assert_eq!(width, 12.0 * 0.6);
    }

    #[test]
    fn test_simple_metrics_line_height() {
        let metrics = SimpleTextMetrics::default();
        let height = metrics.line_height(12.0, 1.5);
        assert_eq!(height, 18.0);
    }
}
