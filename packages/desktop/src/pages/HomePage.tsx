import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/tauri'
import { Book } from '@/lib/types'

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showNewBookModal, setShowNewBookModal] = useState(false)
  const [isModalFadingOut, setIsModalFadingOut] = useState(false)
  const [newBookTitle, setNewBookTitle] = useState('')
  const [newBookAuthor, setNewBookAuthor] = useState('')
  const navigate = useNavigate()

  const handleOpenBook = async () => {
    try {
      setIsLoading(true)
      navigate('/editor')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewBook = () => {
    if (showNewBookModal) {
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

    // Ask for save location first
    const suggestedName = `${newBookTitle
      .trim()
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()}.bk`
    let savePath: string | null = null

    try {
      savePath = await invoke<string | null>('save_file_dialog', {
        defaultName: suggestedName,
      })
    } catch (error) {
      console.error('Failed to show save dialog:', error)
      alert('Failed to show save dialog')
      return
    }

    if (!savePath) {
      // User cancelled
      return
    }

    // Create a new book object
    const newBook: Book = {
      id: crypto.randomUUID(),
      title: newBookTitle.trim(),
      author: newBookAuthor.trim(),
      dedication: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      chapters: [
        {
          id: crypto.randomUUID(),
          title: 'Chapter One',
          content: '',
          order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    }

    // Generate .bk content and save
    let content = `@id: ${newBook.id}\n`
    content += `@title: ${newBook.title}\n`
    content += `@author: ${newBook.author}\n`
    content += '\n'
    content += `#chapter: ${newBook.chapters[0].title}\n`
    content += `${newBook.chapters[0].content}\n`

    try {
      await invoke('save_bk_file', { path: savePath, content })
    } catch (error) {
      console.error('Failed to save book:', error)
      alert(`Failed to save book: ${error}`)
      return
    }

    // Store book and path in localStorage for the editor to pick up
    localStorage.setItem('new-book', JSON.stringify(newBook))
    localStorage.setItem('new-book-path', savePath)

    // Close modal and reset
    setShowNewBookModal(false)
    setNewBookTitle('')
    setNewBookAuthor('')

    // Navigate to editor with new book flag
    navigate('/editor?new=true')
  }

  const handleCancelNewBook = () => {
    setIsModalFadingOut(true)
    setTimeout(() => {
      setShowNewBookModal(false)
      setIsModalFadingOut(false)
      setNewBookTitle('')
      setNewBookAuthor('')
    }, 300)
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
      {/* Center Content */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div style={{ maxWidth: '1024px', textAlign: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '16px',
              marginBottom: '-8px',
              justifyContent: 'center',
            }}
          >
            <h1
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '96px',
                fontWeight: 300,
                letterSpacing: '-0.02em',
                color: 'black',
                margin: 0,
              }}
            >
              Katha
            </h1>
            <span
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '32px',
                color: 'rgba(0, 0, 0, 0.6)',
              }}
            >
              /kʌθɑː/
            </span>
          </div>
          <p
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '24px',
              fontWeight: 300,
              color: 'rgba(0, 0, 0, 0.7)',
              marginBottom: '32px',
            }}
          >
            Hindi · <span style={{ fontStyle: 'italic' }}>noun</span> · a story or narrative
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <button onClick={handleOpenBook} disabled={isLoading}>
              {isLoading ? 'Opening...' : 'Open Book'}
            </button>
            <button onClick={handleNewBook}>New Book</button>
          </div>
        </div>
      </div>

      {/* Bottom Right Corner - Version */}
      <div style={{ position: 'absolute', bottom: '24px', right: '24px' }}>
        <span
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '14px',
            fontWeight: 300,
            color: 'rgba(0, 0, 0, 0.4)',
          }}
        >
          v1.0.0
        </span>
      </div>

      {/* New Book Modal */}
      {showNewBookModal && (
        <div
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
            opacity: isModalFadingOut ? 0 : 1,
            transition: 'opacity 0.3s',
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
                }}
                onBlur={(e) => {
                  e.target.style.borderBottomColor = 'rgba(0, 0, 0, 0.2)'
                  e.target.style.color = 'rgba(0, 0, 0, 0.7)'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const inputs = document.querySelectorAll('input[type="text"]')
                    const authorInput = inputs[1] as HTMLInputElement
                    if (authorInput) authorInput.focus()
                  } else if (e.key === 'Escape') {
                    handleCancelNewBook()
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
                }}
                onBlur={(e) => {
                  e.target.style.borderBottomColor = 'rgba(0, 0, 0, 0.2)'
                  e.target.style.color = 'rgba(0, 0, 0, 0.7)'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateBook()
                  } else if (e.key === 'Escape') {
                    handleCancelNewBook()
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
