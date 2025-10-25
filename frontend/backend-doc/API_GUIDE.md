# CronHooks API Usage Guide

## Authentication

All API requests require authentication. Use the token you received:

```bash
Authorization: Token f5925df1b22693bc896e37bb33d73ffcf7f5e6c8
```

---

## 📋 Complete API Endpoints

### 1. **Create One-Time Webhook**

Execute webhook once at a specific future time.

```bash
curl -X POST http://localhost:8000/api/webhooks/ \
  -H "Authorization: Token f5925df1b22693bc896e37bb33d73ffcf7f5e6c8" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Payment Reminder",
    "url": "https://your-n8n-instance.com/webhook/payment",
    "http_method": "POST",
    "schedule_type": "once",
    "scheduled_at": "2025-10-24T18:00:00Z",
    "payload": {
      "user_id": 123,
      "message": "Payment due in 24 hours",
      "amount": 99.99
    },
    "headers": {
      "X-Custom-Header": "MyValue"
    },
    "timeout": 30,
    "max_retries": 3,
    "retry_delay": 60
  }'
```

**Key Points:**
- `scheduled_at` must be in **UTC timezone** and in the **future**
- Format: `YYYY-MM-DDTHH:MM:SSZ`
- Example: "2025-10-24T18:00:00Z" = October 24, 2025, 6:00 PM UTC

**Response (201 Created):**
```json
{
  "id": 1,
  "name": "Payment Reminder",
  "url": "https://your-n8n-instance.com/webhook/payment",
  "http_method": "POST",
  "schedule_type": "once",
  "scheduled_at": "2025-10-24T18:00:00Z",
  "is_active": true,
  "execution_count": 0,
  "last_execution_status": null,
  "created_at": "2025-10-24T10:30:00Z"
}
```

---

### 2. **Create Recurring Webhook**

Execute webhook repeatedly based on cron expression.

```bash
curl -X POST http://localhost:8000/api/webhooks/ \
  -H "Authorization: Token f5925df1b22693bc896e37bb33d73ffcf7f5e6c8" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hourly Health Check",
    "url": "https://your-n8n-instance.com/webhook/health",
    "http_method": "GET",
    "schedule_type": "recurring",
    "cron_expression": "0 * * * *",
    "timezone": "UTC",
    "payload": {},
    "max_retries": 2
  }'
```

**Common Cron Expressions:**
```
*/2 * * * *     - Every 2 minutes
*/5 * * * *     - Every 5 minutes
0 * * * *       - Every hour
0 */6 * * *     - Every 6 hours
0 0 * * *       - Daily at midnight
0 9 * * 1-5     - Weekdays at 9 AM
0 0 1 * *       - First day of each month
0 0 * * 0       - Every Sunday at midnight
*/15 9-17 * * 1-5  - Every 15 min, 9-5, weekdays
```

Test your cron: https://crontab.guru

---

### 3. **List All Webhooks**

Get all your webhooks with pagination.

```bash
curl -X GET http://localhost:8000/api/webhooks/ \
  -H "Authorization: Token f5925df1b22693bc896e37bb33d73ffcf7f5e6c8"
```

**Response:**
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Test Recurring Webhook",
      "url": "https://webhook.site/test",
      "http_method": "POST",
      "schedule_type": "recurring",
      "is_active": true,
      "last_execution_at": "2025-10-24T10:32:00Z",
      "execution_count": 5,
      "created_at": "2025-10-24T10:30:00Z"
    },
    {
      "id": 2,
      "name": "Payment Reminder",
      "url": "https://your-n8n.com/webhook/payment",
      "http_method": "POST",
      "schedule_type": "once",
      "is_active": true,
      "last_execution_at": null,
      "execution_count": 0,
      "created_at": "2025-10-24T10:35:00Z"
    }
  ]
}
```

**Filter Options:**
```bash
# Filter by schedule type
curl -X GET "http://localhost:8000/api/webhooks/?schedule_type=once" \
  -H "Authorization: Token YOUR_TOKEN"

# Filter by active status
curl -X GET "http://localhost:8000/api/webhooks/?is_active=true" \
  -H "Authorization: Token YOUR_TOKEN"

