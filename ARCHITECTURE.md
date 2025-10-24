# CronHooks System Architecture & Data Flow

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  Browser  │  Postman  │  cURL  │  Mobile App  │  Other Services │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Django REST Framework                        │
├─────────────────────────────────────────────────────────────────┤
│  Authentication  │  Serialization  │  Validation  │  Routing    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐     ┌────────────────┐     ┌────────────┐ │
│  │  Webhook CRUD  │────▶│   Scheduling   │────▶│  Execution │ │
│  │   Operations   │     │     Logic      │     │   Tracking │ │
│  └────────────────┘     └────────────────┘     └────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐
        │   PostgreSQL     │  │   Celery + Beat  │
        │   - Webhooks     │  │   - Task Queue   │
        │   - Executions   │  │   - Scheduler    │
        │   - Users        │  │   - Workers      │
        └──────────────────┘  └──────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │      Redis       │
                              │   Message Broker │
                              └──────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │  External APIs   │
                              │   (Target URLs)  │
                              └──────────────────┘
```

## Detailed Component Breakdown

### 1. API Layer (Django + DRF)

```
Request Flow:
─────────────

Client Request
    │
    ▼
Authentication Middleware
    │ (Token Auth)
    ▼
Permission Check
    │ (IsAuthenticated)
    ▼
URL Routing
    │ (urls.py)
    ▼
ViewSet
    │ (WebhookViewSet)
    ▼
Serializer
    │ (Validation)
    ▼
Model Layer
    │
    ▼
Database/Celery
```

### 2. One-Time Webhook Flow

```
┌──────────────────────────────────────────────────────────────┐
│ 1. User creates one-time webhook via API                     │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Serializer validates data:                                │
│    - scheduled_at is in future                               │
│    - URL is valid                                            │
│    - Required fields present                                 │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Webhook model saved to PostgreSQL                         │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. schedule_webhook() called                                 │
│    - Converts scheduled_at to UTC                            │
│    - Calls execute_webhook.apply_async(eta=scheduled_at)     │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. Task queued in Redis with ETA                             │
│    - Task ID stored in webhook.celery_task_id                │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 6. Celery worker picks up task at scheduled time             │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 7. execute_webhook task runs:                                │
│    - Creates WebhookExecution record                         │
│    - Makes HTTP request to target URL                        │
│    - Captures response                                       │
│    - Updates execution status                                │
│    - Handles retries if needed                               │
└──────────────────────────────────────────────────────────────┘
```

### 3. Recurring Webhook Flow

```
┌──────────────────────────────────────────────────────────────┐
│ 1. User creates recurring webhook with cron expression       │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Serializer validates:                                     │
│    - Cron expression is valid (using croniter)               │
│    - All required fields present                             │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Webhook saved to database                                 │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. schedule_webhook() called:                                │
│    - Parses cron expression (minute, hour, day, etc.)        │
│    - Creates/gets CrontabSchedule object                     │
│    - Creates PeriodicTask in django-celery-beat              │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. PeriodicTask stored in database                           │
│    - Linked to webhook via celery_periodic_task_id           │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 6. Celery Beat reads schedule from database every minute     │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 7. At each cron interval, Beat queues execute_webhook task   │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ 8. Worker executes webhook (same as one-time)                │
│    - Creates execution record                                │
│    - Makes HTTP request                                      │
│    - Logs results                                            │
└──────────────────────────────────────────────────────────────┘
```

### 4. Webhook Execution Detail

```
execute_webhook(webhook_id, attempt_number=1)
│
├─▶ 1. Fetch Webhook from database
│       - Exit if not found or inactive
│
├─▶ 2. Create WebhookExecution record
│       - status: 'pending'
│       - attempt_number: current attempt
│
├─▶ 3. Prepare HTTP request
│       - Headers (with defaults)
│       - Payload
│       - Timeout
│       - HTTP method
│
├─▶ 4. Make HTTP request with httpx
│       - Async client
│       - Custom timeout
│       - Handle all HTTP methods
│
├─▶ 5. Process response
│   │
│   ├─▶ SUCCESS (2xx status)
│   │   - Update execution: status='success'
│   │   - Store response code & body
│   │   - Update webhook.last_execution_at
│   │
│   ├─▶ FAILURE (4xx, 5xx status)
│   │   - Update execution: status='failed'
│   │   - Store response code & body
│   │   │
│   │   └─▶ Retry logic
│   │       - If attempts < max_retries
│   │       - Calculate backoff: delay = retry_delay * 2^(attempt-1)
│   │       - Queue retry task with countdown
│   │       - Update status to 'retrying'
│   │
│   └─▶ EXCEPTION (timeout, network error)
│       - Update execution: status='failed'
│       - Store error message
│       - Same retry logic as above
│
└─▶ 6. Return execution result
```

### 5. Cancellation Flow

```
User calls /webhooks/{id}/cancel/
│
├─▶ One-Time Webhook
│   │
│   ├─▶ 1. Get webhook.celery_task_id
│   │
│   ├─▶ 2. Revoke task from Celery
│   │       celery.control.revoke(task_id, terminate=True)
│   │
│   └─▶ 3. Set webhook.is_active = False
│
└─▶ Recurring Webhook
    │
    ├─▶ 1. Get webhook.celery_periodic_task_id
    │
    ├─▶ 2. Disable PeriodicTask
    │       PeriodicTask.update(enabled=False)
    │
    └─▶ 3. Set webhook.is_active = False

