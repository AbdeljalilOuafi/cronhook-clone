# Update Functionality - User Guide & Verification

## ✅ Good News - Update Functionality is Already Implemented!

The "Update" button in the webhook dialog is **fully functional** and connected to the backend API. Here's how it works:

## 🔧 How the Update Feature Works

### 1. **Opening a Webhook for Editing**

There are two ways to edit a webhook:

#### Option A: Click on the Webhook Card
```
1. Click anywhere on a webhook card
2. Dialog opens with webhook details
3. Modify any fields you want
4. Click "Update" button
5. ✅ Changes are saved to the backend
```

#### Option B: Click the Edit Button
```
1. Click the edit (pencil) icon on a webhook card
2. Dialog opens with webhook details
3. Modify any fields you want
4. Click "Update" button
5. ✅ Changes are saved to the backend
```

### 2. **What Happens When You Click "Update"**

```typescript
// Step-by-step process:

1. Form validation runs (Zod schema)
   ↓
2. If valid, onSubmit() is called
   ↓
3. Form data is transformed to API payload
   ↓
4. Timezone conversion (if one-time webhook)
   - Local time → UTC
   ↓
5. API call: PATCH /api/webhooks/{id}/
   ↓
6. Backend updates webhook
   ↓
7. Backend reschedules webhook with new settings
   ↓
8. Success:
   - Toast notification: "Webhook updated successfully"
   - Dialog closes
   - Webhook list refreshes automatically
```

### 3. **API Endpoint Used**

```http
PATCH /api/webhooks/{id}/
Content-Type: application/json
Authorization: Token YOUR_TOKEN

{
  "name": "Updated Name",
  "url": "https://new-url.com",
  "scheduled_at": "2025-10-25T09:00:00.000Z",
  ... other fields
}
```

**Backend Response:**
```json
{
  "id": 1,
  "name": "Updated Name",
  "url": "https://new-url.com",
  "scheduled_at": "2025-10-25T09:00:00Z",
  ...
}
```

## 📝 Testing the Update Feature

### Test Case 1: Update Webhook Name
1. Click on any webhook card
2. Change the name field
3. Click "Update"
4. ✅ Should see: "Webhook updated successfully" toast
5. ✅ Dialog should close
6. ✅ Card should show new name

### Test Case 2: Update Scheduled Time (One-Time Webhook)
1. Click on a one-time webhook
2. Change the scheduled time (e.g., change from 10:00 AM to 11:00 AM)
3. Click "Update"
4. ✅ Should see success toast
5. ✅ Check network tab: should send UTC time to API
6. ✅ Reload page: should display new time in local timezone

### Test Case 3: Update Cron Expression (Recurring Webhook)
1. Click on a recurring webhook
2. Change cron expression (e.g., from `*/5 * * * *` to `*/10 * * * *`)
3. Click "Update"
4. ✅ Should see success toast
5. ✅ Webhook should now run every 10 minutes instead of 5

### Test Case 4: Update URL and Headers
1. Click on any webhook
2. Change the URL
3. Modify the headers JSON
4. Click "Update"
5. ✅ Should see success toast
6. ✅ Next execution should use new URL and headers

### Test Case 5: Update Payload
1. Click on any webhook
2. Modify the payload JSON
3. Click "Update"
4. ✅ Should see success toast
5. ✅ Next execution should send new payload

### Test Case 6: Validation Errors
1. Click on a webhook
2. Clear the name field (required)
3. Click "Update"
4. ✅ Should see validation error: "Name is required"
5. ✅ Form should NOT submit
6. ✅ Dialog should stay open

### Test Case 7: Invalid JSON
1. Click on a webhook
2. Enter invalid JSON in headers: `{invalid}`
3. Click "Update"
4. ✅ Should see error (either validation or API error)
5. ✅ Dialog should stay open

## 🔍 Debugging the Update Feature

### Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Click on a webhook card to edit
4. Modify a field
5. Click "Update"
6. Look for the PATCH request:

```
Request:
  Method: PATCH
  URL: http://localhost:8000/api/webhooks/1/
  Headers: 
    Authorization: Token ...
    Content-Type: application/json
  Body: 
    {
      "name": "Updated Name",
      "url": "...",
      ...
    }

Response:
  Status: 200 OK
  Body: 
    {
      "id": 1,
      "name": "Updated Name",
      ...
    }
```

### Check Console for Errors

If update fails, check browser console for:
```
Failed to update webhook
```

Or backend errors like:
```
{
  "scheduled_at": ["Scheduled time must be in the future"]
}
```

## 🎯 Current Implementation Details

### Files Involved

1. **`WebhookDialog.tsx`** - The dialog component
   - Handles form state
   - Contains update mutation
   - Processes form submission
   - Shows success/error toasts

2. **`webhooks.ts`** - API client
   - Contains `update()` function
   - Makes PATCH request to backend
   - Returns updated webhook

3. **`WebhooksPage.tsx`** - Main webhooks page
   - Manages dialog state
   - Fetches webhook details on card click
   - Refreshes list after update

### Code Flow

```typescript
// In WebhookDialog.tsx

// 1. Update mutation definition
const updateMutation = useMutation({
  mutationFn: ({ id, data }: { id: number; data: CreateWebhookRequest }) =>
    webhooksApi.update(id, data),  // Calls PATCH /api/webhooks/{id}/
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['webhooks'] });  // Refresh list
    toast.success('Webhook updated successfully');  // Show success
    onClose();  // Close dialog
  },
  onError: (error: any) => {
    toast.error(error.response?.data?.detail || 'Failed to update webhook');
  },
});

// 2. Form submission handler
const onSubmit = (data: WebhookFormData) => {
  // ... transform data to payload ...
  
  if (isEditing) {
    // This is where update happens!
    updateMutation.mutate({ id: webhook.id, data: payload });
  } else {
    createMutation.mutate(payload);
  }
};

// 3. Update button (in the form)
<Button type="submit" disabled={updateMutation.isPending}>
  {updateMutation.isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
</Button>
```

## ✨ Features of the Update Functionality

1. **✅ Automatic Timezone Conversion**
   - Local time → UTC before sending to API
   - No manual conversion needed

2. **✅ Form Validation**
   - Validates all required fields
   - Checks for valid URLs
   - Validates JSON format for headers/payload

3. **✅ Loading States**
   - Button shows "Saving..." while updating
   - Button is disabled during update
   - Prevents double-submission

4. **✅ Error Handling**
   - Shows error toast if update fails
   - Displays backend validation errors
   - Keeps dialog open on error

5. **✅ Success Feedback**
   - Shows success toast
   - Closes dialog automatically
   - Refreshes webhook list

6. **✅ Optimistic Updates**
   - List refreshes with latest data
   - No manual page reload needed

## 🚀 Summary

The update functionality is **fully implemented and working**! 

**To update a webhook:**
1. Click on the webhook card (or edit button)
2. Modify any fields you want
3. Click the "Update" button
4. ✅ Done! Changes are saved

**What gets updated on the backend:**
- All webhook fields (name, URL, method, etc.)
- Schedule gets automatically rescheduled
- Timezone conversions happen automatically
- Validation ensures data integrity

**No additional code needed** - everything is already working! 🎉

## 📱 User Interface States

### Create Mode
- Dialog title: "Create Webhook"
- Button text: "Create"
- webhook prop: `null`

### Edit Mode (Update)
- Dialog title: "Edit Webhook"
- Button text: "Update"
- webhook prop: Webhook object with data

### During Update
- Button text: "Saving..."
- Button: Disabled
- Form: Locked (can't submit again)

### After Update
- Toast: "Webhook updated successfully"
- Dialog: Closes
- List: Refreshes automatically
