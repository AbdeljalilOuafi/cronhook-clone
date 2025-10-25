# CronHooks Development Guide

## Project Structure

```
Cronehooks-clone/
├── config/                 # Django project configuration
│   ├── __init__.py
│   ├── settings.py        # Main settings
│   ├── urls.py            # URL routing
│   ├── celery.py          # Celery configuration
│   ├── wsgi.py
│   └── asgi.py
├── webhooks/              # Main application
│   ├── models.py          # Webhook and WebhookExecution models
│   ├── serializers.py     # DRF serializers
│   ├── views.py           # API views
│   ├── tasks.py           # Celery tasks
│   ├── urls.py            # API routing
│   ├── admin.py           # Django admin
│   └── tests.py           # Unit tests
├── manage.py              # Django management script
├── requirements.txt       # Python dependencies
├── docker-compose.yml     # PostgreSQL + Redis
├── .env                   # Environment variables
└── README.md
```

## Setup Instructions

### Method 1: Using the setup script

```bash
./setup.sh
```

This will:
- Create virtual environment
- Install dependencies
- Start Docker services
- Run migrations
- Prompt to create superuser

### Method 2: Manual setup

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create .env file
cp .env.example .env
# Edit .env with your settings

# 4. Start Docker services
docker-compose up -d

# 5. Run migrations
python manage.py migrate

# 6. Create superuser
python manage.py createsuperuser
```

## Running the Application

You need to run 3 processes:

### Terminal 1: Django Server
```bash
python manage.py runserver
```

### Terminal 2: Celery Worker
```bash
./start_worker.sh
# or
celery -A config worker -l info
```

### Terminal 3: Celery Beat
```bash
./start_beat.sh
# or
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

## API Endpoints

### Authentication
```
POST /api/auth/token/
Body: {"username": "...", "password": "..."}
Response: {"token": "..."}
```

### Webhooks

#### Create One-Time Webhook
```
POST /api/webhooks/
Headers: Authorization: Token YOUR_TOKEN
Body:
{
  "name": "Send notification",
  "url": "https://example.com/webhook",
  "http_method": "POST",
  "schedule_type": "once",
  "scheduled_at": "2025-10-25T15:30:00Z",
  "headers": {"X-Custom-Header": "value"},
  "payload": {"message": "Hello from CronHooks"}
}
```

#### Create Recurring Webhook
```
POST /api/webhooks/
Headers: Authorization: Token YOUR_TOKEN
Body:
{
  "name": "Hourly status check",
  "url": "https://example.com/webhook",
  "http_method": "GET",
  "schedule_type": "recurring",
  "cron_expression": "0 * * * *",
  "headers": {},
  "payload": {}
}
```

#### List Webhooks
```
GET /api/webhooks/
Headers: Authorization: Token YOUR_TOKEN
Query params: ?schedule_type=once&is_active=true
```

#### Get Webhook Details
```
GET /api/webhooks/{id}/
Headers: Authorization: Token YOUR_TOKEN
```

#### Update Webhook
```
PUT /api/webhooks/{id}/
Headers: Authorization: Token YOUR_TOKEN
Body: {updated fields}
```

#### Cancel Webhook
```
POST /api/webhooks/{id}/cancel/
Headers: Authorization: Token YOUR_TOKEN
```

#### Activate Webhook
```
POST /api/webhooks/{id}/activate/
Headers: Authorization: Token YOUR_TOKEN
```

#### Get Execution History
```
GET /api/webhooks/{id}/executions/
Headers: Authorization: Token YOUR_TOKEN
```

#### Delete Webhook
```
DELETE /api/webhooks/{id}/
Headers: Authorization: Token YOUR_TOKEN
```

## Cron Expression Examples

```
*/5 * * * *     - Every 5 minutes
0 * * * *       - Every hour
0 0 * * *       - Daily at midnight
0 9 * * 1       - Every Monday at 9 AM
0 0 1 * *       - First day of every month
*/15 9-17 * * 1-5  - Every 15 minutes, 9 AM - 5 PM, weekdays
```

## Testing

### Run unit tests
```bash
python manage.py test
```

### Test with a webhook endpoint
You can use services like:
- https://webhook.site (get a test URL)
- https://requestbin.com
- Or run a local server:

```bash
# Simple test server
python -m http.server 8001
```

### Manual testing checklist

1. **Create one-time webhook for 2 minutes from now**
   - Verify it executes at the correct time
   - Check execution history

2. **Create recurring webhook (every 2 minutes)**
   - Wait and verify multiple executions
   - Check execution history shows multiple runs

3. **Cancel a one-time webhook before it executes**
   - Verify it doesn't execute
   - Check is_active = false

4. **Cancel a recurring webhook**
   - Verify it stops executing
   - Previous executions should still be in history

5. **Test retry logic**
   - Create webhook pointing to non-existent URL
   - Verify retry attempts in execution history

6. **Test user isolation**
   - Create user A and user B
   - User A shouldn't see user B's webhooks

## Common Cron Expression Patterns

| Pattern | Description |
|---------|-------------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour |
| `0 */2 * * *` | Every 2 hours |
| `0 0 * * *` | Daily at midnight |
| `0 9 * * 1-5` | Weekdays at 9 AM |
| `0 0 1 * *` | First of month |
| `0 0 * * 0` | Every Sunday |

## Troubleshooting

### Celery worker not picking up tasks
- Make sure Redis is running: `docker-compose ps`
- Check Celery worker logs
- Verify CELERY_BROKER_URL in .env

### Tasks not executing at scheduled time
- Make sure Celery Beat is running
- Check django_celery_beat tables in database
- Verify timezone settings

### Database connection errors
- Make sure PostgreSQL is running: `docker-compose ps`
- Check DATABASE_URL in .env
- Run migrations: `python manage.py migrate`

### Import errors
- Make sure virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`

## Database Schema

### webhooks_webhook
- Stores webhook configuration
- Links to user (owner)
- Contains schedule information
- Stores Celery task IDs

### webhooks_webhookexecution
- Execution history
- Response codes and bodies
- Error messages
- Attempt numbers for retries

### django_celery_beat_periodictask
- Celery Beat's schedule storage
- Linked to webhooks via celery_periodic_task_id

## Environment Variables

```bash
# Django
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379/0

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Webhook Settings
DEFAULT_WEBHOOK_TIMEOUT=30
MAX_RETRY_ATTEMPTS=3
```

## Production Deployment Considerations

1. **Use strong SECRET_KEY**
2. **Set DEBUG=False**
3. **Use environment-specific DATABASE_URL**
4. **Set up HTTPS/SSL**
5. **Configure proper ALLOWED_HOSTS**
6. **Use production-grade Redis (managed service)**
7. **Set up monitoring (Sentry, etc.)**
8. **Configure rate limiting**
9. **Set up backup strategy for PostgreSQL**
10. **Use separate Celery queues for priority**

## Monitoring

### Check Celery status
```bash
celery -A config inspect active
celery -A config inspect stats
```

### Check Redis
```bash
docker exec -it cronhooks_redis redis-cli
> INFO
> KEYS *
```

### Check PostgreSQL
```bash
docker exec -it cronhooks_postgres psql -U cronhooks
\dt  # List tables
\d webhooks_webhook  # Describe table
```

## API Documentation

Once the server is running:
- Swagger UI: http://localhost:8000/api/schema/swagger-ui/
- ReDoc: http://localhost:8000/api/schema/redoc/
- OpenAPI Schema: http://localhost:8000/api/schema/

## Admin Panel

Access at http://localhost:8000/admin/

Features:
- View all webhooks
- View execution history
- Manage users
- View Celery Beat periodic tasks
