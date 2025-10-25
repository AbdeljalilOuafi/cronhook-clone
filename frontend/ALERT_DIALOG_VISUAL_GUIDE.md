# Visual Guide: Past Schedule Time Alert

## 🎨 Alert Dialog Preview

When a user tries to activate a webhook with a past scheduled time, they will see:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⏰ Scheduled Time Has Passed                              │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  The webhook "Timezone Convertion" cannot be activated      │
│  because its scheduled time is in the past.                 │
│                                                             │
│  Would you like to update the scheduled time to             │
│  activate this webhook?                                     │
│                                                             │
│                                    ┌────────┐  ┌──────────┐ │
│                                    │ Cancel │  │  Update  │ │
│                                    └────────┘  │ Webhook  │ │
│                                                └──────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Component Breakdown

### Icon
- **Type**: Clock icon from lucide-react
- **Color**: Amber/Yellow (warning color)
- **Size**: 20x20 pixels
- **Position**: Left of title

### Title
- **Text**: "Scheduled Time Has Passed"
- **Font**: Bold, larger size
- **Color**: Default text color
- **Icon**: Clock emoji visual indicator

### Description
- **Paragraph 1**: 
  - Plain text with **bold webhook name**
  - Explains the problem clearly
  
- **Paragraph 2**:
  - Asks user if they want to update
  - Smaller, lighter text color

### Buttons

#### Cancel Button (Left)
- **Style**: Outline variant
- **Color**: Secondary/muted
- **Action**: Dismisses alert, clears state
- **Text**: "Cancel"

#### Update Webhook Button (Right)
- **Style**: Primary/filled
- **Color**: Brand color (default blue/purple)
- **Action**: Opens edit dialog with webhook loaded
- **Text**: "Update Webhook"

## 🎬 Animation Sequence

### Opening (200ms)
1. **Backdrop fades in** (0-100ms)
   - Black overlay: 0% → 80% opacity
   
2. **Dialog zooms in** (100-200ms)
   - Scale: 95% → 100%
   - Opacity: 0% → 100%
   - Position: Slides from top-center

### Closing (200ms)
1. **Dialog zooms out** (0-100ms)
   - Scale: 100% → 95%
   - Opacity: 100% → 0%
   
2. **Backdrop fades out** (100-200ms)
   - Black overlay: 80% → 0% opacity

## 📱 Responsive Behavior

### Desktop (>640px)
```
┌────────────────────────────────────┐
│  ⏰ Scheduled Time Has Passed     │
│                                    │
│  The webhook "..." cannot be...    │
│                                    │
│  Would you like to update...       │
│                                    │
│          [Cancel] [Update Webhook] │
└────────────────────────────────────┘
```

### Mobile (<640px)
```
┌─────────────────────┐
│  ⏰ Scheduled Time  │
│     Has Passed      │
│                     │
│  The webhook "..."  │
│  cannot be...       │
│                     │
│  Would you like to  │
│  update...          │
│                     │
│  [Update Webhook]   │
│  [Cancel]           │
└─────────────────────┘
```

## 🎨 Color Scheme

### Light Mode
- **Backdrop**: `rgba(0, 0, 0, 0.8)`
- **Dialog Background**: `#FFFFFF`
- **Border**: `#E5E7EB` (gray-200)
- **Clock Icon**: `#F59E0B` (amber-500)
- **Title Text**: `#111827` (gray-900)
- **Description**: `#6B7280` (gray-500)
- **Cancel Button**: 
  - Border: `#E5E7EB`
  - Text: `#374151`
  - Hover: `#F9FAFB` background
- **Update Button**:
  - Background: `#3B82F6` (blue-500)
  - Text: `#FFFFFF`
  - Hover: `#2563EB` (blue-600)

