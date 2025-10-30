# Slack OAuth Integration

## Overview
This integration allows users to connect their Slack workspaces to OnSync AI, enabling bot functionality and workspace management.

## Architecture

### Components
1. **Django App**: `slack_integration`
2. **Model**: `SlackAccount` - Stores workspace OAuth tokens
3. **Views**: OAuth callback handlers and account management
4. **Database Table**: `slack_accounts`

### OAuth Flow
```
User clicks "Add to Slack"
    ↓
Redirected to: /oauth/install
    ↓
Redirected to: Slack authorization page
    ↓
User approves permissions
    ↓
Slack redirects to: https://slack.onsync.ai/oauth/callback?code=xxx
    ↓
Backend exchanges code for access token
    ↓
Backend fetches workspace details
    ↓
Backend saves to slack_accounts table
    ↓
User redirected to: https://onsync.ai/slack/success
```

## Setup Instructions

### 1. Environment Variables

Add to your `.env` file:

```bash
# Slack OAuth Configuration
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_REDIRECT_URI=https://slack.onsync.ai/oauth/callback
FRONTEND_URL=https://onsync.ai
```

### 2. Slack App Configuration

**In Slack App Dashboard (api.slack.com/apps):**

1. **OAuth & Permissions**:
   - Redirect URL: `https://slack.onsync.ai/oauth/callback`
   - Bot Token Scopes:
     - `chat:write` - Send messages
     - `channels:read` - View channels
     - `users:read` - View users

2. **Install App**:
   - Get Client ID and Client Secret
   - Add to your `.env` file

### 3. DNS Configuration

**Domain**: `onsync.ai`

Add A record:
```
Type: A
Name: slack
Value: YOUR_SERVER_IP
TTL: Auto
```

**Result**: `https://slack.onsync.ai` → Your server

### 4. Nginx Configuration

Create `/etc/nginx/sites-available/slack.onsync.ai`:

```nginx
server {
    listen 80;
    server_name slack.onsync.ai;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name slack.onsync.ai;
    
    # SSL Configuration (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/slack.onsync.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/slack.onsync.ai/privkey.pem;
    
    # Proxy to Django
    location / {
        proxy_pass http://localhost:8000;
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
sudo systemctl reload nginx
```

### 5. SSL Certificate

```bash
sudo certbot --nginx -d slack.onsync.ai
```

### 6. Database Migration

The `slack_accounts` table was created via Supabase UI, but you should create a migration:

```bash
python manage.py makemigrations slack_integration
python manage.py migrate
```

## API Endpoints

### 1. OAuth Install (Start Flow)
```
GET /oauth/install?account_id=1

Redirects user to Slack authorization page.
```

**Query Parameters**:
- `account_id` (optional): Client account ID to associate with the workspace

### 2. OAuth Callback (Slack Redirects Here)
```
GET /oauth/callback?code=xxx&state=xxx

Handles Slack OAuth callback, exchanges code for token, saves to database.
```

**Query Parameters** (from Slack):
- `code`: Authorization code
- `state`: CSRF protection token
- `error`: Error message if authorization failed

**Redirects To**:
- Success: `https://onsync.ai/slack/success?workspace=WorkspaceName`
- Error: `https://onsync.ai/slack/error?error=error_code`

### 3. List Slack Accounts
```
GET /accounts/?account_id=1

Returns list of connected Slack workspaces.
```

**Query Parameters**:
- `account_id` (optional): Filter by client account

**Response**:
```json
[
  {
    "workspace_id": "T12345678",
    "workspace_name": "My Workspace",
    "workspace_url": "myworkspace.slack.com",
    "onsync_bot_user_id": "U98765432",
    "client_account": 1,
    "created_at": "2025-10-30T08:34:30.125210Z",
    "updated_at": "2025-10-30T08:34:30.125210Z"
  }
]
```

### 4. Disconnect Slack Account
```
DELETE /accounts/<workspace_id>/disconnect

Removes Slack workspace connection.
```

**Response**:
```json
{
  "detail": "Slack workspace T12345678 disconnected successfully"
}
```

### 5. Test Configuration
```
GET /oauth/test

Returns OAuth configuration status (for debugging).
```

**Response**:
```json
{
  "client_id_configured": true,
  "client_secret_configured": true,
  "redirect_uri": "https://slack.onsync.ai/oauth/callback",
  "frontend_url": "https://onsync.ai"
}
```

## Database Schema

### slack_accounts Table

| Column               | Type      | Description                              |
|---------------------|-----------|------------------------------------------|
| workspace_id        | VARCHAR   | Primary key, Slack team ID (T12345678)   |
| workspace_name      | VARCHAR   | Human-readable workspace name            |
| workspace_url       | VARCHAR   | Workspace URL (myworkspace.slack.com)    |
| slack_access_token  | TEXT      | Bot OAuth token (xoxb-...)               |
| onsync_bot_user_id  | VARCHAR   | Bot user ID in this workspace (U...)     |
| client_account_id   | INTEGER   | Foreign key to accounts table            |
| created_at          | TIMESTAMP | When workspace was connected             |
| updated_at          | TIMESTAMP | Last update timestamp                    |

### Relationships
- `client_account_id` → `accounts.id` (Many-to-One)
- One account can have multiple Slack workspaces
- Each Slack workspace belongs to one account

