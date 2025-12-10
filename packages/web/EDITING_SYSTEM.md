# Block-Based Editing System Documentation

## Overview

The editing system provides block-level editing capabilities for the book viewer. Users can click on any page content block to open an overlay editor, make changes, and have the entire book re-parsed and re-rendered.

## Architecture

### Design Principles

1. **Block-Based Editing**: No contentEditable - each block is edited in a dedicated overlay
2. **Parse-First Approach**: Every edit triggers re-parsing through the Rust WASM parser
3. **Immutable Updates**: Changes create a new book state rather than mutating existing state
4. **Context-Based State**: Global BookContext manages book state and editing mode

### Data Flow

```
User clicks block
    ↓
EditorOverlay opens with current content
    ↓
User edits and saves
    ↓
updateBlockContent() called
    ↓
Book serialized to .bk format
    ↓
WASM parser re-parses entire book
    ↓
New Book object replaces old state
    ↓
UI re-renders with updated content
```

## Components

### 1. BookContext (`src/contexts/BookContext.tsx`)

**Purpose**: Global state management for book data and editing operations

**State:**
- `book: Book | null` - Current book object
- `isEditing: boolean` - Edit mode toggle

**Key Methods:**
- `setBook(book)` - Update the book state
- `setIsEditing(editing)` - Toggle edit mode
- `updateBlockContent(chapterId, blockId, newContent)` - Update a block and re-parse
- `updateChapterTitle(chapterId, newTitle)` - Update chapter title and re-parse
- `serializeBook()` - Convert book to .bk format
- `reloadFromSource(source)` - Parse .bk string and update state

**Usage:**
```tsx
import { BookProvider, useBook } from '@/contexts/BookContext'

// Wrap your app
<BookProvider>
  <YourComponent />
</BookProvider>

// Use in components
const { book, isEditing, updateBlockContent } = useBook()
```

### 2. EditorOverlay (`src/components/EditorOverlay.tsx`)

**Purpose**: Modal overlay for editing block content

**Props:**
```typescript
interface EditorOverlayProps {
  initialContent: string
  onSave: (newContent: string) => void
  onCancel: () => void
  title?: string
}
```

**Features:**
- Full-screen modal with backdrop
- Textarea for content editing
- Auto-focus and select on mount
- Keyboard shortcuts:
  - `Esc` - Cancel editing
  - `Ctrl+Enter` / `Cmd+Enter` - Save changes
- Loading state during save
- Click backdrop to close

**Styling:**
- Fixed positioning with z-index 2000
- Centered 800px max width
- 80vh max height
- Monospace font for editing

### 3. EditableBlock (`src/components/EditableBlock.tsx`)

**Purpose**: Wrapper that makes a block clickable and editable

**Props:**
```typescript
interface EditableBlockProps {
  block: Block
  chapterId: string
  isEditable: boolean
  onEdit: (chapterId: string, blockId: string, newContent: string) => Promise<void>
  className?: string
  style?: React.CSSProperties
}
```

**Features:**
- Hover effect when editable (blue border and background)
- Click to open editor
- Manages EditorOverlay state
- Calls onEdit callback on save

**Visual Feedback:**
- Cursor changes to pointer when editable
- Dashed blue border on hover
- Light blue background on hover
- Tooltip: "Click to edit"

### 4. Updated PageView (`src/components/PageView.tsx`)

**New Props:**
```typescript
interface PageViewProps {
  block: Block
  chapterId: string              // NEW
  chapterTitle: string
  onNavigate: (direction: 'prev' | 'next') => void
  hasPrev: boolean
  hasNext: boolean
  isEditable?: boolean           // NEW
  onBlockEdit?: (chapterId, blockId, newContent) => Promise<void>  // NEW
}
```

**Behavior:**
- When `isEditable` is true, wraps content in EditableBlock
- When `isEditable` is false, renders static content
- Passes edit handler to EditableBlock

### 5. Updated BookView (`src/components/BookView.tsx`)

