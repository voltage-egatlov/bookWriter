import { useEffect, useRef } from 'react'
import type { Book } from '@/lib/types'
import { EditorProvider } from './EditorContext'
import { PageSpread } from './PageSpread'
import { useKeyboardInput } from '@/lib/editor/useKeyboardInput'

interface BookEditorInnerProps {
  onSave: () => void
}

function BookEditorInner({ onSave }: BookEditorInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Set up keyboard input handling
  useKeyboardInput(onSave)

  // Focus the container on mount to capture keyboard events
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      style={{
        outline: 'none',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5EFE7',
      }}
    >
      <PageSpread />
    </div>
  )
}

interface BookEditorProps {
  book: Book
  onBookChange: (book: Book) => void
  onSave: () => void
}

export function BookEditor({ book, onBookChange, onSave }: BookEditorProps) {
  return (
    <EditorProvider book={book} onBookChange={onBookChange}>
      <BookEditorInner onSave={onSave} />
    </EditorProvider>
  )
}
