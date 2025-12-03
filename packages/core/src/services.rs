use crate::models::Book;
use anyhow::Result;

pub trait BookService {
    fn create_book(&mut self, title: String, author: String) -> Result<Book>;
    fn get_book(&self, id: &uuid::Uuid) -> Result<Option<Book>>;
    fn list_books(&self) -> Result<Vec<Book>>;
    fn update_book(&mut self, book: Book) -> Result<()>;
    fn delete_book(&mut self, id: &uuid::Uuid) -> Result<()>;
}
