import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { parseBk } from '@/lib/wasm'

const DEFAULT_TEMPLATE = `@title: Untitled Book
@author: Your Name
@dedication:

#chapter: Chapter One
@page:
Write your first page here...

@page:
Continue your story...
`

function EditorPage() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const [content, setContent] = useState(DEFAULT_TEMPLATE)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    // Create a blob and download the file
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'my-book.bk'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePreview = async () => {
    setIsSaving(true)
    setError(null)

    try {
      // Parse the content to validate it
      const book = await parseBk(content)

      // Store in localStorage
      localStorage.setItem('current-book', JSON.stringify(book))

      // Navigate to viewer
      navigate('/viewer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid .bk format')
      console.error('Parse error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    navigate('/')
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F5EFE7',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '1rem 2rem',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#F5EFE7',
        }}
      >
        <h2
          style={{
            fontFamily: 'Libre Baskerville, Georgia, serif',
            fontSize: '24px',
            margin: 0,
            color: 'rgba(0,0,0,0.8)',
          }}
        >
          {bookId ? `Editing Book ${bookId}` : 'New Book'}
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleCancel}>Cancel</button>
          <button onClick={handleSave}>Download .bk</button>
          <button onClick={handlePreview} disabled={isSaving}>
            {isSaving ? 'Loading...' : 'Preview'}
          </button>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: '#ffebee',
            border: '1px solid #ef5350',
            color: '#c62828',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '14px',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Editor */}
      <div style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing your story..."
          style={{
            width: '100%',
            height: '100%',
            padding: '1.5rem',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '8px',
            fontFamily: 'Georgia, serif',
            fontSize: '16px',
            lineHeight: '1.8',
            resize: 'none',
            backgroundColor: 'white',
            color: 'rgba(0,0,0,0.9)',
          }}
        />
      </div>
    </div>
  )
}

export default EditorPage
