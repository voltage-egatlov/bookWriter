import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/tauri'
import { Book } from '@/lib/types'
import { BookEditor } from '@/components/editor/BookEditor'
import { SAVE_DEBOUNCE_MS } from '@/lib/editor/constants'

export default function EditorPage() {
  const [book, setBook] = useState<Book | null>(null)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Debounced save ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingBookRef = useRef<Book | null>(null)
  const hasInitializedRef = useRef(false)

  // Load book on mount
  useEffect(() => {
    // Prevent double initialization (React StrictMode runs effects twice)
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    async function loadBook() {
      // Check if this is a new book from HomePage
      const isNewBook = searchParams.get('new') === 'true'

      if (isNewBook) {
        const newBookJson = localStorage.getItem('new-book')
        const newBookPath = localStorage.getItem('new-book-path')
        if (newBookJson) {
          try {
            const newBook = JSON.parse(newBookJson) as Book
            setBook(newBook)
            if (newBookPath) {
              setFilePath(newBookPath)
            }
            localStorage.removeItem('new-book') // Clean up
            localStorage.removeItem('new-book-path') // Clean up
            setLoading(false)
            return
          } catch (e) {
            console.error('Failed to parse new book:', e)
          }
        }
      }

      // Otherwise, open file dialog
      try {
        const path = await invoke<string | null>('open_file_dialog')
        if (path) {
          const loadedBook = await invoke<Book>('load_bk_file', { path })
          setBook(loadedBook)
          setFilePath(path)
        } else {
          // User cancelled, go back home
          navigate('/')
        }
      } catch (error) {
        console.error('Failed to load book:', error)
        alert(`Failed to load book: ${error}`)
        navigate('/')
      } finally {
        setLoading(false)
      }
    }
    loadBook()
  }, [navigate, searchParams])

  // Helper function to generate .bk file content
  const generateBkContent = useCallback((bookToSave: Book): string => {
    let content = `@id: ${bookToSave.id}\n`
    content += `@title: ${bookToSave.title}\n`
    content += `@author: ${bookToSave.author}\n`
    if (bookToSave.dedication) {
      content += `@dedication: ${bookToSave.dedication}\n`
    }
    content += '\n'

    // Add chapters
    bookToSave.chapters.forEach((chapter) => {
      content += `#chapter: ${chapter.title}\n`
      content += `${chapter.content}\n\n`
    })

    return content
  }, [])

  // Save book to file
  const saveBookToFile = useCallback(
    async (bookToSave: Book, currentFilePath: string | null) => {
      if (!currentFilePath) {
        // No file path, use save dialog
        try {
          const suggestedName = `${bookToSave.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.bk`
          const newPath = await invoke<string | null>('save_file_dialog', {
            defaultName: suggestedName,
          })

          if (newPath) {
            setFilePath(newPath)
            const content = generateBkContent(bookToSave)
            await invoke('save_bk_file', { path: newPath, content })
            console.log('Book saved successfully to:', newPath)
          }
        } catch (error) {
          console.error('Failed to save book:', error)
          alert(`Failed to save: ${error}`)
        }
        return
      }

      // Save to existing path
      try {
        const content = generateBkContent(bookToSave)
        await invoke('save_bk_file', { path: currentFilePath, content })
        console.log('Book saved successfully')
      } catch (error) {
        console.error('Failed to save book:', error)
        alert(`Failed to save: ${error}`)
      }
    },
    [generateBkContent]
  )

  // Debounced save function - only auto-save if we have a file path
  const debouncedSave = useCallback(
    (bookToSave: Book) => {
      // Don't auto-save new books (no file path yet)
      // User must explicitly save with Ctrl+S first
      if (!filePath) {
        return
      }

      pendingBookRef.current = bookToSave

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        if (pendingBookRef.current && filePath) {
          saveBookToFile(pendingBookRef.current, filePath)
          pendingBookRef.current = null
        }
      }, SAVE_DEBOUNCE_MS)
    },
    [filePath, saveBookToFile]
  )

  // Handle book changes from editor
  const handleBookChange = useCallback(
    (updatedBook: Book) => {
      setBook(updatedBook)
      debouncedSave(updatedBook)
    },
    [debouncedSave]
  )

  // Handle manual save
  const handleSave = useCallback(() => {
    if (book) {
      // Cancel debounced save and save immediately
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
      pendingBookRef.current = null
      saveBookToFile(book, filePath)
    }
  }, [book, filePath, saveBookToFile])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      // Save any pending changes before unmount
      if (pendingBookRef.current && filePath) {
        const content = generateBkContent(pendingBookRef.current)
        // Fire and forget - best effort save
        invoke('save_bk_file', { path: filePath, content }).catch(console.error)
      }
    }
  }, [filePath, generateBkContent])

  if (loading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F5EFE7',
          fontFamily: 'Libre Baskerville, Georgia, serif',
        }}
      >
        Loading...
      </div>
    )
  }

  if (!book) {
    return null
  }

  const navButtonStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    borderRadius: 0,
    fontSize: '12px',
    fontFamily: 'Libre Baskerville, Georgia, serif',
    cursor: 'pointer',
    color: 'rgba(0, 0, 0, 0.5)',
    transition: 'color 0.2s',
    padding: '2px 4px',
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#F5EFE7',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <BookEditor book={book} onBookChange={handleBookChange} onSave={handleSave} />
      </div>

      {/* Minimal nav bar */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '4px 16px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderTop: '1px solid rgba(0, 0, 0, 0.1)',
        }}
      >
        <button
          onClick={() => {
            if (pendingBookRef.current && filePath) {
              const content = generateBkContent(pendingBookRef.current)
              invoke('save_bk_file', { path: filePath, content }).catch(console.error)
            }
            navigate('/')
          }}
          style={navButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'rgba(0, 0, 0, 0.8)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(0, 0, 0, 0.5)'
          }}
        >
          Home
        </button>
        <button
          onClick={() => setShowInfoModal(true)}
          style={navButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'rgba(0, 0, 0, 0.8)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(0, 0, 0, 0.5)'
          }}
        >
          Info
        </button>
      </nav>

      {/* Info Modal */}
      {showInfoModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setShowInfoModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              fontFamily: 'Libre Baskerville, Georgia, serif',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '24px' }}>
              How to Use Katha
            </h2>

            <section style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '8px', color: 'rgba(0,0,0,0.7)' }}>
                Editing
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, margin: 0, color: 'rgba(0,0,0,0.6)' }}>
                Click anywhere on the page to place your cursor and start typing. Text flows
                naturally across pages like a real book.
              </p>
            </section>

            <section style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '8px', color: 'rgba(0,0,0,0.7)' }}>
                Keyboard Shortcuts
              </h3>
              <ul
                style={{
                  fontSize: '14px',
                  lineHeight: 1.8,
                  margin: 0,
                  paddingLeft: '20px',
                  color: 'rgba(0,0,0,0.6)',
                }}
              >
                <li>
                  <strong>Ctrl + S</strong> - Save
                </li>
                <li>
                  <strong>Ctrl + B</strong> - Bold
                </li>
                <li>
                  <strong>Ctrl + I</strong> - Italic
                </li>
                <li>
                  <strong>Ctrl + U</strong> - Underline
                </li>
                <li>
                  <strong>Ctrl + Shift + C</strong> - Create new chapter at cursor
                </li>
                <li>
                  <strong>Escape</strong> - Hide cursor
                </li>
              </ul>
            </section>

            <section style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '8px', color: 'rgba(0,0,0,0.7)' }}>
                Chapters
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, margin: 0, color: 'rgba(0,0,0,0.6)' }}>
                To create a new chapter, press <strong>Ctrl + Shift + C</strong> while editing. Text
                after your cursor becomes the new chapter.
                <br />
                <br />
                To delete a chapter, delete its entire title. The content will merge into the
                previous chapter.
              </p>
            </section>

            <section style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '8px', color: 'rgba(0,0,0,0.7)' }}>
                Navigation
              </h3>
              <p style={{ fontSize: '14px', lineHeight: 1.6, margin: 0, color: 'rgba(0,0,0,0.6)' }}>
                Click the arrows at the top corners of pages to navigate between spreads. Click the
                book title (top right) to jump to the Table of Contents. Click any chapter in the
                TOC to jump directly to it.
              </p>
            </section>

            <button
              onClick={() => setShowInfoModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#F5EFE7',
                color: 'rgba(0, 0, 0, 0.7)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