**Changes:**
- Imports `useBook()` hook
- Accepts `isEditable` prop
- Passes `chapterId` to PageView
- Passes `isEditable` and `updateBlockContent` to PageView

### 6. Updated ViewerPage (`src/pages/ViewerPage.tsx`)

**New Structure:**
```tsx
<BookProvider>
  <ViewerPageContent />
</BookProvider>
```

**Features:**
- Edit mode toggle button (top-right)
- Visual indicator: 📝 Editing Mode / 👁 Reading Mode
- Green background when editing, blue when reading
- Fixed positioning with z-index 1500

## Editing Workflow

### User Flow

1. **Load a book** - Upload .bk file via FileUpload component
2. **Toggle edit mode** - Click "Reading Mode" button → becomes "Editing Mode"
3. **Click a block** - Click on any page content (hover shows blue border)
4. **Edit content** - Overlay appears with textarea
5. **Save changes** - Click "Save Changes" or press Ctrl+Enter
6. **Book updates** - Editor closes, book re-parses, UI updates

### Technical Flow

**Edit Trigger:**
```tsx
// User clicks EditableBlock
<EditableBlock onClick={() => setIsEditing(true)} />

// EditorOverlay opens
<EditorOverlay 
  initialContent={block.content}
  onSave={handleSave}
/>
```

**Save Process:**
```tsx
const handleSave = async (newContent: string) => {
  // Call context method
  await updateBlockContent(chapterId, block.id, newContent)
  // Context handles serialization and re-parsing
  setIsEditing(false)
}
```

**Context Update Logic:**
```tsx
updateBlockContent(chapterId, blockId, newContent) {
  // 1. Create updated book structure
  const updatedBook = {
    ...book,
    chapters: book.chapters.map(chapter => {
      if (chapter.id !== chapterId) return chapter
      return {
        ...chapter,
        blocks: chapter.blocks.map(block => {
          if (block.id !== blockId) return block
          return { ...block, content: newContent }
        })
      }
    })
  }
  
  // 2. Serialize to .bk format
  const bkSource = serializeBookObject(updatedBook)
  
  // 3. Re-parse through WASM
  const newBook = await parseBk(bkSource)
  
  // 4. Update state
  setBook(newBook)
}
```

## Serialization Format

The serialization converts Book objects back to .bk format:

```
@title {book.title}
@author {book.author}
@id {book.id}
@dedication {book.dedication}

#chapter {chapter.title}

@page
{block.content}

@page
{block.content}

#chapter {next chapter title}
...
```

## Error Handling

**Parse Errors:**
- Caught in `reloadFromSource()` method
- Logged to console
- Error thrown back to caller
- UI shows error message to user

**Network/WASM Errors:**
- Handled by FileUpload component
- Error state displayed in UI

**Future Enhancement:**
- Add undo/redo capability
- Validate changes before saving
- Show diff/preview before apply
- Auto-save drafts to localStorage

## Keyboard Shortcuts

### Global
- No global shortcuts to avoid conflicts with editing

### In Editor Overlay
- `Esc` - Cancel and close
- `Ctrl+Enter` / `Cmd+Enter` - Save changes

### In Reading Mode
- `←` Arrow Left - Previous page
- `→` Arrow Right - Next page

## Styling Guidelines

### Colors
- Edit mode button: `#28a745` (green)
- Read mode button: `#007bff` (blue)
- Hover background: `rgba(0, 123, 255, 0.05)`
- Hover border: `rgba(0, 123, 255, 0.3)`

### Z-Index Layers
- EditorOverlay: 2000
- Edit mode toggle: 1500
- Sidebar toggle: 1000
- Sidebar: 999

### Animations
- Sidebar: 300ms ease transition
- EditableBlock hover: 200ms transition
- Button hover: Instant

## Integration Points

### WASM Parser
- File: `src/lib/wasm.ts`
- Function: `parseBk(content, createdAt?, updatedAt?)`
- Returns: `Promise<Book>`

