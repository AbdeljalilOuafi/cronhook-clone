# Timezone Feature - Quick Reference

## For Users

### Creating a Webhook with Timezone (Frontend)

1. Click "New SyncHook" button
2. Fill in webhook details (name, URL, etc.)
3. Choose schedule type:
   - **One-time**: Enter date/time, select timezone from dropdown
   - **Recurring**: Enter cron expression, select timezone from dropdown
4. Click in the "Timezone" dropdown to see all 445+ available timezones
5. Search by typing (e.g., "New York", "Tokyo", "London")
6. Select your timezone
7. Submit the form

**Example**: Schedule for 9 AM New York time
- Scheduled Time: 2025-10-30 09:00
- Timezone: America/New_York
- Backend will convert to UTC and schedule correctly

### Using Timezones via API

#### One-Time Webhook
```json
{
  "name": "My Webhook",
  "url": "https://api.example.com/webhook",
  "schedule_type": "once",
  "scheduled_at": "2025-10-30T14:00:00",
  "timezone": "Europe/Paris",
  ...
}
```
This runs at 2 PM Paris time.

#### Recurring Webhook
```json
{
  "name": "Daily Report",
  "url": "https://api.example.com/report",
  "schedule_type": "recurring",
  "cron_expression": "0 9 * * *",
  "timezone": "Asia/Tokyo",
  ...
}
```
This runs at 9 AM Tokyo time every day.

## Common Timezone Values

### North America
- `America/New_York` - Eastern Time
- `America/Chicago` - Central Time
- `America/Denver` - Mountain Time
- `America/Los_Angeles` - Pacific Time
- `America/Toronto` - Eastern Canada
- `America/Vancouver` - Pacific Canada

### Europe
- `Europe/London` - UK, GMT/BST
- `Europe/Paris` - Central European Time
- `Europe/Berlin` - Germany
- `Europe/Madrid` - Spain
- `Europe/Rome` - Italy
- `Europe/Amsterdam` - Netherlands

### Asia
- `Asia/Tokyo` - Japan
- `Asia/Shanghai` - China
- `Asia/Hong_Kong` - Hong Kong
- `Asia/Singapore` - Singapore
- `Asia/Dubai` - UAE
- `Asia/Kolkata` - India

### Pacific
- `Australia/Sydney` - Eastern Australia
- `Australia/Melbourne` - Eastern Australia
- `Pacific/Auckland` - New Zealand
- `Australia/Perth` - Western Australia

### Default
- `UTC` - Coordinated Universal Time (no DST)

## How Timezones Work

### One-Time Webhooks
- You provide: datetime + timezone
- System converts to UTC for storage
- Celery executes at the correct UTC time
- Result: Webhook runs at your specified local time

**Example:**
- Input: 10:00 AM Asia/Tokyo
- Converted: 01:00 AM UTC (Tokyo is UTC+9)
- Executes: When UTC time reaches 01:00 AM
- Local time: 10:00 AM in Tokyo

### Recurring Webhooks
- You provide: cron expression + timezone
- System creates crontab schedule with timezone
- Celery Beat evaluates cron in your timezone
- Handles Daylight Saving Time automatically

**Example:**
- Cron: `0 9 * * *` (9 AM daily)
- Timezone: `America/New_York`
- Result: Runs at 9 AM EST in winter, 9 AM EDT in summer

## Cron Expression Examples

```
0 9 * * *      → Daily at 9:00 AM
0 */2 * * *    → Every 2 hours
30 8 * * 1-5   → Weekdays at 8:30 AM
0 0 1 * *      → First day of month at midnight
0 12 * * 0     → Sundays at noon
*/15 * * * *   → Every 15 minutes
0 0,12 * * *   → Twice daily (midnight and noon)
```

## Testing Your Timezone

### Quick Test
```bash
# Create test webhook for 5 minutes from now in your timezone
curl -X POST "http://localhost:8000/api/webhooks/" \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Webhook",
    "url": "https://webhook.site/your-unique-url",
    "schedule_type": "once",
    "scheduled_at": "2025-10-29T14:35:00",
    "timezone": "America/New_York",
    "http_method": "POST",
    "payload": {"test": true}
  }'
```

### Verify Timezone in Database
```bash
python manage.py shell
```
```python
from webhooks.models import Webhook
webhook = Webhook.objects.latest('created_at')
print(f"Timezone: {webhook.timezone}")
print(f"Scheduled: {webhook.scheduled_at}")
```

## Troubleshooting

### Webhook Not Running at Expected Time

1. **Check timezone spelling**
   - Must be exact IANA timezone (e.g., "America/New_York" not "New York")
   - Case-sensitive

2. **Verify scheduled time**
   - For one-time: `scheduled_at` should be in future
   - Check if time was converted correctly to UTC

3. **Check Celery is running**
   ```bash
   # Terminal 1: Celery worker
   celery -A config worker -l info
   
   # Terminal 2: Celery beat (for recurring)
   celery -A config beat -l info
   ```

4. **View logs**
   ```bash
   # Check task scheduling logs
   tail -f celery.log
   ```

### Invalid Timezone Error

- Backend validates timezone with pytz
- Use exact IANA identifier from the dropdown
- Check [IANA Timezone Database](https://www.iana.org/time-zones) for valid names

### Timezone Not in Dropdown

- Frontend uses `Intl.supportedValuesOf('timeZone')`
- Returns 445+ timezones
- If your timezone is missing, use closest equivalent
- Or use UTC and calculate offset manually

## Best Practices

1. **Always specify timezone** - Don't rely on UTC default if you want local time
2. **Use IANA identifiers** - Not abbreviations (use "America/New_York" not "EST")
3. **Test before production** - Create test webhook 5-10 minutes in future
4. **Consider DST** - Timezones handle it automatically
5. **Document your choice** - Note which timezone you're using in webhook name/description

## API Field Reference

### Required for One-Time
```json
{
  "schedule_type": "once",
  "scheduled_at": "2025-10-30T14:00:00",  // Required
  "timezone": "Europe/Paris"               // Optional (defaults to UTC)
}
```

### Required for Recurring
```json
{
  "schedule_type": "recurring",
  "cron_expression": "0 9 * * *",         // Required
  "timezone": "Asia/Tokyo"                // Optional (defaults to UTC)
}
```

### On Update
- Changing timezone reschedules the webhook
- Old task is cancelled, new one created
- For one-time: must be in future
- For recurring: takes effect immediately

## Support

For issues or questions:
1. Check logs: `tail -f logs/celery.log`
2. Verify Celery is running: `ps aux | grep celery`
3. Test with UTC first, then add timezone
4. Check webhook execution history in UI

---

**Quick Links:**
- Full Implementation: `TIMEZONE_IMPLEMENTATION.md`
- Test Script: `./test_timezone_complete.sh`
- Supported Timezones: Run `Intl.supportedValuesOf('timeZone')` in browser console
