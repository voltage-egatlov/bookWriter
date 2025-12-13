import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseBk } from '@/lib/wasm'

interface RecentBook {
  id: string
  title: string
  lastOpened: number
}

export default function HomePage() {
  const [recentBooks, setRecentBooks] = useState<RecentBook[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showNewBookModal, setShowNewBookModal] = useState(false)
  const [isModalFadingOut, setIsModalFadingOut] = useState(false)
  const [newBookTitle, setNewBookTitle] = useState('')
  const [newBookAuthor, setNewBookAuthor] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Load recent books from localStorage
    const loadRecentBooks = () => {
      const booksMap = new Map<string, RecentBook>()
      const keys = Object.keys(localStorage)

      keys.forEach((key) => {
        if (key.startsWith('book-position-')) {
          const bookId = key.replace('book-position-', '')
          const titleKey = `book-title-${bookId}`
          const title = localStorage.getItem(titleKey) || 'Untitled Book'
          const lastOpenedKey = `book-last-opened-${bookId}`
          const lastOpened = parseInt(localStorage.getItem(lastOpenedKey) || '0')

          // Only add if we don't already have this book or if this has a newer timestamp
          const existing = booksMap.get(bookId)
          if (!existing || lastOpened > existing.lastOpened) {
            booksMap.set(bookId, { id: bookId, title, lastOpened })
          }
        }
      })

      // Convert map to array, sort by last opened (most recent first) and take top 3
      const books = Array.from(booksMap.values())
      books.sort((a, b) => b.lastOpened - a.lastOpened)
      setRecentBooks(books.slice(0, 3))
    }

    loadRecentBooks()
  }, [])

  useEffect(() => {
    // Handle ESC key to close modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showNewBookModal) {
        handleCancelNewBook()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showNewBookModal])

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  const handleOpenBook = () => {
    console.log('Open Book clicked')
    console.log('File input ref:', fileInputRef.current)
    fileInputRef.current?.click()
  }

  const handleNewBook = () => {
    if (showNewBookModal) {
      // If modal is already open, close it
      handleCancelNewBook()
    } else {
      setShowNewBookModal(true)
    }
  }

  const handleCreateBook = async () => {
    if (!newBookTitle.trim() || !newBookAuthor.trim()) {
      alert('Please enter both title and author')
      return
    }

    // Create a new book with template
    const bookTemplate = `@title: ${newBookTitle}
@author: ${newBookAuthor}
@dedication:

#chapter: Chapter One
@block:
Write your first page here...

@block:
Continue your story...
`

    try {
      // Parse the template to create a book object
      const book = await parseBk(bookTemplate)

      // Store in localStorage
      localStorage.setItem('current-book', JSON.stringify(book))

      // Close modal and reset
      setShowNewBookModal(false)
      setNewBookTitle('')
      setNewBookAuthor('')

      // Navigate to viewer
      navigate('/viewer')
    } catch (err) {
      console.error('Failed to create book:', err)
      alert('Failed to create new book')
    }
  }

  const handleCancelNewBook = () => {
    setIsModalFadingOut(true)
    setTimeout(() => {
      setShowNewBookModal(false)
      setIsModalFadingOut(false)
      setNewBookTitle('')
      setNewBookAuthor('')
    }, 300) // Match animation duration
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)

    try {
      // Read file content
      const content = await file.text()

      // Parse using WASM
      const book = await parseBk(content)

      // Check if the file has an @id directive
      const hasId = content.includes('@id:')

      // If no ID in file, add it and trigger download of updated file
      if (!hasId) {
        const lines = content.split('\n')
        const updatedLines = []
        let idInserted = false

        for (const line of lines) {
          updatedLines.push(line)
          // Insert @id after @author
          if (!idInserted && line.startsWith('@author:')) {
            updatedLines.push(`@id: ${book.id}`)
            idInserted = true
          }
        }

        const updatedContent = updatedLines.join('\n')

        // Create a blob and download the updated file
        const blob = new Blob([updatedContent], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
      }

      // Store book data in localStorage for the viewer
      localStorage.setItem('current-book', JSON.stringify(book))

      // Navigate to viewer
      navigate('/viewer')
    } catch (err) {
      console.error('Parse error:', err)
      alert(`Failed to open book: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#F5EFE7',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Left Corner */}
      <div style={{ position: 'absolute', top: '24px', left: '24px' }}>
        {/* Add content here */}
      </div>

      {/* Top Right Corner */}
      <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
        {/* Add content here */}
      </div>

      {/* Center Content */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div style={{ maxWidth: '1024px' }}>
          <div className="flex items-baseline gap-4 -mb-2">
            <h1
              className="font-light tracking-tight text-black"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '96px' }}
            >
              Katha
            </h1>
            <span
              className="text-black/60"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '32px' }}
            >
              /kʌθɑː/
            </span>
          </div>
          <p
            className="text-black/70 font-light"
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '24px',
              marginBottom: '24px',
            }}
          >
            Hindi · <span className="italic">noun</span> · a story or narrative
          </p>

          <div className="flex justify-around gap-4">
            <button onClick={handleOpenBook} disabled={isLoading}>
              {isLoading ? 'Opening...' : 'Open Book'}
            </button>
            <button onClick={handleNewBook}>New Book</button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".bk"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Bottom Left Corner - Recent Books */}
      <div style={{ position: 'absolute', bottom: '32px', left: '32px', maxWidth: '320px' }}>
        <div>
          <h3
            className="font-light mb-4"
            style={{
              fontFamily: 'Libre Baskerville, Georgia, serif',
              fontSize: '16px',
              letterSpacing: '0.02em',
              color: 'rgba(0, 0, 0, 0.5)',
              fontStyle: 'italic',
            }}
          >
            Recently opened
          </h3>
          {recentBooks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {recentBooks.map((book, index) => (
                <div key={book.id}>
                  <button
                    className="text-left transition-all duration-200"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => {
                      const title = e.currentTarget.querySelector('.book-title') as HTMLElement
                      if (title) title.style.color = 'rgba(0, 0, 0, 0.9)'
                    }}
                    onMouseLeave={(e) => {
                      const title = e.currentTarget.querySelector('.book-title') as HTMLElement
                      if (title) title.style.color = 'rgba(0, 0, 0, 0.7)'
                    }}
                    onClick={() => {
                      window.location.href = `/viewer?bookId=${book.id}`
                    }}
                  >
                    <div
                      className="book-title"
                      style={{
                        fontFamily: 'Libre Baskerville, Georgia, serif',
                        fontSize: '18px',
                        fontWeight: '600',
                        color: 'rgba(0, 0, 0, 0.7)',
                        marginBottom: '4px',
                        lineHeight: '1.4',
                        transition: 'color 0.2s',
                      }}
                    >
                      {book.title}
                    </div>
                    <div
                      style={{
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontSize: '12px',
                        color: 'rgba(0, 0, 0, 0.4)',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {formatTimeAgo(book.lastOpened)}
                    </div>
                  </button>
                  {index < recentBooks.length - 1 && (
                    <div
                      style={{
                        height: '1px',
                        background: 'rgba(0, 0, 0, 0.1)',
                        marginTop: '16px',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '14px',
                color: 'rgba(0, 0, 0, 0.4)',
                fontStyle: 'italic',
              }}
            >
              No books opened yet
            </p>
          )}
        </div>
      </div>

      {/* Bottom Right Corner */}
      <div style={{ position: 'absolute', bottom: '24px', right: '24px' }}>
        <span
          className="text-black/40 font-light"
          style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' }}
        >
          v0.1.0
        </span>
      </div>

      {/* New Book Modal */}
      {showNewBookModal && (
        <div
          className={isModalFadingOut ? 'fade-out' : 'fade-in'}
          style={{
            position: 'absolute',
            top: 'calc(50% + 50px)',
            left: 'calc(50% + 200px)',
            transform: 'translateY(-50%)',
            backgroundColor: '#F5EFE7',
            padding: '40px',
            borderRadius: '12px',
            width: '400px',
            zIndex: 100,
          }}
        >
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span
                style={{
                  fontFamily: 'Libre Baskerville, Georgia, serif',
                  fontSize: '20px',
                  color: 'rgba(0, 0, 0, 0.3)',
                }}
              >
                Title:
              </span>
              <input
                type="text"
                value={newBookTitle}
                onChange={(e) => setNewBookTitle(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  border: 'none',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.2)',
                  background: 'transparent',
                  fontFamily: 'Libre Baskerville, Georgia, serif',
                  fontSize: '20px',
                  color: 'rgba(0, 0, 0, 0.7)',
                  padding: '4px 0',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderBottomColor = 'rgba(0, 0, 0, 0.6)'
                  e.target.style.color = 'rgba(0, 0, 0, 0.9)'
                  const label = e.target.previousElementSibling as HTMLElement
                  if (label) label.style.color = 'rgba(0, 0, 0, 0.6)'
                }}
                onBlur={(e) => {
                  e.target.style.borderBottomColor = 'rgba(0, 0, 0, 0.2)'
                  e.target.style.color = 'rgba(0, 0, 0, 0.7)'
                  const label = e.target.previousElementSibling as HTMLElement
                  if (label) label.style.color = 'rgba(0, 0, 0, 0.3)'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const authorInput = document.querySelector(
                      'input[type="text"]:not(:focus)'
                    ) as HTMLInputElement
                    if (authorInput) authorInput.focus()
                  }
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span
                style={{
                  fontFamily: 'Libre Baskerville, Georgia, serif',
                  fontSize: '20px',
                  color: 'rgba(0, 0, 0, 0.3)',
                }}
              >
                Author:
              </span>
              <input
                type="text"
                value={newBookAuthor}
                onChange={(e) => setNewBookAuthor(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.2)',
                  background: 'transparent',
                  fontFamily: 'Libre Baskerville, Georgia, serif',
                  fontSize: '20px',
                  color: 'rgba(0, 0, 0, 0.7)',
                  padding: '4px 0',
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderBottomColor = 'rgba(0, 0, 0, 0.6)'
                  e.target.style.color = 'rgba(0, 0, 0, 0.9)'
                  const label = e.target.previousElementSibling as HTMLElement
                  if (label) label.style.color = 'rgba(0, 0, 0, 0.6)'
                }}
                onBlur={(e) => {
                  e.target.style.borderBottomColor = 'rgba(0, 0, 0, 0.2)'
                  e.target.style.color = 'rgba(0, 0, 0, 0.7)'
                  const label = e.target.previousElementSibling as HTMLElement
                  if (label) label.style.color = 'rgba(0, 0, 0, 0.3)'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateBook()
                  }
                }}
              />
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <span
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '12px',
                color: 'rgba(0, 0, 0, 0.3)',
                fontStyle: 'italic',
              }}
            >
              press enter to continue
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
