import { useState, useEffect } from 'react'
import { Book } from '@/lib/types'
import { Sidebar } from './Sidebar'
import { PageView } from './PageView'
import { useBook } from '@/contexts/BookContext'
import { usePageAnimation } from '@/lib/hooks/usePageAnimation'
import bookStyles from '@/styles/book-styles.module.css'

interface BookViewProps {
  book: Book
  isEditable?: boolean
}

export function BookView({ book, isEditable = false }: BookViewProps) {
  const { updateBlockContent } = useBook()
  const { isAnimating, triggerAnimation } = usePageAnimation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0)

  // Flatten all blocks from all chapters with metadata
  const allBlocks = book.chapters.flatMap((chapter) =>
    chapter.blocks.map((block) => ({
      block,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
    }))
  )

  // Calculate total spreads (2 blocks per spread)
  const totalSpreads = Math.ceil(allBlocks.length / 2)

  // Load last position from localStorage and save book metadata
  useEffect(() => {
    // Save book title and last opened timestamp
    localStorage.setItem(`book-title-${book.id}`, book.title)
    localStorage.setItem(`book-last-opened-${book.id}`, Date.now().toString())

    const savedPosition = localStorage.getItem(`book-position-${book.id}`)
    if (savedPosition) {
      try {
        const { spreadIndex } = JSON.parse(savedPosition)
        if (spreadIndex >= 0 && spreadIndex < totalSpreads) {
          setCurrentSpreadIndex(spreadIndex)
        }
      } catch (e) {
        console.error('Failed to load saved position:', e)
      }
    }
  }, [book.id, book.title, totalSpreads])

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      `book-position-${book.id}`,
      JSON.stringify({ spreadIndex: currentSpreadIndex })
    )
  }, [book.id, currentSpreadIndex])

  // Get left and right blocks for current spread
  const leftBlockIndex = currentSpreadIndex * 2
  const rightBlockIndex = leftBlockIndex + 1

  const leftBlockData = allBlocks[leftBlockIndex]
  const rightBlockData = allBlocks[rightBlockIndex]

  // Navigation handlers
  const hasPrev = currentSpreadIndex > 0
  const hasNext = currentSpreadIndex < totalSpreads - 1

  const handleNavigate = (direction: 'prev' | 'next') => {
    triggerAnimation(() => {
      if (direction === 'next' && hasNext) {
        setCurrentSpreadIndex((prev) => prev + 1)
      } else if (direction === 'prev' && hasPrev) {
        setCurrentSpreadIndex((prev) => prev - 1)
      }
    })
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev) {
        handleNavigate('prev')
      } else if (e.key === 'ArrowRight' && hasNext) {
        handleNavigate('next')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasPrev, hasNext])

  const handleChapterSelect = (chapterId: string) => {
    // Find the first block of this chapter
    const blockIndex = allBlocks.findIndex((b) => b.chapterId === chapterId)
    if (blockIndex !== -1) {
      const spreadIndex = Math.floor(blockIndex / 2)
      triggerAnimation(() => {
        setCurrentSpreadIndex(spreadIndex)
      })
    }
  }

  if (allBlocks.length === 0) {
    return <div>No content available</div>
  }

  // Determine current chapter for sidebar highlighting
  const currentChapterId =
    leftBlockData?.chapterId || rightBlockData?.chapterId || book.chapters[0]?.id

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar
        book={book}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        currentChapterId={currentChapterId}
        onChapterSelect={handleChapterSelect}
      />

      <div className={bookStyles.bookContainer}>
        <div className={bookStyles.pageSpread}>
          {/* Left Page */}
          {leftBlockData && (
            <PageView
              block={leftBlockData.block}
              chapterId={leftBlockData.chapterId}
              chapterTitle={leftBlockData.chapterTitle}
              position="left"
              isAnimating={isAnimating}
              isEditable={isEditable}
              onBlockEdit={updateBlockContent}
            />
          )}

          {/* Gutter */}
          <div className={bookStyles.gutter} />

          {/* Right Page */}
          {rightBlockData && (
            <PageView
              block={rightBlockData.block}
              chapterId={rightBlockData.chapterId}
              chapterTitle={rightBlockData.chapterTitle}
              position="right"
              isAnimating={isAnimating}
              isEditable={isEditable}
              onBlockEdit={updateBlockContent}
            />
          )}
        </div>

        {/* Navigation Controls */}
        <div className={bookStyles.navigation}>
          <button
            onClick={() => handleNavigate('prev')}
            disabled={!hasPrev}
            className={bookStyles.navButton}
          >
            ← Previous
          </button>
          <button
            onClick={() => handleNavigate('next')}
            disabled={!hasNext}
            className={bookStyles.navButton}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
