# BookWriter - Flowing Text Implementation

## Current Status: Planning Phase

### What We Have Now
- ✅ **Basic book viewer with chapter editing**
  - Two-page spread layout (title, dedication, ToC, chapters)
  - Chapter-level content editing (whole chapter in single textarea)
  - Navigation between spreads via corner triangles
  - Click to edit dedication and chapters
  - Auto-save to localStorage and .bk file on blur

### What Needs to Change
The goal is to implement **page-level flowing text** similar to a word processor:
- Text should flow between pages automatically when typing
- Each page should have a fixed capacity based on dimensions and typography
- Cursor should jump to next page when current page overflows
- Deleting text should pull content back from next page
- Navigation between pages with keyboard shortcuts

### Current Architecture

#### Data Model (Rust)
- `packages/core/src/models.rs`: Book and Chapter structs
  - Book contains metadata (title, author, dedication) + Vec<Chapter>
  - Chapter has: id, title, **content** (single string), order, timestamps
  - Currently: Each chapter stores all its text in one `content` field

#### UI (React/TypeScript)
- `packages/web/src/pages/ViewerPage.tsx`: Main viewer component
  - Renders spreads (2 pages at a time)
  - Page types: Title (0), Dedication (1), ToC (2), Chapters (3+)
  - **Current behavior**: Entire chapter content in one textarea
  - No pagination within chapters

#### File Format
- `packages/core/src/bk_format/parser.rs`: .bk file parser
  - Format:
    ```
    @id: <uuid>
    @title: Book Title
    @author: Author Name
    @dedication: Optional dedication

    #chapter: Chapter Title
    Chapter content here...

    #chapter: Another Chapter
    More content...
    ```
  - Parser accumulates all lines after `#chapter:` into `chapter.content`

### Implementation Plan

We need to decide between two approaches:

#### Option A: Keep Chapter Model, Add Runtime Pagination
- **Data model**: No changes to Rust models (chapters still have single `content` field)
- **File format**: No changes to .bk format
- **UI changes**:
  - Add `paginate.ts` to split chapter content into pages at render time
  - Add `pageCapacity.ts` to calculate how much text fits per page
  - Change from rendering one chapter per page to multiple pages per chapter
  - Implement page-level editing with overflow detection
  - Handle backward flow when deleting

**Pros**: Simpler data model, easier to maintain .bk files
**Cons**: More complex UI logic, need to recalculate pagination frequently

#### Option B: Store Pages in Data Model
- **Data model**: Change Chapter to store `Vec<Page>` instead of single `content`
- **File format**: Either keep .bk format and split on load, or extend format
- **UI changes**: Simpler - just render pages directly and edit them

**Pros**: Simpler UI rendering
**Cons**: More complex data model, harder to edit raw .bk files

### Next Steps
1. Decide on architecture approach (A vs B)
2. Design page configuration (dimensions, padding, typography)
3. Implement pagination logic or data model changes
4. Build overflow detection
5. Implement forward flow (text moves to next page)
6. Implement backward flow (text pulls from next page)
7. Add keyboard navigation
8. Test and polish

## Technical Notes

### Current Page Sizing
From ViewerPage.tsx:
- Page dimensions: 40vw × 90vh
- Padding: 50px (all sides)
- Font: 'Libre Baskerville, Georgia, serif'
- Chapter content: 14px, line-height 1.6
- Chapter title: 20px, 24px margin-bottom

### Files to Modify/Create

**If going with Option A (Runtime Pagination)**:
- Create: `packages/web/src/lib/paginate.ts` - pagination algorithm
- Create: `packages/web/src/lib/pageCapacity.ts` - capacity calculation
- Modify: `packages/web/src/pages/ViewerPage.tsx` - page-level editing logic

**If going with Option B (Data Model)**:
- Modify: `packages/core/src/models.rs` - add Page struct
- Modify: `packages/core/src/bk_format/parser.rs` - split into pages on load
- Modify: `packages/web/src/pages/ViewerPage.tsx` - render pages directly

## Questions to Resolve
1. Which architecture approach should we use?
2. Should pages have fixed pixel dimensions or viewport-relative?
3. How to handle chapter titles across the flowing text?
4. Should keyboard navigation be arrow keys, Page Up/Down, or both?
5. How to visually indicate which page is active during editing?
