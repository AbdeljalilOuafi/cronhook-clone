# Past Schedule Time Alert Dialog Implementation

## 🎯 Problem Solved

**Issue**: When trying to activate a one-time webhook whose `scheduled_at` time is in the past, the backend returns a 400 error. Users would see a generic error toast and wouldn't know how to fix it.

**Solution**: Created a beautiful alert dialog that:
1. Detects the "scheduled time is in the past" error
2. Shows a friendly explanation with the webhook name
3. Offers a direct action to update the webhook
4. Opens the edit dialog with the webhook pre-loaded

## ✨ User Experience Flow

### Before (Poor UX):
1. User toggles switch to activate webhook
2. ❌ Generic error toast: "Failed to update webhook status"
3. User confused about what went wrong
4. No clear path to fix the issue

### After (Excellent UX):
1. User toggles switch to activate webhook
2. 🔔 Alert dialog appears with:
   - Clear icon (Clock) indicating time issue
   - Title: "Scheduled Time Has Passed"
   - Message: "The webhook **{name}** cannot be activated because its scheduled time is in the past."
   - Question: "Would you like to update the scheduled time to activate this webhook?"
3. User clicks **"Update Webhook"** button
4. ✅ Edit dialog opens with webhook details
5. User updates the `scheduled_at` field to a future time
6. User clicks "Update"
7. ✅ Webhook updated successfully
8. User can now activate it with the toggle switch

## 🎨 UI Components Created

### 1. AlertDialog Component
**File**: `frontend/src/components/ui/alert-dialog.tsx`

A reusable Radix UI alert dialog with:
- **AlertDialog** - Root component
- **AlertDialogContent** - Modal content container
- **AlertDialogHeader** - Header section
- **AlertDialogTitle** - Title with icon support
- **AlertDialogDescription** - Description text
- **AlertDialogFooter** - Button container
- **AlertDialogAction** - Primary action button
- **AlertDialogCancel** - Cancel button

### 2. Enhanced WebhooksPage
**File**: `frontend/src/pages/WebhooksPage.tsx`

**New State Variables**:
```typescript
const [showPastTimeAlert, setShowPastTimeAlert] = useState(false);
const [pastTimeWebhook, setPastTimeWebhook] = useState<Webhook | null>(null);
```

**Enhanced Error Handling**:
```typescript
onError: (error: any, variables) => {
  const errorMessage = error.response?.data?.detail;
  
  // Check if error is due to past scheduled time
  if (errorMessage.includes('scheduled time is in the past')) {
    const failedWebhook = webhooks?.find(w => w.id === variables.id);
    if (failedWebhook) {
      setPastTimeWebhook(failedWebhook);
      setShowPastTimeAlert(true);
    }
  } else {
    toast.error(errorMessage);
  }
}
```

**New Handler**:
```typescript
const handleUpdateFromAlert = async () => {
  if (pastTimeWebhook) {
    setShowPastTimeAlert(false);
    // Fetch full webhook details and open edit dialog
    const webhookDetails = await webhooksApi.getById(pastTimeWebhook.id);
    setSelectedWebhook(webhookDetails);
    setIsDialogOpen(true);
    setPastTimeWebhook(null);
  }
};
```

## 📦 New Dependencies

```bash
npm install @radix-ui/react-alert-dialog
```

## 🎭 Visual Design

### Alert Dialog Styling
- **Backdrop**: Black overlay with 80% opacity
- **Content**: White card with rounded corners and shadow
- **Icon**: Amber clock icon (indicates warning)
- **Title**: Bold, prominent
- **Description**: Two paragraphs:
  1. Explains the problem with webhook name in bold
  2. Asks if user wants to update
- **Buttons**:
  - Cancel (outline style)
  - Update Webhook (primary style)

### Animation
- Smooth fade-in/fade-out
- Zoom in/out effect
- Slide animation from center

## 🔍 Error Detection Logic

The system detects the error by checking the backend error message:

```typescript
if (errorMessage.includes('scheduled time is in the past')) {
  // Show alert dialog
}
```

