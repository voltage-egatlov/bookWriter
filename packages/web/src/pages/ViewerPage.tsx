import { useEffect, useState, useCallback, useRef, type CSSProperties } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Book } from '@/lib/types'
import { getFileHandle, storeFileHandle } from '@/lib/fileHandleDB'
import { parseBk } from '@/lib/wasm'
import { BookEditor } from '@/components/editor/BookEditor'
import { SAVE_DEBOUNCE_MS } from '@/lib/editor/constants'

export default function ViewerPage() {
  const [book, setBook] = useState<Book | null>(null)
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Debounced save ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingBookRef = useRef<Book | null>(null)

  useEffect(() => {
    // Get file handle from navigation state
    if (location.state?.fileHandle) {
      setFileHandle(location.state.fileHandle)
    }

    // Check for bookId query parameter for recent books
    const searchParams = new URLSearchParams(location.search)
    const bookId = searchParams.get('bookId')

    if (bookId) {
      // Loading from recent books - retrieve file handle from IndexedDB
      ;(async () => {
        try {
          const handle = await getFileHandle(bookId)

          if (handle) {
            setFileHandle(handle)

            // Read from disk (always latest!)
            const file = await handle.getFile()
            const content = await file.text()
            const parsedBook = await parseBk(content)

            setBook(parsedBook)
            localStorage.setItem(`book-last-opened-${bookId}`, Date.now().toString())
            localStorage.setItem('current-book', JSON.stringify(parsedBook))

            console.log('Loaded from disk via IndexedDB handle:', parsedBook.title)
            return
          } else {
            alert('Could not access file. Permission may have been revoked.')
            navigate('/')
          }
        } catch (err: any) {
          console.error('Failed to load:', err)
          alert(`Failed to open: ${err.message || 'Unknown error'}`)
          navigate('/')
        }
      })()
      return
    }

    // Normal flow - load from current-book
    const currentBook = localStorage.getItem('current-book')
    if (currentBook) {
      try {
        const parsedBook = JSON.parse(currentBook) as Book
        setBook(parsedBook)

        // Update last opened timestamp
        localStorage.setItem(`book-title-${parsedBook.id}`, parsedBook.title)
        localStorage.setItem(`book-last-opened-${parsedBook.id}`, Date.now().toString())
      } catch (err) {
        console.error('Failed to load book from localStorage:', err)
        navigate('/')
      }
    } else {
      navigate('/')
    }
  }, [navigate, location])

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

  // Helper for "Save As" or new books without file handle
  const saveBookAs = useCallback(
    async (bookToSave: Book) => {
      try {
        const handle = await window.showSaveFilePicker({
          types: [
            {
              description: 'Book Files',
              accept: { 'text/plain': ['.bk'] },
            },
          ],
          suggestedName: `${bookToSave.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.bk`,
        })

        setFileHandle(handle) // Store for future saves

        // Store in IndexedDB for recent books
        const file = await handle.getFile()
        await storeFileHandle(bookToSave.id, handle, file.name)

        const content = generateBkContent(bookToSave)
        const writable = await handle.createWritable()
        await writable.write(content)
        await writable.close()

        console.log('Book saved successfully and handle stored')
      } catch (error: any) {
        if (error.name === 'AbortError') return // User cancelled
        console.error('Failed to save book:', error)
        alert(`Failed to save: ${error.message || 'Unknown error'}`)
      }
    },
    [generateBkContent]
  )

  const saveBookToFile = useCallback(
    async (bookToSave: Book, currentFileHandle: FileSystemFileHandle | null) => {
      // If File System Access API not supported, fall back to download
      if (!('showSaveFilePicker' in window)) {
        // Fallback: trigger download
        const content = generateBkContent(bookToSave)
        const blob = new Blob([content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${bookToSave.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.bk`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        return
      }

      // If no file handle available (new book), trigger "Save As"
      if (!currentFileHandle) {
        console.log('No file handle available, triggering Save As')
        await saveBookAs(bookToSave)
        return
      }

      // Save to existing file handle (seamless, no dialog!)
      try {
        const content = generateBkContent(bookToSave)

        // Create writable stream to file
        const writable = await currentFileHandle.createWritable()

        // Write content to file
        await writable.write(content)

        // Close the file and commit changes
        await writable.close()

        console.log('Book saved successfully')
      } catch (error: any) {
        console.error('Failed to save book:', error)
        alert(`Failed to save: ${error.message || 'Unknown error'}`)
      }
    },
    [generateBkContent, saveBookAs]
  )

  // Debounced save function
  const debouncedSave = useCallback(
    (bookToSave: Book) => {
      pendingBookRef.current = bookToSave

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        if (pendingBookRef.current) {
          saveBookToFile(pendingBookRef.current, fileHandle)
          pendingBookRef.current = null
        }
      }, SAVE_DEBOUNCE_MS)
    },
    [fileHandle, saveBookToFile]
  )

  // Handle book changes from editor
  const handleBookChange = useCallback(
    (updatedBook: Book) => {
      setBook(updatedBook)
      localStorage.setItem('current-book', JSON.stringify(updatedBook))
      localStorage.setItem(`book-title-${updatedBook.id}`, updatedBook.title)
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
      saveBookToFile(book, fileHandle)
    }
  }, [book, fileHandle, saveBookToFile])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      // Save any pending changes
      if (pendingBookRef.current) {
        // Note: This won't work reliably on unmount, but it's a best effort
        localStorage.setItem('current-book', JSON.stringify(pendingBookRef.current))
      }
    }
  }, [])

  if (!book) {
    return null
  }

  const navButtonStyle: CSSProperties = {
    background: 'none',
    border: 'none',
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
        <BookEditor
          book={book}
          fileHandle={fileHandle}
          onBookChange={handleBookChange}
          onSave={handleSave}
        />
      </div>

      {/* Minimal nav bar */}
      <nav
        style={{
          display: 'flex',
          gap: '16px',
          padding: '6px 16px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderTop: '1px solid rgba(0, 0, 0, 0.1)',
        }}
      >
        <button
          onClick={() => {
            if (pendingBookRef.current) {
              saveBookToFile(pendingBookRef.current, fileHandle)
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
                  <strong>Ctrl/Cmd + S</strong> - Save
                </li>
                <li>
                  <strong>Ctrl/Cmd + B</strong> - Bold
                </li>
                <li>
                  <strong>Ctrl/Cmd + I</strong> - Italic
                </li>
                <li>
                  <strong>Ctrl/Cmd + U</strong> - Underline
                </li>
                <li>
                  <strong>Ctrl/Cmd + Shift + C</strong> - Create new chapter at cursor
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
                To create a new chapter, press <strong>Ctrl/Cmd + Shift + C</strong> while editing.
                Text after your cursor becomes the new chapter.
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
