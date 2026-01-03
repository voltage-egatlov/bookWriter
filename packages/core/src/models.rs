use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Book {
    pub id: Uuid,
    pub title: String,
    pub author: String,
    pub dedication: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub chapters: Vec<Chapter>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Chapter {
    pub id: Uuid,
    pub title: String,
    pub content: String,
    pub order: usize,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Book {
    pub fn new(title: String, author: String) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            title,
            author,
            dedication: None,
            created_at: now,
            updated_at: now,
            chapters: Vec::new(),
        }
    }

    pub fn add_chapter(&mut self, title: String, content: String) {
        let now = Utc::now();
        let order = self.chapters.len();
        let chapter = Chapter {
            id: generate_chapter_id(&self.id, order, &title),
            title,
            content,
            order,
            created_at: now,
            updated_at: now,
        };
        self.chapters.push(chapter);
        self.updated_at = now;
    }
}

/// Generate deterministic chapter ID from book ID, order, and title
pub fn generate_chapter_id(book_id: &Uuid, order: usize, title: &str) -> Uuid {
    let name = format!("{}-{}", order, title);
    Uuid::new_v5(book_id, name.as_bytes())
}