# Filter by HTTP method
curl -X GET "http://localhost:8000/api/webhooks/?http_method=POST" \
  -H "Authorization: Token YOUR_TOKEN"

# Combine filters
curl -X GET "http://localhost:8000/api/webhooks/?schedule_type=recurring&is_active=true" \
  -H "Authorization: Token YOUR_TOKEN"

# Pagination
curl -X GET "http://localhost:8000/api/webhooks/?page=2" \
  -H "Authorization: Token YOUR_TOKEN"
```

---

### 4. **Get Webhook Details**

Get complete details of a specific webhook.

```bash
curl -X GET http://localhost:8000/api/webhooks/1/ \
  -H "Authorization: Token f5925df1b22693bc896e37bb33d73ffcf7f5e6c8"
```

**Response:**
```json
{
  "id": 1,
  "name": "Test Recurring Webhook",
  "url": "https://webhook.site/test",
  "http_method": "POST",
  "headers": {},
  "payload": {
    "message": "Hello from CronHooks",
    "timestamp": "now"
  },
  "schedule_type": "recurring",
  "cron_expression": "*/2 * * * *",
  "scheduled_at": null,
  "timezone": "UTC",
  "is_active": true,
  "max_retries": 3,
  "retry_delay": 60,
  "timeout": 30,
  "last_execution_at": "2025-10-24T10:32:00Z",
  "execution_count": 5,
  "last_execution_status": "success",
  "created_at": "2025-10-24T10:30:00Z",
  "updated_at": "2025-10-24T10:30:00Z"
}
```

---

### 5. **Update Webhook**

Update any webhook property. This will **reschedule** the webhook.

```bash
# Full update (PUT)
curl -X PUT http://localhost:8000/api/webhooks/1/ \
  -H "Authorization: Token f5925df1b22693bc896e37bb33d73ffcf7f5e6c8" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Webhook Name",
    "url": "https://new-url.com/webhook",
    "http_method": "POST",
    "schedule_type": "recurring",
    "cron_expression": "*/10 * * * *",
    "payload": {"updated": true}
  }'

# Partial update (PATCH) - only change specific fields
curl -X PATCH http://localhost:8000/api/webhooks/1/ \
  -H "Authorization: Token f5925df1b22693bc896e37bb33d73ffcf7f5e6c8" \
  -H "Content-Type: application/json" \
  -d '{
    "cron_expression": "*/10 * * * *"
  }'
```

**Note:** Updating a webhook automatically cancels the old schedule and creates a new one.

---

### 6. **Cancel Webhook** ⭐

Stop a webhook from executing. **Does NOT delete it** - preserves execution history.

```bash
curl -X POST http://localhost:8000/api/webhooks/1/cancel/ \
  -H "Authorization: Token f5925df1b22693bc896e37bb33d73ffcf7f5e6c8"
```

**Response:**
```json
{
  "detail": "Webhook \"Test Recurring Webhook\" has been canceled"
}
```

**What happens:**
- ✅ Sets `is_active = False`
- ✅ Revokes pending Celery tasks (for one-time webhooks)
- ✅ Disables PeriodicTask (for recurring webhooks)
- ✅ Preserves execution history
- ✅ Webhook can be reactivated later

**Use Cases:**
- Temporarily stop a recurring webhook
- Cancel a one-time webhook before it executes
- Pause webhooks during maintenance

---

### 7. **Activate Webhook** ⭐

Reactivate a canceled webhook. **Reschedules it**.

```bash
curl -X POST http://localhost:8000/api/webhooks/1/activate/ \
  -H "Authorization: Token f5925df1b22693bc896e37bb33d73ffcf7f5e6c8"
```

**Response:**
```json
{
  "detail": "Webhook \"Test Recurring Webhook\" has been activated"
}
```

**Note:** For one-time webhooks, the scheduled time must still be in the future.

---

### 8. **Get Execution History** ⭐

View all execution attempts for a webhook.

```bash
curl -X GET http://localhost:8000/api/webhooks/1/executions/ \
  -H "Authorization: Token f5925df1b22693bc896e37bb33d73ffcf7f5e6c8"
