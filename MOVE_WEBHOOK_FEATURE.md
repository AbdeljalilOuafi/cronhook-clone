# Move Webhook Feature Implementation

## Summary
Added a three-dot menu (⋮) to the top-right corner of each webhook card with a "Move..." option that allows users to move webhooks between folders.

## Files Created

### 1. `/frontend/src/components/ui/dropdown-menu.tsx`
- Created Radix UI dropdown menu component
- Supports all standard dropdown menu features
- Installed `@radix-ui/react-dropdown-menu` package

### 2. `/frontend/src/components/webhooks/MoveWebhookDialog.tsx`
- Dialog for moving a webhook to a different folder
- Shows list of all available folders with:
  - Folder name and color
  - Webhook count per folder
  - "No folder (Root)" option
- Highlights currently selected folder
- Uses `webhooksApi.bulkMove()` to move the webhook
- Invalidates queries after successful move

## Files Modified

### `/frontend/src/pages/WebhooksPage.tsx`
**Changes:**
- Added imports for `DropdownMenu`, `MoreVertical`, `FolderInput`, and `MoveWebhookDialog`
- Added state for move dialog: `showMoveDialog` and `webhookToMove`
- Updated webhook card header:
  - Added three-dot menu button next to the badge
  - Menu contains "Move..." option with folder icon
  - Stops propagation to prevent opening webhook details
- Made title and content areas clickable for editing webhook
- Added `<MoveWebhookDialog>` component at the end

## UI/UX Features

### Three-Dot Menu
- Located in top-right corner of each webhook card
- Next to the Active/Inactive badge
- Uses `MoreVertical` icon (⋮)
- Ghost button style for minimal appearance
- Stops click propagation to prevent card click

### Move Dialog
- Modal dialog with folder selection
- Shows:
  - Webhook name in description
  - "No folder (Root)" option at top
  - All folders with color dots, icons, and webhook counts
  - Scrollable list (max-height: 300px)
  - Move button (disabled if already in selected folder)
- Purple highlight for selected folder
- Hover effect on folder items

### Click Behavior
- **Card Title/Content**: Click to open webhook details dialog
- **Three-dot menu**: Click to open move menu
- **Badge/Switch/Delete**: Click to perform respective actions
- All properly isolated with `stopPropagation()`

## API Integration

Uses the existing `webhooksApi.bulkMove()` endpoint:
```typescript
POST /api/webhooks/bulk_move/
{
  "webhook_ids": [1],
  "folder_id": 2  // or null for root
}
```

## Testing Checklist

- [x] Three-dot menu appears on all webhook cards
- [x] Menu opens when clicking three dots
- [x] "Move..." option appears in menu
- [x] Move dialog opens when clicking "Move..."
- [x] Dialog shows all folders
- [x] "No folder" option works
- [x] Current folder is highlighted
- [x] Move button disabled if already in folder
- [x] Webhook moves successfully
- [x] Folder counts update after move
- [x] Success toast appears
- [x] Card clicks still work for opening details

## Package Added
```bash
npm install @radix-ui/react-dropdown-menu
```

## Ready for Production
✅ Feature complete and ready for testing!
