import type { Book } from '../types'
import type { PageContent, PageSegment } from './types'
import { EDITOR_FONT, getPageContentDimensions, getLineHeightPx } from './constants'
import { fitTextToHeight } from './textMeasurement'

/**
 * Create an empty page with the given page number
 */
function createEmptyPage(pageNumber: number, availableHeight?: number): PageContent {
  const { height } = getPageContentDimensions()
  return {
    pageNumber,
    segments: [],
    availableHeight: availableHeight ?? height,
  }
}

/**
 * Calculate the height used by the title page elements
 */
function getTitlePageHeight(): number {
  const titleHeight = getLineHeightPx(EDITOR_FONT.mainTitleSize) * 2 // Title with some margin
  const authorHeight = getLineHeightPx(EDITOR_FONT.authorSize) * 2
  return titleHeight + authorHeight + 100 // Extra spacing
}

/**
 * Create the title page (page 0)
 */
function createTitlePage(book: Book): PageContent {
  const { height } = getPageContentDimensions()

  return {
    pageNumber: 0,
    segments: [
      {
        contentType: 'title',
        chapterId: null,
        text: book.title,
        startOffset: 0,
        endOffset: book.title.length,
      },
      {
        contentType: 'author',
        chapterId: null,
        text: book.author,
        startOffset: 0,
        endOffset: book.author.length,
      },
    ],
    availableHeight: height - getTitlePageHeight(),
  }
}

/**
 * Create the dedication page (page 1)
 */
function createDedicationPage(book: Book): PageContent {
  const { height } = getPageContentDimensions()
  const dedication = book.dedication || ''

  return {
    pageNumber: 1,
    segments: [
      {
        contentType: 'dedication',
        chapterId: null,
        text: dedication,
        startOffset: 0,
        endOffset: dedication.length,
      },
    ],
    availableHeight:
      height - getLineHeightPx(EDITOR_FONT.size) * Math.max(1, dedication.split('\n').length),
  }
}

/**
 * Create the table of contents page (page 2)
 */
function createTOCPage(book: Book): PageContent {
  const { height } = getPageContentDimensions()
  const tocText = book.chapters.map((ch) => ch.title).join('\n')

  return {
    pageNumber: 2,
    segments: [
      {
        contentType: 'toc',
        chapterId: null,
        text: tocText,
        startOffset: 0,
        endOffset: tocText.length,
      },
    ],
    availableHeight: height - getLineHeightPx(EDITOR_FONT.size) * (book.chapters.length + 2),
  }
}

/**
 * Calculate the height of a chapter title
 */
function getChapterTitleHeight(): number {
  return getLineHeightPx(EDITOR_FONT.titleSize) + 30 // Title plus margin below
}

/**
 * Paginate the entire book into pages
 */
export function paginateBook(book: Book): PageContent[] {
  const pages: PageContent[] = []
  const { width } = getPageContentDimensions()

  // Page 0: Title page
  pages.push(createTitlePage(book))

  // Page 1: Dedication page
  pages.push(createDedicationPage(book))

  // Page 2: Table of Contents
  pages.push(createTOCPage(book))

  // Page 3+: Chapters with flowing text
  let currentPage = createEmptyPage(3)

  for (const chapter of book.chapters) {
    // Each chapter starts on a fresh page
    if (currentPage.segments.length > 0) {
      pages.push(currentPage)
      currentPage = createEmptyPage(pages.length)
    }

    // Add chapter title
    const titleHeight = getChapterTitleHeight()
    currentPage.segments.push({
      contentType: 'chapter-title',
      chapterId: chapter.id,
      text: chapter.title,
      startOffset: 0,
      endOffset: chapter.title.length,
    })
    currentPage.availableHeight -= titleHeight

    // Flow chapter content across pages
    let remainingContent = chapter.content
    let contentOffset = 0

    while (remainingContent.length > 0 || contentOffset === 0) {
      // Ensure we add at least one segment per chapter (even if empty)
      const fit = fitTextToHeight(
        remainingContent,
        width,
        currentPage.availableHeight,
        EDITOR_FONT.size
      )

      currentPage.segments.push({
        contentType: 'chapter-content',
        chapterId: chapter.id,
        text: fit.fittedText,
        startOffset: contentOffset,
        endOffset: contentOffset + fit.fittedText.length,
      })

      contentOffset += fit.fittedText.length
      remainingContent = fit.remainingText

      // If there's more content, start a new page
      if (remainingContent.length > 0) {
        pages.push(currentPage)
        currentPage = createEmptyPage(pages.length)
      } else {
        // Update available height for potential continuation
        const contentHeight = fit.lineCount * getLineHeightPx(EDITOR_FONT.size)
        currentPage.availableHeight -= contentHeight
        break
      }
    }
  }

  // Add the last page if it has content
  if (currentPage.segments.length > 0) {
    pages.push(currentPage)
  }

  // Ensure we have at least 4 pages (title, dedication, toc, chapter 1)
  while (pages.length < 4) {
    pages.push(createEmptyPage(pages.length))
  }

  return pages
}

/**
 * Find which page contains a specific cursor position
 */
export function findPageForCursor(
  pages: PageContent[],
  chapterId: string | null,
  contentType: string,
  offset: number
): number {
  for (const page of pages) {
    for (const segment of page.segments) {
      if (
        segment.chapterId === chapterId &&
        segment.contentType === contentType &&
        offset >= segment.startOffset &&
        offset <= segment.endOffset
      ) {
        return page.pageNumber
      }
    }
  }

  // Default to first relevant page for the content type
  if (contentType === 'title' || contentType === 'author') return 0
  if (contentType === 'dedication') return 1
  if (contentType === 'toc') return 2

  // For chapters, find the first page with this chapter
  for (const page of pages) {
    if (page.segments.some((s) => s.chapterId === chapterId)) {
      return page.pageNumber
    }
  }

  return 3
}

/**
 * Get the spread number for a page
 */
export function getSpreadForPage(pageNumber: number): number {
  return Math.floor(pageNumber / 2)
}

/**
 * Get the total number of spreads
 */
export function getTotalSpreads(pages: PageContent[]): number {
  return Math.ceil(pages.length / 2)
}

/**
 * Find the segment containing a cursor position
 */
export function findSegmentForCursor(
  pages: PageContent[],
  chapterId: string | null,
  contentType: string,
  offset: number
): { page: PageContent; segment: PageSegment; segmentIndex: number } | null {
  for (const page of pages) {
    for (let i = 0; i < page.segments.length; i++) {
      const segment = page.segments[i]
      if (
        segment.chapterId === chapterId &&
        segment.contentType === contentType &&
        offset >= segment.startOffset &&
        offset <= segment.endOffset
      ) {
        return { page, segment, segmentIndex: i }
      }
    }
  }
  return null
}

/**
 * Incrementally repaginate from a specific chapter onward
 * (Optimization for when only one chapter changes)
 */
export function repaginateFromChapter(
  currentPages: PageContent[],
  book: Book,
  changedChapterId: string
): PageContent[] {
  // Find the first page affected by the change
  let firstAffectedPageIndex = currentPages.findIndex((page) =>
    page.segments.some((s) => s.chapterId === changedChapterId)
  )

  // If chapter not found, do full repagination
  if (firstAffectedPageIndex === -1) {
    return paginateBook(book)
  }

  // Keep fixed pages (title, dedication, TOC) if change is in chapters
  if (firstAffectedPageIndex < 3) {
    firstAffectedPageIndex = 3
  }

  // For now, just do full repagination
  // TODO: Optimize to only repaginate from affected chapter
  return paginateBook(book)
}