This matches the backend error from `views.py`:
```python
if webhook.schedule_type == 'once' and webhook.scheduled_at <= timezone.now():
    return Response(
        {'detail': 'Cannot activate one-time webhook: scheduled time is in the past'},
        status=status.HTTP_400_BAD_REQUEST
    )
```

## 📝 Complete Example

### Scenario: Activating Old Webhook

**User has webhook**:
- Name: "Send Birthday Email"
- Scheduled at: 2025-10-24 10:00 AM (yesterday)
- Status: Inactive

**User Action**: Toggles switch to activate

**What Happens**:

1. **API Call**: `POST /api/webhooks/5/activate/`

2. **Backend Response** (400):
   ```json
   {
     "detail": "Cannot activate one-time webhook: scheduled time is in the past"
   }
   ```

3. **Frontend Detects**: Error contains "scheduled time is in the past"

4. **Alert Dialog Appears**:
   ```
   ⏰ Scheduled Time Has Passed
   
   The webhook "Send Birthday Email" cannot be activated because
   its scheduled time is in the past.
   
   Would you like to update the scheduled time to activate this webhook?
   
   [Cancel]  [Update Webhook]
   ```

5. **User Clicks**: "Update Webhook"

6. **Edit Dialog Opens**: Pre-loaded with webhook details

7. **User Updates**: Changes scheduled_at to 2025-10-26 10:00 AM

8. **User Clicks**: "Update"

9. **Success**: Webhook updated, now user can activate it

## 🎯 Edge Cases Handled

### 1. Multiple Rapid Toggles
- Alert only shows for one webhook at a time
- State is properly cleared between alerts

### 2. Dialog Already Open
- Alert waits for current dialog to close
- Proper state management prevents conflicts

### 3. Webhook Deleted While Alert Open
- Alert can be dismissed with Cancel
- State is cleared properly

### 4. Other Error Types
- Only past time errors show alert dialog
- Other errors show regular toast notifications
- Examples:
  - "Webhook is already active" → Toast
  - "Webhook is already inactive" → Toast
  - Network errors → Toast

## 🧪 Testing Checklist

- [x] Alert dialog component created
- [x] AlertDialog installed from Radix UI
- [x] State variables added to WebhooksPage
- [x] Error detection logic implemented
- [x] handleUpdateFromAlert function created
- [x] Alert dialog markup added to JSX
- [x] Clock icon imported from lucide-react
- [x] Webhook name displayed in alert
- [x] Update button opens edit dialog
- [x] Cancel button closes alert
- [x] State properly cleared after actions
- [x] No TypeScript errors

## 🎨 Custom Styling Options

You can customize the alert appearance by modifying `alert-dialog.tsx`:

### Change Colors:
```tsx
// Make it more urgent (red theme)
<AlertDialogTitle className="flex items-center gap-2 text-red-600">
  <Clock className="h-5 w-5 text-red-500" />
  Scheduled Time Has Passed
</AlertDialogTitle>
```

### Change Size:
```tsx
<AlertDialogContent className="max-w-md"> // Smaller
<AlertDialogContent className="max-w-2xl"> // Larger
```

## 📊 Benefits

1. **Clear Communication**: Users immediately understand the problem
2. **Guided Solution**: Direct path to fix the issue (Update button)
3. **Better UX**: No confusion about what went wrong
4. **Professional**: Polished error handling with modern UI
5. **Reusable**: AlertDialog can be used for other warnings/confirmations

## 🚀 Future Enhancements

Possible improvements:
1. **Smart Suggestion**: Auto-fill scheduled_at with current time + 1 hour
2. **Quick Update**: Allow changing time directly in alert dialog
3. **Recurring Webhooks**: Similar alert for invalid cron expressions
4. **Batch Operations**: Handle multiple failed activations
5. **History**: Show when webhook was originally scheduled

---

**The alert dialog is now fully implemented and ready to use!** 🎉

When users try to activate a webhook with a past scheduled time, they'll see a beautiful, helpful alert that guides them to update the webhook instead of showing a confusing error message.