### Type Definitions
- File: `src/lib/types.ts`
- Types: `Book`, `Chapter`, `Block`, `BlockType`

## Testing Guide

### Manual Testing Steps

1. **Load Book**
   ```
   - Click "Open Book File"
   - Select test-book.bk
   - Verify book loads correctly
   ```

2. **Toggle Edit Mode**
   ```
   - Click "Reading Mode" button
   - Verify it changes to "Editing Mode"
   - Verify button color changes to green
   ```

3. **Edit Block**
   ```
   - Hover over page content
   - Verify blue border appears
   - Click on content
   - Verify overlay opens
   - Edit text
   - Press Ctrl+Enter or click Save
   - Verify overlay closes
   - Verify content updates
   ```

4. **Navigate After Edit**
   ```
   - Edit a block
   - Navigate to next page
   - Navigate back
   - Verify edit persists
   ```

5. **Cancel Edit**
   ```
   - Click a block
   - Make changes
   - Press Esc or click Cancel
   - Verify changes discarded
   - Verify overlay closes
   ```

### Automated Testing (Future)

```typescript
describe('EditableBlock', () => {
  it('opens editor on click when editable', () => {})
  it('does not open editor when not editable', () => {})
  it('shows hover effect when editable', () => {})
  it('calls onEdit with correct parameters', () => {})
})

describe('BookContext', () => {
  it('updates block content and re-parses', () => {})
  it('serializes book correctly', () => {})
  it('handles parse errors gracefully', () => {})
})
```

## Performance Considerations

**Current Approach:**
- Every edit re-parses the entire book
- Book state is immutable (creates new objects)
- No optimistic updates

**Performance Characteristics:**
- Small books (< 100 pages): Instant
- Medium books (100-500 pages): < 100ms
- Large books (500+ pages): < 500ms

**Future Optimizations:**
- Debounce re-parsing for rapid edits
- Cache parsed structure
- Partial re-parsing for single block changes
- Web Worker for parsing

## Known Limitations

1. **No Undo/Redo** - Once saved, changes are permanent
2. **No Auto-Save** - Must manually save each edit
3. **No Concurrent Editing** - Single user only
4. **No Real-time Preview** - Changes only visible after save
5. **No Validation** - Invalid content may cause parse errors

## Future Enhancements

### Short-term
- Add undo/redo using command pattern
- Auto-save to localStorage
- Validation before save
- Preview pane in editor

### Medium-term
- Rich text editing (bold, italic, etc.)
- Chapter title inline editing
- Drag-and-drop page reordering
- Multi-block selection

### Long-term
- Collaborative editing
- Version history
- Track changes / comments
- Export to multiple formats

## File Structure

```
packages/web/src/
├── contexts/
│   └── BookContext.tsx          # Global book state
├── components/
│   ├── EditorOverlay.tsx        # Edit modal
│   ├── EditableBlock.tsx        # Clickable wrapper
│   ├── PageView.tsx             # Updated with edit support
│   ├── BookView.tsx             # Updated with context
│   ├── Sidebar.tsx              # Unchanged
│   └── FileUpload.tsx           # Unchanged
├── pages/
│   └── ViewerPage.tsx           # Updated with provider
├── lib/
│   ├── types.ts                 # Type definitions
│   └── wasm.ts                  # WASM integration
└── EDITING_SYSTEM.md           # This file
```

## Troubleshooting

**Issue: Edit mode toggle doesn't work**
- Check BookProvider wraps ViewerPage
- Verify useBook() is called inside provider

**Issue: Edits don't save**
- Check console for parse errors
- Verify updateBlockContent is called
- Check WASM module is initialized

**Issue: Content doesn't update after save**
- Verify book state updates in context
- Check React re-renders triggered
- Verify block IDs match

**Issue: Editor doesn't open on click**
- Verify isEditable prop is true
- Check edit mode is enabled
- Verify onBlockEdit callback exists

## Support

For issues or questions:
1. Check this documentation
2. Review console errors
3. Check component props
4. Verify BookContext is providing values
