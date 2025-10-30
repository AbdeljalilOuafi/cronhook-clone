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
FRONTEND_URL=https://onsync.ai
```

Get these from: https://api.slack.com/apps → Your App → OAuth & Permissions

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
  "redirect_uri": "https://slack.onsync.ai/oauth/callback",
  "frontend_url": "https://onsync.ai"
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
2. Should redirect to: `https://onsync.ai/slack/success?workspace=WorkspaceName`
3. Check database for new entry

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

## 🎨 Frontend Integration Needed

You need to create two pages in your frontend:

### 1. Success Page: `/slack/success`

URL will be: `https://onsync.ai/slack/success?workspace=WorkspaceName`

```tsx
// Example React component
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

export default function SlackSuccess() {
  const [searchParams] = useSearchParams();
  const workspace = searchParams.get('workspace');
  
  useEffect(() => {
    if (workspace) {
      toast.success(`Successfully connected to ${workspace}!`);
    }
  }, [workspace]);
  
  return (
    <div>
      <h1>Slack Connected!</h1>
      <p>Your workspace "{workspace}" has been connected successfully.</p>
      <Link to="/dashboard">Go to Dashboard</Link>
    </div>
  );
}
```

### 2. Error Page: `/slack/error`

URL will be: `https://onsync.ai/slack/error?error=error_code`

```tsx
import { useSearchParams } from 'react-router-dom';

const ERROR_MESSAGES = {
  'access_denied': 'Authorization was cancelled',
  'no_code': 'No authorization code received',
  'missing_data': 'Incomplete data from Slack',
  'network_error': 'Network connection failed',
  'server_error': 'An unexpected error occurred'
};

export default function SlackError() {
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');
  const message = ERROR_MESSAGES[error] || 'Installation failed';
  
  return (
    <div>
      <h1>Connection Failed</h1>
      <p>{message}</p>
      <button onClick={() => window.location.href = '/slack/install'}>
        Try Again
      </button>
    </div>
  );
}
```

### 3. "Add to Slack" Button

Add anywhere in your app:

```tsx
<a 
  href={`https://slack.onsync.ai/oauth/install?account_id=${accountId}`}
  className="inline-block"
>
  <img 
    alt="Add to Slack" 
    src="https://platform.slack-edge.com/img/add_to_slack.png" 
    srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, 
            https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" 
    width="139" 
    height="40" 
  />
</a>
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

- [ ] Environment variables added to server .env
- [ ] DNS A record created for slack.onsync.ai
- [ ] Nginx configured and enabled
- [ ] SSL certificate obtained
- [ ] Code deployed to server
- [ ] Migration faked
- [ ] Service restarted
- [ ] Slack app redirect URI configured
- [ ] OAuth flow tested
- [ ] Frontend success page created
- [ ] Frontend error page created
- [ ] "Add to Slack" button added to UI

## 📚 Documentation Reference

- **Quick Setup**: `SLACK_INTEGRATION_SETUP.md`
- **Full Documentation**: `SLACK_OAUTH_INTEGRATION.md`
- **Test Script**: `./test_slack_integration.sh`

## 🎯 Summary

Your Slack OAuth integration is **code-complete** and **locally tested**. 

Next immediate actions:
1. Deploy to server
2. Configure nginx + SSL
3. Add environment variables
4. Test OAuth flow
5. Create frontend pages

Once deployed, users will be able to click "Add to Slack" and connect their workspaces!
