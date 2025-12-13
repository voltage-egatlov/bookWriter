import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Book } from '@/lib/types'

export default function ViewerPage() {
  const [book, setBook] = useState<Book | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [editingDedication, setEditingDedication] = useState(false)
  const [dedicationText, setDedicationText] = useState('')
  const [editingBlock, setEditingBlock] = useState<string | null>(null)
  const [blockTexts, setBlockTexts] = useState<Map<string, string>>(new Map())
  const navigate = useNavigate()

  useEffect(() => {
    // Load book from localStorage
    const currentBook = localStorage.getItem('current-book')
    if (currentBook) {
      try {
        const parsedBook = JSON.parse(currentBook) as Book
        setBook(parsedBook)
        setDedicationText(parsedBook.dedication || 'This book is dedicated to...')

        // Initialize block texts
        const texts = new Map<string, string>()
        parsedBook.chapters.forEach((chapter) => {
          chapter.blocks.forEach((block) => {
            texts.set(block.id, block.content)
          })
        })
        setBlockTexts(texts)

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
  }, [navigate])

  if (!book) {
    return null
  }

  const saveActiveEdits = () => {
    if (!book) return

    let updatedBook = { ...book }
    let hasChanges = false

    // Save dedication if editing
    if (editingDedication) {
      updatedBook.dedication = dedicationText
      hasChanges = true
      setEditingDedication(false)
    }

    // Save block if editing
    if (editingBlock) {
      updatedBook.chapters = updatedBook.chapters.map((chapter) => ({
        ...chapter,
        blocks: chapter.blocks.map((block) =>
          block.id === editingBlock
            ? { ...block, content: blockTexts.get(editingBlock) || '' }
            : block
        ),
      }))
      hasChanges = true
      setEditingBlock(null)
    }

    if (hasChanges) {
      setBook(updatedBook)
      localStorage.setItem('current-book', JSON.stringify(updatedBook))
      saveBookToFile(updatedBook)
    }
  }

  const handlePrevPage = () => {
    saveActiveEdits()
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    saveActiveEdits()
    // For now, allow unlimited page turns (we'll add proper limits later)
    setCurrentPage(currentPage + 1)
  }

  const handleDedicationBlur = () => {
    setEditingDedication(false)
    if (book) {
      const updatedBook = { ...book, dedication: dedicationText }
      setBook(updatedBook)
      localStorage.setItem('current-book', JSON.stringify(updatedBook))
      saveBookToFile(updatedBook)
    }
  }

  const handleBlockBlur = (blockId: string) => {
    setEditingBlock(null)
    if (book) {
      const updatedBook = { ...book }
      updatedBook.chapters = updatedBook.chapters.map((chapter) => ({
        ...chapter,
        blocks: chapter.blocks.map((block) =>
          block.id === blockId ? { ...block, content: blockTexts.get(blockId) || '' } : block
        ),
      }))
      setBook(updatedBook)
      localStorage.setItem('current-book', JSON.stringify(updatedBook))
      saveBookToFile(updatedBook)
    }
  }

  const handleBlockTextChange = (blockId: string, text: string) => {
    setBlockTexts(new Map(blockTexts.set(blockId, text)))
  }

  const getCurrentChapter = (pageNumber: number) => {
    if (!book || pageNumber < 3) return null

    // Find which chapter/block this page corresponds to
    const contentPageIndex = pageNumber - 3
    let blockCount = 0

    for (const chapter of book.chapters) {
      if (contentPageIndex < blockCount + chapter.blocks.length) {
        return chapter
      }
      blockCount += chapter.blocks.length
    }

    return book.chapters[book.chapters.length - 1] || null
  }

  const saveBookToFile = (bookToSave: Book) => {
    // Generate .bk file content
    let content = `@id: ${bookToSave.id}\n`
    content += `@title: ${bookToSave.title}\n`
    content += `@author: ${bookToSave.author}\n`
    if (bookToSave.dedication) {
      content += `@dedication: ${bookToSave.dedication}\n`
    }
    content += '\n'

    // Add chapters and blocks
    bookToSave.chapters.forEach((chapter) => {
      content += `#chapter: ${chapter.title}\n`
      chapter.blocks.forEach((block) => {
        content += `@block: ${block.id}\n`
        content += `${block.content}\n\n`
      })
    })

    // Trigger download
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${bookToSave.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.bk`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Helper to render page content based on page number
  const renderPageContent = (pageNumber: number) => {
    // Page 0 (right side of spread 0): Title page
    if (pageNumber === 0) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <h1
            style={{
              fontFamily: 'Libre Baskerville, Georgia, serif',
              fontSize: '48px',
              fontWeight: 'bold',
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            {book.title}
          </h1>
          <p
            style={{
              fontFamily: 'Libre Baskerville, Georgia, serif',
              fontSize: '24px',
              color: 'rgba(0,0,0,0.6)',
            }}
          >
            {book.author}
          </p>
        </div>
      )
    }

    // Page 1 (left side of spread 1): Dedication page
    if (pageNumber === 1) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          {editingDedication ? (
            <textarea
              value={dedicationText}
              onChange={(e) => setDedicationText(e.target.value)}
              onBlur={handleDedicationBlur}
              autoFocus
              style={{
                fontFamily: 'Libre Baskerville, Georgia, serif',
                fontSize: '18px',
                fontStyle: 'italic',
                color: 'rgba(0,0,0,0.6)',
                textAlign: 'center',
                border: 'none',
                outline: 'none',
                resize: 'none',
                background: 'transparent',
                width: '100%',
                minHeight: '100px',
              }}
            />
          ) : (
            <p
              onClick={() => setEditingDedication(true)}
              style={{
                fontFamily: 'Libre Baskerville, Georgia, serif',
                fontSize: '18px',
                fontStyle: 'italic',
                color: 'rgba(0,0,0,0.6)',
                textAlign: 'center',
                cursor: 'text',
              }}
            >
              {dedicationText}
            </p>
          )}
        </div>
      )
    }

    // Page 2 (right side of spread 1): Table of Contents
    if (pageNumber === 2) {
      return (
        <div>
          <h2
            style={{
              fontFamily: 'Libre Baskerville, Georgia, serif',
              fontSize: '32px',
              fontWeight: 'bold',
              marginBottom: '40px',
              textAlign: 'center',
            }}
          >
            Contents
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {book.chapters.map((chapter, index) => (
              <button
                key={chapter.id}
                onClick={() => {
                  saveActiveEdits()
                  // Navigate to chapter (we'll implement this)
                  // For now, just go to page 3+ where content starts
                  setCurrentPage(Math.floor((3 + index * 2) / 2))
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: '8px 0',
                  fontFamily: 'Libre Baskerville, Georgia, serif',
                  fontSize: '18px',
                  color: 'rgba(0,0,0,0.7)',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(0,0,0,1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(0,0,0,0.7)'
                }}
              >
                {chapter.title}
              </button>
            ))}
          </div>
        </div>
      )
    }

    // Page 3+: Actual content (for now, show blocks)
    const contentPageIndex = pageNumber - 3

    // Find the block across all chapters
    let blockCount = 0
    let block = null
    let currentChapter = null
    let isFirstBlockOfChapter = false

    for (const chapter of book.chapters) {
      if (contentPageIndex < blockCount + chapter.blocks.length) {
        const blockIndexInChapter = contentPageIndex - blockCount
        block = chapter.blocks[blockIndexInChapter]
        currentChapter = chapter
        isFirstBlockOfChapter = blockIndexInChapter === 0
        break
      }
      blockCount += chapter.blocks.length
    }

    if (!block) return ''

    const isEditing = editingBlock === block.id
    const blockText = blockTexts.get(block.id) || ''

    if (isEditing) {
      return (
        <>
          {isFirstBlockOfChapter && (
            <h2
              style={{
                fontFamily: 'Libre Baskerville, Georgia, serif',
                fontSize: '32px',
                fontWeight: 'bold',
                marginBottom: '40px',
                textAlign: 'center',
                color: 'rgba(0,0,0,0.85)',
              }}
            >
              {currentChapter?.title}
            </h2>
          )}
          <textarea
            value={blockText}
            onChange={(e) => handleBlockTextChange(block.id, e.target.value)}
            onBlur={() => handleBlockBlur(block.id)}
            autoFocus
            style={{
              fontFamily: 'Libre Baskerville, Georgia, serif',
              fontSize: '18px',
              lineHeight: '1.8',
              color: 'rgba(0,0,0,0.85)',
              border: 'none',
              outline: 'none',
              resize: 'none',
              background: 'transparent',
              width: '100%',
              height: '100%',
            }}
          />
        </>
      )
    }

    return (
      <>
        {isFirstBlockOfChapter && (
          <h2
            style={{
              fontFamily: 'Libre Baskerville, Georgia, serif',
              fontSize: '32px',
              fontWeight: 'bold',
              marginBottom: '40px',
              textAlign: 'center',
              color: 'rgba(0,0,0,0.85)',
            }}
          >
            {currentChapter?.title}
          </h2>
        )}
        <p
          onClick={() => setEditingBlock(block.id)}
          style={{
            cursor: 'text',
            margin: 0,
          }}
        >
          {blockText}
        </p>
      </>
    )
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#F5EFE7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
      }}
    >
      {/* Left Arrow */}
      <button
        onClick={handlePrevPage}
        disabled={currentPage === 0}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '96px',
          color: currentPage === 0 ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.5)',
          cursor: currentPage === 0 ? 'default' : 'pointer',
          padding: '20px',
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => {
          if (currentPage > 0) {
            e.currentTarget.style.color = 'rgba(0,0,0,0.8)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = currentPage === 0 ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.5)'
        }}
      >
        ‹
      </button>

      <div
        style={{
          width: '90vw',
          height: '90vh',
          display: 'flex',
        }}
      >
        {/* Left Page */}
        <div
          style={{
            flex: 1,
            backgroundColor: 'white',
            padding: '60px 60px 40px 60px',
            fontFamily: 'Libre Baskerville, Georgia, serif',
            fontSize: '18px',
            lineHeight: '1.8',
            color: 'rgba(0,0,0,0.85)',
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.08)',
            borderTopLeftRadius: '8px',
            borderBottomLeftRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            onClick={() => {
              saveActiveEdits()
              setCurrentPage(1)
            }}
            style={{
              fontFamily: 'Libre Baskerville, Georgia, serif',
              fontSize: '14px',
              color: 'rgba(0,0,0,0.4)',
              marginBottom: '40px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgba(0,0,0,0.7)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(0,0,0,0.4)'
            }}
          >
            {getCurrentChapter(currentPage * 2)
              ? `Chapter: ${getCurrentChapter(currentPage * 2)?.title}`
              : ''}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>{renderPageContent(currentPage * 2)}</div>
          <div
            style={{
              textAlign: 'center',
              fontFamily: 'Libre Baskerville, Georgia, serif',
              fontSize: '18px',
              color: 'rgba(0,0,0,0.4)',
              marginTop: '20px',
            }}
          >
            ~{currentPage * 2 + 1}~
          </div>
        </div>

        {/* Right Page */}
        <div
          style={{
            flex: 1,
            backgroundColor: 'white',
            padding: '60px 60px 40px 60px',
            fontFamily: 'Libre Baskerville, Georgia, serif',
            fontSize: '18px',
            lineHeight: '1.8',
            color: 'rgba(0,0,0,0.85)',
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.08)',
            borderTopRightRadius: '8px',
            borderBottomRightRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              fontFamily: 'Libre Baskerville, Georgia, serif',
              fontSize: '14px',
              color: 'rgba(0,0,0,0.4)',
              marginBottom: '40px',
              textAlign: 'right',
            }}
          >
            {book.author}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {renderPageContent(currentPage * 2 + 1)}
          </div>
          <div
            style={{
              textAlign: 'center',
              fontFamily: 'Libre Baskerville, Georgia, serif',
              fontSize: '16px',
              color: 'rgba(0,0,0,0.4)',
              marginTop: '20px',
            }}
          >
            ~{currentPage * 2 + 2}~
          </div>
        </div>
      </div>

      {/* Right Arrow */}
      <button
        onClick={handleNextPage}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '96px',
          color: 'rgba(0,0,0,0.5)',
          cursor: 'pointer',
          padding: '20px',
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'rgba(0,0,0,0.8)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(0,0,0,0.5)'
        }}
      >
        ›
      </button>
    </div>
  )
}
