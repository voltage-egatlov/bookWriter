import { useEditorContext } from './EditorContext'
import { Page } from './Page'
import { getTotalSpreads } from '@/lib/editor/pagination'

export function PageSpread() {
  const { pages, currentSpread, dispatch } = useEditorContext()

  const leftPageIndex = currentSpread * 2
  const rightPageIndex = currentSpread * 2 + 1

  const leftPage = pages[leftPageIndex]
  const rightPage = pages[rightPageIndex]

  const totalSpreads = getTotalSpreads(pages)
  const canGoPrev = currentSpread > 0
  const canGoNext = currentSpread < totalSpreads - 1

  const handlePrevSpread = () => {
    if (canGoPrev) {
      dispatch({ type: 'SET_SPREAD', payload: currentSpread - 1 })
    }
  }

  const handleNextSpread = () => {
    if (canGoNext) {
      dispatch({ type: 'SET_SPREAD', payload: currentSpread + 1 })
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '4px',
        position: 'relative',
      }}
    >
      {/* Left page with navigation */}
      <div style={{ position: 'relative' }}>
        <Page page={leftPage} position="left" />
        {canGoPrev && (
          <button
            onClick={handlePrevSpread}
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              width: '30px',
              height: '30px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.3,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.3')}
            aria-label="Previous spread"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M15 0 L0 10 L15 20 Z" />
            </svg>
          </button>
        )}
      </div>

      {/* Right page with navigation */}
      <div style={{ position: 'relative' }}>
        <Page page={rightPage} position="right" />
        {canGoNext && (
          <button
            onClick={handleNextSpread}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              width: '30px',
              height: '30px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.3,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.3')}
            aria-label="Next spread"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 0 L20 10 L5 20 Z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
