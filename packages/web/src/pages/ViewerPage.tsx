import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Book } from '@/lib/types'

export default function ViewerPage() {
  const [book, setBook] = useState<Book | null>(null)
  const [currentSpread, setCurrentSpread] = useState(0)
  const [editingDedication, setEditingDedication] = useState(false)
  const [dedicationText, setDedicationText] = useState('')
  const [editingChapter, setEditingChapter] = useState<string | null>(null)
  const [chapterTexts, setChapterTexts] = useState<Map<string, string>>(new Map())
  const navigate = useNavigate()

  useEffect(() => {
    // Load book from localStorage
    const currentBook = localStorage.getItem('current-book')
    if (currentBook) {
      try {
        const parsedBook = JSON.parse(currentBook) as Book
        setBook(parsedBook)
        setDedicationText(parsedBook.dedication || 'This book is dedicated to...')

        // Initialize chapter texts
        const texts = new Map<string, string>()
        parsedBook.chapters.forEach((chapter) => {
          texts.set(chapter.id, chapter.content)
        })
        setChapterTexts(texts)

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

    // Save chapter if editing
    if (editingChapter) {
      updatedBook.chapters = updatedBook.chapters.map((chapter) =>
        chapter.id === editingChapter
          ? { ...chapter, content: chapterTexts.get(editingChapter) || '' }
          : chapter
      )
      hasChanges = true
      setEditingChapter(null)
    }

    if (hasChanges) {
      setBook(updatedBook)
      localStorage.setItem('current-book', JSON.stringify(updatedBook))
      saveBookToFile(updatedBook)
    }
  }

  const handlePreviousSpread = () => {
    if (currentSpread > 0) {
      saveActiveEdits()
      setCurrentSpread(currentSpread - 1)
    }
  }

  const handleNextSpread = () => {
    // Calculate total number of spreads
    // Spread 0: title + dedication
    // Spread 1: ToC + first chapter
    // Spread 2+: chapters paired
    const totalPages = 3 + book.chapters.length // title, dedication, ToC, then chapters
    const maxSpread = Math.ceil(totalPages / 2) - 1

    if (currentSpread < maxSpread) {
      saveActiveEdits()
      setCurrentSpread(currentSpread + 1)
    }
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

  const handleChapterBlur = (chapterId: string) => {
    setEditingChapter(null)
    if (book) {
      const updatedBook = { ...book }
      updatedBook.chapters = updatedBook.chapters.map((chapter) =>
        chapter.id === chapterId
          ? { ...chapter, content: chapterTexts.get(chapterId) || '' }
          : chapter
      )
      setBook(updatedBook)
      localStorage.setItem('current-book', JSON.stringify(updatedBook))
      saveBookToFile(updatedBook)
    }
  }

  const handleChapterTextChange = (chapterId: string, text: string) => {
    setChapterTexts(new Map(chapterTexts.set(chapterId, text)))
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

    // Add chapters
    bookToSave.chapters.forEach((chapter) => {
      content += `#chapter: ${chapter.title}\n`
      content += `${chapter.content}\n\n`
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

  // Get left and right page numbers for current spread
  const getLeftPageNumber = () => currentSpread * 2
  const getRightPageNumber = () => currentSpread * 2 + 1

  // Helper to render page content based on page number
  const renderPageContent = (pageNumber: number) => {
    // Page 0: Title page
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
              fontSize: '32px',
              fontWeight: 'bold',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            {book.title}
          </h1>
          <p
            style={{
              fontFamily: 'Libre Baskerville, Georgia, serif',
              fontSize: '16px',
              color: 'rgba(0,0,0,0.6)',
            }}
          >
            {book.author}
          </p>
        </div>
      )
    }

    // Page 1: Dedication page
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
                fontSize: '14px',
                fontStyle: 'italic',
                lineHeight: '1.6',
                color: 'rgba(0,0,0,0.6)',
                textAlign: 'center',
                border: 'none',
                outline: 'none',
                resize: 'none',
                background: 'transparent',
                width: '100%',
                minHeight: '100px',
                padding: 0,
                margin: 0,
                cursor: 'text',
              }}
            />
          ) : (
            <p
              onClick={() => setEditingDedication(true)}
              style={{
                fontFamily: 'Libre Baskerville, Georgia, serif',
                fontSize: '14px',
                fontStyle: 'italic',
                lineHeight: '1.6',
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

    // Page 2: Table of Contents
    if (pageNumber === 2) {
      return (
        <div>
          <h2
            style={{
              fontFamily: 'Libre Baskerville, Georgia, serif',
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '32px',
              textAlign: 'center',
            }}
          >
            Contents
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {book.chapters.map((chapter, index) => {
              // Calculate which spread this chapter will be on
              const chapterPageNumber = 3 + index
              const chapterSpread = Math.floor(chapterPageNumber / 2)

              return (
                <button
                  key={chapter.id}
                  onClick={() => {
                    saveActiveEdits()
                    setCurrentSpread(chapterSpread)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    padding: '6px 0',
                    fontFamily: 'Libre Baskerville, Georgia, serif',
                    fontSize: '14px',
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
              )
            })}
          </div>
        </div>
      )
    }

    // Page 3+: Chapter content
    const chapterIndex = pageNumber - 3
    if (chapterIndex >= 0 && chapterIndex < book.chapters.length) {
      const chapter = book.chapters[chapterIndex]
      const isEditing = editingChapter === chapter.id
      const chapterText = chapterTexts.get(chapter.id) || ''

      if (isEditing) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h2
              style={{
                fontFamily: 'Libre Baskerville, Georgia, serif',
                fontSize: '20px',
                fontWeight: 'bold',
                marginBottom: '24px',
                textAlign: 'center',
                color: 'rgba(0,0,0,0.85)',
              }}
            >
              {chapter.title}
            </h2>
            <textarea
              value={chapterText}
              onChange={(e) => handleChapterTextChange(chapter.id, e.target.value)}
              onBlur={() => handleChapterBlur(chapter.id)}
              autoFocus
              style={{
                fontFamily: 'Libre Baskerville, Georgia, serif',
                fontSize: '14px',
                lineHeight: '1.6',
                color: 'rgba(0,0,0,0.85)',
                border: 'none',
                outline: 'none',
                resize: 'none',
                background: 'transparent',
                width: '100%',
                flex: 1,
                padding: 0,
                margin: 0,
                cursor: 'text',
              }}
            />
          </div>
        )
      }

      return (
        <>
          <h2
            style={{
              fontFamily: 'Libre Baskerville, Georgia, serif',
              fontSize: '20px',
              fontWeight: 'bold',
              marginBottom: '24px',
              textAlign: 'center',
              color: 'rgba(0,0,0,0.85)',
            }}
          >
            {chapter.title}
          </h2>
          <div
            onClick={() => setEditingChapter(chapter.id)}
            style={{
              cursor: 'text',
              fontFamily: 'Libre Baskerville, Georgia, serif',
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'rgba(0,0,0,0.85)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {chapterText}
          </div>
        </>
      )
    }

    return null
  }

  // Triangle styles
  const cornerTriangleStyle = {
    position: 'absolute' as const,
    width: 0,
    height: 0,
    cursor: 'pointer',
    transition: 'border-color 0.2s ease',
    zIndex: 10,
  }

  const topLeftTriangleStyle = {
    ...cornerTriangleStyle,
    top: 0,
    left: 0,
    borderTop: '60px solid rgba(0,0,0,0.08)',
    borderRight: '60px solid transparent',
  }

  const topRightTriangleStyle = {
    ...cornerTriangleStyle,
    top: 0,
    right: 0,
    borderTop: '60px solid rgba(0,0,0,0.08)',
    borderLeft: '60px solid transparent',
  }

  const leftPageNumber = getLeftPageNumber()
  const rightPageNumber = getRightPageNumber()

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#F5EFE7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Home button in bottom-left */}
      <div style={{ position: 'absolute', bottom: '24px', left: '24px', zIndex: 20 }}>
        <button
          onClick={() => {
            saveActiveEdits()
            navigate('/')
          }}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '8px',
            opacity: 0.5,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.5'
          }}
        >
          🏠
        </button>
      </div>

      {/* Two-page spread */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          padding: '20px',
        }}
      >
        {/* Left Page */}
        <div
          style={{
            position: 'relative',
            width: '40vw',
            height: '90vh',
            backgroundColor: 'white',
            padding: '50px',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top-left corner triangle for previous spread */}
          {currentSpread > 0 && (
            <div
              onClick={(e) => {
                e.stopPropagation()
                handlePreviousSpread()
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderTopColor = 'rgba(0,0,0,0.25)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderTopColor = 'rgba(0,0,0,0.08)'
              }}
              style={topLeftTriangleStyle}
            />
          )}
          {renderPageContent(leftPageNumber)}
        </div>

        {/* Right Page */}
        <div
          style={{
            position: 'relative',
            width: '40vw',
            height: '90vh',
            backgroundColor: 'white',
            padding: '50px',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top-right corner triangle for next spread */}
          {currentSpread < Math.ceil((3 + book.chapters.length) / 2) - 1 && (
            <div
              onClick={(e) => {
                e.stopPropagation()
                handleNextSpread()
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderTopColor = 'rgba(0,0,0,0.25)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderTopColor = 'rgba(0,0,0,0.08)'
              }}
              style={topRightTriangleStyle}
            />
          )}
          {renderPageContent(rightPageNumber)}
        </div>
      </div>
    </div>
  )
}
