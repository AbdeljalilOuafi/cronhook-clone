# CronHooks Production Deployment Guide

## 1. Frontend Build Command

The frontend is already configured with a production build command in `package.json`:

```bash
cd frontend
npm run build
```

This will:
- Compile TypeScript to JavaScript
- Build optimized production bundle with Vite
- Output files to `frontend/dist/` directory
- Minify and optimize all assets

**Build output location:** `frontend/dist/`

---

## 2. Nginx Configuration

Two nginx configuration files have been created in the `nginx/` directory:

### Frontend Configuration (`nginx/frontend.conf`)
- Serves the React frontend
- Handles client-side routing (SPA)
- Optimized caching for static assets
- Security headers

### Backend Configuration (`nginx/backend.conf`)
- Proxies requests to Django/Gunicorn
- Serves static files (Django admin, DRF browsable API)
- Handles CORS and security headers
- WebSocket support ready

---

## 3. SSL Certificate Setup with Certbot

### Install Certbot (if not already installed)

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

**CentOS/RHEL:**
```bash
sudo yum install certbot python3-certbot-nginx -y
```

**Arch Linux:**
```bash
sudo pacman -S certbot certbot-nginx
```

### Generate SSL Certificates

**For Frontend:**
```bash
sudo certbot --nginx -d YOUR_DOMAIN_HERE
```

**For Backend (API):**
```bash
sudo certbot --nginx -d api.YOUR_DOMAIN_HERE
```

**For Both Domains (Recommended):**
```bash
sudo certbot --nginx -d YOUR_DOMAIN_HERE -d api.YOUR_DOMAIN_HERE
```

### Certbot Options

- `--nginx`: Uses nginx plugin to automatically configure SSL
- `-d DOMAIN`: Specify domain name(s)
- `--non-interactive`: Run without user interaction (for automation)
- `--agree-tos`: Agree to terms of service automatically
- `--email your@email.com`: Contact email for urgent renewal notices

**Example with all options:**
```bash
sudo certbot --nginx \
  -d cronhooks.example.com \
  -d api.cronhooks.example.com \
  --non-interactive \
  --agree-tos \
  --email admin@example.com
```

### Auto-Renewal

Certbot automatically sets up auto-renewal. Test it with:
```bash
sudo certbot renew --dry-run
```

---

## 4. Complete Deployment Steps

### Step 1: Prepare the Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install nginx python3-pip python3-venv postgresql redis-server -y

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y
```

### Step 2: Clone and Setup Project

```bash
# Create project directory
sudo mkdir -p /var/www/cronhooks
sudo chown $USER:$USER /var/www/cronhooks
cd /var/www/cronhooks

# Clone repository
git clone YOUR_REPO_URL .

# Setup Python virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
nano .env  # Edit with production values
```

### Step 3: Build Frontend

```bash
cd frontend
npm install
npm run build
```

### Step 4: Setup Django

```bash
cd ..
source venv/bin/activate

# Collect static files
python manage.py collectstatic --noinput

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### Step 5: Configure Nginx

```bash
# Copy nginx configs
sudo cp nginx/frontend.conf /etc/nginx/sites-available/cronhooks-frontend
sudo cp nginx/backend.conf /etc/nginx/sites-available/cronhooks-backend

# Edit domain names
sudo nano /etc/nginx/sites-available/cronhooks-frontend
# Replace YOUR_DOMAIN_HERE with your actual domain (e.g., cronhooks.example.com)

sudo nano /etc/nginx/sites-available/cronhooks-backend
# Replace api.YOUR_DOMAIN_HERE with your API domain (e.g., api.cronhooks.example.com)

# Enable sites
sudo ln -s /etc/nginx/sites-available/cronhooks-frontend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/cronhooks-backend /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### Step 6: Setup Gunicorn (Backend Server)

```bash
# Install gunicorn
pip install gunicorn

# Test gunicorn
gunicorn config.wsgi:application --bind 127.0.0.1:8000

# Create systemd service
sudo nano /etc/systemd/system/cronhooks-web.service
```

**Service file content:**
```ini
[Unit]
Description=CronHooks Gunicorn daemon
After=network.target

