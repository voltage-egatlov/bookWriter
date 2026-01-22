import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import type { Book, Chapter } from '@/lib/types'
import type {
  EditorState,
  EditorAction,
  EditorContextValue,
  CursorPosition,
} from '@/lib/editor/types'
import { paginateBook, getSpreadForPage, findPageForCursor } from '@/lib/editor/pagination'

function getInitialCursor(): CursorPosition {
  return {
    chapterId: null,
    contentType: 'title',
    offset: 0,
  }
}

function getInitialState(book: Book, fileHandle: FileSystemFileHandle | null): EditorState {
  return {
    book,
    pages: paginateBook(book),
    currentSpread: 0,
    cursor: getInitialCursor(),
    cursorVisible: false,
    fileHandle,
  }
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_CURSOR': {
      const newCursor = action.payload
      const pageNumber = findPageForCursor(
        state.pages,
        newCursor.chapterId,
        newCursor.contentType,
        newCursor.offset
      )
      const newSpread = getSpreadForPage(pageNumber)

      return {
        ...state,
        cursor: newCursor,
        cursorVisible: true,
        currentSpread: newSpread,
      }
    }

    case 'HIDE_CURSOR': {
      return {
        ...state,
        cursorVisible: false,
      }
    }

    case 'SET_SPREAD': {
      return {
        ...state,
        currentSpread: action.payload,
      }
    }

    case 'SET_PAGES': {
      return {
        ...state,
        pages: action.payload,
      }
    }

    case 'UPDATE_BOOK': {
      const newBook = action.payload
      const newPages = paginateBook(newBook)

      // Ensure cursor is still valid
      let newCursor = state.cursor
      const pageNumber = findPageForCursor(
        newPages,
        newCursor.chapterId,
        newCursor.contentType,
        newCursor.offset
      )

      return {
        ...state,
        book: newBook,
        pages: newPages,
        currentSpread: getSpreadForPage(pageNumber),
      }
    }

    case 'UPDATE_CHAPTER': {
      const updatedChapter = action.payload
      const newChapters = state.book.chapters.map((ch) =>
        ch.id === updatedChapter.id ? updatedChapter : ch
      )
      const newBook = { ...state.book, chapters: newChapters }
      const newPages = paginateBook(newBook)

      return {
        ...state,
        book: newBook,
        pages: newPages,
      }
    }

    case 'INSERT_TEXT': {
      const { text } = action.payload
      const { cursor, book } = state

      let newBook: Book
      let newCursor: CursorPosition

      if (cursor.contentType === 'title') {
        const newTitle = book.title.slice(0, cursor.offset) + text + book.title.slice(cursor.offset)
        newBook = { ...book, title: newTitle }
        newCursor = { ...cursor, offset: cursor.offset + text.length }
      } else if (cursor.contentType === 'author') {
        const newAuthor =
          book.author.slice(0, cursor.offset) + text + book.author.slice(cursor.offset)
        newBook = { ...book, author: newAuthor }
        newCursor = { ...cursor, offset: cursor.offset + text.length }
      } else if (cursor.contentType === 'dedication') {
        const dedication = book.dedication || ''
        const newDedication =
          dedication.slice(0, cursor.offset) + text + dedication.slice(cursor.offset)
        newBook = { ...book, dedication: newDedication }
        newCursor = { ...cursor, offset: cursor.offset + text.length }
      } else if (cursor.contentType === 'chapter-title' && cursor.chapterId) {
        const chapter = book.chapters.find((ch) => ch.id === cursor.chapterId)
        if (!chapter) return state

        const newTitle =
          chapter.title.slice(0, cursor.offset) + text + chapter.title.slice(cursor.offset)
        const newChapters = book.chapters.map((ch) =>
          ch.id === cursor.chapterId ? { ...ch, title: newTitle } : ch
        )
        newBook = { ...book, chapters: newChapters }
        newCursor = { ...cursor, offset: cursor.offset + text.length }
      } else if (cursor.contentType === 'chapter-content' && cursor.chapterId) {
        const chapter = book.chapters.find((ch) => ch.id === cursor.chapterId)
        if (!chapter) return state

        const newContent =
          chapter.content.slice(0, cursor.offset) + text + chapter.content.slice(cursor.offset)
        const newChapters = book.chapters.map((ch) =>
          ch.id === cursor.chapterId ? { ...ch, content: newContent } : ch
        )
        newBook = { ...book, chapters: newChapters }
        newCursor = { ...cursor, offset: cursor.offset + text.length }
      } else {
        return state
      }

      const newPages = paginateBook(newBook)
      const pageNumber = findPageForCursor(
        newPages,
        newCursor.chapterId,
        newCursor.contentType,
        newCursor.offset
      )

      return {
        ...state,
        book: newBook,
        pages: newPages,
        cursor: newCursor,
        currentSpread: getSpreadForPage(pageNumber),
      }
    }

    case 'DELETE_TEXT': {
      const { direction } = action.payload
      const { cursor, book } = state

      if (direction === 'backward' && cursor.offset === 0) {
        // At the start of content, can't delete backward within same content
        // (cross-content navigation handled separately)
        return state
      }

      let newBook: Book
      let newCursor: CursorPosition
      const deleteOffset = direction === 'backward' ? cursor.offset - 1 : cursor.offset

      if (cursor.contentType === 'title') {
        if (direction === 'forward' && cursor.offset >= book.title.length) return state
        const newTitle = book.title.slice(0, deleteOffset) + book.title.slice(deleteOffset + 1)
        newBook = { ...book, title: newTitle }
        newCursor = {
          ...cursor,
          offset: direction === 'backward' ? cursor.offset - 1 : cursor.offset,
        }
      } else if (cursor.contentType === 'author') {
        if (direction === 'forward' && cursor.offset >= book.author.length) return state
        const newAuthor = book.author.slice(0, deleteOffset) + book.author.slice(deleteOffset + 1)
        newBook = { ...book, author: newAuthor }
        newCursor = {
          ...cursor,
          offset: direction === 'backward' ? cursor.offset - 1 : cursor.offset,
        }
      } else if (cursor.contentType === 'dedication') {
        const dedication = book.dedication || ''
        if (direction === 'forward' && cursor.offset >= dedication.length) return state
        const newDedication = dedication.slice(0, deleteOffset) + dedication.slice(deleteOffset + 1)
        newBook = { ...book, dedication: newDedication }
        newCursor = {
          ...cursor,
          offset: direction === 'backward' ? cursor.offset - 1 : cursor.offset,
        }
      } else if (cursor.contentType === 'chapter-title' && cursor.chapterId) {
        const chapter = book.chapters.find((ch) => ch.id === cursor.chapterId)
        if (!chapter) return state
        if (direction === 'forward' && cursor.offset >= chapter.title.length) return state

        const newTitle =
          chapter.title.slice(0, deleteOffset) + chapter.title.slice(deleteOffset + 1)

        // Handle chapter deletion when title is empty
        if (newTitle === '' && direction === 'backward') {
          if (chapter.order === 0) {
            // First chapter - restore default title
            const newChapters = book.chapters.map((ch) =>
              ch.id === cursor.chapterId ? { ...ch, title: 'Chapter 1' } : ch
            )
            newBook = { ...book, chapters: newChapters }
            newCursor = { ...cursor, offset: 'Chapter 1'.length }
          } else {
            // Merge into previous chapter
            const prevChapter = book.chapters.find((c) => c.order === chapter.order - 1)
            if (!prevChapter) return state

            const mergedContent = prevChapter.content + '\n\n' + chapter.content
            const newChapters = book.chapters
              .filter((c) => c.id !== chapter.id)
              .map((c) => (c.id === prevChapter.id ? { ...c, content: mergedContent } : c))
              .map((c, idx) => ({ ...c, order: idx }))

            newBook = { ...book, chapters: newChapters }
            newCursor = {
              chapterId: prevChapter.id,
              contentType: 'chapter-content',
              offset: prevChapter.content.length,
            }
          }
        } else {
          const newChapters = book.chapters.map((ch) =>
            ch.id === cursor.chapterId ? { ...ch, title: newTitle } : ch
          )
          newBook = { ...book, chapters: newChapters }
          newCursor = {
            ...cursor,
            offset: direction === 'backward' ? cursor.offset - 1 : cursor.offset,
          }
        }
      } else if (cursor.contentType === 'chapter-content' && cursor.chapterId) {
        const chapter = book.chapters.find((ch) => ch.id === cursor.chapterId)
        if (!chapter) return state
        if (direction === 'forward' && cursor.offset >= chapter.content.length) return state

        const newContent =
          chapter.content.slice(0, deleteOffset) + chapter.content.slice(deleteOffset + 1)
        const newChapters = book.chapters.map((ch) =>
          ch.id === cursor.chapterId ? { ...ch, content: newContent } : ch
        )
        newBook = { ...book, chapters: newChapters }
        newCursor = {
          ...cursor,
          offset: direction === 'backward' ? cursor.offset - 1 : cursor.offset,
        }
      } else {
        return state
      }

      const newPages = paginateBook(newBook)
      const pageNumber = findPageForCursor(
        newPages,
        newCursor.chapterId,
        newCursor.contentType,
        newCursor.offset
      )

      return {
        ...state,
        book: newBook,
        pages: newPages,
        cursor: newCursor,
        currentSpread: getSpreadForPage(pageNumber),
      }
    }

    case 'CREATE_CHAPTER': {
      const { cursor, book } = state

      // Can only create chapter when in chapter content
      if (cursor.contentType !== 'chapter-content' || !cursor.chapterId) {
        return state
      }

      const currentChapter = book.chapters.find((c) => c.id === cursor.chapterId)
      if (!currentChapter) return state

      // Split content at cursor
      const contentBefore = currentChapter.content.slice(0, cursor.offset)
      const contentAfter = currentChapter.content.slice(cursor.offset).trimStart()

      // Update current chapter
      const updatedChapter = { ...currentChapter, content: contentBefore }

      // Create new chapter
      const newChapterOrder = currentChapter.order + 1
      const newChapter: Chapter = {
        id: crypto.randomUUID(),
        title: `Chapter ${newChapterOrder + 1}`,
        content: contentAfter,
        order: newChapterOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Insert and reorder
      const currentIndex = book.chapters.findIndex((c) => c.id === currentChapter.id)
      const newChapters = [...book.chapters]
      newChapters[currentIndex] = updatedChapter
      newChapters.splice(currentIndex + 1, 0, newChapter)

      // Reorder subsequent chapters
      newChapters.forEach((ch, idx) => {
        ch.order = idx
      })

      const newBook = { ...book, chapters: newChapters }
      const newPages = paginateBook(newBook)

      // Move cursor to start of new chapter title
      const newCursor: CursorPosition = {
        chapterId: newChapter.id,
        contentType: 'chapter-title',
        offset: 0,
      }

      const pageNumber = findPageForCursor(
        newPages,
        newCursor.chapterId,
        newCursor.contentType,
        newCursor.offset
      )

      return {
        ...state,
        book: newBook,
        pages: newPages,
        cursor: newCursor,
        currentSpread: getSpreadForPage(pageNumber),
      }
    }

    case 'TOGGLE_FORMAT': {
      // TODO: Implement markdown formatting toggle
      return state
    }

    default:
      return state
  }
}

