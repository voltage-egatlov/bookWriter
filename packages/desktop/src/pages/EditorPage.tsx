import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/tauri'

interface Book {
  id: string
  title: string
  author: string
  chapters: Chapter[]
}

interface Chapter {
  id: string
  title: string
  content: string
  order: number
}

function EditorPage() {
  const { bookId } = useParams()
  const [book, setBook] = useState<Book | null>(null)
  const [content, setContent] = useState('')

  useEffect(() => {
    if (bookId) {
      loadBook(bookId)
    }
  }, [bookId])

  const loadBook = async (id: string) => {
    try {
      const result = await invoke<Book | null>('get_book', { id })
      if (result) {
        setBook(result)
        if (result.chapters.length > 0) {
          setContent(result.chapters[0].content)
        }
      }
    } catch (error) {
      console.error('Failed to load book:', error)
    }
  }

  return (
    <div className="editor-container">
      <header className="editor-header">
        <h2>{book ? book.title : 'New Book'}</h2>
      </header>
      <div className="editor-workspace">
        <textarea
          className="editor-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing your story..."
        />
      </div>
    </div>
  )
}

export default EditorPage
