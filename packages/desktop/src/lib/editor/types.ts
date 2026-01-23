import type { Book, Chapter } from '../types'

// Content types that can be edited
export type ContentType = 'title' | 'author' | 'dedication' | 'chapter-title' | 'chapter-content'

// Represents a position within the book content
export interface CursorPosition {
  chapterId: string | null // null for title/author/dedication
  contentType: ContentType
  offset: number // character offset within that content
}

// A rendered segment that fits within a page
export interface PageSegment {
  contentType: ContentType | 'toc'
  chapterId: string | null
  text: string // The text slice for this segment
  startOffset: number // Where this segment starts in the original content
  endOffset: number // Where this segment ends
}

// A single page with its content segments
export interface PageContent {
  pageNumber: number
  segments: PageSegment[]
  availableHeight: number // Remaining height after segments
}

// Parsed markdown node for rendering
export interface FormattedNode {
  type: 'text' | 'bold' | 'italic' | 'underline'
  content: string
  startOffset: number
  endOffset: number
  children?: FormattedNode[]
}

// Text measurement result
export interface MeasurementResult {
  width: number
  height: number
  lineCount: number
  lineBreaks: number[] // Character indices where lines break
}

// Result of fitting text to a height
export interface FitResult {
  fittedText: string
  fittedCharCount: number
  remainingText: string
  lineCount: number
}

// Editor action types
export type EditorAction =
  | { type: 'SET_CURSOR'; payload: CursorPosition }
  | { type: 'HIDE_CURSOR' }
  | { type: 'INSERT_TEXT'; payload: { text: string } }
  | { type: 'DELETE_TEXT'; payload: { direction: 'backward' | 'forward' } }
  | { type: 'UPDATE_BOOK'; payload: Book }
  | { type: 'UPDATE_CHAPTER'; payload: Chapter }
  | { type: 'SET_SPREAD'; payload: number }
  | { type: 'TOGGLE_FORMAT'; payload: 'bold' | 'italic' | 'underline' }
  | { type: 'CREATE_CHAPTER' }
  | { type: 'SET_PAGES'; payload: PageContent[] }

// Editor state (desktop version - no FileSystemFileHandle)
export interface EditorState {
  // Book data
  book: Book

  // Pagination
  pages: PageContent[]
  currentSpread: number

  // Cursor
  cursor: CursorPosition
  cursorVisible: boolean
}

// Editor context value
export interface EditorContextValue extends EditorState {
  dispatch: React.Dispatch<EditorAction>
  getContentAtCursor: () => string
  setContentAtCursor: (content: string) => void
}
