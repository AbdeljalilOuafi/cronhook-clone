# Update Button Debugging Guide

## 🔍 Enhanced Error Handling & Logging

I've added comprehensive logging and error handling to help debug the update functionality. Here's what was added:

## 📝 Changes Made

### 1. **Enhanced Form Submission Logging**

The `onSubmit` function now logs detailed information:

```typescript
const onSubmit = (data: WebhookFormData) => {
  console.log('🔵 Form submitted with data:', data);
  console.log('🔵 Is editing mode:', isEditing);
  console.log('🔵 Webhook ID:', webhook?.id);
  // ... more logs
}
```

### 2. **JSON Validation with Error Messages**

Added try-catch blocks for JSON parsing with user-friendly error messages:

```typescript
try {
  parsedHeaders = JSON.parse(data.headers);
} catch (error) {
  console.error('❌ Invalid headers JSON:', error);
  toast.error('Invalid JSON in headers field');
  return; // Stops submission
}
```

### 3. **Button Click Logging**

The Update/Create button now logs when clicked:

```typescript
onClick={(e) => {
  console.log('🔵 Submit button clicked!');
  console.log('🔵 Form errors:', errors);
  console.log('🔵 Current form values:', watch());
}}
```

### 4. **Form Level Logging**

The form element logs when submission is attempted:

```typescript
<form 
  onSubmit={(e) => {
    console.log('🔵 Form onSubmit triggered!');
    handleSubmit(onSubmit)(e);
  }}
>
```

### 5. **Enhanced Mutation Error Handling**

Both create and update mutations now show detailed errors:

```typescript
onError: (error: any) => {
  console.error('❌ Update webhook error:', error);
  console.error('❌ Error response:', error.response);
  
  // Show main error
  toast.error(errorMessage);
  
  // Show field-specific errors
  if (error.response?.data) {
    Object.keys(error.response.data).forEach(key => {
      toast.error(`${key}: ${error.response.data[key]}`);
    });
  }
}
```

## 🧪 How to Debug

### Step 1: Open Browser Console

1. Open your application
2. Press F12 to open DevTools
3. Go to the **Console** tab
4. Keep it open while testing

### Step 2: Test the Update Flow

1. Click on a webhook card to open the dialog
2. Watch the console - you should see logs about loading
3. Modify a field (e.g., change the name)
4. Click the "Update" button

### Step 3: Check Console Logs

You should see logs in this order:

```
🔵 Submit button clicked!
🔵 Button type: submit
🔵 Form errors: {}
🔵 Is editing: true
🔵 Webhook object: { id: 1, name: "...", ... }
🔵 Current form values: { name: "...", url: "...", ... }

🔵 Form onSubmit triggered!
🔵 Event: SubmitEvent {...}

🔵 Form submitted with data: { name: "...", ... }
🔵 Is editing mode: true
🔵 Webhook ID: 1
🔵 One-time webhook - scheduled_at (local): 2025-10-25T10:00
🔵 One-time webhook - scheduled_at (UTC): 2025-10-25T09:00:00.000Z
🔵 Final payload being sent to API: { name: "...", ... }
🔵 Calling UPDATE mutation for webhook ID: 1

🔵 updateMutation called with: { id: 1, data: {...} }

✅ Webhook updated successfully: { id: 1, ... }
```

### Step 4: Check Network Tab

1. Switch to the **Network** tab in DevTools
2. Click the Update button again
3. Look for a request to `/api/webhooks/1/` (or similar)
4. Check:
   - **Method**: Should be `PATCH`
   - **Status**: Should be `200` or `201`
   - **Request Payload**: Should contain your changes

## 🚨 Common Issues & Solutions

### Issue 1: No Logs Appear When Clicking Update

**Possible Causes:**
- Button is disabled
- Form validation is failing
- Event listener not attached

**Check:**
```
🔵 Submit button clicked!  <-- Should appear immediately
```

**If this doesn't appear:**
- Check if the button shows "Saving..." (means mutation is pending)
- Check browser console for JavaScript errors
- Try refreshing the page

### Issue 2: Button Clicked but Form Not Submitting

