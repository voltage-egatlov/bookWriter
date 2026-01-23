import type { FormattedNode } from './types'
import { createElement, type ReactNode } from 'react'

/**
 * Parse markdown-style formatting into a tree of nodes
 * Supports: **bold**, *italic*, __underline__
 */
export function parseMarkdown(text: string): FormattedNode[] {
  const nodes: FormattedNode[] = []

  // Simple approach: find all formatting markers and their positions
  interface Marker {
    start: number
    end: number
    type: 'bold' | 'italic' | 'underline'
    content: string
    fullMatch: string
  }

  const markers: Marker[] = []

  // Find bold first (so ** doesn't get caught by single *)
  const boldRegex = /\*\*(.+?)\*\*/g
  let match
  while ((match = boldRegex.exec(text)) !== null) {
    markers.push({
      start: match.index,
      end: match.index + match[0].length,
      type: 'bold',
      content: match[1],
      fullMatch: match[0],
    })
  }

  // Find underline (before italic to avoid __ being caught)
  const underlineRegex = /__(.+?)__/g
  while ((match = underlineRegex.exec(text)) !== null) {
    // Check for overlap with existing markers
    const overlaps = markers.some(
      (m) =>
        (match!.index >= m.start && match!.index < m.end) ||
        (match!.index + match![0].length > m.start && match!.index + match![0].length <= m.end)
    )
    if (!overlaps) {
      markers.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'underline',
        content: match[1],
        fullMatch: match[0],
      })
    }
  }

  // Find italic (single * not part of **)
  const italicRegex = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g
  while ((match = italicRegex.exec(text)) !== null) {
    // Check for overlap with existing markers
    const overlaps = markers.some(
      (m) =>
        (match!.index >= m.start && match!.index < m.end) ||
        (match!.index + match![0].length > m.start && match!.index + match![0].length <= m.end)
    )
    if (!overlaps) {
      markers.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'italic',
        content: match[1],
        fullMatch: match[0],
      })
    }
  }

  // Sort markers by start position
  markers.sort((a, b) => a.start - b.start)

  // Build nodes from markers
  let currentPos = 0

  for (const marker of markers) {
    // Add plain text before this marker
    if (marker.start > currentPos) {
      const plainText = text.slice(currentPos, marker.start)
      nodes.push({
        type: 'text',
        content: plainText,
        startOffset: currentPos,
        endOffset: marker.start,
      })
    }

    // Add formatted node
    nodes.push({
      type: marker.type,
      content: marker.content,
      startOffset: marker.start,
      endOffset: marker.end,
    })

    currentPos = marker.end
  }

  // Add remaining plain text
  if (currentPos < text.length) {
    nodes.push({
      type: 'text',
      content: text.slice(currentPos),
      startOffset: currentPos,
      endOffset: text.length,
    })
  }

  // If no nodes were created, add the entire text as plain
  if (nodes.length === 0) {
    nodes.push({
      type: 'text',
      content: text,
      startOffset: 0,
      endOffset: text.length,
    })
  }

  return nodes
}

/**
 * Render formatted nodes to React elements, inserting cursor at the correct position
 */
export function renderFormattedNodes(
  nodes: FormattedNode[],
  cursorOffset: number | null,
  cursorElement?: ReactNode
): ReactNode[] {
  const elements: ReactNode[] = []

  let remainingOffset = cursorOffset

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const key = `node-${i}-${node.startOffset}`

    // Check if cursor is within this node
    const cursorInNode =
      remainingOffset !== null && remainingOffset >= 0 && remainingOffset <= node.content.length

    const displayContent = node.content

    if (cursorInNode && remainingOffset !== null && cursorElement) {
      if (remainingOffset < displayContent.length) {
        // Insert cursor within the content
        const before = displayContent.slice(0, remainingOffset)
        const after = displayContent.slice(remainingOffset)

        const content = [before, cursorElement, after]
        elements.push(renderNodeWithContent(node.type, content, key))
      } else {
        // Cursor is at the end of this node
        elements.push(renderNodeWithContent(node.type, displayContent, key))
      }
    } else {
      // No cursor in this node, render normally
      elements.push(renderNodeWithContent(node.type, displayContent, key))
    }

    // Move cursor offset for next node
    if (remainingOffset !== null) {
      remainingOffset -= node.content.length
    }
  }

  return elements
}

function renderNodeWithContent(
  type: FormattedNode['type'],
  content: ReactNode,
  key: string
): ReactNode {
  switch (type) {
    case 'bold':
      return createElement('strong', { key }, content)
    case 'italic':
      return createElement('em', { key }, content)
    case 'underline':
      return createElement('u', { key }, content)
    case 'text':
    default:
      return createElement('span', { key }, content)
  }
}

/**
 * Toggle formatting around the cursor position or selection
 * Returns the new content and new cursor offset
 */
export function toggleFormat(
  content: string,
  cursorOffset: number,
  format: 'bold' | 'italic' | 'underline'
): { newContent: string; newOffset: number } {
  const markers = {
    bold: '**',
    italic: '*',
    underline: '__',
  }

  const marker = markers[format]

  // Check if we're inside a formatted region
  const beforeCursor = content.slice(0, cursorOffset)
  const afterCursor = content.slice(cursorOffset)

  // Simple toggle: if cursor is at a word boundary, wrap the word
  // For now, just insert markers at cursor position
  const newContent = beforeCursor + marker + marker + afterCursor
  const newOffset = cursorOffset + marker.length

  return { newContent, newOffset }
}

/**
 * Check if cursor is inside a formatted region
 */
export function isInsideFormat(
  content: string,
  cursorOffset: number,
  format: 'bold' | 'italic' | 'underline'
): boolean {
  const nodes = parseMarkdown(content)

  // Find which node contains the cursor (accounting for marker positions)
  let displayOffset = 0
  for (const node of nodes) {
    const nodeDisplayLength = node.content.length
    if (displayOffset + nodeDisplayLength >= cursorOffset) {
      return node.type === format
    }
    displayOffset += nodeDisplayLength
  }

  return false
}