```

**Response:**
```json
{
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 5,
      "status": "success",
      "response_code": 200,
      "response_body": "{\"success\": true}",
      "error_message": "",
      "attempt_number": 1,
      "executed_at": "2025-10-24T10:32:00Z"
    },
    {
      "id": 4,
      "status": "success",
      "response_code": 200,
      "response_body": "{\"success\": true}",
      "error_message": "",
      "attempt_number": 1,
      "executed_at": "2025-10-24T10:30:00Z"
    },
    {
      "id": 3,
      "status": "failed",
      "response_code": 500,
      "response_body": "{\"error\": \"Server error\"}",
      "error_message": "",
      "attempt_number": 3,
      "executed_at": "2025-10-24T10:28:00Z"
    }
  ]
}
```

**Status Values:**
- `pending` - Execution scheduled but not yet run
- `success` - HTTP 2xx response received
- `failed` - Failed after all retry attempts
- `retrying` - Failed but will retry

**Pagination:**
```bash
curl -X GET "http://localhost:8000/api/webhooks/1/executions/?page=2" \
  -H "Authorization: Token YOUR_TOKEN"
```

---

### 9. **Delete Webhook** ⚠️

Permanently delete a webhook and cancel its schedule.

```bash
curl -X DELETE http://localhost:8000/api/webhooks/1/ \
  -H "Authorization: Token f5925df1b22693bc896e37bb33d73ffcf7f5e6c8"
```

**Response:** `204 No Content`

**Warning:** This permanently deletes:
- ✅ The webhook configuration
- ✅ All execution history
- ✅ Cannot be undone

**Recommendation:** Use `cancel/` endpoint instead to preserve history.

---

## 🔄 Webhook Lifecycle Examples

### Example 1: One-Time Webhook Flow

```bash
# 1. Create one-time webhook for 1 hour from now
curl -X POST http://localhost:8000/api/webhooks/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Send Email Reminder",
    "url": "https://n8n.example.com/webhook/email",
    "http_method": "POST",
    "schedule_type": "once",
    "scheduled_at": "2025-10-24T19:00:00Z",
    "payload": {"to": "user@example.com", "subject": "Reminder"}
  }'

# Response: {"id": 5, ...}

# 2. Check webhook status
curl -X GET http://localhost:8000/api/webhooks/5/ \
  -H "Authorization: Token YOUR_TOKEN"

# 3. Cancel if needed (before execution time)
curl -X POST http://localhost:8000/api/webhooks/5/cancel/ \
  -H "Authorization: Token YOUR_TOKEN"

# 4. View execution history (after execution)
curl -X GET http://localhost:8000/api/webhooks/5/executions/ \
  -H "Authorization: Token YOUR_TOKEN"
```

---

### Example 2: Recurring Webhook Flow

```bash
# 1. Create recurring webhook (every 5 minutes)
curl -X POST http://localhost:8000/api/webhooks/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "System Health Check",
    "url": "https://n8n.example.com/webhook/health",
    "http_method": "GET",
    "schedule_type": "recurring",
    "cron_expression": "*/5 * * * *"
  }'

# Response: {"id": 6, ...}

# 2. Let it run for a while, then check executions
curl -X GET http://localhost:8000/api/webhooks/6/executions/ \
  -H "Authorization: Token YOUR_TOKEN"

# 3. Pause webhook temporarily
curl -X POST http://localhost:8000/api/webhooks/6/cancel/ \
  -H "Authorization: Token YOUR_TOKEN"

# 4. Resume webhook later
curl -X POST http://localhost:8000/api/webhooks/6/activate/ \
  -H "Authorization: Token YOUR_TOKEN"

# 5. Change frequency (every 10 minutes)
curl -X PATCH http://localhost:8000/api/webhooks/6/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cron_expression": "*/10 * * * *"}'
```

---

## 🎯 Common Use Cases

### 1. Send Daily Report at 9 AM
```bash
curl -X POST http://localhost:8000/api/webhooks/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Report",
    "url": "https://n8n.example.com/webhook/daily-report",
    "http_method": "POST",
    "schedule_type": "recurring",
    "cron_expression": "0 9 * * *",
    "timezone": "UTC"
  }'
