# Production Deployment with Systemd

This guide covers deploying CronHooks as systemd services that:
- ✅ Start automatically on boot
- ✅ Restart on failure
- ✅ Run in the background
- ✅ Centralized logging
- ✅ Easy management

---

## 📋 Prerequisites

1. Linux server with systemd (Ubuntu 20.04+, Debian 10+, CentOS 7+, etc.)
2. CronHooks project deployed to `/opt/cronhooks`
3. PostgreSQL and Redis running (Docker or native)
4. Python virtual environment created
5. Root/sudo access

---

## 🔧 Step-by-Step Setup

### Step 1: Prepare the Application

```bash
# Create application directory
sudo mkdir -p /opt/cronhooks
cd /opt/cronhooks

# Clone or copy your project
git clone https://github.com/AbdeljalilOuafi/cronhook-clone.git .

# Create virtual environment
python3 -m venv venv

# Install dependencies
source venv/bin/activate
pip install -r requirements.txt

# Copy and configure .env
cp .env.example .env
nano .env  # Edit with production values
```

### Step 2: Create Systemd User

For security, run services as a dedicated user:

```bash
# Create system user (no home directory, no login)
sudo useradd --system --no-create-home --shell /bin/false cronhooks

# Set ownership
sudo chown -R cronhooks:cronhooks /opt/cronhooks

# Ensure scripts are executable
sudo chmod +x /opt/cronhooks/start_worker.sh
sudo chmod +x /opt/cronhooks/start_beat.sh
```

### Step 3: Create Systemd Service Files

I'll create three service files for you:

1. **Django (Gunicorn)** - Web server
2. **Celery Worker** - Task execution
3. **Celery Beat** - Scheduler

---

## 📄 Service File 1: Django (Gunicorn)

Create `/etc/systemd/system/cronhooks-web.service`:

```ini
[Unit]
Description=CronHooks Django Web Application
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=notify
User=cronhooks
Group=cronhooks
WorkingDirectory=/opt/cronhooks
Environment="PATH=/opt/cronhooks/venv/bin"
EnvironmentFile=/opt/cronhooks/.env

# Gunicorn command
ExecStart=/opt/cronhooks/venv/bin/gunicorn \
    --bind 127.0.0.1:8000 \
    --workers 4 \
    --timeout 120 \
    --access-logfile /var/log/cronhooks/access.log \
    --error-logfile /var/log/cronhooks/error.log \
    --log-level info \
    config.wsgi:application

# Restart policy
Restart=always
RestartSec=10s

# Security
NoNewPrivileges=true
PrivateTmp=true

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cronhooks-web

[Install]
WantedBy=multi-user.target
```

---

## 📄 Service File 2: Celery Worker

Create `/etc/systemd/system/cronhooks-worker.service`:

```ini
[Unit]
Description=CronHooks Celery Worker
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=cronhooks
Group=cronhooks
WorkingDirectory=/opt/cronhooks
Environment="PATH=/opt/cronhooks/venv/bin"
EnvironmentFile=/opt/cronhooks/.env

# Celery worker command
ExecStart=/opt/cronhooks/venv/bin/celery \
    -A config \
    worker \
    --loglevel=info \
    --concurrency=4 \
    --max-tasks-per-child=1000

# Restart policy
Restart=always
RestartSec=10s
KillSignal=SIGTERM
TimeoutStopSec=30

# Security
NoNewPrivileges=true
PrivateTmp=true

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cronhooks-worker

[Install]
WantedBy=multi-user.target
```

---

## 📄 Service File 3: Celery Beat

Create `/etc/systemd/system/cronhooks-beat.service`:

```ini
[Unit]
Description=CronHooks Celery Beat Scheduler
After=network.target postgresql.service redis.service cronhooks-worker.service
Wants=postgresql.service redis.service
Requires=cronhooks-worker.service

[Service]
Type=simple
User=cronhooks
Group=cronhooks
WorkingDirectory=/opt/cronhooks
Environment="PATH=/opt/cronhooks/venv/bin"
EnvironmentFile=/opt/cronhooks/.env

# Celery beat command
ExecStart=/opt/cronhooks/venv/bin/celery \
    -A config \
    beat \
    --loglevel=info \
    --scheduler django_celery_beat.schedulers:DatabaseScheduler \
    --pidfile=/run/cronhooks/celerybeat.pid

# Restart policy
Restart=always
RestartSec=10s
KillSignal=SIGTERM
TimeoutStopSec=30

# Runtime directory
RuntimeDirectory=cronhooks
RuntimeDirectoryMode=0755

# Security
NoNewPrivileges=true
PrivateTmp=true

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cronhooks-beat

[Install]
WantedBy=multi-user.target
```

