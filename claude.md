# BookWriter - Flowing Text Implementation

## Current Status: Step 2 - Overflow Detection (In Progress)

### Completed
- ✅ **Step 1: Basic page-level editing**
  - Changed from chapter-level to page-level editing
  - Added `overflow: hidden` to prevent scrollbars
  - Fixed textarea height constraints with flexbox
  - Prevented internal textarea scrolling with `onScroll` handler
  - Adjusted page width from 600px to 800px for better fill

### In Progress
- 🔄 **Step 2: Overflow detection and cursor jump**
  - Implemented `checkPageCapacity()` function to detect when text overflows
  - Added first-page detection to account for chapter title space
  - Adjusting padding calculation: currently testing 105px offset for title
  - Issue: Line count calculation needs fine-tuning (showing 19 lines when 18 fit)
  - Issue: Text splitting causing extra newlines on overflow
  - Current fix: Trimming next page content and using character-based splitting

### Pending
- ⏳ Step 3: Add backward flow when deleting
- ⏳ Step 4: Add keyboard navigation between pages
- ⏳ Step 5: Add visual feedback for active page
- ⏳ Step 6: Test and polish complete flow

## Known Issues

### Active Issues
1. **Line capacity calculation off by 1**: maxLines shows 19 but only 18 lines actually fit on first page
   - Adjusted top padding from 72px to 105px
   - Testing to verify correct line count

2. **Extra newlines on overflow** (Partially fixed):
   - Added `.trim()` to next page content
   - Changed text splitting from line-based to character-based
   - Still investigating edge cases

### Fixed Issues
- ✅ Text shifting down when typing (fixed with flex layout and scroll lock)
- ✅ Page width too narrow (increased from 600px to 800px)
- ✅ Scrollbar appearing (added `overflow: hidden`)

## Technical Details

### Key Files Modified
- `packages/web/src/pages/ViewerPage.tsx` - Main editing logic
- `packages/web/src/lib/pageCapacity.ts` - Overflow detection
- `packages/web/src/lib/paginate.ts` - Text pagination engine
- `packages/core/src/models.rs` - Changed from blocks to content model
- `packages/core/src/bk_format/parser.rs` - Updated to join blocks into content

### Page Configuration
```typescript
DEFAULT_PAGE_CONFIG = {
  pageWidth: 800px,
  pageHeight: 800px,
  fontSize: 18px,
  lineHeight: 1.8,
  padding: { top: 60, right: 60, bottom: 40, left: 60 }
}

First page adjustment:
  top: 165px (60 + 105 for chapter title)
```

### Overflow Logic
1. On each keystroke, check if content fits using `checkPageCapacity()`
2. If overflow detected:
   - Split text at word boundary
   - Keep fitting content on current page
   - Move overflow to next page
   - Auto-switch focus to next page
   - Navigate to correct spread if needed

## Next Steps
1. Verify line count is correct (should show 18 for first page)
2. Test overflow behavior with correct line count
3. Debug any remaining newline issues
4. Move to Step 3: backward flow deletion
