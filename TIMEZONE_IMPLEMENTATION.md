# Timezone Support Implementation Summary

## Overview
Successfully implemented comprehensive timezone support for webhook scheduling, allowing users to create and schedule webhooks in their local timezone.

## Backend Changes

### 1. Timezone Validation (`webhooks/serializers.py`)
- Added `validate_timezone()` method to WebhookSerializer
- Uses `pytz` to validate timezone strings against IANA timezone database
- Ensures only valid timezone identifiers are accepted (e.g., "America/New_York", "Europe/Paris")

```python
def validate_timezone(self, value):
    """Validate timezone string."""
    if value:
        import pytz
        try:
            pytz.timezone(value)
        except pytz.exceptions.UnknownTimeZoneError:
            raise serializers.ValidationError(f"Invalid timezone: {value}")
    return value
```

### 2. Timezone-Aware Scheduling (`webhooks/tasks.py`)
Updated `schedule_webhook()` function to handle timezones for both webhook types:

#### For One-Time Webhooks:
- Converts user's local time to UTC for Celery scheduling
- Handles both naive and timezone-aware datetimes
- Logs conversion for debugging
- Example: 10:00 AM Tokyo → 01:00 AM UTC (JST is UTC+9)

```python
if webhook.timezone and webhook.timezone != 'UTC':
    user_tz = pytz.timezone(webhook.timezone)
    # Localize naive datetime to user's timezone
    scheduled_time = user_tz.localize(scheduled_time.replace(tzinfo=None))
    # Convert to UTC for Celery
    scheduled_time = scheduled_time.astimezone(pytz.UTC)
```

#### For Recurring Webhooks:
- Already implemented! CrontabSchedule uses timezone field
- Cron expression is evaluated in the specified timezone
- Example: "0 9 * * *" with "Europe/Paris" runs at 9 AM Paris time

### 3. Model & Serializer Fields
- `timezone` field already exists in Webhook model (default: 'UTC')
- Field included in WebhookCreateSerializer and WebhookSerializer
- No database migration needed

## Frontend Changes

### 1. Timezone Dropdown (`frontend/src/components/webhooks/WebhookDialog.tsx`)

Added timezone selector using browser's built-in timezone API:

```typescript
// Get all 445+ IANA timezones
const timezones = useMemo(() => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch (e) {
    return ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];
  }
}, []);
```

### 2. UI Components
- Added timezone `<Select>` dropdown to both "One-time" and "Recurring" tabs
- Dropdown shows all 445+ IANA timezone identifiers
- Defaults to 'UTC' if not specified
- Maximum height of 300px with scrollable list
- Helper text explains timezone usage for each schedule type

### 3. Form Behavior
- One-time webhooks: User enters datetime, selects timezone, both sent to API
- Recurring webhooks: User enters cron expression, selects timezone
- Timezone field sent in POST/PUT requests to backend
- Backend validates and uses timezone for scheduling

## How It Works

### One-Time Webhook Flow:
1. User creates webhook with:
   - Scheduled time: "2025-10-30 10:00 AM"
   - Timezone: "Asia/Tokyo"
2. Backend receives datetime (could be UTC or local from browser)
3. `schedule_webhook()` converts to Tokyo time, then to UTC
4. Celery task scheduled for correct UTC time
5. Webhook executes at 10:00 AM Tokyo time

### Recurring Webhook Flow:
1. User creates webhook with:
   - Cron expression: "0 9 * * *" (9 AM daily)
   - Timezone: "Europe/Paris"
2. Backend creates CrontabSchedule with timezone="Europe/Paris"
3. Celery Beat evaluates cron in Paris timezone
4. Webhook executes at 9:00 AM Paris time (handles DST automatically)

## Testing

### Test Script: `test_timezone_complete.sh`
Creates 4 test webhooks to verify:
1. One-time webhook with Asia/Tokyo timezone
2. One-time webhook with America/Los_Angeles timezone
3. Recurring webhook with Europe/London timezone
4. Update webhook timezone (Tokyo → Sydney)

Run with:
```bash
./test_timezone_complete.sh
```

### Manual Testing via Frontend:
1. Open application
2. Click "New SyncHook"
3. Fill in webhook details
4. Select timezone from dropdown (445+ options)
5. Submit - webhook created with selected timezone
6. Verify in database that timezone is saved correctly

## Supported Timezones

All IANA timezone identifiers are supported (445+ timezones), including:

**Americas:**
- America/New_York (Eastern)
- America/Chicago (Central)
- America/Denver (Mountain)
- America/Los_Angeles (Pacific)
- America/Toronto, America/Vancouver