const EditorContext = createContext<EditorContextValue | null>(null)

interface EditorProviderProps {
  children: ReactNode
  book: Book
  fileHandle: FileSystemFileHandle | null
  onBookChange?: (book: Book) => void
}

export function EditorProvider({ children, book, fileHandle, onBookChange }: EditorProviderProps) {
  const [state, dispatch] = useReducer(editorReducer, getInitialState(book, fileHandle))

  // Update pages when book changes externally
  useEffect(() => {
    if (book !== state.book) {
      dispatch({ type: 'UPDATE_BOOK', payload: book })
    }
  }, [book])

  // Notify parent of book changes
  useEffect(() => {
    onBookChange?.(state.book)
  }, [state.book, onBookChange])

  const getContentAtCursor = useCallback(() => {
    const { cursor, book } = state

    if (cursor.contentType === 'title') return book.title
    if (cursor.contentType === 'author') return book.author
    if (cursor.contentType === 'dedication') return book.dedication || ''

    if (cursor.chapterId) {
      const chapter = book.chapters.find((c) => c.id === cursor.chapterId)
      if (chapter) {
        if (cursor.contentType === 'chapter-title') return chapter.title
        if (cursor.contentType === 'chapter-content') return chapter.content
      }
    }

    return ''
  }, [state])

  const setContentAtCursor = useCallback(
    (content: string) => {
      const { cursor, book } = state

      if (cursor.contentType === 'title') {
        dispatch({ type: 'UPDATE_BOOK', payload: { ...book, title: content } })
      } else if (cursor.contentType === 'author') {
        dispatch({ type: 'UPDATE_BOOK', payload: { ...book, author: content } })
      } else if (cursor.contentType === 'dedication') {
        dispatch({ type: 'UPDATE_BOOK', payload: { ...book, dedication: content } })
      } else if (cursor.chapterId) {
        const chapter = book.chapters.find((c) => c.id === cursor.chapterId)
        if (chapter) {
          if (cursor.contentType === 'chapter-title') {
            dispatch({ type: 'UPDATE_CHAPTER', payload: { ...chapter, title: content } })
          } else if (cursor.contentType === 'chapter-content') {
            dispatch({ type: 'UPDATE_CHAPTER', payload: { ...chapter, content: content } })
          }
        }
      }
    },
    [state]
  )

  const contextValue = useMemo<EditorContextValue>(
    () => ({
      ...state,
      dispatch,
      getContentAtCursor,
      setContentAtCursor,
    }),
    [state, getContentAtCursor, setContentAtCursor]
  )

  return <EditorContext.Provider value={contextValue}>{children}</EditorContext.Provider>
}

export function useEditorContext(): EditorContextValue {
  const context = useContext(EditorContext)
  if (!context) {
    throw new Error('useEditorContext must be used within an EditorProvider')
  }
  return context
}
