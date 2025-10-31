# Slack OAuth Integration - Logging Guide

## Overview

The Slack OAuth integration uses comprehensive logging instead of frontend redirects. All success and failure information is logged to help you monitor and troubleshoot the OAuth flow.

## Log Format

Logs use emoji indicators for easy scanning:

- 🚀 Starting operations
- 🔄 Processing/fetching data
- ✅ Success
- ❌ Critical errors
- ⚠️  Warnings
- 💾 Database operations
- 📋 Listing operations
- 🗑️  Deletion operations
- 🔍 Testing/debugging

## OAuth Flow Logs

### Successful Authorization

```log
2025-10-30 10:15:23 INFO slack_integration 🚀 Starting Slack OAuth flow
2025-10-30 10:15:23 INFO slack_integration    Client Account ID: 1
2025-10-30 10:15:23 INFO slack_integration    Redirecting to Slack authorization page

2025-10-30 10:15:45 INFO slack_integration 🔄 Exchanging authorization code for access token...
2025-10-30 10:15:46 INFO slack_integration ✅ Successfully obtained access token
2025-10-30 10:15:46 INFO slack_integration    Workspace: My Company (T12345678)
2025-10-30 10:15:46 INFO slack_integration    Bot User ID: U98765432
2025-10-30 10:15:46 INFO slack_integration    Authorized User: U11111111

2025-10-30 10:15:46 INFO slack_integration 🔄 Fetching additional workspace details...
2025-10-30 10:15:47 INFO slack_integration    Workspace URL: mycompany.slack.com

2025-10-30 10:15:47 INFO slack_integration 💾 Saving Slack account to database...
2025-10-30 10:15:47 INFO slack_integration ✅ Slack account created successfully!
2025-10-30 10:15:47 INFO slack_integration    Workspace ID: T12345678
2025-10-30 10:15:47 INFO slack_integration    Workspace Name: My Company
2025-10-30 10:15:47 INFO slack_integration    Workspace URL: mycompany.slack.com
2025-10-30 10:15:47 INFO slack_integration    Bot User ID: U98765432
2025-10-30 10:15:47 INFO slack_integration    Client Account: 1
2025-10-30 10:15:47 INFO slack_integration    Action: CREATED
```

### User Denies Authorization

```log
2025-10-30 10:20:15 ERROR slack_integration ❌ Slack OAuth Error: User denied authorization - access_denied
```

### Invalid Authorization Code

```log
2025-10-30 10:22:30 INFO slack_integration 🔄 Exchanging authorization code for access token...
2025-10-30 10:22:31 ERROR slack_integration ❌ Slack OAuth token exchange failed: invalid_code
2025-10-30 10:22:31 ERROR slack_integration    Full response: {'ok': False, 'error': 'invalid_code'}
```

### Missing Required Data

```log
2025-10-30 10:25:00 INFO slack_integration 🔄 Exchanging authorization code for access token...
2025-10-30 10:25:01 INFO slack_integration ✅ Successfully obtained access token
2025-10-30 10:25:01 ERROR slack_integration ❌ Missing required data in Slack OAuth response
2025-10-30 10:25:01 ERROR slack_integration    Access Token: Present
2025-10-30 10:25:01 ERROR slack_integration    Workspace ID: Missing
2025-10-30 10:25:01 ERROR slack_integration    Workspace Name: Missing
```

### Network Error

```log
2025-10-30 10:30:00 INFO slack_integration 🔄 Exchanging authorization code for access token...
2025-10-30 10:30:10 ERROR slack_integration ❌ Network error during Slack OAuth: Connection timeout
Traceback (most recent call last):
  ...
```

### Team Info API Warning

```log
2025-10-30 10:35:00 INFO slack_integration 🔄 Fetching additional workspace details...
2025-10-30 10:35:01 WARNING slack_integration ⚠️  Could not fetch team.info: missing_scope
2025-10-30 10:35:01 WARNING slack_integration    Continuing without workspace URL
```

## Other Operations

### Listing Slack Accounts

```log
2025-10-30 11:00:00 INFO slack_integration 📋 Listing Slack accounts
2025-10-30 11:00:00 INFO slack_integration    Filtered by account_id: 1
2025-10-30 11:00:00 INFO slack_integration    Found 3 Slack account(s)
```

### Disconnecting Workspace

```log
2025-10-30 11:05:00 INFO slack_integration 🗑️  Attempting to disconnect Slack workspace: T12345678
2025-10-30 11:05:00 INFO slack_integration ✅ Slack workspace disconnected successfully
2025-10-30 11:05:00 INFO slack_integration    Workspace ID: T12345678
2025-10-30 11:05:00 INFO slack_integration    Workspace Name: My Company
```

### Workspace Not Found

```log
2025-10-30 11:10:00 INFO slack_integration 🗑️  Attempting to disconnect Slack workspace: T99999999
2025-10-30 11:10:00 WARNING slack_integration ⚠️  Slack workspace not found: T99999999
```

### Testing Configuration

```log
2025-10-30 11:15:00 INFO slack_integration 🔍 Testing Slack OAuth configuration
2025-10-30 11:15:00 INFO slack_integration    Client ID configured: True
2025-10-30 11:15:00 INFO slack_integration    Client Secret configured: True
2025-10-30 11:15:00 INFO slack_integration    Redirect URI: https://slack.onsync.ai/oauth/callback
```