Note: Previous executions remain in database
```

### 6. Retry Logic Detail

```
Exponential Backoff Example:
────────────────────────────

retry_delay = 60 seconds (1 minute)
max_retries = 3

Attempt 1: Immediate execution
    │
    └─▶ FAILS
        │
        ├─▶ Delay = 60 * 2^0 = 60 seconds
        │
Attempt 2: After 1 minute
    │
    └─▶ FAILS
        │
        ├─▶ Delay = 60 * 2^1 = 120 seconds
        │
Attempt 3: After 2 minutes  
    │
    └─▶ FAILS
        │
        └─▶ Max retries reached, stop
```

## Database Schema Relationships

```
┌─────────────────────┐
│        User         │
│─────────────────────│
│ id (PK)            │
│ username           │
│ password           │
│ email              │
└─────────────────────┘
         │
         │ 1:N
         │
         ▼
┌─────────────────────────────────────┐
│            Webhook                  │
│─────────────────────────────────────│
│ id (PK)                            │
│ user_id (FK) ──────────────────────┼──▶ User
│ name                               │
│ url                                │
│ http_method                        │
│ headers (JSON)                     │
│ payload (JSON)                     │
│ schedule_type                      │
│ cron_expression                    │
│ scheduled_at                       │
│ timezone                           │
│ is_active                          │
│ max_retries                        │
│ retry_delay                        │
│ timeout                            │
│ celery_task_id                     │
│ celery_periodic_task_id (FK) ─────┼──▶ PeriodicTask
│ last_execution_at                  │
│ created_at                         │
│ updated_at                         │
└─────────────────────────────────────┘
         │
         │ 1:N
         │
         ▼
┌─────────────────────────────────────┐
│       WebhookExecution              │
│─────────────────────────────────────│
│ id (PK)                            │
│ webhook_id (FK) ────────────────────┼──▶ Webhook
│ status                             │
│ response_code                      │
│ response_body                      │
│ error_message                      │
│ attempt_number                     │
│ executed_at                        │
└─────────────────────────────────────┘


┌─────────────────────────────────────┐
│      PeriodicTask (Celery Beat)     │
│─────────────────────────────────────│
│ id (PK)                            │
│ name                               │
│ task                               │
│ crontab_id (FK) ────────────────────┼──▶ CrontabSchedule
│ args (JSON)                        │
│ enabled                            │
└─────────────────────────────────────┘
                                       │
                                       ▼
                     ┌─────────────────────────────────────┐
                     │      CrontabSchedule               │
                     │─────────────────────────────────────│
                     │ id (PK)                            │
                     │ minute                             │
                     │ hour                               │
                     │ day_of_week                        │
                     │ day_of_month                       │
                     │ month_of_year                      │
                     │ timezone                           │
                     └─────────────────────────────────────┘