---

## 📁 Create Log Directory

```bash
# Create log directory
sudo mkdir -p /var/log/cronhooks
sudo chown cronhooks:cronhooks /var/log/cronhooks

# Create runtime directory (if not using RuntimeDirectory)
sudo mkdir -p /run/cronhooks
sudo chown cronhooks:cronhooks /run/cronhooks
```

---

## ⚙️ Install Gunicorn

The Django service uses Gunicorn as the production WSGI server:

```bash
# Activate virtual environment
cd /opt/cronhooks
source venv/bin/activate

# Install Gunicorn
pip install gunicorn

# Update requirements.txt
pip freeze > requirements.txt
```

---

## 🚀 Enable and Start Services

```bash
# Reload systemd to recognize new services
sudo systemctl daemon-reload

# Enable services (start on boot)
sudo systemctl enable cronhooks-web
sudo systemctl enable cronhooks-worker
sudo systemctl enable cronhooks-beat

# Start services
sudo systemctl start cronhooks-web
sudo systemctl start cronhooks-worker
sudo systemctl start cronhooks-beat

# Check status
sudo systemctl status cronhooks-web
sudo systemctl status cronhooks-worker
sudo systemctl status cronhooks-beat
```

---

## 🔍 Managing Services

### Check Status
```bash
sudo systemctl status cronhooks-web
sudo systemctl status cronhooks-worker
sudo systemctl status cronhooks-beat

# Or all at once
sudo systemctl status cronhooks-*
```

### Start Services
```bash
sudo systemctl start cronhooks-web
sudo systemctl start cronhooks-worker
sudo systemctl start cronhooks-beat

# Or all at once
sudo systemctl start cronhooks-*
```

### Stop Services
```bash
sudo systemctl stop cronhooks-web
sudo systemctl stop cronhooks-worker
sudo systemctl stop cronhooks-beat

# Or all at once
sudo systemctl stop cronhooks-*
```

### Restart Services
```bash
sudo systemctl restart cronhooks-web
sudo systemctl restart cronhooks-worker
sudo systemctl restart cronhooks-beat

# Or all at once
sudo systemctl restart cronhooks-*
```

### Reload Configuration (without restart)
```bash
# After editing .env or code changes
sudo systemctl reload cronhooks-web

# For worker/beat, restart is required
sudo systemctl restart cronhooks-worker cronhooks-beat
```

### Disable Services (don't start on boot)
```bash
sudo systemctl disable cronhooks-web
sudo systemctl disable cronhooks-worker
sudo systemctl disable cronhooks-beat
```

---

## 📊 Viewing Logs

### Real-time Logs
```bash
# Django/Gunicorn logs
sudo journalctl -u cronhooks-web -f

# Celery worker logs
sudo journalctl -u cronhooks-worker -f

# Celery beat logs
sudo journalctl -u cronhooks-beat -f

# All services
sudo journalctl -u cronhooks-* -f
```

### Recent Logs
```bash
# Last 100 lines
sudo journalctl -u cronhooks-web -n 100

# Last hour
sudo journalctl -u cronhooks-worker --since "1 hour ago"

# Today's logs
sudo journalctl -u cronhooks-beat --since today

# Specific date
sudo journalctl -u cronhooks-web --since "2025-10-24"
```

### Log Files
```bash
# Access logs (Gunicorn)
sudo tail -f /var/log/cronhooks/access.log

# Error logs (Gunicorn)
sudo tail -f /var/log/cronhooks/error.log
```

---

## 🌐 Nginx Configuration (Optional)

For production, use Nginx as a reverse proxy:

