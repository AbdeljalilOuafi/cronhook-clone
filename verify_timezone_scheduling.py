#!/usr/bin/env python
"""Verify that webhooks are scheduled with correct timezones."""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from webhooks.models import Webhook
from django_celery_beat.models import PeriodicTask, CrontabSchedule

print("=== Verifying Timezone Scheduling ===\n")

# Get the test webhooks
webhooks = Webhook.objects.filter(name__icontains='timezone').order_by('-created_at')[:2]

for webhook in webhooks:
    print(f"\n{'='*60}")
    print(f"Webhook: {webhook.name}")
    print(f"Schedule Type: {webhook.schedule_type}")
    print(f"Timezone: {webhook.timezone}")
    print(f"Active: {webhook.is_active}")
    
    if webhook.schedule_type == 'recurring':
        print(f"Cron Expression: {webhook.cron_expression}")
        print(f"Periodic Task ID: {webhook.celery_periodic_task_id}")
        
        if webhook.celery_periodic_task_id:
            try:
                periodic_task = PeriodicTask.objects.get(id=webhook.celery_periodic_task_id)
                print(f"\nPeriodicTask Found:")
                print(f"  - Name: {periodic_task.name}")
                print(f"  - Enabled: {periodic_task.enabled}")
                print(f"  - Crontab ID: {periodic_task.crontab_id}")
                
                if periodic_task.crontab:
                    crontab = periodic_task.crontab
                    print(f"\nCrontabSchedule:")
                    print(f"  - Minute: {crontab.minute}")
                    print(f"  - Hour: {crontab.hour}")
                    print(f"  - Day of Week: {crontab.day_of_week}")
                    print(f"  - Day of Month: {crontab.day_of_month}")
                    print(f"  - Month of Year: {crontab.month_of_year}")
                    print(f"  - TIMEZONE: {crontab.timezone}")
                    print(f"\n  ✅ Timezone correctly set to: {crontab.timezone}")
            except PeriodicTask.DoesNotExist:
                print(f"  ❌ PeriodicTask {webhook.celery_periodic_task_id} not found!")
    
    elif webhook.schedule_type == 'once':
        print(f"Scheduled At (UTC): {webhook.scheduled_at}")
        print(f"Celery Task ID: {webhook.celery_task_id}")
        if webhook.celery_task_id:
            print(f"  ✅ One-time task scheduled with ID: {webhook.celery_task_id}")

print(f"\n{'='*60}\n")
print("Verification complete!")
