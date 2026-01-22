import { useCallback, createElement } from 'react'
import type { PageSegment as PageSegmentType, CursorPosition } from '@/lib/editor/types'
import { EDITOR_FONT } from '@/lib/editor/constants'
import { Cursor } from './Cursor'
import { useEditorContext } from './EditorContext'
import { parseMarkdown, renderFormattedNodes } from '@/lib/editor/markdown'

interface PageSegmentProps {
  segment: PageSegmentType
}

export function PageSegment({ segment }: PageSegmentProps) {
  const { cursor, cursorVisible, dispatch } = useEditorContext()

  // Check if cursor is in this segment and visible
  const isCursorInSegment =
    cursorVisible &&
    cursor.chapterId === segment.chapterId &&
    cursor.contentType === segment.contentType &&
    cursor.offset >= segment.startOffset &&
    cursor.offset <= segment.endOffset

  const localCursorOffset = isCursorInSegment ? cursor.offset - segment.startOffset : null

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Don't handle clicks on TOC
      if (segment.contentType === 'toc') return

      const element = event.currentTarget
      const rect = element.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      // Estimate character offset from click position
      // This is a rough estimate - actual implementation would use canvas measurement
      const lineHeight = EDITOR_FONT.size * EDITOR_FONT.lineHeight
      const charWidth = EDITOR_FONT.size * 0.55 // Approximate character width

      const lineIndex = Math.floor(y / lineHeight)
      const charIndex = Math.floor(x / charWidth)

      // Calculate approximate offset
      const lines = segment.text.split('\n')
      let offset = 0

      for (let i = 0; i < Math.min(lineIndex, lines.length); i++) {
        offset += lines[i].length + 1 // +1 for newline
      }

      if (lineIndex < lines.length) {
        offset += Math.min(charIndex, lines[lineIndex].length)
      }

      // Clamp to segment bounds
      offset = Math.max(0, Math.min(offset, segment.text.length))

      const newCursor: CursorPosition = {
        chapterId: segment.chapterId,
        contentType: segment.contentType as CursorPosition['contentType'],
        offset: segment.startOffset + offset,
      }

      dispatch({ type: 'SET_CURSOR', payload: newCursor })
    },
    [segment, dispatch]
  )

  // Check if content is empty and determine placeholder text
  const isEmpty = segment.text === ''
  const getPlaceholderText = (): string | null => {
    if (!isEmpty) return null
    switch (segment.contentType) {
      case 'title':
        return 'Untitled'
      case 'author':
        return 'Author name'
      case 'dedication':
        return 'Write your dedication...'
      case 'chapter-title':
        return 'Chapter title'
      case 'chapter-content':
        return 'Start writing...'
      default:
        return null
    }
  }
  const placeholderText = getPlaceholderText()

  // Parse markdown and render with cursor
  const nodes = parseMarkdown(segment.text)
  const cursorEl = createElement(Cursor, { key: 'cursor' })
  const renderedContent = renderFormattedNodes(nodes, localCursorOffset, cursorEl)

  // Determine styling based on content type
  const getStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
      hyphens: 'auto',
      WebkitHyphens: 'auto',
      cursor: segment.contentType === 'toc' ? 'default' : 'text',
      outline: 'none',
    }

    switch (segment.contentType) {
      case 'title':
        return {
          ...baseStyle,
          fontSize: `${EDITOR_FONT.mainTitleSize}px`,
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '20px',
        }
      case 'author':
        return {
          ...baseStyle,
          fontSize: `${EDITOR_FONT.authorSize}px`,
          textAlign: 'center',
          fontStyle: 'italic',
        }
      case 'dedication':
        return {
          ...baseStyle,
          fontSize: `${EDITOR_FONT.size}px`,
          textAlign: 'center',
          fontStyle: 'italic',
          paddingTop: '40%',
        }
      case 'toc':
        return {
          ...baseStyle,
          fontSize: `${EDITOR_FONT.size}px`,
        }
      case 'chapter-title':
        return {
          ...baseStyle,
          fontSize: `${EDITOR_FONT.titleSize}px`,
          fontWeight: 'bold',
          marginBottom: '20px',
        }
      case 'chapter-content':
        return {
          ...baseStyle,
          fontSize: `${EDITOR_FONT.size}px`,
          lineHeight: EDITOR_FONT.lineHeight,
        }
      default:
        return baseStyle
    }
  }

  return (
    <div onClick={handleClick} style={getStyle()}>
      {isEmpty && placeholderText && !isCursorInSegment ? (
        <span style={{ color: 'rgba(0, 0, 0, 0.3)' }}>{placeholderText}</span>
      ) : (
        <>
          {renderedContent}
          {/* Show cursor at end if offset equals text length */}
          {isCursorInSegment && localCursorOffset === segment.text.length && <Cursor />}
        </>
      )}
      {/* Show cursor when segment is empty and focused */}
      {isEmpty && isCursorInSegment && <Cursor />}
    </div>
  )
}
