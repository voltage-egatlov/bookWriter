import { EDITOR_FONT, getFontString, getLineHeightPx } from './constants'
import type { MeasurementResult, FitResult } from './types'

// Canvas context for text measurement (lazily initialized)
let measureCanvas: HTMLCanvasElement | null = null
let measureContext: CanvasRenderingContext2D | null = null

function getContext(): CanvasRenderingContext2D {
  if (!measureContext) {
    measureCanvas = document.createElement('canvas')
    measureContext = measureCanvas.getContext('2d')!
  }
  return measureContext
}

// Measurement cache for performance
const measurementCache = new Map<string, MeasurementResult>()

function getCacheKey(text: string, fontSize: number, maxWidth: number): string {
  return `${text.length}:${text.slice(0, 50)}:${fontSize}:${maxWidth}`
}

/**
 * Measure how text wraps within a given width
 * Returns line breaks and total dimensions
 */
export function measureText(
  text: string,
  maxWidth: number,
  fontSize: number = EDITOR_FONT.size
): MeasurementResult {
  const cacheKey = getCacheKey(text, fontSize, maxWidth)
  const cached = measurementCache.get(cacheKey)
  if (cached) return cached

  const ctx = getContext()
  ctx.font = getFontString(fontSize)

  const lineHeight = getLineHeightPx(fontSize)
  const lines: string[] = []
  const lineBreaks: number[] = []

  let currentLine = ''
  let currentLineStart = 0

  // Split by explicit newlines first
  const paragraphs = text.split('\n')

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const paragraph = paragraphs[pIdx]

    if (paragraph === '') {
      // Empty line (from consecutive newlines)
      if (currentLine) {
        lines.push(currentLine)
        lineBreaks.push(currentLineStart + currentLine.length)
        currentLine = ''
      }
      lines.push('')
      // Track the newline position
      if (pIdx < paragraphs.length - 1) {
        const prevLength = paragraphs.slice(0, pIdx + 1).join('\n').length
        lineBreaks.push(prevLength)
      }
      currentLineStart = paragraphs.slice(0, pIdx + 1).join('\n').length + 1
      continue
    }

    const words = paragraph.split(/(\s+)/)

    for (const word of words) {
      const testLine = currentLine + word
      const metrics = ctx.measureText(testLine)

      if (metrics.width > maxWidth && currentLine !== '') {
        // Line is full, start a new one
        lines.push(currentLine)
        lineBreaks.push(currentLineStart + currentLine.length)
        currentLine = word.trimStart()
        currentLineStart = currentLineStart + currentLine.length + (word.length - word.trimStart().length)
      } else {
        currentLine = testLine
      }
    }

    // End of paragraph - add newline break if not last paragraph
    if (pIdx < paragraphs.length - 1) {
      lines.push(currentLine)
      const breakPos = paragraphs.slice(0, pIdx + 1).join('\n').length
      lineBreaks.push(breakPos)
      currentLine = ''
      currentLineStart = breakPos + 1
    }
  }

  // Add remaining text
  if (currentLine) {
    lines.push(currentLine)
  }

  const result: MeasurementResult = {
    width: maxWidth,
    height: lines.length * lineHeight,
    lineCount: lines.length,
    lineBreaks,
  }

  // Cache the result (limit cache size)
  if (measurementCache.size > 1000) {
    const firstKey = measurementCache.keys().next().value
    if (firstKey) measurementCache.delete(firstKey)
  }
  measurementCache.set(cacheKey, result)

  return result
}

/**
 * Calculate how much text fits within a given height
 * Uses binary search for efficiency
 */
