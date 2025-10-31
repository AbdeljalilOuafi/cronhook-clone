# Slack OAuth Integration - Deployment Steps

## ✅ Completed
- [x] Django app `slack_integration` created
- [x] Model `SlackAccount` created and synced with existing database table
- [x] Migration faked (table already exists in Supabase)
- [x] Verified: 1 existing Slack account found in database
- [x] Views, serializers, and URLs configured
- [x] Admin interface registered

## 🚀 Next Steps for Server Deployment

### 1. Update Environment Variables on Server

SSH to your server and edit `.env`:

```bash
# Add these to /opt/cronhooks/cronhook-clone/.env
SLACK_CLIENT_ID=your_slack_client_id_here
SLACK_CLIENT_SECRET=your_slack_client_secret_here
SLACK_REDIRECT_URI=https://slack.onsync.ai/oauth/callback
```

Get these from: https://api.slack.com/apps → Your App → OAuth & Permissions

**Note**: No frontend URL needed - the OAuth callback returns JSON responses instead of redirects.

### 2. Configure DNS (Already Done?)

Verify DNS is pointing to your server:
```bash
dig slack.onsync.ai
```

If not set up yet:
- Go to your DNS provider (onsync.ai domain)
- Add A record: `slack` → `YOUR_SERVER_IP`

### 3. Configure Nginx on Server

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
    
    # SSL will be configured by certbot
    
    location / {
        proxy_pass http://127.0.0.1:8000;  # Your Django port
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/slack.onsync.ai /etc/nginx/sites-enabled/
sudo nginx -t
```

### 4. Get SSL Certificate

```bash
sudo certbot --nginx -d slack.onsync.ai
```

This will automatically:
- Get SSL certificate from Let's Encrypt
- Update Nginx configuration
- Set up auto-renewal

### 5. Restart Nginx

```bash
sudo systemctl reload nginx
```

### 6. Deploy Code to Server

Push your code and pull on server:

```bash
# On server
cd /opt/cronhooks/cronhook-clone
git pull origin main

# Activate virtualenv
source venv/bin/activate

# Fake migration (table already exists)
python manage.py migrate slack_integration --fake

# Restart Django/Gunicorn
sudo systemctl restart cronhooks-web  # Or your service name
```

### 7. Configure Slack App

Go to https://api.slack.com/apps → Your App

**OAuth & Permissions**:
- Add Redirect URL: `https://slack.onsync.ai/oauth/callback`
- Bot Token Scopes:
  - `chat:write` - Post messages
  - `channels:read` - View channels
  - `users:read` - View users
  
**Save Changes**

### 8. Test the Integration

**Test 1: Configuration Check**
```bash
curl https://slack.onsync.ai/oauth/test
```

Expected response:
```json
{
  "client_id_configured": true,
  "client_secret_configured": true,
  "redirect_uri": "https://slack.onsync.ai/oauth/callback"
}
```

**Test 2: Start OAuth Flow**

Visit in browser:
```
https://slack.onsync.ai/oauth/install?account_id=1
```

Should redirect to Slack authorization page.

**Test 3: Complete Flow**
1. Authorize the app
2. Should receive JSON response:
```json
{
  "success": true,
  "action": "created",
  "data": {
    "workspace_id": "T12345678",
    "workspace_name": "My Workspace",
    "workspace_url": "myworkspace.slack.com",
    "bot_user_id": "U98765432",
    "client_account_id": 1
  },
  "message": "Slack workspace 'My Workspace' created successfully"
}
```
3. Check server logs for detailed information
4. Check database for new entry

**Test 4: Check Database**
```bash
python manage.py shell
```
```python
from slack_integration.models import SlackAccount
accounts = SlackAccount.objects.all()
for acc in accounts:
    print(f"{acc.workspace_name}: {acc.workspace_id}")
```

## 📋 API Endpoints Now Available

All accessible at `https://slack.onsync.ai`:

| Endpoint | Purpose |
|----------|---------|
| `/oauth/install?account_id=1` | Start OAuth, redirect to Slack |
| `/oauth/callback` | Slack redirects here after auth |
| `/oauth/test` | Check configuration |
| `/accounts/` | List Slack workspaces (requires auth) |
| `/accounts/<id>/disconnect` | Remove workspace |

## 🎨 OAuth Response Handling

The OAuth callback returns JSON responses instead of redirects. All success and failure information is logged.

### Success Response

When OAuth succeeds, you'll get:

```json
{
  "success": true,
  "action": "created",  // or "updated"
  "data": {
    "workspace_id": "T12345678",
    "workspace_name": "My Workspace",
    "workspace_url": "myworkspace.slack.com",
    "bot_user_id": "U98765432",
    "client_account_id": 1
  },
  "message": "Slack workspace 'My Workspace' created successfully"
}
```

### Error Response

When OAuth fails, you'll get:

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human-readable error message"
}
```

### Possible Error Codes

- `access_denied` - User denied authorization
- `no_code` - No authorization code received
- `missing_data` - Incomplete data from Slack
- `network_error` - Network connection failed
- `server_error` - Unexpected server error

### Server Logs

All OAuth events are logged with emojis for easy scanning:

```
🚀 Starting Slack OAuth flow
   Client Account ID: 1
   Redirecting to Slack authorization page

