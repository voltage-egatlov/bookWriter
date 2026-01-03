use bookwriter_core::bk_format::BkParser;
use std::path::Path;

fn main() {
    // Example 1: Parse from string
    println!("=== Example 1: Parse from String ===\n");

    let content = r#"
@title: My First Book
@author: John Doe
@dedication: To my readers

#chapter: Introduction
@page:
Welcome to this book. This is the first page of the introduction.

@page:
And this is the second page, with more content.

#chapter: Chapter Two
@page:
Now we're in chapter two. The story continues...
    "#;

    match BkParser::parse_string(content, chrono::Utc::now(), chrono::Utc::now()) {
        Ok(book) => {
            println!("Successfully parsed book!");
            println!("Title: {}", book.title);
            println!("Author: {}", book.author);
            println!("Dedication: {:?}", book.dedication);
            println!("Number of chapters: {}", book.chapters.len());

            for chapter in &book.chapters {
                println!("\nChapter: {}", chapter.title);
                println!("  Blocks: {}", chapter.blocks.len());
                for (i, block) in chapter.blocks.iter().enumerate() {
                    println!("  Block {}: {} chars", i + 1, block.content.len());
                }
            }
        }
        Err(e) => {
            eprintln!("Error parsing book: {}", e);
            eprintln!("Help: {}", e.help_message());
        }
    }

    // Example 2: Parse from file
    println!("\n\n=== Example 2: Parse from File ===\n");

    let file_path = Path::new("example.bk");
    if file_path.exists() {
        match BkParser::parse_file(file_path) {
            Ok(book) => {
                println!("Successfully parsed book from file!");
                println!("Title: {}", book.title);
                println!("Author: {}", book.author);
                println!("Chapters: {}", book.chapters.len());

                // Display first chapter's blocks
                if let Some(first_chapter) = book.chapters.first() {
                    println!("\nFirst chapter blocks:");
                    for (i, block) in first_chapter.blocks.iter().enumerate() {
                        println!("Block {}: {}", i + 1, block.content);
                    }
                }
            }
            Err(e) => {
                eprintln!("Error parsing file: {}", e);
                eprintln!("Help: {}", e.help_message());
            }
        }
    } else {
        println!("File 'example.bk' not found in current directory");
    }

    // Example 3: Error handling
    println!("\n\n=== Example 3: Error Handling ===\n");

    let invalid_content = r#"
@title: Invalid Book

#chapter: Chapter One
@page:
Content here
    "#;

    match BkParser::parse_string(invalid_content, chrono::Utc::now(), chrono::Utc::now()) {
        Ok(_) => println!("Unexpectedly succeeded"),
        Err(e) => {
            println!("Expected error occurred: {}", e);
            println!("Help message: {}", e.help_message());
        }
    }
}
