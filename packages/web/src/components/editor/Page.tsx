import { useRef, useCallback } from 'react'
import type { PageContent } from '@/lib/editor/types'
import { PAGE_DIMENSIONS, EDITOR_FONT } from '@/lib/editor/constants'
import { getSpreadForPage } from '@/lib/editor/pagination'
import { PageSegment } from './PageSegment'
import { useEditorContext } from './EditorContext'

interface PageProps {
  page: PageContent | undefined
  position: 'left' | 'right'
}

export function Page({ page, position }: PageProps) {
  const pageRef = useRef<HTMLDivElement>(null)
  const { book, pages, dispatch } = useEditorContext()

  // Navigate to TOC (page 2)
  const navigateToTOC = useCallback(() => {
    const tocSpread = getSpreadForPage(2)
    dispatch({ type: 'SET_SPREAD', payload: tocSpread })
  }, [dispatch])

  // Navigate to a specific chapter
  const navigateToChapter = useCallback(
    (chapterId: string) => {
      // Find the first page that contains this chapter
      for (const p of pages) {
        const hasChapter = p.segments.some(
          (s) => s.chapterId === chapterId && s.contentType === 'chapter-title'
        )
        if (hasChapter) {
          const spread = getSpreadForPage(p.pageNumber)
          dispatch({ type: 'SET_SPREAD', payload: spread })
          return
        }
      }
    },
    [pages, dispatch]
  )

  // Render table of contents with clickable chapters
  const renderTOC = useCallback(() => {
    return (
      <div style={{ paddingTop: '20px' }}>
        <h2
          style={{
            fontSize: `${EDITOR_FONT.titleSize}px`,
            fontWeight: 'bold',
            marginBottom: '30px',
            textAlign: 'center',
          }}
        >
          Table of Contents
        </h2>
        <div style={{ fontSize: `${EDITOR_FONT.size}px` }}>
          {book.chapters.map((chapter, index) => (
            <div
              key={chapter.id}
              onClick={() => navigateToChapter(chapter.id)}
              style={{
                marginBottom: '10px',
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'rgba(0, 0, 0, 0.6)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'inherit'
              }}
            >
              {index + 1}. {chapter.title}
            </div>
          ))}
        </div>
      </div>
    )
  }, [book.chapters, navigateToChapter])

  // Determine if this is a special page (title, dedication, TOC)
  const isSpecialPage = page && page.pageNumber < 3

  // Render header based on position
  const renderHeader = () => {
    if (!page || isSpecialPage) return null

    if (position === 'left') {
      // Author name on left page
      return (
        <div
          style={{
            position: 'absolute',
            top: '15px',
            left: `${PAGE_DIMENSIONS.paddingPx}px`,
            right: `${PAGE_DIMENSIONS.paddingPx}px`,
            fontSize: '11px',
            color: 'rgba(0, 0, 0, 0.4)',
            fontStyle: 'italic',
          }}
        >
          {book.author}
        </div>
      )
    } else {
      // Book title on right page (clickable to TOC)
      return (
        <div
          onClick={navigateToTOC}
          style={{
            position: 'absolute',
            top: '15px',
            left: `${PAGE_DIMENSIONS.paddingPx}px`,
            right: `${PAGE_DIMENSIONS.paddingPx}px`,
            fontSize: '11px',
            color: 'rgba(0, 0, 0, 0.4)',
            textAlign: 'right',
            cursor: 'pointer',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'rgba(0, 0, 0, 0.7)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(0, 0, 0, 0.4)'
          }}
        >
          {book.title}
        </div>
      )
    }
  }

  // Render page number at bottom
  const renderPageNumber = () => {
    if (!page) return null

    // Page numbers start from 1 for display (page 0 = page 1)
    const displayPageNumber = page.pageNumber + 1

    return (
      <div
        style={{
          position: 'absolute',
          bottom: '15px',
          left: `${PAGE_DIMENSIONS.paddingPx}px`,
          right: `${PAGE_DIMENSIONS.paddingPx}px`,
          fontSize: '11px',
          color: 'rgba(0, 0, 0, 0.4)',
          textAlign: position === 'left' ? 'left' : 'right',
        }}
      >
        {displayPageNumber}
      </div>
    )
  }

  if (!page) {
    // Empty page
    return (
      <div
        style={{
          width: `${PAGE_DIMENSIONS.widthVw}vw`,
          height: `${PAGE_DIMENSIONS.heightVh}vh`,
          backgroundColor: 'white',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          padding: `${PAGE_DIMENSIONS.paddingPx}px`,
          overflow: 'hidden',
          fontFamily: EDITOR_FONT.family,
          position: 'relative',
        }}
      />
    )
  }

  const hasTOC = page.segments.some((s) => s.contentType === 'toc')

  return (
    <div
      ref={pageRef}
      lang="en"
      style={{
        width: `${PAGE_DIMENSIONS.widthVw}vw`,
        height: `${PAGE_DIMENSIONS.heightVh}vh`,
        backgroundColor: 'white',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        padding: `${PAGE_DIMENSIONS.paddingPx}px`,
        paddingTop: isSpecialPage ? `${PAGE_DIMENSIONS.paddingPx}px` : '40px',
        overflow: 'hidden',
        fontFamily: EDITOR_FONT.family,
        position: 'relative',
      }}
    >
      {renderHeader()}
      {hasTOC
        ? renderTOC()
        : page.segments.map((segment) => (
            <PageSegment
              key={`${segment.chapterId}-${segment.contentType}-${segment.startOffset}`}
              segment={segment}
            />
          ))}
      {renderPageNumber()}
    </div>
  )
}