Create `/etc/nginx/sites-available/cronhooks`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Static files
    location /static/ {
        alias /opt/cronhooks/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Proxy to Gunicorn
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Logging
    access_log /var/log/nginx/cronhooks_access.log;
    error_log /var/log/nginx/cronhooks_error.log;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/cronhooks /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔐 Production Environment Variables

Update `/opt/cronhooks/.env` for production:

```bash
# Django Settings
SECRET_KEY=your-very-long-random-secret-key-here-min-50-chars
DEBUG=False
ALLOWED_HOSTS=your-domain.com,www.your-domain.com

# Database (production PostgreSQL)
DATABASE_URL=postgresql://cronhooks_user:secure_password@localhost:5432/cronhooks_prod

# Redis (production instance)
REDIS_URL=redis://localhost:6379/0

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Webhook Settings
DEFAULT_WEBHOOK_TIMEOUT=30
MAX_RETRY_ATTEMPTS=3

# Security (if using HTTPS)
CSRF_COOKIE_SECURE=True
SESSION_COOKIE_SECURE=True
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
```

---

## 🔄 Deployment Workflow

### Initial Deployment

```bash
# 1. Create service files (done above)
# 2. Install dependencies
cd /opt/cronhooks
source venv/bin/activate
pip install -r requirements.txt

# 3. Run migrations
python manage.py migrate

# 4. Collect static files
python manage.py collectstatic --noinput

# 5. Create superuser
python manage.py createsuperuser

# 6. Start services
sudo systemctl daemon-reload
sudo systemctl enable cronhooks-*
sudo systemctl start cronhooks-*
```

### Update Deployment

```bash
# 1. Pull latest code
cd /opt/cronhooks
sudo -u cronhooks git pull

# 2. Install new dependencies
sudo -u cronhooks /opt/cronhooks/venv/bin/pip install -r requirements.txt

# 3. Run migrations
sudo -u cronhooks /opt/cronhooks/venv/bin/python manage.py migrate

# 4. Collect static files
sudo -u cronhooks /opt/cronhooks/venv/bin/python manage.py collectstatic --noinput

# 5. Restart services
sudo systemctl restart cronhooks-*

# 6. Check status
sudo systemctl status cronhooks-*
```

---

## 🔧 Troubleshooting

### Service won't start

```bash
# Check logs
sudo journalctl -u cronhooks-web -n 50

# Check file permissions
ls -la /opt/cronhooks
sudo chown -R cronhooks:cronhooks /opt/cronhooks

# Check environment file
sudo -u cronhooks cat /opt/cronhooks/.env

# Test manually
sudo -u cronhooks bash
cd /opt/cronhooks
source venv/bin/activate
gunicorn config.wsgi:application
```

### Database connection issues

```bash
# Test database connection
sudo -u cronhooks /opt/cronhooks/venv/bin/python manage.py check

# Verify DATABASE_URL in .env
cat /opt/cronhooks/.env | grep DATABASE_URL

# Check PostgreSQL is running
sudo systemctl status postgresql
```

### Worker not executing tasks

```bash
# Check worker logs
sudo journalctl -u cronhooks-worker -f

# Check Redis connection
redis-cli ping

# Test Celery manually
sudo -u cronhooks bash
cd /opt/cronhooks
source venv/bin/activate
celery -A config worker -l debug
```

### Beat not scheduling tasks

```bash
# Check beat logs
sudo journalctl -u cronhooks-beat -f

# Verify database schedule
sudo -u cronhooks /opt/cronhooks/venv/bin/python manage.py shell
>>> from django_celery_beat.models import PeriodicTask
>>> PeriodicTask.objects.all()
```

---

## 📈 Monitoring & Maintenance

### Systemd Status Check Script

Create `/opt/cronhooks/check_services.sh`:

```bash
#!/bin/bash

echo "=== CronHooks Service Status ==="
echo ""

for service in cronhooks-web cronhooks-worker cronhooks-beat; do
    if systemctl is-active --quiet $service; then
        echo "✅ $service: RUNNING"
    else
        echo "❌ $service: STOPPED"
    fi
done

echo ""
echo "=== Recent Errors ==="
sudo journalctl -u cronhooks-* --since "1 hour ago" -p err --no-pager | tail -20
```

### Automated Restart on Failure

The systemd services already include `Restart=always`, which automatically restarts on failure.

### Log Rotation

Create `/etc/logrotate.d/cronhooks`:

```
/var/log/cronhooks/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 cronhooks cronhooks
    sharedscripts
    postrotate
        systemctl reload cronhooks-web > /dev/null 2>&1 || true
    endscript
}
```

---

## ✅ Verification Checklist

- [ ] Services start successfully
- [ ] Services enabled for boot
- [ ] Logs are being written
- [ ] Database connections working
- [ ] Redis connections working
- [ ] Webhooks execute correctly
- [ ] Celery Beat scheduling works
- [ ] Nginx reverse proxy configured (if using)
- [ ] SSL certificates installed (if using HTTPS)
- [ ] Firewall configured
- [ ] Backups configured

---

## 🎉 Quick Commands Reference

```bash
# Start all services
sudo systemctl start cronhooks-*

# Stop all services
sudo systemctl stop cronhooks-*

# Restart all services
sudo systemctl restart cronhooks-*

# Check all service status
sudo systemctl status cronhooks-*

# View all logs in real-time
sudo journalctl -u cronhooks-* -f

# Enable auto-start on boot
sudo systemctl enable cronhooks-*

# Disable auto-start
sudo systemctl disable cronhooks-*
```

---

Your CronHooks application is now production-ready with:
✅ Automatic startup on boot
✅ Automatic restart on failure
✅ Centralized logging
✅ Secure user permissions
✅ Professional deployment setup