export function fitTextToHeight(
  text: string,
  maxWidth: number,
  maxHeight: number,
  fontSize: number = EDITOR_FONT.size
): FitResult {
  if (!text) {
    return {
      fittedText: '',
      fittedCharCount: 0,
      remainingText: '',
      lineCount: 0,
    }
  }

  const lineHeight = getLineHeightPx(fontSize)
  const maxLines = Math.floor(maxHeight / lineHeight)

  if (maxLines <= 0) {
    return {
      fittedText: '',
      fittedCharCount: 0,
      remainingText: text,
      lineCount: 0,
    }
  }

  // First, measure the full text
  const fullMeasure = measureText(text, maxWidth, fontSize)

  // If it all fits, return everything
  if (fullMeasure.lineCount <= maxLines) {
    return {
      fittedText: text,
      fittedCharCount: text.length,
      remainingText: '',
      lineCount: fullMeasure.lineCount,
    }
  }

  // Binary search for the cutoff point
  let low = 0
  let high = text.length
  let bestFit = 0

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2)
    const testText = text.slice(0, mid)
    const measure = measureText(testText, maxWidth, fontSize)

    if (measure.lineCount <= maxLines) {
      bestFit = mid
      low = mid
    } else {
      high = mid - 1
    }
  }

  // Try to break at a word boundary if possible
  let breakPoint = bestFit
  if (breakPoint < text.length) {
    // Look back for a space or newline
    for (let i = breakPoint; i > Math.max(0, breakPoint - 50); i--) {
      if (text[i] === ' ' || text[i] === '\n') {
        breakPoint = i + 1
        break
      }
    }
  }

  const fittedText = text.slice(0, breakPoint)
  const fittedMeasure = measureText(fittedText, maxWidth, fontSize)

  return {
    fittedText,
    fittedCharCount: breakPoint,
    remainingText: text.slice(breakPoint),
    lineCount: fittedMeasure.lineCount,
  }
}

/**
 * Get the line number and position within line for a character offset
 */
export function getLineAndColumn(
  text: string,
  offset: number,
  maxWidth: number,
  fontSize: number = EDITOR_FONT.size
): { line: number; column: number; lineStart: number } {
  const textUpToOffset = text.slice(0, offset)
  const measure = measureText(textUpToOffset, maxWidth, fontSize)

  // Find which line the offset is on
  let line = 0
  let lineStart = 0

  for (let i = 0; i < measure.lineBreaks.length; i++) {
    if (measure.lineBreaks[i] >= offset) {
      break
    }
    line = i + 1
    lineStart = measure.lineBreaks[i]
    // Skip the newline/space character
    if (text[lineStart] === '\n' || text[lineStart] === ' ') {
      lineStart++
    }
  }

  return {
    line,
    column: offset - lineStart,
    lineStart,
  }
}

/**
 * Get the character offset for a given line and approximate column
 */
export function getOffsetFromLine(
  text: string,
  targetLine: number,
  approximateColumn: number,
  maxWidth: number,
  fontSize: number = EDITOR_FONT.size
): number {
  const measure = measureText(text, maxWidth, fontSize)

  // Find the start of the target line
  let lineStart = 0
  if (targetLine > 0 && targetLine <= measure.lineBreaks.length) {
    lineStart = measure.lineBreaks[targetLine - 1]
    if (text[lineStart] === '\n' || text[lineStart] === ' ') {
      lineStart++
    }
  }

  // Find the end of the target line
  let lineEnd = text.length
  if (targetLine < measure.lineBreaks.length) {
    lineEnd = measure.lineBreaks[targetLine]
  }

  // Clamp the column to the line length
  const lineLength = lineEnd - lineStart
  const column = Math.min(approximateColumn, lineLength)

  return lineStart + column
}

/**
 * Get the x position of a character within a line
 */
export function getCharacterX(
  text: string,
  offset: number,
  maxWidth: number,
  fontSize: number = EDITOR_FONT.size
): number {
  const { lineStart } = getLineAndColumn(text, offset, maxWidth, fontSize)
  const textFromLineStart = text.slice(lineStart, offset)

  const ctx = getContext()
  ctx.font = getFontString(fontSize)

  return ctx.measureText(textFromLineStart).width
}

/**
 * Find the character offset at a given x position within a line
 */
export function getOffsetAtX(
  text: string,
  lineStart: number,
  lineEnd: number,
  targetX: number,
  fontSize: number = EDITOR_FONT.size
): number {
  const ctx = getContext()
  ctx.font = getFontString(fontSize)

  const lineText = text.slice(lineStart, lineEnd)

  // Binary search for the closest character
  let low = 0
  let high = lineText.length

  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    const textWidth = ctx.measureText(lineText.slice(0, mid)).width

    if (textWidth < targetX) {
      low = mid + 1
    } else {
      high = mid
    }
  }

  // Check if we're closer to the previous or current character
  if (low > 0) {
    const prevWidth = ctx.measureText(lineText.slice(0, low - 1)).width
    const currWidth = ctx.measureText(lineText.slice(0, low)).width

    if (Math.abs(targetX - prevWidth) < Math.abs(targetX - currWidth)) {
      return lineStart + low - 1
    }
  }

  return lineStart + low
}

/**
 * Clear the measurement cache (useful when font settings change)
 */
export function clearMeasurementCache(): void {
  measurementCache.clear()
}
