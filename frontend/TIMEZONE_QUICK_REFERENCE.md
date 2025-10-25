# Timezone Handling - Quick Reference

## 🎯 Problem Solved

Users entering local times in the frontend were experiencing webhooks executing at incorrect times because the backend expected UTC but received local time without conversion.

## ✅ Solution

Automatic timezone conversion on the frontend:
- **Input**: User enters local time → Converted to UTC → Sent to backend
- **Display**: Backend returns UTC → Converted to local time → Shown to user
- **Edit**: Backend returns UTC → Converted to local → User edits → Converted to UTC → Sent to backend

## 📁 Files Changed

### New Files
1. **`src/lib/timezone-utils.ts`** - Core timezone utilities
2. **`src/lib/timezone-utils.test.ts`** - Browser console tests
3. **`src/components/dev/TimezoneDemo.tsx`** - Visual testing component
4. **`TIMEZONE_HANDLING.md`** - Detailed documentation
5. **`TIMEZONE_FIX_SUMMARY.md`** - Implementation summary

### Modified Files
1. **`src/components/webhooks/WebhookDialog.tsx`** - Form conversion logic
2. **`src/pages/WebhooksPage.tsx`** - Display formatting
3. **`src/pages/ExecutionsPage.tsx`** - Execution time formatting

## 🔧 Key Functions

```typescript
// Convert local datetime to UTC for API
convertLocalToUTC("2025-10-25T10:00") 
// → "2025-10-25T09:00:00.000Z" (if UTC+1)

// Convert UTC to local for form inputs
convertUTCToLocal("2025-10-25T09:00:00Z") 
// → "2025-10-25T10:00" (if UTC+1)

// Format UTC for display to users
formatUTCForDisplay("2025-10-25T09:00:00Z") 
// → "25 Oct 2025, 10:00" (in user's locale)

// Get user's timezone
getUserTimezone() 
// → "UTC+1"
```

## 🧪 Testing

### Quick Browser Test
```javascript
// Open browser console on the app
import { runTimezoneTests } from './lib/timezone-utils.test';
runTimezoneTests();
```

### Visual Test
Add the demo component temporarily to any page:
```typescript
import TimezoneDemo from '@/components/dev/TimezoneDemo';

// In your component
<TimezoneDemo />
```

### Manual Test
1. Create webhook with local time (e.g., 10:00 AM)
2. Check network tab - should send UTC time
3. Refresh page - should display local time (10:00 AM)
4. Edit webhook - form should show local time (10:00 AM)

## 📝 Usage Examples

### Creating a Webhook
```typescript
// In WebhookDialog.tsx onSubmit
if (data.schedule_type === 'once') {
  // User enters: "2025-10-25T10:00" (local)
  payload.scheduled_at = convertLocalToUTC(data.scheduled_at);
  // API receives: "2025-10-25T09:00:00.000Z" (UTC)
}
```

### Displaying Webhooks
```typescript
// In WebhooksPage.tsx
{webhook.schedule_type === 'once' && webhook.scheduled_at && (
  <span>{formatUTCForDisplay(webhook.scheduled_at)}</span>
  // Shows: "25 Oct 2025, 10:00" (local)
)}
```

### Editing a Webhook
```typescript
// In WebhookDialog.tsx useEffect
reset({
  // Backend returns: "2025-10-25T09:00:00Z" (UTC)
  scheduled_at: webhook.scheduled_at 
    ? convertUTCToLocal(webhook.scheduled_at) 
    : undefined,
  // Form shows: "2025-10-25T10:00" (local)
});
```

## 🌍 How Different Timezones Work

| User Location | Local Input | UTC Stored | Executes At (UTC) | Executes At (Local) |
|--------------|-------------|------------|-------------------|---------------------|
| Morocco (UTC+1) | 10:00 AM | 09:00 AM | 09:00 AM | 10:00 AM ✓ |
| New York (UTC-5) | 10:00 AM | 03:00 PM | 03:00 PM | 10:00 AM ✓ |
| Tokyo (UTC+9) | 10:00 AM | 01:00 AM | 01:00 AM | 10:00 AM ✓ |
| London (UTC+0) | 10:00 AM | 10:00 AM | 10:00 AM | 10:00 AM ✓ |

**Result:** Everyone's webhook executes at their local 10:00 AM! 🎉

## ⚠️ Important Notes

1. **Backend Unchanged**: No modifications needed to backend API
2. **Automatic**: Uses browser's timezone - no user configuration needed
3. **Consistent**: All timestamps use the same conversion utilities
4. **datetime-local**: Input type automatically uses local timezone
5. **ISO 8601**: Backend expects/returns UTC with 'Z' suffix

## 🐛 Troubleshooting

**Issue**: Times still incorrect
- Check system timezone is set correctly
- Verify browser timezone detection
- Check for DST (Daylight Saving Time) transitions

**Issue**: Form shows wrong time
- Ensure using `convertUTCToLocal()` when populating form
- Check input type is `datetime-local`

**Issue**: Backend receives wrong time
- Ensure using `convertLocalToUTC()` before sending to API
- Verify UTC string has 'Z' suffix

## 📚 Documentation

- **Full Details**: See `TIMEZONE_HANDLING.md`
- **Implementation**: See `TIMEZONE_FIX_SUMMARY.md`
- **API Reference**: See inline JSDoc in `timezone-utils.ts`

## 🎓 Learning Points

### Why UTC?
- Universal standard for time storage
- No ambiguity across timezones
- DST-safe (no timezone rules needed)

### Why Convert on Frontend?
- Backend remains simple (always UTC)
- Users work in familiar local time
- No server-side timezone logic needed

### Why Browser Timezone?
- Automatically correct for user location
- No manual configuration
- Handles DST automatically

## 🚀 Next Steps

After implementing, verify:
1. ✅ Create webhook → executes at correct local time
2. ✅ View webhooks → shows correct local times
3. ✅ Edit webhook → form shows correct local time
4. ✅ Execution history → shows correct local times
5. ✅ Test in different timezones (change system timezone)

## 💡 Tips

- Always use utility functions - never manual conversion
- Test with different timezones (change system timezone)
- Check edge cases (midnight, DST transitions)
- Keep documentation updated if extending functionality

---

**Status**: ✅ Implementation Complete  
**Breaking Changes**: None  
**Migration Needed**: None (automatic client-side conversion)
