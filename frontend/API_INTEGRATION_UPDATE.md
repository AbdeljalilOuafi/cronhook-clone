# API Integration Update - Backend Alignment

## Changes Made to Align with Backend API

### 1. Authentication System

**Changed from JWT (access/refresh tokens) to Token-based authentication:**

- **Authorization Header**: `Token <token>` (instead of `Bearer <token>`)
- **Login endpoint**: `/api/auth/login/` 
- **Response structure**:
  ```json
  {
    "token": "f5925df1b22693bc896e37bb33d73ffcf7f5e6c8",
    "user": { "id": 1, "username": "admin", "email": "admin@example.com" }
  }
  ```

**Files Updated:**
- `src/lib/api-client.ts` - Changed `Authorization` header format and removed token refresh logic
- `src/api/auth.ts` - Updated login endpoint and token handling
- `src/store/auth.ts` - Simplified to use single token instead of access/refresh
- `src/pages/LoginPage.tsx` - Updated to use new token response structure

### 2. Webhook Model Field Names

**Updated field names to match backend API:**

| Frontend (Old) | Backend (Actual) | Type |
|---------------|------------------|------|
| `method` | `http_method` | HTTP method |
| `body` | `payload` | Request body/payload |
| `schedule_type: 'one_time'` | `schedule_type: 'once'` | Schedule type |
| `scheduled_time` | `scheduled_at` | DateTime field |
| `retry_on_failure` | *(removed)* | Always enabled |
| *(new)* | `timeout` | Request timeout (seconds) |
| *(new)* | `execution_count` | Number of executions |
| *(new)* | `last_execution_status` | Last execution result |
| *(new)* | `celery_task_id` | Celery task reference |
| *(new)* | `celery_periodic_task_id` | Periodic task ID |

**Files Updated:**
- `src/types/index.ts` - Updated `Webhook` and `CreateWebhookRequest` interfaces
- `src/components/webhooks/WebhookDialog.tsx` - Updated form fields and validation
- `src/pages/WebhooksPage.tsx` - Updated to display correct field names

### 3. Webhook Operations

**Added backend-specific operations:**

- **Cancel Webhook**: `POST /api/webhooks/{id}/cancel/`
  - Sets `is_active = False`
  - Revokes scheduled tasks
  - Preserves execution history

- **Activate Webhook**: `POST /api/webhooks/{id}/activate/`
  - Sets `is_active = True`
  - Reschedules webhook

**Toggle Active Logic Changed:**
- Old: `PATCH /api/webhooks/{id}/` with `{is_active: !current}`
- New: `POST /api/webhooks/{id}/cancel/` or `POST /api/webhooks/{id}/activate/`

**Files Updated:**
- `src/api/webhooks.ts` - Added `cancel()` and `activate()` methods
- `src/pages/WebhooksPage.tsx` - Updated toggle button to use cancel/activate

### 4. WebhookExecution Model

**Updated execution fields:**

| Frontend (Old) | Backend (Actual) | Change |
|---------------|------------------|--------|
| `scheduled_time` | *(removed)* | Not in execution model |
| `executed_at` | `executed_at` | ✅ Same |
| `status: 'pending' \| 'success' \| 'failed'` | `status: 'pending' \| 'success' \| 'failed' \| 'retrying'` | Added 'retrying' |

**Files Updated:**
- `src/types/index.ts` - Added 'retrying' status
- `src/pages/ExecutionsPage.tsx` - Removed scheduled_time column, added retrying badge

### 5. Schedule Types

**Changed schedule type values:**

- `'one_time'` → `'once'`
- `'recurring'` → `'recurring'` (unchanged)

**Files Updated:**
- `src/types/index.ts` - Updated type definitions
- `src/components/webhooks/WebhookDialog.tsx` - Updated tab values and form schema

### 6. Payload Handling

**Changed from string to flexible type:**

- Old: `body: string`
- New: `payload: Record<string, any> | string`

The backend accepts JSON objects or strings. The frontend now:
- Stringifies objects to JSON for storage
- Parses JSON strings for editing
- Sends as JSON object to API

**Files Updated:**
- `src/types/index.ts` - Changed payload type
- `src/components/webhooks/WebhookDialog.tsx` - Updated to handle JSON serialization

### 7. Removed Fields

Fields that existed in initial design but not in backend:

- `retry_on_failure` - Backend always retries up to `max_retries`
- `webhook_name` in WebhookExecution - Not provided by backend

## API Endpoints Used

```
Authentication:
POST   /api/auth/login/        - Login and get token

Webhooks:
GET    /api/webhooks/          - List all webhooks
POST   /api/webhooks/          - Create webhook
GET    /api/webhooks/{id}/     - Get webhook details
PATCH  /api/webhooks/{id}/     - Update webhook
DELETE /api/webhooks/{id}/     - Delete webhook
POST   /api/webhooks/{id}/cancel/    - Cancel webhook
POST   /api/webhooks/{id}/activate/  - Activate webhook

Executions:
GET    /api/webhooks/{id}/executions/  - Get webhook executions
GET    /api/executions/                - Get all executions
```

## Backend Documentation Used

Read from `/backend-doc/`:
- `API_GUIDE.md` - Complete API endpoint documentation with examples
- `ARCHITECTURE.md` - System architecture and data flow

## Testing Checklist

- [ ] Login with correct token format
- [ ] Create one-time webhook with `scheduled_at`
- [ ] Create recurring webhook with `cron_expression`
- [ ] View webhooks list
- [ ] Edit webhook
- [ ] Cancel webhook (pause)
- [ ] Activate webhook (resume)
- [ ] Delete webhook
- [ ] View execution history
- [ ] Verify all field names match backend

## Environment Configuration

Update `.env` to point to your backend:

```env
VITE_API_URL=http://localhost:8000/api
```

Or for production:

```env
VITE_API_URL=https://your-backend-url.com/api
```

## Notes

1. The frontend now perfectly matches the backend API structure
2. All field names align with the backend models
3. Authentication uses simple Token auth (no JWT refresh)
4. Webhook lifecycle operations (cancel/activate) properly implemented
5. Form validation updated to match backend requirements

---

**Status**: ✅ Frontend fully aligned with backend API
**Date**: October 24, 2025
