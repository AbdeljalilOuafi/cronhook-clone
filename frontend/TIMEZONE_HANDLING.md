# Timezone Handling Implementation

## Problem Statement

The backend stores the `scheduled_at` field on the Webhook model in UTC format. This created a timezone mismatch issue where:

1. Users entering their local time in the frontend would see webhooks scheduled at the wrong time
2. The backend would receive and store the time as-is, treating it as UTC
3. When webhooks executed, they would run at unexpected times from the user's perspective

**Example:**
- User in Morocco (UTC+1) enters: **10:00 AM** local time
- Backend receives and stores: **10:00 AM UTC**
- Webhook executes at: **11:00 AM** Morocco time (1 hour late!)

## Solution

The frontend now handles all timezone conversions automatically:

### 1. **Creating/Editing Webhooks** (`WebhookDialog.tsx`)

When a user selects a datetime:

```typescript
// User inputs local time in the datetime-local field
// Example: "2025-10-25T10:00" (10:00 AM in Morocco)

// On form submit, convert to UTC before sending to API
const utcDateTime = convertLocalToUTC(data.scheduled_at);
// Result: "2025-10-25T09:00:00.000Z" (9:00 AM UTC)

payload.scheduled_at = utcDateTime; // Send UTC to backend
```

**Key Points:**
- The `datetime-local` input automatically uses the user's browser timezone
- `convertLocalToUTC()` converts this to a proper UTC ISO string with 'Z' suffix
- The backend receives and stores proper UTC time

### 2. **Displaying Webhooks** (`WebhooksPage.tsx`)

When showing scheduled times to users:

```typescript
// Backend returns: "2025-10-25T09:00:00Z" (UTC)

// Display in user's local timezone
const displayTime = formatUTCForDisplay(webhook.scheduled_at);
// Result for Morocco user: "25 Oct 2025, 10:00" (local time)
```

**Key Points:**
- Users always see times in their local timezone
- The conversion is automatic based on browser timezone
- Format is consistent and readable

### 3. **Editing Existing Webhooks** (`WebhookDialog.tsx`)

When loading a webhook for editing:

```typescript
// Backend returns: "2025-10-25T09:00:00Z" (UTC)

// Convert to local time for the datetime-local input
const localDateTime = convertUTCToLocal(webhook.scheduled_at);
// Result: "2025-10-25T10:00" (for Morocco user)

// Populate the form input
setValue('scheduled_at', localDateTime);
```

**Key Points:**
- The form shows the correct local time to the user
- When they submit, it's converted back to UTC
- No timezone confusion for the user

## Files Modified

### New File
- **`src/lib/timezone-utils.ts`**: Core timezone conversion utilities
  - `convertLocalToUTC()`: Converts datetime-local input to UTC ISO string
  - `convertUTCToLocal()`: Converts UTC ISO string to datetime-local format
  - `formatUTCForDisplay()`: Formats UTC for user-friendly display
  - `getUserTimezone()`: Gets user's timezone offset

### Updated Files

1. **`src/components/webhooks/WebhookDialog.tsx`**
   - Import timezone utilities
   - Convert UTC to local when loading webhook for editing
   - Convert local to UTC before sending to API
   - Added helpful hint text for users

2. **`src/pages/WebhooksPage.tsx`**
   - Import `formatUTCForDisplay`
   - Display scheduled times in user's local timezone

3. **`src/pages/ExecutionsPage.tsx`**
   - Import `formatUTCForDisplay`
   - Display execution times in user's local timezone

## How It Works

### The Date API Magic

JavaScript's `Date` object handles timezone conversions automatically:

```typescript
// Input from datetime-local: "2025-10-25T10:00"
const localDate = new Date("2025-10-25T10:00");
// Browser interprets this as 10:00 in the user's timezone

// Convert to UTC ISO string
const utcString = localDate.toISOString();
// Result: "2025-10-25T09:00:00.000Z" (if user is UTC+1)
```

### Reverse Conversion

