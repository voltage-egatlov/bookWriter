import { useState, useEffect } from 'react'
import { Book } from '@/lib/types'
import { Sidebar } from './Sidebar'
import { PageView } from './PageView'
import { useBook } from '@/contexts/BookContext'

interface BookViewProps {
  book: Book
  isEditable?: boolean
}

export function BookView({ book, isEditable = false }: BookViewProps) {
  const { updateBlockContent } = useBook()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentChapterId, setCurrentChapterId] = useState<string>(book.chapters[0]?.id || '')
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0)

  // Load last position from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem(`book-position-${book.id}`)
    if (savedPosition) {
      try {
        const { chapterId, blockIndex } = JSON.parse(savedPosition)
        const chapterExists = book.chapters.find((c) => c.id === chapterId)
        if (chapterExists) {
          setCurrentChapterId(chapterId)
          setCurrentBlockIndex(blockIndex)
        }
      } catch (e) {
        console.error('Failed to load saved position:', e)
      }
    }
  }, [book.id, book.chapters])

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(
      `book-position-${book.id}`,
      JSON.stringify({ chapterId: currentChapterId, blockIndex: currentBlockIndex })
    )
  }, [book.id, currentChapterId, currentBlockIndex])

  const currentChapter = book.chapters.find((c) => c.id === currentChapterId)
  const currentBlock = currentChapter?.blocks[currentBlockIndex]

  // Calculate if we can navigate prev/next
  const hasPrev =
    currentBlockIndex > 0 || book.chapters.findIndex((c) => c.id === currentChapterId) > 0
  const hasNext =
    currentBlockIndex < (currentChapter?.blocks.length || 0) - 1 ||
    book.chapters.findIndex((c) => c.id === currentChapterId) < book.chapters.length - 1

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!currentChapter) return

    if (direction === 'next') {
      // Try to go to next block in current chapter
      if (currentBlockIndex < currentChapter.blocks.length - 1) {
        setCurrentBlockIndex(currentBlockIndex + 1)
      } else {
        // Go to first block of next chapter
        const currentChapterIndex = book.chapters.findIndex((c) => c.id === currentChapterId)
        if (currentChapterIndex < book.chapters.length - 1) {
          setCurrentChapterId(book.chapters[currentChapterIndex + 1].id)
          setCurrentBlockIndex(0)
        }
      }
    } else {
      // Try to go to previous block in current chapter
      if (currentBlockIndex > 0) {
        setCurrentBlockIndex(currentBlockIndex - 1)
      } else {
        // Go to last block of previous chapter
        const currentChapterIndex = book.chapters.findIndex((c) => c.id === currentChapterId)
        if (currentChapterIndex > 0) {
          const prevChapter = book.chapters[currentChapterIndex - 1]
          setCurrentChapterId(prevChapter.id)
          setCurrentBlockIndex(prevChapter.blocks.length - 1)
        }
      }
    }
  }

  const handleChapterSelect = (chapterId: string) => {
    setCurrentChapterId(chapterId)
    setCurrentBlockIndex(0)
  }

  if (!currentBlock || !currentChapter) {
    return <div>No content available</div>
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar
        book={book}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        currentChapterId={currentChapterId}
        onChapterSelect={handleChapterSelect}
      />
      <PageView
        block={currentBlock}
        chapterId={currentChapterId}
        chapterTitle={currentChapter.title}
        onNavigate={handleNavigate}
        hasPrev={hasPrev}
        hasNext={hasNext}
        isEditable={isEditable}
        onBlockEdit={updateBlockContent}
      />
    </div>
  )
}
