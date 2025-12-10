import { Block } from '@/lib/types'
import { EditableBlock } from './EditableBlock'
import bookStyles from '@/styles/book-styles.module.css'

interface PageViewProps {
  block: Block
  chapterId: string
  chapterTitle: string
  position: 'left' | 'right'
  isAnimating?: boolean
  showNavigation?: boolean
  onNavigate?: (direction: 'prev' | 'next') => void
  hasPrev?: boolean
  hasNext?: boolean
  isEditable?: boolean
  onBlockEdit?: (chapterId: string, blockId: string, newContent: string) => Promise<void>
}

export function PageView({
  block,
  chapterId,
  chapterTitle,
  position,
  isAnimating = false,
  isEditable = false,
  onBlockEdit,
}: PageViewProps) {
  // Determine animation class based on position and state
  const animationClass = isAnimating
    ? position === 'left'
      ? bookStyles.pageEnterLeft
      : bookStyles.pageEnterRight
    : ''

  // Page styling based on position
  const pageClass = position === 'left' ? bookStyles.pageLeft : bookStyles.pageRight

  return (
    <div className={`${pageClass} ${animationClass} ${bookStyles.pageVignette}`}>
      <div className={bookStyles.pageContent}>
        {/* Chapter Title */}
        <h2 className={bookStyles.chapterTitle}>{chapterTitle}</h2>

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
          <div className={bookStyles.bodyText}>{block.content}</div>
        )}

        {/* Page Number */}
        <div className={bookStyles.pageNumber}>Page {block.order + 1}</div>
      </div>
    </div>
  )
}