```typescript
// UTC from backend: "2025-10-25T09:00:00Z"
const utcDate = new Date("2025-10-25T09:00:00Z");

// Get local components
const hours = utcDate.getHours(); // Returns 10 (for UTC+1 user)
const minutes = utcDate.getMinutes(); // Returns 0

// Format for datetime-local input
const localString = "2025-10-25T10:00";
```

## User Experience

### Creating a Webhook

1. User clicks "New Webhook"
2. Selects schedule type: "One-time"
3. Picks datetime: **October 25, 2025, 10:00 AM** (their local time)
4. Sees hint: *"Enter time in your local timezone. It will be converted to UTC automatically."*
5. Clicks "Create"
6. ✅ Webhook will execute at exactly 10:00 AM in their timezone

### Viewing Webhooks

1. User views webhook list
2. Sees scheduled time: **25 Oct 2025, 10:00** (their local time)
3. No mental conversion needed - it's already in their timezone!

### Editing a Webhook

1. User clicks "Edit" on existing webhook
2. Form shows: **October 25, 2025, 10:00 AM** (their local time)
3. Can adjust time as needed (still in local timezone)
4. Clicks "Update"
5. ✅ Backend receives proper UTC conversion

## Testing

### Test Scenarios

1. **Different Timezones**
   - Test with system timezone set to different values
   - Verify conversions are correct for UTC-5, UTC+0, UTC+5, etc.

2. **Edge Cases**
   - Midnight transitions (23:00 → 01:00 in different timezone)
   - Daylight Saving Time transitions
   - Dates crossing day boundaries

3. **Consistency**
   - Create webhook at specific local time
   - Edit webhook and verify time shows correctly
   - Check execution history shows correct times

### Manual Testing

```bash
# Change system timezone (Linux)
sudo timedatectl set-timezone America/New_York  # UTC-5
# Or
sudo timedatectl set-timezone Europe/Paris      # UTC+1

# Restart browser and test the app
# Verify all times display correctly for that timezone
```

## Technical Details

### ISO 8601 Format

The backend expects and returns times in ISO 8601 format with UTC indicator:

```
2025-10-25T09:00:00Z
         ↑          ↑
    Date/Time     UTC indicator ('Z' = Zulu time)
```

### datetime-local Input

The HTML5 `datetime-local` input expects format without timezone:

```
2025-10-25T10:00
         ↑
    No timezone - interpreted as local
```

### Benefits of This Approach

✅ **User-Friendly**: Users work entirely in their local timezone  
✅ **No Configuration**: Automatically uses browser timezone  
✅ **Consistent**: All timestamps handled the same way  
✅ **Backend Compatible**: Backend continues using UTC internally  
✅ **No Breaking Changes**: Backend API unchanged

## Future Enhancements

Potential improvements for the future:

1. **Timezone Selector**: Allow users to explicitly choose timezone
2. **Timezone Display**: Show timezone offset in UI (e.g., "10:00 AM (UTC+1)")
3. **Multiple Timezones**: Display time in multiple timezones simultaneously
4. **Timezone Validation**: Warn if scheduling very far in future/past

## Troubleshooting

### Issue: Times are still wrong

**Check:**
- Browser timezone settings
- System timezone settings
- Daylight saving time considerations

**Debug:**
```typescript
// Add to console
console.log('User timezone offset:', new Date().getTimezoneOffset());
console.log('Local input:', localDateTime);
console.log('UTC conversion:', convertLocalToUTC(localDateTime));
```

### Issue: Datetime-local input shows wrong time

**Likely Cause:** UTC string being used directly instead of converting with `convertUTCToLocal()`

**Fix:** Always use `convertUTCToLocal()` when populating datetime-local inputs

## Summary

The timezone handling implementation ensures that:

1. Users always work in their local timezone
2. The backend receives and stores proper UTC times
3. No timezone confusion or manual calculations needed
4. Consistent, user-friendly experience across the application

The solution is transparent to users - they simply enter and see times in their local timezone, and everything "just works"!
