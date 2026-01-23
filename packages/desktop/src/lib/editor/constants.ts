// Font configuration for the editor
export const EDITOR_FONT = {
  family: 'Libre Baskerville, Georgia, serif',
  size: 14, // pixels
  lineHeight: 1.6, // multiplier
  titleSize: 20, // chapter title size in pixels
  mainTitleSize: 32, // book title size in pixels
  authorSize: 18, // author name size in pixels
} as const

// Page dimensions (matching current ViewerPage)
export const PAGE_DIMENSIONS = {
  widthVw: 40, // viewport width percentage
  heightVh: 90, // viewport height percentage
  paddingPx: 50, // padding in pixels
} as const

// Cursor configuration
export const CURSOR_CONFIG = {
  blinkRate: 530, // milliseconds
  width: 2, // pixels
} as const

// Debounce delay for auto-save
export const SAVE_DEBOUNCE_MS = 1000

// Get computed line height in pixels
export function getLineHeightPx(fontSize: number = EDITOR_FONT.size): number {
  return fontSize * EDITOR_FONT.lineHeight
}

// Get the font string for canvas measurement
export function getFontString(fontSize: number = EDITOR_FONT.size): string {
  return `${fontSize}px ${EDITOR_FONT.family}`
}

// Calculate page content area dimensions
export function getPageContentDimensions(): { width: number; height: number } {
  const vw = window.innerWidth / 100
  const vh = window.innerHeight / 100

  return {
    width: PAGE_DIMENSIONS.widthVw * vw - PAGE_DIMENSIONS.paddingPx * 2,
    height: PAGE_DIMENSIONS.heightVh * vh - PAGE_DIMENSIONS.paddingPx * 2,
  }
}
