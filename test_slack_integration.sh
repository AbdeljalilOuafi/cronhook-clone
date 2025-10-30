#!/bin/bash

# Slack OAuth Integration Test Script
# This script helps verify the Slack OAuth integration is set up correctly

echo "=================================="
echo "Slack OAuth Integration Test"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
echo "1. Checking environment configuration..."
if [ ! -f .env ]; then
    echo -e "${RED}✗ .env file not found${NC}"
    echo "  Create .env file and add Slack credentials"
    exit 1
fi

# Check for Slack environment variables
if grep -q "SLACK_CLIENT_ID" .env && grep -q "SLACK_CLIENT_SECRET" .env; then
    echo -e "${GREEN}✓ Slack environment variables found in .env${NC}"
else
    echo -e "${RED}✗ Slack environment variables missing${NC}"
    echo "  Add SLACK_CLIENT_ID and SLACK_CLIENT_SECRET to .env"
    exit 1
fi

# Check if slack_integration app is in INSTALLED_APPS
echo ""
echo "2. Checking Django configuration..."
if grep -q "slack_integration" config/settings.py; then
    echo -e "${GREEN}✓ slack_integration app is installed${NC}"
else
    echo -e "${RED}✗ slack_integration not in INSTALLED_APPS${NC}"
    echo "  Add 'slack_integration' to INSTALLED_APPS in settings.py"
    exit 1
fi

# Check if migrations exist
echo ""
echo "3. Checking migrations..."
if [ -f slack_integration/migrations/0001_initial.py ]; then
    echo -e "${GREEN}✓ Migration file exists${NC}"
else
    echo -e "${YELLOW}⚠ Migration file not found${NC}"
    echo "  Run: python manage.py makemigrations slack_integration"
fi

# Check if DNS is configured
echo ""
echo "4. Checking DNS configuration..."
if command -v dig &> /dev/null; then
    DNS_RESULT=$(dig +short slack.onsync.ai)
    if [ -n "$DNS_RESULT" ]; then
        echo -e "${GREEN}✓ DNS configured: slack.onsync.ai → $DNS_RESULT${NC}"
    else
        echo -e "${YELLOW}⚠ DNS not configured for slack.onsync.ai${NC}"
        echo "  Add A record: slack → YOUR_SERVER_IP"
    fi
else
    echo -e "${YELLOW}⚠ dig command not found, skipping DNS check${NC}"
fi

# Check if Nginx configuration exists
echo ""
echo "5. Checking Nginx configuration..."
if [ -f /etc/nginx/sites-available/slack.onsync.ai ]; then
    echo -e "${GREEN}✓ Nginx configuration file exists${NC}"
    if [ -L /etc/nginx/sites-enabled/slack.onsync.ai ]; then
        echo -e "${GREEN}✓ Nginx site is enabled${NC}"
    else
        echo -e "${YELLOW}⚠ Nginx site not enabled${NC}"
        echo "  Run: sudo ln -s /etc/nginx/sites-available/slack.onsync.ai /etc/nginx/sites-enabled/"
    fi
else
    echo -e "${YELLOW}⚠ Nginx configuration not found${NC}"
    echo "  Create /etc/nginx/sites-available/slack.onsync.ai"
fi

# Check SSL certificate
echo ""
echo "6. Checking SSL certificate..."
if [ -f /etc/letsencrypt/live/slack.onsync.ai/fullchain.pem ]; then
    echo -e "${GREEN}✓ SSL certificate exists${NC}"
else
    echo -e "${YELLOW}⚠ SSL certificate not found${NC}"
    echo "  Run: sudo certbot --nginx -d slack.onsync.ai"
fi

# Test Django server is running
echo ""
echo "7. Testing Django server..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/oauth/test 2>/dev/null | grep -q "200\|302"; then
    echo -e "${GREEN}✓ Django server is running${NC}"
else
    echo -e "${YELLOW}⚠ Django server not responding${NC}"
    echo "  Start server: python manage.py runserver"
fi

# Test OAuth endpoint (if server is running)
echo ""
echo "8. Testing OAuth configuration endpoint..."
RESPONSE=$(curl -s http://localhost:8000/oauth/test 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ OAuth test endpoint accessible${NC}"
    echo "  Response: $RESPONSE"
else
    echo -e "${YELLOW}⚠ Could not reach OAuth test endpoint${NC}"
fi

# Check database table
echo ""
echo "9. Checking database..."
if command -v python &> /dev/null || command -v python3 &> /dev/null; then
    PYTHON_CMD=$(command -v python3 || command -v python)
    TABLE_CHECK=$($PYTHON_CMD manage.py shell -c "
from django.db import connection
cursor = connection.cursor()
cursor.execute(\"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='slack_accounts')\")
print(cursor.fetchone()[0])
" 2>/dev/null)
    
    if [ "$TABLE_CHECK" = "True" ]; then
        echo -e "${GREEN}✓ slack_accounts table exists${NC}"
    else
        echo -e "${YELLOW}⚠ slack_accounts table not found${NC}"
        echo "  Run: python manage.py migrate slack_integration"
    fi
else
    echo -e "${YELLOW}⚠ Python not found, skipping database check${NC}"
fi

# Summary
echo ""
echo "=================================="
echo "Test Summary"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. If any checks failed, follow the instructions above"
echo "2. Make sure Django server is running"
echo "3. Configure Slack app redirect URI: https://slack.onsync.ai/oauth/callback"
echo "4. Test OAuth flow: https://slack.onsync.ai/oauth/install?account_id=1"
echo ""
echo "For detailed setup instructions, see:"
echo "- SLACK_INTEGRATION_SETUP.md (quick setup)"
echo "- SLACK_OAUTH_INTEGRATION.md (full documentation)"
echo ""
