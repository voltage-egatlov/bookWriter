#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use bookwriter_core::{Book, BookService};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

struct AppState {
    books: Mutex<HashMap<Uuid, Book>>,
}

impl BookService for AppState {
    fn create_book(&mut self, title: String, author: String) -> anyhow::Result<Book> {
        let book = Book::new(title, author);
        let id = book.id;
        self.books.lock().unwrap().insert(id, book.clone());
        Ok(book)
    }

    fn get_book(&self, id: &Uuid) -> anyhow::Result<Option<Book>> {
        Ok(self.books.lock().unwrap().get(id).cloned())
    }

    fn list_books(&self) -> anyhow::Result<Vec<Book>> {
        Ok(self.books.lock().unwrap().values().cloned().collect())
    }

    fn update_book(&mut self, book: Book) -> anyhow::Result<()> {
        self.books.lock().unwrap().insert(book.id, book);
        Ok(())
    }

    fn delete_book(&mut self, id: &Uuid) -> anyhow::Result<()> {
        self.books.lock().unwrap().remove(id);
        Ok(())
    }
}

#[tauri::command]
fn create_book(title: String, author: String, state: State<AppState>) -> Result<Book, String> {
    let book = Book::new(title, author);
    let id = book.id;
    state.books.lock().unwrap().insert(id, book.clone());
    Ok(book)
}

#[tauri::command]
fn list_books(state: State<AppState>) -> Result<Vec<Book>, String> {
    Ok(state.books.lock().unwrap().values().cloned().collect())
}

#[tauri::command]
fn get_book(id: String, state: State<AppState>) -> Result<Option<Book>, String> {
    let uuid = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    Ok(state.books.lock().unwrap().get(&uuid).cloned())
}

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            books: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![create_book, list_books, get_book])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
