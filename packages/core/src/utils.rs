pub fn sanitize_filename(filename: &str) -> String {
    filename
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => c,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_filename() {
        assert_eq!(
            sanitize_filename("My Book: Chapter 1"),
            "My Book_ Chapter 1"
        );
        assert_eq!(
            sanitize_filename("Valid-Name_123.txt"),
            "Valid-Name_123.txt"
        );
    }
}
