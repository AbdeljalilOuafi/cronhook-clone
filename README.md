# SyncHooks

A webhook scheduling service that allows users to schedule webhooks to run one-time at specific dates/times or repeatedly using cron expressions.

## Features

- Schedule webhooks to run once at a specific time
- Schedule recurring webhooks with cron expressions
- Cancel scheduled webhooks
- Automatic retry on failures with exponential backoff
- Execution history tracking
- RESTful API with authentication

## Tech Stack

- Django 4.2.7 + Django REST Framework
- Celery + Celery Beat for task scheduling
- PostgreSQL for data persistence
- Redis as message broker
- Docker for local development

## Quick Start

### Prerequisites

- Python 3.10+
- Docker & Docker Compose
- pip

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd Cronehooks-clone
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment:
```bash
cp .env.example .env
# Edit .env with your settings
```

5. Start PostgreSQL and Redis:
```bash
docker-compose up -d
```

6. Run migrations:
```bash
python manage.py migrate
```

7. Create superuser:
```bash
python manage.py createsuperuser
```

8. Run the development server:
```bash
python manage.py runserver
```

9. In separate terminals, start Celery:
```bash
# Terminal 1: Celery Worker
celery -A config worker -l info

# Terminal 2: Celery Beat
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/api/schema/swagger-ui/
- ReDoc: http://localhost:8000/api/schema/redoc/

## Usage Examples

### Create a One-Time Webhook

```bash
curl -X POST http://localhost:8000/api/webhooks/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "One-time notification",
    "url": "https://example.com/webhook",
    "http_method": "POST",
    "schedule_type": "once",
    "scheduled_at": "2025-10-25T10:00:00Z",
    "payload": {"message": "Hello"}
  }'
```

### Create a Recurring Webhook

```bash
curl -X POST http://localhost:8000/api/webhooks/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Every 5 minutes",
    "url": "https://example.com/webhook",
    "http_method": "POST",
    "schedule_type": "recurring",
    "cron_expression": "*/5 * * * *",
    "payload": {"status": "check"}
  }'
```

### Cancel a Webhook

```bash
curl -X POST http://localhost:8000/api/webhooks/{id}/cancel/ \
  -H "Authorization: Token YOUR_TOKEN"
```

### View Execution History

```bash
curl http://localhost:8000/api/webhooks/{id}/executions/ \
  -H "Authorization: Token YOUR_TOKEN"
```

## License

MIT