```

## File Organization

```
Cronehooks-clone/
│
├── config/                    # Project Configuration
│   ├── settings.py           # Django settings, Celery config
│   ├── celery.py             # Celery app initialization
│   ├── urls.py               # Root URL routing
│   └── wsgi.py/asgi.py       # WSGI/ASGI config
│
├── webhooks/                  # Main Application
│   ├── models.py             # Webhook, WebhookExecution
│   ├── serializers.py        # DRF serializers + validation
│   ├── views.py              # WebhookViewSet (API endpoints)
│   ├── tasks.py              # Celery tasks (execute, schedule, cancel)
│   ├── urls.py               # App URL routing
│   ├── admin.py              # Django admin customization
│   ├── tests.py              # Unit tests
│   └── management/
│       └── commands/
│           └── create_sample_webhooks.py
│
├── Docker & Config
│   ├── docker-compose.yml    # PostgreSQL + Redis
│   ├── .env                  # Environment variables
│   └── requirements.txt      # Python dependencies
│
└── Documentation
    ├── README.md             # Quick start
    ├── DEVELOPMENT.md        # Detailed guide
    ├── PROJECT_SUMMARY.md    # Complete overview
    ├── QUICKREF.md           # Quick reference
    └── ARCHITECTURE.md       # This file
```

## Technology Stack Diagram

```
┌────────────────────────────────────────────────────┐
│              Frontend / Client                      │
│  - Postman                                         │
│  - cURL                                            │
│  - Browser (for browseable API)                   │
│  - Any HTTP client                                │
└────────────────────────────────────────────────────┘
                       │ HTTP/REST
                       ▼
┌────────────────────────────────────────────────────┐
│            Web Framework Layer                      │
│  Django 4.2.7                                      │
│  Django REST Framework 3.14                        │
│  drf-spectacular (OpenAPI docs)                    │
└────────────────────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
┌──────────────────┐         ┌──────────────────┐
│   Data Layer     │         │   Task Queue     │
│  PostgreSQL 15   │         │   Celery 5.3     │
│  psycopg2        │         │   Celery Beat    │
│                  │         │   Redis 7        │
└──────────────────┘         └──────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │  HTTP Client     │
                            │   httpx 0.25     │
                            └──────────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │  External APIs   │
                            │  (Target URLs)   │
                            └──────────────────┘
```

## Security Flow

```
Request
  │
  ▼
┌─────────────────────────────────┐
│  Authentication Middleware      │
│  - Check for Authorization      │
│    header                       │
│  - Validate token               │
│  - Load user                    │
└─────────────────────────────────┘
  │
  ├─▶ No token? ──▶ 401 Unauthorized
  │
  ├─▶ Invalid token? ──▶ 401 Unauthorized
  │
  ▼
┌─────────────────────────────────┐
│  Permission Check               │
│  - IsAuthenticated required     │
└─────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────┐
│  Object-Level Permission        │
│  - user can only access their   │
│    own webhooks                 │
│  - Filtered in get_queryset()   │
└─────────────────────────────────┘
  │
  ▼
Process Request
```

## Monitoring Points

```
Application Level:
├─▶ Django logs
│   - Request/response
│   - Errors
│   - Authentication failures
│
├─▶ Celery logs
│   - Task execution
│   - Task failures
│   - Retry attempts
│
└─▶ Webhook execution logs
    - HTTP requests
    - Response codes
    - Errors

Database Level:
├─▶ PostgreSQL logs
│   - Connection count
│   - Slow queries
│   - Errors
│
└─▶ Execution history table
    - Success/failure rates
    - Response times
    - Error patterns

Infrastructure:
├─▶ Redis metrics
│   - Queue length
│   - Memory usage
│   - Connection count
│
└─▶ Docker container stats
    - CPU usage
    - Memory usage
    - Network I/O
```

---

This architecture supports:
- ✅ Horizontal scaling (multiple Celery workers)
- ✅ High availability (stateless workers)
- ✅ Fault tolerance (retry logic)
- ✅ Observability (comprehensive logging)
- ✅ Security (authentication, authorization)
- ✅ Performance (async execution, database indexing)