[Service]
User=YOUR_USER
Group=www-data
WorkingDirectory=/var/www/cronhooks
Environment="PATH=/var/www/cronhooks/venv/bin"
ExecStart=/var/www/cronhooks/venv/bin/gunicorn \
          --workers 3 \
          --bind 127.0.0.1:8000 \
          config.wsgi:application

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable cronhooks-web
sudo systemctl start cronhooks-web
```

### Step 7: Setup Celery Workers

```bash
# Use existing systemd services in systemd/ directory
sudo cp systemd/cronhooks-worker.service /etc/systemd/system/
sudo cp systemd/cronhooks-beat.service /etc/systemd/system/

# Edit paths if needed
sudo nano /etc/systemd/system/cronhooks-worker.service
sudo nano /etc/systemd/system/cronhooks-beat.service

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable cronhooks-worker cronhooks-beat
sudo systemctl start cronhooks-worker cronhooks-beat
```

### Step 8: Setup SSL Certificates

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate certificates (replace with your domains)
sudo certbot --nginx \
  -d cronhooks.example.com \
  -d api.cronhooks.example.com \
  --non-interactive \
  --agree-tos \
  --email admin@example.com
```

Certbot will automatically:
- Generate SSL certificates
- Modify nginx configs to use HTTPS
- Set up HTTP -> HTTPS redirects
- Configure auto-renewal

### Step 9: Verify Deployment

```bash
# Check all services
sudo systemctl status nginx
sudo systemctl status cronhooks-web
sudo systemctl status cronhooks-worker
sudo systemctl status cronhooks-beat
sudo systemctl status redis
sudo systemctl status postgresql

# Check logs
sudo tail -f /var/log/nginx/cronhooks-frontend-error.log
sudo tail -f /var/log/nginx/cronhooks-backend-error.log
sudo journalctl -u cronhooks-web -f
sudo journalctl -u cronhooks-worker -f
```

---

## 5. Environment Variables for Production

Update `.env` file with production values:

```bash
# Django
DEBUG=False
SECRET_KEY=your-very-secure-random-secret-key
ALLOWED_HOSTS=api.cronhooks.example.com,cronhooks.example.com
CORS_ALLOWED_ORIGINS=https://cronhooks.example.com

# Database
DATABASE_URL=postgresql://dbuser:dbpassword@localhost/cronhooks

# Redis
REDIS_URL=redis://localhost:6379/0

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

---

## 6. Security Checklist

- ✅ Set `DEBUG=False` in production
- ✅ Use strong `SECRET_KEY`
- ✅ Configure `ALLOWED_HOSTS` properly
- ✅ Set up CORS with specific origins
- ✅ Use HTTPS (SSL certificates)
- ✅ Configure firewall (ufw/iptables)
- ✅ Keep dependencies updated
- ✅ Set up database backups
- ✅ Configure fail2ban
- ✅ Enable nginx rate limiting

---

## 7. Maintenance Commands

### Update Application
```bash
cd /var/www/cronhooks
git pull
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
cd frontend && npm install && npm run build
sudo systemctl restart cronhooks-web cronhooks-worker cronhooks-beat
```

### View Logs
```bash
# Nginx
sudo tail -f /var/log/nginx/cronhooks-backend-error.log

# Gunicorn
sudo journalctl -u cronhooks-web -f

# Celery
sudo journalctl -u cronhooks-worker -f
sudo journalctl -u cronhooks-beat -f
```

### Renew SSL Certificates (manual)
```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## 8. Quick Reference Commands

| Task | Command |
|------|---------|
| Build frontend | `cd frontend && npm run build` |
| Collect static files | `python manage.py collectstatic --noinput` |
| Run migrations | `python manage.py migrate` |
| Restart backend | `sudo systemctl restart cronhooks-web` |
| Restart celery | `sudo systemctl restart cronhooks-worker cronhooks-beat` |
| Restart nginx | `sudo systemctl restart nginx` |
| Test nginx config | `sudo nginx -t` |
| Check SSL expiry | `sudo certbot certificates` |
| Renew SSL | `sudo certbot renew` |

---

## Support

For issues or questions, refer to:
- Main README.md
- PRODUCTION_DEPLOYMENT.md (if exists)
- Django documentation: https://docs.djangoproject.com/
- Nginx documentation: https://nginx.org/en/docs/
- Certbot documentation: https://certbot.eff.org/docs/
