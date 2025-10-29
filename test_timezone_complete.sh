#!/bin/bash

# Complete timezone functionality test
TOKEN="82b8cb7e761b8530a19d75f758950de84a3f3e88"
BASE_URL="http://localhost:8000"

echo "=== Complete Timezone Functionality Test ==="
echo ""

# Test 1: One-time webhook with Tokyo timezone
echo "1. Creating one-time webhook with Asia/Tokyo timezone..."
echo "   Scheduled for 2025-10-30 10:00 AM Tokyo time"
curl -X POST "$BASE_URL/api/webhooks/" \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tokyo Morning Webhook",
    "url": "https://webhook.site/tokyo-test",
    "http_method": "POST",
    "schedule_type": "once",
    "scheduled_at": "2025-10-30T10:00:00",
    "timezone": "Asia/Tokyo",
    "payload": {"city": "Tokyo", "time": "10:00 AM"}
  }' | python3 -m json.tool

echo -e "\n\n"

# Test 2: One-time webhook with Los Angeles timezone  
echo "2. Creating one-time webhook with America/Los_Angeles timezone..."
echo "   Scheduled for 2025-10-30 3:00 PM LA time"
curl -X POST "$BASE_URL/api/webhooks/" \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "LA Afternoon Webhook",
    "url": "https://webhook.site/la-test",
    "http_method": "POST",
    "schedule_type": "once",
    "scheduled_at": "2025-10-30T15:00:00",
    "timezone": "America/Los_Angeles",
    "payload": {"city": "Los Angeles", "time": "3:00 PM"}
  }' | python3 -m json.tool

echo -e "\n\n"

# Test 3: Recurring webhook with London timezone
echo "3. Creating recurring webhook with Europe/London timezone..."
echo "   Cron: 0 8 * * * (8 AM every day London time)"
curl -X POST "$BASE_URL/api/webhooks/" \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "London Morning Report",
    "url": "https://webhook.site/london-daily",
    "http_method": "POST",
    "schedule_type": "recurring",
    "cron_expression": "0 8 * * *",
    "timezone": "Europe/London",
    "payload": {"city": "London", "report": "daily"}
  }' | python3 -m json.tool

echo -e "\n\n"

# Test 4: Update a webhook with different timezone
echo "4. Updating webhook timezone (will update the first test webhook)..."
WEBHOOK_ID=$(curl -s -X GET "$BASE_URL/api/webhooks/" \
  -H "Authorization: Token $TOKEN" | python3 -c "import sys, json; webhooks = json.load(sys.stdin)['results']; print([w['id'] for w in webhooks if 'Tokyo' in w['name']][0])")

echo "   Changing Tokyo webhook to use Australia/Sydney timezone..."
curl -X PUT "$BASE_URL/api/webhooks/$WEBHOOK_ID/" \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sydney Morning Webhook (Updated)",
    "url": "https://webhook.site/sydney-test",
    "http_method": "POST",
    "schedule_type": "once",
    "scheduled_at": "2025-10-30T10:00:00",
    "timezone": "Australia/Sydney",
    "payload": {"city": "Sydney", "time": "10:00 AM"}
  }' | python3 -m json.tool

echo -e "\n\n"

echo "=== Verification ==="
echo "Now checking if the webhooks were scheduled correctly..."
echo ""

python3 << 'PYTHON_SCRIPT'
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from webhooks.models import Webhook
from django_celery_beat.models import PeriodicTask

print("Recent timezone webhooks:\n")
webhooks = Webhook.objects.filter(name__icontains='webhook').order_by('-created_at')[:4]

for webhook in webhooks:
    print(f"{'='*60}")
    print(f"Name: {webhook.name}")
    print(f"Timezone: {webhook.timezone}")
    print(f"Schedule Type: {webhook.schedule_type}")
    
    if webhook.schedule_type == 'once':
        print(f"Scheduled At (UTC): {webhook.scheduled_at}")
        print(f"Celery Task ID: {webhook.celery_task_id}")
    else:
        print(f"Cron Expression: {webhook.cron_expression}")
        if webhook.celery_periodic_task_id:
            try:
                pt = PeriodicTask.objects.get(id=webhook.celery_periodic_task_id)
                print(f"Crontab Timezone: {pt.crontab.timezone}")
            except:
                pass
    print()

print(f"{'='*60}")
print("\n✅ Timezone functionality test complete!")
PYTHON_SCRIPT

echo -e "\n\nAll tests completed!"