### Dark Mode
- **Backdrop**: `rgba(0, 0, 0, 0.8)`
- **Dialog Background**: `#1F2937` (gray-800)
- **Border**: `#374151` (gray-700)
- **Clock Icon**: `#FBBF24` (amber-400)
- **Title Text**: `#F9FAFB` (gray-50)
- **Description**: `#9CA3AF` (gray-400)
- **Cancel Button**:
  - Border: `#4B5563`
  - Text: `#D1D5DB`
  - Hover: `#374151` background
- **Update Button**:
  - Background: `#3B82F6`
  - Text: `#FFFFFF`
  - Hover: `#2563EB`

## 🔄 State Flow Diagram

```
User Toggles Switch
        ↓
Frontend sends: POST /api/webhooks/{id}/activate/
        ↓
Backend checks: scheduled_at > now?
        ↓
     NO ❌
        ↓
Backend returns: 400 Bad Request
{
  "detail": "Cannot activate one-time webhook: 
             scheduled time is in the past"
}
        ↓
Frontend detects: error.includes('scheduled time is in the past')
        ↓
Frontend shows: AlertDialog
        ↓
    User Choice?
    ┌─────┴─────┐
    ↓           ↓
 Cancel      Update
    ↓           ↓
 Close      Open Edit Dialog
  Alert         ↓
            Load Webhook
                ↓
            User Updates Time
                ↓
            POST /api/webhooks/{id}/
                ↓
            Success ✅
                ↓
            Close Dialog
                ↓
            User Can Now Activate
```

## 📋 Accessibility Features

### Keyboard Navigation
- **Tab**: Moves focus between buttons
- **Enter**: Activates focused button
- **Escape**: Closes dialog (same as Cancel)
- **Shift+Tab**: Reverse tab order

### Screen Reader Support
- **Role**: `alertdialog`
- **Aria-labelledby**: References title
- **Aria-describedby**: References description
- **Focus trap**: Keeps focus within dialog
- **Initial focus**: First focusable element (Cancel button)

### ARIA Attributes
```html
<div role="alertdialog" 
     aria-labelledby="alert-title"
     aria-describedby="alert-description"
     aria-modal="true">
  <h2 id="alert-title">Scheduled Time Has Passed</h2>
  <p id="alert-description">The webhook cannot be activated...</p>
</div>
```

## 🎯 User Interaction Examples

### Example 1: Quick Update
1. **User sees**: Toggle switch is OFF
2. **User clicks**: Switch to activate
3. **Alert appears**: "Scheduled Time Has Passed"
4. **User clicks**: "Update Webhook"
5. **Edit dialog opens**: Pre-filled with webhook data
6. **User changes**: scheduled_at from "2025-10-24 10:00" to "2025-10-26 15:00"
7. **User clicks**: "Update"
8. **Success toast**: "Webhook updated successfully"
9. **User clicks**: Switch again
10. **Success toast**: "Webhook activated"

### Example 2: User Cancels
1. **Alert appears**: "Scheduled Time Has Passed"
2. **User clicks**: "Cancel"
3. **Alert closes**: No action taken
4. **Switch stays**: OFF (inactive)
5. **User can**: Try again later or manually edit webhook

### Example 3: Recurring Webhook (No Alert)
1. **User toggles**: Recurring webhook
2. **Backend**: Activates successfully
3. **No alert**: Only one-time webhooks with past times show alert
4. **Success toast**: "Webhook activated"

## 📐 Dimensions

### Dialog
- **Max Width**: 512px (lg)
- **Padding**: 24px (p-6)
- **Border Radius**: 8px (rounded-lg)
- **Shadow**: Large shadow for depth

### Spacing
- **Title to Description**: 8px (space-y-2)
- **Description paragraphs**: 8px gap
- **Content to Footer**: 16px (gap-4)
- **Footer buttons**: 8px gap (space-x-2)

### Typography
- **Title**: 18px, font-semibold
- **Description**: 14px, regular
- **Button text**: 14px, medium

---

**The alert dialog provides a professional, user-friendly way to handle the edge case of past scheduled times!** ✨