## Data Flow

### OAuth Response Mapping

**From `oauth.v2.access` response**:
```json
{
  "ok": true,
  "access_token": "xoxb-...",           // → slack_access_token
  "bot_user_id": "U12345678",           // → onsync_bot_user_id
  "team": {
    "id": "T12345678",                  // → workspace_id
    "name": "Workspace Name"            // → workspace_name
  }
}
```

**From `team.info` API**:
```json
{
  "ok": true,
  "team": {
    "domain": "myworkspace"             // → workspace_url (add .slack.com)
  }
}
```

## Testing

### 1. Test OAuth Configuration
```bash
curl https://slack.onsync.ai/oauth/test
```

Expected output:
```json
{
  "client_id_configured": true,
  "client_secret_configured": true,
  "redirect_uri": "https://slack.onsync.ai/oauth/callback",
  "frontend_url": "https://onsync.ai"
}
```

### 2. Start OAuth Flow
Visit in browser:
```
https://slack.onsync.ai/oauth/install?account_id=1
```

Should redirect to Slack authorization page.

### 3. Check Database
```sql
SELECT * FROM slack_accounts;
```

### 4. List via API
```bash
curl -H "Authorization: Token YOUR_TOKEN" \
  https://slack.onsync.ai/accounts/
```

## Frontend Integration

### "Add to Slack" Button

```html
<a href="https://slack.onsync.ai/oauth/install?account_id=1">
  <img 
    alt="Add to Slack" 
    src="https://platform.slack-edge.com/img/add_to_slack.png" 
    srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, 
            https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" 
    width="139" 
    height="40" 
  />
</a>
```

### Success Page (`/slack/success`)

```typescript
// Get workspace name from URL
const params = new URLSearchParams(window.location.search);
const workspace = params.get('workspace');

// Show success message
toast.success(`Successfully connected to ${workspace}!`);
```

### Error Page (`/slack/error`)

```typescript
// Get error from URL
const params = new URLSearchParams(window.location.search);
const error = params.get('error');

// Map errors to user-friendly messages
const errorMessages = {
  'access_denied': 'Authorization was cancelled',
  'no_code': 'No authorization code received',
  'missing_data': 'Incomplete data from Slack',
  'network_error': 'Network connection failed',
  'server_error': 'An unexpected error occurred'
};

// Show error message
toast.error(errorMessages[error] || 'Installation failed');
```

## Security Considerations

### 1. Token Storage
- ✅ Access tokens stored in database (encrypted at rest)
- ✅ Never exposed in API responses (excluded from serializer)
- ✅ HTTPS required for all OAuth endpoints

### 2. CSRF Protection
- ✅ `state` parameter passed through OAuth flow
- ✅ Can include account_id in state for tracking

### 3. Permissions
- ✅ OAuth callback endpoint is `AllowAny` (required for Slack redirect)
- ✅ Account management endpoints require authentication
- ✅ Users can only access their own account's Slack workspaces

## Troubleshooting

### Error: "redirect_uri_mismatch"
**Cause**: Slack app redirect URI doesn't match configured URI

**Fix**: In Slack app settings, add exact URI:
```
https://slack.onsync.ai/oauth/callback
```

### Error: "Network error"
**Cause**: Server can't reach Slack API

**Fix**: Check firewall and outbound HTTPS access:
```bash
curl https://slack.com/api/team.info
```

### Error: "Missing required data"
**Cause**: Incomplete OAuth response from Slack

**Fix**: Check logs for details:
```bash
tail -f /var/log/django/slack_oauth.log
```

### Workspace Not Saving
**Cause**: Database permissions or foreign key constraint

**Fix**: Check client_account exists:
```sql
SELECT id FROM accounts WHERE id = 1;
```

## Logs

### Enable Logging

Add to `settings.py`:
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/slack_oauth.log',
        },
    },
    'loggers': {
        'slack_integration': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
```

### Log Messages
- ✅ OAuth code exchange
- ✅ Workspace details fetch
- ✅ Database save operations
- ✅ Errors and exceptions

## Next Steps

### 1. Create Frontend Pages
- `/slack/success` - Success message and workspace details
- `/slack/error` - Error handling and retry button
- `/slack/manage` - List and disconnect workspaces

### 2. Add Slack Bot Features
- Send messages to channels
- Retrieve channel lists
- User management

### 3. Webhook Integration
- Trigger Slack messages from webhooks
- Use Slack workspace in webhook payloads

### 4. Multi-Account Support
- Allow users to connect multiple workspaces
- Filter workspaces by client account
- Manage permissions per workspace

## Production Checklist

- [ ] Set environment variables in `.env`
- [ ] Configure Slack app redirect URI
- [ ] Set up DNS A record for slack.onsync.ai
- [ ] Configure Nginx with SSL
- [ ] Run database migrations
- [ ] Test OAuth flow end-to-end
- [ ] Create frontend success/error pages
- [ ] Set up logging
- [ ] Monitor OAuth callback errors
- [ ] Document for users

## Support

For issues or questions:
1. Check logs: `tail -f /var/log/django/slack_oauth.log`
2. Test configuration: `GET /oauth/test`
3. Verify DNS: `dig slack.onsync.ai`
4. Check Slack app settings
5. Review Nginx configuration
