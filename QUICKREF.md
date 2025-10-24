# CronHooks Quick Reference Card

## 🚀 Quick Start (3 Commands)
```bash
./setup.sh                # First time only
make docker-up            # Start PostgreSQL + Redis
make all                  # Start all services (requires tmux)
```

## 📝 Common Commands

### Setup & Installation
```bash
make setup              # Complete setup
make install            # Install dependencies only
make migrate            # Run database migrations
make superuser          # Create admin user
```

### Running Services
```bash
# Option 1: Separate terminals
make run                # Django server (terminal 1)
make worker             # Celery worker (terminal 2)
make beat               # Celery beat (terminal 3)

# Option 2: All in one (tmux)
make all                # Start everything in tmux
# Ctrl+B then D to detach
# tmux attach -t cronhooks to reattach

# Option 3: Using scripts
./start_worker.sh       # Start worker
./start_beat.sh         # Start beat
```

### Docker
```bash
make docker-up          # Start services
make docker-down        # Stop services
make docker-logs        # View logs
```

### Development
```bash
make shell              # Django shell
make test               # Run tests
make sample             # Create sample webhooks
make clean              # Clean cache files
```

## 🔑 Get API Token
```bash
curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}'
```

## 📡 Common API Calls

### Create One-Time Webhook
```bash
curl -X POST http://localhost:8000/api/webhooks/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Webhook",
    "url": "https://webhook.site/YOUR-ID",
    "http_method": "POST",
    "schedule_type": "once",
    "scheduled_at": "2025-10-25T15:00:00Z",
    "payload": {"message": "Hello"}
  }'
```

### Create Recurring Webhook
```bash
curl -X POST http://localhost:8000/api/webhooks/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Every 5 Minutes",
    "url": "https://webhook.site/YOUR-ID",
    "http_method": "POST",
    "schedule_type": "recurring",
    "cron_expression": "*/5 * * * *",
    "payload": {"status": "check"}
  }'
```

### List Webhooks
```bash
curl http://localhost:8000/api/webhooks/ \
  -H "Authorization: Token YOUR_TOKEN"
```

### Cancel Webhook
```bash
curl -X POST http://localhost:8000/api/webhooks/1/cancel/ \
  -H "Authorization: Token YOUR_TOKEN"
```

### Get Execution History
```bash
curl http://localhost:8000/api/webhooks/1/executions/ \
  -H "Authorization: Token YOUR_TOKEN"
```

## ⏰ Cron Expression Cheat Sheet

| Expression | Description |
|------------|-------------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour |
| `0 */2 * * *` | Every 2 hours |
| `0 0 * * *` | Daily at midnight |
| `0 9 * * 1-5` | Weekdays at 9 AM |
| `0 0 1 * *` | First day of month |
| `0 0 * * 0` | Every Sunday |
| `*/15 9-17 * * 1-5` | Every 15 min, 9-5, weekdays |

**Format:** `minute hour day_of_month month day_of_week`
- minute: 0-59
- hour: 0-23
- day_of_month: 1-31
- month: 1-12
- day_of_week: 0-6 (0=Sunday)

**Test your cron:** https://crontab.guru

## 🌐 URLs

- **API Base:** http://localhost:8000/api/
- **Admin:** http://localhost:8000/admin/
- **Swagger:** http://localhost:8000/api/schema/swagger-ui/
- **ReDoc:** http://localhost:8000/api/schema/redoc/
- **Test Webhooks:** https://webhook.site

## 🐛 Troubleshooting

### Services not starting?
```bash
docker-compose ps              # Check Docker status
docker-compose logs postgres   # Check Postgres logs
docker-compose logs redis      # Check Redis logs
```

### Celery not running tasks?
```bash
# Check Celery worker is running
ps aux | grep celery

# Check Redis connection
docker exec -it cronhooks_redis redis-cli ping
# Should return: PONG

# View Celery stats
celery -A config inspect active
celery -A config inspect stats
```

### Database issues?
```bash
# Recreate database
make clean-all
make docker-up
make migrate
make superuser
```

### Import errors?
```bash
# Reinstall dependencies
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 📊 Monitoring

### Check running processes
```bash
ps aux | grep -E "(manage.py|celery)"
```

### Monitor Celery tasks
```bash
# Terminal with worker logs
make worker

# In another terminal, watch active tasks
watch -n 2 'celery -A config inspect active'
```

### Monitor Redis
```bash
docker exec -it cronhooks_redis redis-cli MONITOR
```

### Monitor PostgreSQL
```bash
docker exec -it cronhooks_postgres psql -U cronhooks -c "SELECT COUNT(*) FROM webhooks_webhook;"
docker exec -it cronhooks_postgres psql -U cronhooks -c "SELECT COUNT(*) FROM webhooks_webhookexecution;"
```

## 🧪 Testing Workflow

1. **Get test URL:** Visit https://webhook.site and copy your unique URL
2. **Create webhook:** Use API or admin panel
3. **Monitor execution:** 
   - Watch Celery worker logs
   - Check webhook.site for incoming requests
   - View execution history in admin or API
4. **Test cancellation:** Cancel webhook and verify it stops

## 📦 Project Files

| File | Purpose |
|------|---------|
| `config/settings.py` | Django settings |
| `config/celery.py` | Celery configuration |
| `webhooks/models.py` | Database models |
| `webhooks/serializers.py` | API serializers |
| `webhooks/views.py` | API endpoints |
| `webhooks/tasks.py` | Celery tasks |
| `docker-compose.yml` | Docker services |
| `.env` | Environment variables |
| `requirements.txt` | Python dependencies |
| `Makefile` | Common commands |

## 🎯 Typical Development Session

```bash
# Morning - Start services
make docker-up
make all              # Starts Django, worker, beat in tmux

# Work on features
make shell            # Test in Django shell
make test             # Run tests

# Create test data
make sample           # Create sample webhooks

# Monitor
# Ctrl+B then 0/1/2 to switch tmux windows
# Window 0: Django server
# Window 1: Celery worker  
# Window 2: Celery beat
# Window 3: Shell

# Evening - Stop services
# Ctrl+B then D to detach tmux
make docker-down
```

## 💾 Backup & Restore

### Backup Database
```bash
docker exec cronhooks_postgres pg_dump -U cronhooks cronhooks > backup.sql
```

### Restore Database
```bash
docker exec -i cronhooks_postgres psql -U cronhooks cronhooks < backup.sql
```

## 📚 Additional Resources

- **Django Docs:** https://docs.djangoproject.com
- **DRF Docs:** https://www.django-rest-framework.org
- **Celery Docs:** https://docs.celeryq.dev
- **Cron Helper:** https://crontab.guru
- **Webhook Tester:** https://webhook.site
- **httpx Docs:** https://www.python-httpx.org

## 🎓 Next Steps After MVP

1. Add webhook signature verification (HMAC)
2. Implement rate limiting
3. Add email notifications on failures
4. Create analytics dashboard
5. Add webhook testing endpoint (dry run)
6. Implement webhook templates
7. Add global environment variables
8. Create multi-user organizations
9. Export execution history
10. Add webhook logs streaming

---

**Need help?** Check DEVELOPMENT.md for detailed documentation.
