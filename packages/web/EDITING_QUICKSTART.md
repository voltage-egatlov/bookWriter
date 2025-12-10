# Editing System Quick Start Guide

## What You Get

✅ **Block-based editing** - Click any page content to edit  
✅ **Live re-parsing** - Changes are validated through Rust parser  
✅ **Edit mode toggle** - Switch between reading and editing  
✅ **Keyboard shortcuts** - Esc to cancel, Ctrl+Enter to save  
✅ **Visual feedback** - Hover effects show what's editable  

## Quick Start (5 Steps)

### 1. Run the App

```bash
cd packages/web
npm install
npm run dev
```

Visit `http://localhost:5173/viewer`

### 2. Load a Book

- Click "Open Book File"
- Select `test-book.bk` (or any .bk file)
- Book loads in reading mode

### 3. Enable Editing

- Click the blue **"👁 Reading Mode"** button (top-right)
- Button turns green: **"📝 Editing Mode"**

### 4. Edit Content

- **Hover** over page text → see blue dashed border
- **Click** on text → editor overlay opens
- **Edit** the content in textarea
- **Save**: Click "Save Changes" or press `Ctrl+Enter`

### 5. See Results

- Editor closes automatically
- Book re-parses through WASM
- Updated content appears immediately
- Navigate to other pages → edits persist

## Visual Guide

### Reading Mode
```
┌─────────────────────────────────────────┐
│  [👁 Reading Mode]                      │  ← Click to enable editing
├─────────────────────────────────────────┤
│                                         │
│  Chapter Title                          │
│                                         │
│  Page content appears here...           │  ← Static, not clickable
│  Cannot be edited.                      │
│                                         │
└─────────────────────────────────────────┘
```

### Editing Mode
```
┌─────────────────────────────────────────┐
│  [📝 Editing Mode]                      │  ← Green = editing enabled
├─────────────────────────────────────────┤
│                                         │
│  Chapter Title                          │
│                                         │
│ ╔═══════════════════════════════════╗  │
│ ║ Page content appears here...      ║  │  ← Blue border on hover
│ ║ Click to edit!                    ║  │  ← Clickable
│ ╚═══════════════════════════════════╝  │
│                                         │
└─────────────────────────────────────────┘
```

### Editor Overlay
```
┌─────────────────────────────────────────┐
│ ████████████████████████████████████████│
│ ███ ┌─────────────────────────────┐ ███│
│ ███ │ Edit Block (Page 1)     [×] │ ███│  ← Click × or Esc to cancel
│ ███ ├─────────────────────────────┤ ███│
│ ███ │                             │ ███│
│ ███ │ ┌─────────────────────────┐ │ ███│
│ ███ │ │ Page content appears... │ │ ███│  ← Textarea with content
│ ███ │ │ here. Edit freely!      │ │ ███│
│ ███ │ │                         │ │ ███│
│ ███ │ └─────────────────────────┘ │ ███│
│ ███ │                             │ ███│
│ ███ ├─────────────────────────────┤ ███│
│ ███ │ [Cancel]  [Save Changes]    │ ███│  ← Save or cancel
│ ███ └─────────────────────────────┘ ███│
│ ████████████████████████████████████████│
└─────────────────────────────────────────┘
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Click block | Open editor (in edit mode) |
| `Esc` | Cancel editing, close overlay |
| `Ctrl+Enter` | Save changes, close overlay |
| `←` Arrow | Previous page (in read mode) |
| `→` Arrow | Next page (in read mode) |

## Code Example

### Using BookContext in Your Component

```tsx
import { useBook } from '@/contexts/BookContext'

function MyComponent() {
  const { 
    book,           // Current book object
    isEditing,      // Edit mode state
    setIsEditing,   // Toggle edit mode
    updateBlockContent  // Edit a block
  } = useBook()

  // Toggle edit mode
  const toggleEdit = () => setIsEditing(!isEditing)

  // Manual edit
  const handleEdit = async () => {
    await updateBlockContent(
      'chapter-id',
      'block-id',
      'New content here'
    )
  }

  return (
    <div>
      <button onClick={toggleEdit}>
        {isEditing ? 'Editing' : 'Reading'}
      </button>
      {/* Your content */}
    </div>
  )
}
```

### Wrapping with Provider

```tsx
import { BookProvider } from '@/contexts/BookContext'

function App() {
  return (
    <BookProvider>
      <MyComponent />
    </BookProvider>
  )
}
```

## Common Workflows

### 1. Fix a Typo

```
1. Click "Reading Mode" → "Editing Mode"
2. Navigate to page with typo
3. Click on the text
4. Fix typo in editor
5. Press Ctrl+Enter
6. Done! ✓
```

### 2. Rewrite a Paragraph

```
1. Enable editing mode
2. Find the paragraph
3. Click to edit
4. Rewrite content
5. Click "Save Changes"
6. Continue reading/editing
```

### 3. Edit Multiple Blocks

```
1. Enable editing mode
2. Edit first block → save
3. Navigate to next page
4. Edit second block → save
5. Repeat as needed
6. All changes persist automatically
```

## What Happens Under the Hood

```
You edit: "Hello world"
    ↓
Context updates Book object
    ↓
Serializes to .bk format:
    @title My Book
    @author Me
    
    #chapter Chapter 1
    
    @page
    Hello world
    ↓
WASM parser parses .bk
    ↓
Returns new Book object
    ↓
React re-renders with new data
    ↓
You see: "Hello world" on page ✓
```

## Tips & Tricks

### ✅ DO
- Enable edit mode before clicking blocks
- Use Ctrl+Enter for quick saves
- Check hover effect to confirm editability
- Save often (no auto-save yet)

### ❌ DON'T
- Try to edit in reading mode (won't work)
- Edit without checking the hover effect
- Expect undo after saving (not implemented yet)
- Edit multiple blocks simultaneously (one at a time)

## Troubleshooting

**Q: Block doesn't become editable when I click**  
A: Make sure editing mode is enabled (green button)

**Q: Changes disappear after save**  
A: Check browser console for parse errors. Invalid .bk syntax will fail.

**Q: Editor doesn't open**  
A: Verify you're in editing mode and clicking the content area, not margins

**Q: How do I undo a change?**  
A: Undo isn't implemented yet. Click Cancel before saving to discard changes.

## Next Steps

- Read [EDITING_SYSTEM.md](./EDITING_SYSTEM.md) for full technical docs
- Explore the source code in `src/contexts/` and `src/components/`
- Try building your own editing features on top of BookContext

## Build for Production

```bash
npm run build
```

Output in `dist/` directory, ready to deploy!
