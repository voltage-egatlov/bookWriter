import { useEffect, useCallback } from 'react'
import { useEditorContext } from '@/components/editor/EditorContext'
import { getPageContentDimensions } from './constants'
import { measureText, getLineAndColumn, getOffsetFromLine } from './textMeasurement'

export function useKeyboardInput(onSave: () => void) {
  const { cursor, book, pages, dispatch, getContentAtCursor } = useEditorContext()

  const moveCursor = useCallback(
    (direction: 'left' | 'right' | 'up' | 'down') => {
      const content = getContentAtCursor()
      const { width } = getPageContentDimensions()

      let newOffset = cursor.offset
      let newContentType = cursor.contentType
      let newChapterId = cursor.chapterId

      if (direction === 'left') {
        if (cursor.offset > 0) {
          newOffset = cursor.offset - 1
        }
        // Don't cross content boundaries on left
      } else if (direction === 'right') {
        if (cursor.offset < content.length) {
          newOffset = cursor.offset + 1
        }
        // Don't cross content boundaries on right
      } else if (direction === 'up' || direction === 'down') {
        const { line, column } = getLineAndColumn(content, cursor.offset, width)
        const measure = measureText(content, width)

        if (direction === 'up') {
          if (line > 0) {
            newOffset = getOffsetFromLine(content, line - 1, column, width)
          }
        } else {
          if (line < measure.lineCount - 1) {
            newOffset = getOffsetFromLine(content, line + 1, column, width)
          }
        }
      }

      if (
        newOffset !== cursor.offset ||
        newContentType !== cursor.contentType ||
        newChapterId !== cursor.chapterId
      ) {
        dispatch({
          type: 'SET_CURSOR',
          payload: {
            chapterId: newChapterId,
            contentType: newContentType,
            offset: newOffset,
          },
        })
      }
    },
    [cursor, book, pages, dispatch, getContentAtCursor]
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, shiftKey } = event

      // Escape to hide cursor
      if (key === 'Escape') {
        event.preventDefault()
        dispatch({ type: 'HIDE_CURSOR' })
        return
      }

      // Save shortcut
      if ((ctrlKey || metaKey) && key === 's') {
        event.preventDefault()
        onSave()
        return
      }

      // Create chapter shortcut (Ctrl+Shift+C)
      if ((ctrlKey || metaKey) && shiftKey && key === 'C') {
        event.preventDefault()
        dispatch({ type: 'CREATE_CHAPTER' })
        return
      }

      // Formatting shortcuts
      if ((ctrlKey || metaKey) && !shiftKey) {
        if (key === 'b') {
          event.preventDefault()
          dispatch({ type: 'TOGGLE_FORMAT', payload: 'bold' })
          return
        }
        if (key === 'i') {
          event.preventDefault()
          dispatch({ type: 'TOGGLE_FORMAT', payload: 'italic' })
          return
        }
        if (key === 'u') {
          event.preventDefault()
          dispatch({ type: 'TOGGLE_FORMAT', payload: 'underline' })
          return
        }
      }

      // Navigation
      if (key === 'ArrowLeft') {
        event.preventDefault()
        moveCursor('left')
        return
      }
      if (key === 'ArrowRight') {
        event.preventDefault()
        moveCursor('right')
        return
      }
      if (key === 'ArrowUp') {
        event.preventDefault()
        moveCursor('up')
        return
      }
      if (key === 'ArrowDown') {
        event.preventDefault()
        moveCursor('down')
        return
      }

      // Home/End
      if (key === 'Home') {
        event.preventDefault()
        dispatch({
          type: 'SET_CURSOR',
          payload: { ...cursor, offset: 0 },
        })
        return
      }
      if (key === 'End') {
        event.preventDefault()
        const content = getContentAtCursor()
        dispatch({
          type: 'SET_CURSOR',
          payload: { ...cursor, offset: content.length },
        })
        return
      }

      // Deletion
      if (key === 'Backspace') {
        event.preventDefault()
        dispatch({ type: 'DELETE_TEXT', payload: { direction: 'backward' } })
        return
      }
      if (key === 'Delete') {
        event.preventDefault()
        dispatch({ type: 'DELETE_TEXT', payload: { direction: 'forward' } })
        return
      }

      // Enter
      if (key === 'Enter') {
        event.preventDefault()
        dispatch({ type: 'INSERT_TEXT', payload: { text: '\n' } })
        return
      }

      // Tab (insert spaces)
      if (key === 'Tab') {
        event.preventDefault()
        dispatch({ type: 'INSERT_TEXT', payload: { text: '    ' } })
        return
      }

      // Regular character input
      if (key.length === 1 && !ctrlKey && !metaKey) {
        event.preventDefault()
        dispatch({ type: 'INSERT_TEXT', payload: { text: key } })
        return
      }
    },
    [cursor, dispatch, moveCursor, onSave, getContentAtCursor]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}