**Check Console For:**
```
🔵 Submit button clicked!  ✅
🔵 Form onSubmit triggered!  ❌ <-- MISSING
```

**Possible Causes:**
- Form validation errors
- React Hook Form blocking submission

**Solution:**
Check the logged form errors:
```javascript
🔵 Form errors: { 
  name: { message: "Name is required" },
  scheduled_at: { message: "..." }
}
```

### Issue 3: Form Submits but No API Call

**Check Console For:**
```
🔵 Form submitted with data: {...}  ✅
🔵 Calling UPDATE mutation for webhook ID: 1  ✅
🔵 updateMutation called with: {...}  ❌ <-- MISSING
```

**Possible Causes:**
- `webhook` object is null or missing ID
- Mutation function not called

**Check:**
```javascript
🔵 Webhook ID: undefined  <-- PROBLEM!
```

**Solution:**
- Verify webhook was loaded when card was clicked
- Check `selectedWebhook` state

### Issue 4: Invalid JSON Error

**You'll See:**
```
❌ Invalid headers JSON: SyntaxError
Toast: "Invalid JSON in headers field"
```

**Solution:**
- Fix the JSON syntax in headers or payload field
- Use valid JSON: `{"key": "value"}`
- Not: `{key: value}` or `{'key': 'value'}`

### Issue 5: API Call Made but Failed

**Check Console For:**
```
❌ Update webhook error: {...}
❌ Error response: { data: { detail: "..." } }
```

**Check Network Tab:**
- Response status code (400, 401, 403, 404, 500)
- Response body for error details

## 📊 Expected Console Output (Success Case)

```
🔵 Submit button clicked!
🔵 Button type: submit
🔵 Form errors: {}
🔵 Is editing: true
🔵 Webhook object: {id: 1, name: 'Test Webhook', ...}
🔵 Current form values: {name: 'Updated Name', url: '...', ...}

🔵 Form onSubmit triggered!
🔵 Event: SubmitEvent {isTrusted: true, ...}

🔵 Form submitted with data: {name: 'Updated Name', url: '...', ...}
🔵 Is editing mode: true
🔵 Webhook ID: 1
🔵 One-time webhook - scheduled_at (local): 2025-10-25T10:00
🔵 One-time webhook - scheduled_at (UTC): 2025-10-25T09:00:00.000Z
🔵 Final payload being sent to API: {
  name: 'Updated Name',
  url: 'https://...',
  http_method: 'POST',
  schedule_type: 'once',
  scheduled_at: '2025-10-25T09:00:00.000Z',
  headers: {},
  payload: {},
  max_retries: 3,
  retry_delay: 60,
  timeout: 30
}
🔵 Calling UPDATE mutation for webhook ID: 1

🔵 updateMutation called with: {
  id: 1,
  data: {...}
}

✅ Webhook updated successfully: {id: 1, name: 'Updated Name', ...}
Toast: "Webhook updated successfully"
```

## 🎯 Next Steps

1. **Try clicking the Update button** and share the console output
2. **Check for any error messages** (red text starting with ❌)
3. **Share the logs** - especially any missing expected logs

## 🔧 Quick Test Checklist

- [ ] Open browser console before clicking card
- [ ] Click webhook card - see loading logs
- [ ] Dialog opens with webhook data
- [ ] Make a small change (e.g., change webhook name)
- [ ] Click "Update" button
- [ ] See "🔵 Submit button clicked!" in console
- [ ] See "🔵 Form onSubmit triggered!" in console
- [ ] See "🔵 Form submitted with data:" in console
- [ ] See "🔵 Calling UPDATE mutation" in console
- [ ] See "✅ Webhook updated successfully" in console
- [ ] See success toast notification
- [ ] Dialog closes
- [ ] Webhook list refreshes

## 💡 Tips

1. **Clear Console** before each test for clean output
2. **Take Screenshots** of console if issues persist
3. **Check Network Tab** to verify API calls are made
4. **Test with Simple Changes** first (just change the name)
5. **Avoid Invalid JSON** - test with valid data first

---

**If the Update button still doesn't work after this, please share:**
1. Console logs (everything from clicking Update)
2. Network tab (any API calls made)
3. Any error messages or toasts you see
