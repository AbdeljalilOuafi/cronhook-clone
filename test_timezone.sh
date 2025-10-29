#!/bin/bash

# Test timezone support for webhook creation
TOKEN="82b8cb7e761b8530a19d75f758950de84a3f3e88"
BASE_URL="http://localhost:8000"

echo "=== Testing Webhook Creation with Timezone ==="
echo ""

# Test 1: Create a one-time webhook with America/New_York timezone
echo "1. Creating one-time webhook with America/New_York timezone..."
curl -X POST "$BASE_URL/api/webhooks/" \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Timezone Webhook",
    "url": "https://webhook.site/test",
    "http_method": "POST",
    "schedule_type": "once",
    "scheduled_at": "2025-10-30T15:00:00Z",
    "timezone": "America/New_York",
    "payload": {"test": "timezone_test"}
  }' | python3 -m json.tool

echo -e "\n\n"

# Test 2: Create recurring webhook with Europe/Paris timezone
echo "2. Creating recurring webhook with Europe/Paris timezone..."
curl -X POST "$BASE_URL/api/webhooks/" \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Recurring Timezone Webhook",
    "url": "https://webhook.site/test-recurring",
    "http_method": "POST",
    "schedule_type": "recurring",
    "cron_expression": "0 9 * * *",
    "timezone": "Europe/Paris",
    "payload": {"test": "recurring_timezone"}
  }' | python3 -m json.tool

echo -e "\n\n"
s to verify timezone is saved
echo "3. Listing webhooks to verify timezone..."
curl -X GET "$BASE_URL/api/webhooks/" \
  -H "Authorization: Token $TOKEN" | python3 -m json.tool

# Test 3: Get the created webhook
echo -e "\n\nTests completed!"
