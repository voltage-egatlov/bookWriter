import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileUpload } from '@/components/FileUpload'
import { BookView } from '@/components/BookView'
import { BookProvider, useBook } from '@/contexts/BookContext'
import { Book } from '@/lib/types'

function ViewerPageContent() {
  const { book, setBook, isEditing, setIsEditing } = useBook()
  const navigate = useNavigate()

  useEffect(() => {
    // Load book from localStorage if available
    const currentBook = localStorage.getItem('current-book')
    if (currentBook) {
      try {
        const parsedBook = JSON.parse(currentBook) as Book
        setBook(parsedBook)
      } catch (err) {
        console.error('Failed to load book from localStorage:', err)
      }
    }
  }, [setBook])

  const handleBookParsed = (parsedBook: Book) => {
    setBook(parsedBook)
    localStorage.setItem('current-book', JSON.stringify(parsedBook))
  }

  if (!book) {
    return <FileUpload onBookParsed={handleBookParsed} />
  }

  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      {/* Edit Mode Toggle */}
      <button
        onClick={() => setIsEditing(!isEditing)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1500,
          padding: '10px 20px',
          fontSize: '14px',
          background: isEditing ? '#28a745' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        {isEditing ? '📝 Editing Mode' : '👁 Reading Mode'}
      </button>

      <BookView book={book} isEditable={isEditing} />
    </div>
  )
}

export default function ViewerPage() {
  return (
    <BookProvider>
      <ViewerPageContent />
    </BookProvider>
  )
}
