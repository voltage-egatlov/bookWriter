import { Block } from '@/lib/types'
import { useEffect } from 'react'
import { EditableBlock } from './EditableBlock'

interface PageViewProps {
  block: Block
  chapterId: string
  chapterTitle: string
  onNavigate: (direction: 'prev' | 'next') => void
  hasPrev: boolean
  hasNext: boolean
  isEditable?: boolean
  onBlockEdit?: (chapterId: string, blockId: string, newContent: string) => Promise<void>
}

export function PageView({
  block,
  chapterId,
  chapterTitle,
  onNavigate,
  hasPrev,
  hasNext,
  isEditable = false,
  onBlockEdit,
}: PageViewProps) {
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev) {
        onNavigate('prev')
      } else if (e.key === 'ArrowRight' && hasNext) {
        onNavigate('next')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasPrev, hasNext, onNavigate])

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        background: '#fafafa',
      }}
    >
      {/* Page Content */}
      <div
        style={{
          maxWidth: '700px',
          width: '100%',
          background: 'white',
          padding: '60px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          minHeight: '500px',
        }}
      >
        {/* Chapter Title */}
        <h2 style={{ margin: '0 0 30px 0', fontSize: '24px', color: '#333' }}>{chapterTitle}</h2>

        {/* Page Content */}
        {isEditable && onBlockEdit ? (
          <EditableBlock
            block={block}
            chapterId={chapterId}
            isEditable={isEditable}
            onEdit={onBlockEdit}
            style={{
              fontSize: '18px',
              lineHeight: '1.8',
              color: '#333',
              whiteSpace: 'pre-wrap',
            }}
          />
        ) : (
          <div
            style={{
              fontSize: '18px',
              lineHeight: '1.8',
              color: '#333',
              whiteSpace: 'pre-wrap',
            }}
          >
            {block.content}
          </div>
        )}

        {/* Page Number */}
        <div
          style={{
            marginTop: '40px',
            textAlign: 'center',
            fontSize: '14px',
            color: '#999',
          }}
        >
          Page {block.order + 1}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '20px',
          marginTop: '30px',
        }}
      >
        <button
          onClick={() => onNavigate('prev')}
          disabled={!hasPrev}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: hasPrev ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: hasPrev ? 'pointer' : 'not-allowed',
          }}
        >
          ← Previous
        </button>
        <button
          onClick={() => onNavigate('next')}
          disabled={!hasNext}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: hasNext ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: hasNext ? 'pointer' : 'not-allowed',
          }}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