```

### 2. Send Reminder in 24 Hours
```bash
# Calculate time: current_time + 24 hours in UTC
curl -X POST http://localhost:8000/api/webhooks/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "24h Reminder",
    "url": "https://n8n.example.com/webhook/reminder",
    "http_method": "POST",
    "schedule_type": "once",
    "scheduled_at": "2025-10-25T10:30:00Z",
    "payload": {"reminder": "Your task is due"}
  }'
```

### 3. Hourly Data Sync (weekdays only)
```bash
curl -X POST http://localhost:8000/api/webhooks/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hourly Sync",
    "url": "https://n8n.example.com/webhook/sync",
    "http_method": "POST",
    "schedule_type": "recurring",
    "cron_expression": "0 9-17 * * 1-5",
    "payload": {"action": "sync"}
  }'
```

---

## 📊 Response Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Successful GET/PUT/PATCH |
| 201 | Created | Webhook created successfully |
| 204 | No Content | Webhook deleted successfully |
| 400 | Bad Request | Invalid data (check error messages) |
| 401 | Unauthorized | Missing or invalid token |
| 404 | Not Found | Webhook doesn't exist or not yours |
| 500 | Server Error | Internal server error |

---

## 🚨 Error Handling

### Invalid Cron Expression
```bash
# Request
curl -X POST http://localhost:8000/api/webhooks/ \
  -d '{"cron_expression": "invalid"}'

# Response (400)
{
  "cron_expression": ["Invalid cron expression: ..."]
}
```

### Scheduled Time in Past
```bash
# Response (400)
{
  "scheduled_at": ["Scheduled time must be in the future"]
}
```

### Missing Required Fields
```bash
# Response (400)
{
  "scheduled_at": ["This field is required for one-time webhooks"],
  "cron_expression": ["This field is required for recurring webhooks"]
}
```

---

## 🔍 Monitoring & Debugging

### Check if webhook executed successfully
```bash
# Get latest execution
curl -X GET http://localhost:8000/api/webhooks/1/executions/ \
  -H "Authorization: Token YOUR_TOKEN" \
| jq '.results[0]'
```

### Find failed webhooks
Check execution history for status="failed" entries.

### Monitor Celery worker logs
```bash
# In the terminal running Celery worker
# Look for log messages like:
# [INFO] Executing webhook Test Recurring Webhook (ID: 1), attempt 1
# [INFO] Webhook Test Recurring Webhook executed successfully: 200
```

---

## 💡 Tips & Best Practices

1. **Always use UTC for scheduled_at**
   - Convert your local time to UTC before creating webhooks

2. **Test with webhook.site first**
   - Use https://webhook.site to get a test URL
   - Verify your webhooks work before connecting to n8n

3. **Set appropriate timeouts**
   - Default is 30 seconds
   - Increase for slow endpoints

4. **Configure retries wisely**
   - max_retries: 3 is usually good
   - retry_delay: 60 seconds (exponential backoff applies)

5. **Use cancel instead of delete**
   - Preserves execution history
   - Can reactivate later

6. **Monitor execution history**
   - Check regularly for failed executions
   - Look for patterns in errors

7. **Secure your n8n webhooks**
   - Use custom headers for authentication
   - Validate webhook signatures in n8n

---

## 🎓 Quick Reference

```bash
# Get your token (already have it)
YOUR_TOKEN="f5925df1b22693bc896e37bb33d73ffcf7f5e6c8"

# Create one-time webhook
POST /api/webhooks/  + {"schedule_type": "once", "scheduled_at": "..."}

# Create recurring webhook
POST /api/webhooks/  + {"schedule_type": "recurring", "cron_expression": "..."}

# List webhooks
GET /api/webhooks/

# Get webhook details
GET /api/webhooks/{id}/

# Update webhook
PATCH /api/webhooks/{id}/  + {fields to update}

# Cancel webhook (pause)
POST /api/webhooks/{id}/cancel/

# Activate webhook (resume)
POST /api/webhooks/{id}/activate/

# Get execution history
GET /api/webhooks/{id}/executions/

# Delete webhook (permanent)
DELETE /api/webhooks/{id}/
```

---

**Happy scheduling! 🚀**
