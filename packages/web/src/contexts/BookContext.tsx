import React, { createContext, useContext, useState, useCallback } from 'react'
import { Book } from '@/lib/types'
import { parseBk } from '@/lib/wasm'

interface BookContextType {
  book: Book | null
  isEditing: boolean
  setBook: (book: Book | null) => void
  setIsEditing: (editing: boolean) => void
  updateBlockContent: (chapterId: string, blockId: string, newContent: string) => Promise<void>
  updateChapterTitle: (chapterId: string, newTitle: string) => Promise<void>
  serializeBook: () => string
  reloadFromSource: (source: string) => Promise<void>
}

const BookContext = createContext<BookContextType | undefined>(undefined)

export function BookProvider({ children }: { children: React.ReactNode }) {
  const [book, setBook] = useState<Book | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  /**
   * Serialize the current book back to .bk format
   */
  const serializeBook = useCallback((): string => {
    if (!book) return ''

    const lines: string[] = []

    // Metadata
    lines.push(`@title ${book.title}`)
    lines.push(`@author ${book.author}`)
    lines.push(`@id ${book.id}`)
    if (book.dedication) {
      lines.push(`@dedication ${book.dedication}`)
    }
    lines.push('')

    // Chapters
    for (const chapter of book.chapters) {
      lines.push(`#chapter ${chapter.title}`)
      lines.push('')

      for (const block of chapter.blocks) {
        lines.push('@page')
        lines.push(block.content)
        lines.push('')
      }
    }

    return lines.join('\n')
  }, [book])

  /**
   * Reload book from .bk source string
   * Re-parses and updates the book state
   */
  const reloadFromSource = useCallback(async (source: string) => {
    try {
      const newBook = await parseBk(source)
      setBook(newBook)
    } catch (error) {
      console.error('Failed to reload book:', error)
      throw error
    }
  }, [])

  /**
   * Update a block's content and re-parse the book
   */
  const updateBlockContent = useCallback(
    async (chapterId: string, blockId: string, newContent: string) => {
      if (!book) return

      // Create updated book structure
      const updatedBook: Book = {
        ...book,
        chapters: book.chapters.map((chapter) => {
          if (chapter.id !== chapterId) return chapter

          return {
            ...chapter,
            blocks: chapter.blocks.map((block) => {
              if (block.id !== blockId) return block
              return {
                ...block,
                content: newContent,
              }
            }),
          }
        }),
      }

      // Serialize and re-parse to ensure consistency
      const serialized = serializeBookObject(updatedBook)
      await reloadFromSource(serialized)
    },
    [book, reloadFromSource]
  )

  /**
   * Update a chapter's title and re-parse the book
   */
  const updateChapterTitle = useCallback(
    async (chapterId: string, newTitle: string) => {
      if (!book) return

      // Create updated book structure
      const updatedBook: Book = {
        ...book,
        chapters: book.chapters.map((chapter) => {
          if (chapter.id !== chapterId) return chapter
          return {
            ...chapter,
            title: newTitle,
          }
        }),
      }

      // Serialize and re-parse
      const serialized = serializeBookObject(updatedBook)
      await reloadFromSource(serialized)
    },
    [book, reloadFromSource]
  )

  /**
   * Helper to serialize a book object to .bk format
   */
  const serializeBookObject = (bookObj: Book): string => {
    const lines: string[] = []

    lines.push(`@title ${bookObj.title}`)
    lines.push(`@author ${bookObj.author}`)
    lines.push(`@id ${bookObj.id}`)
    if (bookObj.dedication) {
      lines.push(`@dedication ${bookObj.dedication}`)
    }
    lines.push('')

    for (const chapter of bookObj.chapters) {
      lines.push(`#chapter ${chapter.title}`)
      lines.push('')

      for (const block of chapter.blocks) {
        lines.push('@page')
        lines.push(block.content)
        lines.push('')
      }
    }

    return lines.join('\n')
  }

  const value: BookContextType = {
    book,
    isEditing,
    setBook,
    setIsEditing,
    updateBlockContent,
    updateChapterTitle,
    serializeBook,
    reloadFromSource,
  }

  return <BookContext.Provider value={value}>{children}</BookContext.Provider>
}

export function useBook() {
  const context = useContext(BookContext)
  if (context === undefined) {
    throw new Error('useBook must be used within a BookProvider')
  }
  return context
}
