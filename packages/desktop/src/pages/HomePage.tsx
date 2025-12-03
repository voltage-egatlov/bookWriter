import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/tauri'

interface Book {
  id: string
  title: string
  author: string
}

function HomePage() {
  const navigate = useNavigate()
  const [books, setBooks] = useState<Book[]>([])

  useEffect(() => {
    loadBooks()
  }, [])

  const loadBooks = async () => {
    try {
      const result = await invoke<Book[]>('list_books')
      setBooks(result)
    } catch (error) {
      console.error('Failed to load books:', error)
    }
  }

  const createNewBook = async () => {
    try {
      const book = await invoke<Book>('create_book', {
        title: 'Untitled Book',
        author: 'Anonymous',
      })
      navigate(`/editor/${book.id}`)
    } catch (error) {
      console.error('Failed to create book:', error)
    }
  }

  return (
    <div className="container">
      <h1>Book Writer</h1>
      <p>Welcome to your desktop book-writing platform</p>
      <button onClick={createNewBook}>Create New Book</button>
      <div className="books-list">
        {books.map((book) => (
          <div key={book.id} onClick={() => navigate(`/editor/${book.id}`)}>
            <h3>{book.title}</h3>
            <p>by {book.author}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default HomePage
