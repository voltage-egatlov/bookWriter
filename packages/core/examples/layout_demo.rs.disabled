use bookwriter_core::layout::{layout_book, LayoutConfig, Margins, PageSize};
use bookwriter_core::Book;

fn main() -> anyhow::Result<()> {
    // Create a sample book
    let mut book = Book::new("The Great Adventure".into(), "Jane Smith".into());

    // Add first chapter
    book.add_chapter(
        "The Beginning".into(),
        "It was a dark and stormy night when our hero first set out on the journey. \
         The road ahead was uncertain, but courage filled their heart. \
         Step by step, they moved forward into the unknown."
            .into(),
    );

    // Add second chapter with longer content
    book.add_chapter(
        "The Journey Continues".into(),
        "Miles passed under weary feet. The landscape changed from rolling hills to \
         towering mountains. Each day brought new challenges, but also new discoveries. \
         The hero learned that the journey itself was the reward, not just the destination. \
         Through valleys and over peaks, the adventure continued. \
         Stars guided the way at night, and the sun warmed the path by day."
            .into(),
    );

    // Add third chapter
    book.add_chapter(
        "The Return".into(),
        "Finally, after what seemed like an eternity, familiar sights appeared on the horizon. \
         The hero had changed, grown wiser and stronger. The journey had transformed them. \
         Home was just ahead, but they knew they would never be the same again."
            .into(),
    );

    // Create layout configuration
    let mut config = LayoutConfig::default();
    config.page_size = PageSize::US_LETTER;
    config.margins = Margins::uniform(72.0); // 1 inch margins

    // Layout the book
    println!("Laying out book: '{}'", book.title);
    println!("by {}", book.author);
    println!();

    let render_tree = layout_book(&book, &config)?;

    // Display results
    println!("Layout complete!");
    println!("Total pages: {}", render_tree.metadata.total_pages);
    println!("Total chapters: {}", render_tree.metadata.total_chapters);
    println!();

    // Show details for each page
    for page in &render_tree.pages {
        println!("Page {} ({:?} side):", page.page_number, page.side);
        println!("  Frames: {}", page.frames.len());

        for (i, frame) in page.frames.iter().enumerate() {
            println!("    Frame {}: {:?}", i + 1, frame.frame_type);
            println!(
                "      Position: ({:.1}, {:.1})",
                frame.bounds.x, frame.bounds.y
            );
            println!(
                "      Size: {:.1} x {:.1}",
                frame.bounds.width, frame.bounds.height
            );
            println!("      Lines: {}", frame.lines.len());

            // Show first line of each frame
            if let Some(first_line) = frame.lines.first() {
                if let Some(first_fragment) = first_line.fragments.first() {
                    let preview = if first_fragment.text.len() > 50 {
                        format!("{}...", &first_fragment.text[..50])
                    } else {
                        first_fragment.text.clone()
                    };
                    println!("      Preview: \"{}\"", preview);
                }
            }
        }
        println!();
    }

    // Show serialization capability
    println!("Serializing to JSON...");
    let json = serde_json::to_string_pretty(&render_tree)?;
    println!("JSON size: {} bytes", json.len());
    println!();
    println!("First 500 characters of JSON:");
    println!("{}", &json[..json.len().min(500)]);

    Ok(())
}
