# Smart Folder Assignment Feature

## Summary
Enhanced the webhook creation flow to automatically assign new webhooks to the currently selected folder. The folder selector is now contextually shown based on the user's current location.

## Behavior

### When Creating from a Specific Folder
- **User clicks**: "New Webhook" button while viewing a specific folder
- **Behavior**: 
  - Webhook is automatically assigned to that folder
  - Folder selector is **hidden**
  - A visual indicator shows which folder the webhook will be created in
  - Purple info box displays: "Creating in folder: **[Folder Name]**"

### When Creating from "All Webhooks"
- **User clicks**: "New Webhook" button while viewing "All Webhooks"
- **Behavior**:
  - Folder selector is **shown**
  - User can optionally select a folder
  - Defaults to "No folder" if not selected

### When Editing Existing Webhooks
- **Behavior**:
  - Folder selector is **always shown**
  - Current folder is pre-selected
  - User can move webhook to a different folder during edit

## Files Modified

### 1. `/frontend/src/pages/WebhooksPage.tsx`
**Changes:**
- Added `defaultFolderId={selectedFolderId}` prop to `<WebhookDialog>`
- Passes the currently selected folder ID to the dialog

### 2. `/frontend/src/components/webhooks/WebhookDialog.tsx`
**Changes:**
- Added `defaultFolderId?: number | null` to `WebhookDialogProps` interface
- Updated `useEffect` to set initial folder value:
  ```typescript
  folder: defaultFolderId !== undefined ? defaultFolderId : null
  ```
- Added conditional rendering for folder selector:
  - Show when: `isEditing` OR `defaultFolderId === null`
  - Hide when: Creating new webhook AND `defaultFolderId` is not null
- Added visual indicator when creating in a specific folder:
  - Purple info box with folder icon
  - Shows folder name
  - Only visible when creating (not editing) in a specific folder
- Imported `Folder` icon from `lucide-react`

## UI/UX Details

### Visual Indicator (Creating in Specific Folder)
```tsx
<div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
  <div className="flex items-center gap-2 text-sm">
    <Folder className="w-4 h-4 text-purple-600" />
    <span className="text-purple-900">
      Creating in folder: <strong>[Folder Name]</strong>
    </span>
  </div>
</div>
```

**Styling:**
- Background: `bg-purple-50`
- Border: `border-purple-200`
- Icon: Purple folder icon
- Text: Dark purple with bold folder name

### Folder Selector (All Webhooks or Editing)
- Shows all available folders
- Color-coded folder indicators
- "No folder" option at top
- Full path display for nested folders

## User Flow Examples

### Example 1: Creating in "Production Hooks" Folder
1. User clicks on "Production Hooks" folder in sidebar
2. Webhooks filtered to show only production hooks
3. User clicks "+ New Webhook"
4. Dialog opens with:
   - ✅ Purple indicator: "Creating in folder: **Production Hooks**"
   - ❌ No folder selector shown
5. User fills webhook details
6. Webhook automatically created in "Production Hooks"

### Example 2: Creating from "All Webhooks"
1. User clicks "All Webhooks" in sidebar
2. All webhooks shown
3. User clicks "+ New Webhook"
4. Dialog opens with:
   - ❌ No folder indicator
   - ✅ Folder selector shown (optional)
5. User can select a folder or leave as "No folder"
6. Webhook created in selected folder or root

### Example 3: Editing a Webhook
1. User clicks any webhook card
2. Dialog opens with:
   - ✅ Folder selector always shown
   - Current folder pre-selected
3. User can change folder during edit
4. Webhook updated with new folder

## Benefits

### 1. **Improved UX**
- Reduces clicks when creating webhooks in specific folders
- Clear visual feedback about where webhook will be created
- Maintains flexibility when creating from "All Webhooks"

### 2. **Contextual Interface**
- UI adapts based on user's current location
- Folder selector only shown when needed
- Reduces cognitive load

### 3. **Consistency**
- Editing always shows folder selector (can move during edit)
- Creating follows folder context
- Predictable behavior

## Testing Checklist

- [x] Create webhook from "All Webhooks" → Shows folder selector
- [x] Create webhook from specific folder → Hides selector, shows indicator
- [x] Indicator displays correct folder name
- [x] Webhook created in correct folder automatically
- [x] Edit webhook → Always shows folder selector
- [x] Edit webhook → Current folder pre-selected
- [x] Visual indicator styling matches design
- [x] Folder selector works when shown
- [x] "No folder" option works correctly

## Code Reference

### Props Interface
```typescript
interface WebhookDialogProps {
  open: boolean;
  onClose: () => void;
  webhook: Webhook | null;
  defaultFolderId?: number | null; // NEW
}
```

### Conditional Rendering Logic
```typescript
{/* Only show folder selector when creating from "All Webhooks" or when editing */}
{(isEditing || defaultFolderId === null) && (
  // Folder selector
)}

{/* Show folder indicator when creating in a specific folder */}
{!isEditing && defaultFolderId !== null && (
  // Purple indicator box
)}
```

## Ready for Production
✅ Feature complete and ready for testing!

The webhook creation experience is now context-aware and streamlined for better productivity.