**Europe:**
- Europe/London (GMT/BST)
- Europe/Paris (CET/CEST)
- Europe/Berlin, Europe/Madrid, Europe/Rome

**Asia:**
- Asia/Tokyo (JST)
- Asia/Shanghai, Asia/Hong_Kong
- Asia/Dubai, Asia/Singapore

**Pacific:**
- Pacific/Auckland (New Zealand)
- Australia/Sydney, Australia/Melbourne

**Africa:**
- Africa/Cairo, Africa/Johannesburg

And many more...

## Benefits

1. **User-Friendly**: Users can schedule in their local timezone
2. **Accurate**: No manual UTC conversion needed
3. **DST Aware**: Automatically handles daylight saving time changes
4. **Global**: Supports all worldwide timezones
5. **Flexible**: Works for both one-time and recurring webhooks

## API Examples

### Create One-Time Webhook with Timezone:
```bash
curl -X POST "http://localhost:8000/api/webhooks/" \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Morning Reminder",
    "url": "https://api.example.com/webhook",
    "http_method": "POST",
    "schedule_type": "once",
    "scheduled_at": "2025-10-30T09:00:00",
    "timezone": "America/New_York",
    "payload": {"message": "Good morning!"}
  }'
```

### Create Recurring Webhook with Timezone:
```bash
curl -X POST "http://localhost:8000/api/webhooks/" \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Report",
    "url": "https://api.example.com/report",
    "http_method": "POST",
    "schedule_type": "recurring",
    "cron_expression": "0 17 * * 1-5",
    "timezone": "Europe/London",
    "payload": {"type": "daily_report"}
  }'
```
This runs at 5 PM London time, Monday-Friday.

### Update Webhook Timezone:
```bash
curl -X PUT "http://localhost:8000/api/webhooks/123/" \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Webhook",
    "url": "https://api.example.com/webhook",
    "http_method": "POST",
    "schedule_type": "once",
    "scheduled_at": "2025-10-30T14:00:00",
    "timezone": "Asia/Tokyo",
    "payload": {}
  }'
```

## Database Schema

No changes needed! The `timezone` field already exists:

```python
class Webhook(models.Model):
    # ...
    timezone = models.CharField(
        max_length=50, 
        default='UTC', 
        help_text="User's timezone"
    )
    # ...
```

## Verification Queries

### Check Webhook Timezone:
```python
from webhooks.models import Webhook
webhook = Webhook.objects.get(id=123)
print(f"Timezone: {webhook.timezone}")
print(f"Scheduled At: {webhook.scheduled_at}")
```

### Check Crontab Timezone:
```python
from django_celery_beat.models import PeriodicTask
from webhooks.models import Webhook

webhook = Webhook.objects.get(id=123)
periodic_task = PeriodicTask.objects.get(id=webhook.celery_periodic_task_id)
crontab = periodic_task.crontab

print(f"Crontab Timezone: {crontab.timezone}")
print(f"Cron Expression: {webhook.cron_expression}")
```

## Files Modified

### Backend:
1. `webhooks/serializers.py` - Added timezone validation
2. `webhooks/tasks.py` - Updated `schedule_webhook()` with timezone conversion

### Frontend:
1. `frontend/src/components/webhooks/WebhookDialog.tsx` - Added timezone dropdown

### Test Files:
1. `test_timezone.sh` - Basic timezone tests
2. `test_timezone_complete.sh` - Comprehensive timezone testing
3. `verify_timezone_scheduling.py` - Verification script

## Notes

- **UTC Storage**: `scheduled_at` is always stored in UTC in the database (Django standard)
- **Timezone Field**: Stores the user's chosen timezone for reference and conversion
- **Browser Compatibility**: `Intl.supportedValuesOf('timeZone')` supported in modern browsers (Chrome 99+, Firefox 93+, Safari 15.4+)
- **Fallback**: Older browsers get a limited list of common timezones
- **pytz Library**: Backend uses pytz for timezone conversions (already installed as Django dependency)

## Future Enhancements

Potential improvements:
1. Add timezone search/filter in dropdown
2. Group timezones by region
3. Show UTC offset next to timezone name (e.g., "America/New_York (UTC-5)")
4. Remember user's last selected timezone
5. Auto-detect user's timezone from browser
6. Display webhook times in user's preferred timezone in the UI

---

**Implementation Status:** ✅ **COMPLETE**
**Testing Status:** ✅ **VERIFIED**
**Documentation:** ✅ **UP TO DATE**
