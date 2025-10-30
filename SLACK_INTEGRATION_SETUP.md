# Slack OAuth Integration - Quick Setup

## ✅ What Was Created

### 1. Django App: `slack_integration`
- **Model**: `SlackAccount` - Stores Slack workspace OAuth data
- **Views**: OAuth callback, install, account management endpoints
- **URLs**: `/oauth/callback`, `/oauth/install`, `/accounts/`, etc.
- **Admin**: Django admin interface for managing Slack accounts

### 2. Database
- **Table**: `slack_accounts` (already created in Supabase)
- **Migration**: Django migration file created for consistency

### 3. Configuration
- **Settings**: Added to `config/settings.py`
- **URLs**: Integrated into `config/urls.py`
- **Environment**: Example `.env.slack.example` created

## 🚀 Quick Setup Steps

### 1. Add to .env
```bash
# Add these to your .env file
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=https://slack.onsync.ai/oauth/callback
FRONTEND_URL=https://onsync.ai
```

### 2. Run Migration
```bash
python manage.py makemigrations slack_integration
python manage.py migrate slack_integration
```

### 3. Configure Nginx

Create `/etc/nginx/sites-available/slack.onsync.ai`:

```nginx
server {
    listen 80;
    server_name slack.onsync.ai;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name slack.onsync.ai;
    
    ssl_certificate /etc/letsencrypt/live/slack.onsync.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/slack.onsync.ai/privkey.pem;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/slack.onsync.ai /etc/nginx/sites-enabled/
sudo certbot --nginx -d slack.onsync.ai
sudo nginx -t && sudo systemctl reload nginx
```

### 4. Configure Slack App

Go to https://api.slack.com/apps

1. **OAuth & Permissions**:
   - Redirect URL: `https://slack.onsync.ai/oauth/callback`
   - Scopes: `chat:write`, `channels:read`, `users:read`

2. **Get Credentials**:
   - Copy Client ID → Add to .env
   - Copy Client Secret → Add to .env

### 5. Test the Integration

```bash
# 1. Test configuration
curl https://slack.onsync.ai/oauth/test

# 2. Start OAuth flow (in browser)
# Visit: https://slack.onsync.ai/oauth/install?account_id=1

# 3. Check database
python manage.py shell
>>> from slack_integration.models import SlackAccount
>>> SlackAccount.objects.all()
```

## 📋 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/oauth/install` | GET | Start OAuth flow, redirect to Slack |
| `/oauth/callback` | GET | Handle Slack OAuth callback |
| `/oauth/test` | GET | Test configuration status |
| `/accounts/` | GET | List connected Slack workspaces |
| `/accounts/<id>/disconnect` | DELETE | Remove workspace connection |

## 🔄 OAuth Flow

```
User → /oauth/install 
  ↓
Slack Authorization Page
  ↓
/oauth/callback?code=xxx
  ↓
Exchange code for token
  ↓
Fetch workspace details
  ↓
Save to slack_accounts table
  ↓
Redirect to /slack/success
```

## 📊 Data Stored

| Field | Source | Example |
|-------|--------|---------|
| workspace_id | OAuth response | T12345678 |
| workspace_name | OAuth response | My Workspace |
| workspace_url | team.info API | myworkspace.slack.com |
| slack_access_token | OAuth response | xoxb-1841592... |
| onsync_bot_user_id | OAuth response | U98765432 |
| client_account_id | URL parameter | 1 |

## 🎨 Frontend Integration

### "Add to Slack" Button

```html
<a href="https://slack.onsync.ai/oauth/install?account_id=1">
  <img 
    alt="Add to Slack" 
    src="https://platform.slack-edge.com/img/add_to_slack.png" 
    width="139" height="40" 
  />
</a>
```

### Success Page Route

Create `/slack/success` page to handle:
```
https://onsync.ai/slack/success?workspace=WorkspaceName
```

### Error Page Route

Create `/slack/error` page to handle:
```
https://onsync.ai/slack/error?error=error_code
```

## 🔍 Troubleshooting

### Check Configuration
```bash
curl https://slack.onsync.ai/oauth/test
```

Should return:
```json
{
  "client_id_configured": true,
  "client_secret_configured": true,
  "redirect_uri": "https://slack.onsync.ai/oauth/callback",
  "frontend_url": "https://onsync.ai"
}
```

### Check DNS
```bash
dig slack.onsync.ai
```

Should point to your server IP.

### Check Nginx
```bash
sudo nginx -t
curl -I https://slack.onsync.ai/oauth/test
```

Should return 200 OK with proper HTTPS.

### Check Logs
```bash
# Django logs
tail -f /path/to/django/logs/debug.log

# Nginx logs
tail -f /var/log/nginx/error.log
```

## 📚 Documentation

Full documentation: `SLACK_OAUTH_INTEGRATION.md`

## ✅ Production Checklist

- [ ] Environment variables set in .env
- [ ] DNS record created for slack.onsync.ai
- [ ] Nginx configured with SSL
- [ ] Slack app redirect URI configured
- [ ] Database migrated
- [ ] OAuth flow tested end-to-end
- [ ] Frontend success/error pages created
- [ ] Monitoring and logging set up

## 🎯 Next Steps

1. **Deploy**: Restart Django server with new configuration
2. **Test**: Complete OAuth flow in browser
3. **Frontend**: Create success/error pages
4. **Monitor**: Check logs for any issues
5. **Use**: Start using Slack integration in your app!

---

**Need Help?** See full documentation in `SLACK_OAUTH_INTEGRATION.md`