## Viewing Logs

### Real-time Monitoring

```bash
# All logs (recommended)
tail -f /var/log/django/app.log | grep slack_integration

# Only errors
tail -f /var/log/django/app.log | grep -E "slack_integration.*(ERROR|❌)"

# Only successful authorizations
tail -f /var/log/django/app.log | grep -E "slack_integration.*✅.*created successfully"

# Using journalctl (if using systemd)
journalctl -u cronhooks-web -f | grep slack_integration
```

### Search Logs

```bash
# Find all OAuth attempts for a specific account
grep "Client Account ID: 1" /var/log/django/app.log

# Find all successful authorizations
grep "✅ Slack account created successfully" /var/log/django/app.log

# Find all failures
grep "❌" /var/log/django/app.log | grep slack_integration

# Find logs for specific workspace
grep "T12345678" /var/log/django/app.log
```

### Log Rotation

Ensure logs are rotated to prevent disk space issues:

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/django

# Add this content:
/var/log/django/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload cronhooks-web > /dev/null 2>&1 || true
    endscript
}
```

## API Responses

### Success Response

```json
{
  "success": true,
  "action": "created",
  "data": {
    "workspace_id": "T12345678",
    "workspace_name": "My Company",
    "workspace_url": "mycompany.slack.com",
    "bot_user_id": "U98765432",
    "client_account_id": 1
  },
  "message": "Slack workspace 'My Company' created successfully"
}
```

### Error Response

```json
{
  "success": false,
  "error": "access_denied",
  "message": "User denied authorization or authorization failed"
}
```

### Error Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| `access_denied` | User canceled authorization | User clicked "Cancel" on Slack page |
| `no_code` | No authorization code | Invalid callback URL or network issue |
| `invalid_code` | Code exchange failed | Code already used or expired |
| `missing_data` | Incomplete response | Slack API returned partial data |
| `network_error` | Connection failed | Slack API unreachable |
| `server_error` | Unexpected error | Bug in code or database issue |

## Monitoring Best Practices

### 1. Set Up Alerts

Monitor for repeated failures:

```bash
# Alert if > 5 OAuth errors in 1 hour
grep "❌.*Slack OAuth" /var/log/django/app.log | tail -100 | wc -l
```

### 2. Track Metrics

Count successful authorizations:

```bash
# Daily successful authorizations
grep "✅ Slack account created successfully" /var/log/django/app.log \
  | grep "$(date +%Y-%m-%d)" \
  | wc -l
```

### 3. Monitor Specific Accounts

```bash
# Track specific client account
grep "Client Account: 1" /var/log/django/app.log | tail -20
```

### 4. Check for Common Issues

```bash
# Check for missing scopes
grep "missing_scope" /var/log/django/app.log

# Check for network timeouts
grep "timeout" /var/log/django/app.log | grep slack_integration

# Check for database errors
grep "Database error" /var/log/django/app.log | grep slack_integration
```

## Debugging Tips

### Enable Django Debug Logging

Add to `settings.py`:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/app.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'slack_integration': {
            'handlers': ['file', 'console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
```

### Test Locally

```bash
# Run development server with verbose logging
python manage.py runserver --verbosity 2

# Watch logs in separate terminal
tail -f /path/to/logs/debug.log | grep slack_integration
```

### Verify Environment

```bash
# Check environment variables
python manage.py shell
>>> from django.conf import settings
>>> print(f"Client ID: {bool(settings.SLACK_CLIENT_ID)}")
>>> print(f"Client Secret: {bool(settings.SLACK_CLIENT_SECRET)}")
>>> print(f"Redirect URI: {settings.SLACK_REDIRECT_URI}")
```

## Integration with White-Labeled CRM

### Parsing Responses

Your CRM can parse the JSON responses:

```javascript
// Example: Handle OAuth callback in your CRM
fetch('https://slack.onsync.ai/oauth/callback?code=xxx&state=account_1')
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log(`Connected: ${data.data.workspace_name}`);
      console.log(`Action: ${data.action}`); // "created" or "updated"
      // Update your CRM database
      updateSlackConnection(data.data);
    } else {
      console.error(`Error: ${data.message}`);
      console.error(`Code: ${data.error}`);
      // Show error to user
      showError(data.message);
    }
  });
```

### Monitoring from CRM

```javascript
// Check connection status
fetch('https://slack.onsync.ai/accounts/?account_id=1', {
  headers: {
    'Authorization': 'Token YOUR_AUTH_TOKEN'
  }
})
  .then(response => response.json())
  .then(accounts => {
    console.log(`Found ${accounts.length} Slack connections`);
    accounts.forEach(acc => {
      console.log(`- ${acc.workspace_name} (${acc.workspace_id})`);
    });
  });
```

## Summary

- ✅ All OAuth events logged with emoji indicators
- ✅ Detailed information for troubleshooting
- ✅ JSON responses for programmatic handling
- ✅ Easy log searching and monitoring
- ✅ No frontend dependencies
- ✅ Works with any white-labeled CRM

Monitor your logs to track OAuth success rates, identify issues, and ensure smooth integration!