🔄 Exchanging authorization code for access token...
✅ Successfully obtained access token
   Workspace: My Workspace (T12345678)
   Bot User ID: U98765432

🔄 Fetching additional workspace details...
   Workspace URL: myworkspace.slack.com

💾 Saving Slack account to database...
✅ Slack account created successfully!
   Workspace ID: T12345678
   Workspace Name: My Workspace
   Workspace URL: myworkspace.slack.com
   Bot User ID: U98765432
   Client Account: 1
   Action: CREATED
```

Error logs use ❌ and ⚠️ emojis:

```
❌ Slack OAuth Error: User denied authorization - access_denied
❌ Slack OAuth token exchange failed: invalid_code
⚠️  Could not fetch team.info: missing_scope
```

### Viewing Logs

```bash
# View real-time logs
tail -f /var/log/cronhooks/error.log | grep slack_integration

# Or if using journalctl
journalctl -u cronhooks-web -f | grep slack_integration

# Search for specific workspace
grep "T12345678" /var/log/cronhooks/error.log
```

## 🔍 Troubleshooting

### If OAuth test fails:
```bash
# Check environment variables
cat .env | grep SLACK

# Check Django logs
tail -f /var/log/cronhooks/error.log

# Test direct connection
curl http://localhost:8000/oauth/test
```

### If redirect fails:
- Verify DNS: `dig slack.onsync.ai`
- Check Nginx: `sudo nginx -t`
- Check SSL: `curl -I https://slack.onsync.ai/oauth/test`
- Verify Slack app redirect URL matches exactly

### If database errors:
```bash
# Check table exists
python manage.py dbshell
\dt slack_accounts
\d slack_accounts
```

## ✅ Final Checklist

- [ ] Environment variables added to server .env (CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
- [ ] DNS A record created for slack.onsync.ai
- [ ] Nginx configured and enabled
- [ ] SSL certificate obtained
- [ ] Code deployed to server
- [ ] Migration faked
- [ ] Service restarted
- [ ] Slack app redirect URI configured
- [ ] OAuth flow tested
- [ ] Logging configured and working
- [ ] Integration tested from white-labeled CRM

## 📚 Documentation Reference

- **Quick Setup**: `SLACK_INTEGRATION_SETUP.md`
- **Full Documentation**: `SLACK_OAUTH_INTEGRATION.md`
- **Test Script**: `./test_slack_integration.sh`

## 🎯 Summary

Your Slack OAuth integration is **code-complete** and **locally tested**. 

**Key Changes:**
- ✅ No frontend redirects - returns JSON responses
- ✅ Comprehensive logging with emoji indicators
- ✅ All success/failure info in server logs
- ✅ White-labeled CRM can parse JSON responses

Next immediate actions:
1. Deploy to server
2. Configure nginx + SSL
3. Add environment variables
4. Test OAuth flow
5. Configure logging
6. Integrate with your white-labeled CRM

Once deployed, users can authorize via your white-labeled CRM, and you'll have full visibility through logs!
