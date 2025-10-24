"""
Celery tasks for webhook execution and scheduling.
"""
import httpx
import logging
from datetime import timedelta
from celery import shared_task
from django.utils import timezone
from django.conf import settings
from django_celery_beat.models import PeriodicTask, CrontabSchedule
import json

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=None)
def execute_webhook(self, webhook_id, attempt_number=1):
    """
    Execute a webhook by making HTTP request to the target URL.
    """
    from .models import Webhook, WebhookExecution
    
    try:
        webhook = Webhook.objects.get(id=webhook_id, is_active=True)
    except Webhook.DoesNotExist:
        logger.warning(f"Webhook {webhook_id} not found or inactive")
        return
    
    # Create execution record
    execution = WebhookExecution.objects.create(
        webhook=webhook,
        status='pending',
        attempt_number=attempt_number
    )
    
    try:
        # Prepare request
        headers = webhook.headers or {}
        headers.setdefault('Content-Type', 'application/json')
        headers.setdefault('User-Agent', 'CronHooks/1.0')
        
        # Make HTTP request
        logger.info(f"Executing webhook {webhook.name} (ID: {webhook_id}), attempt {attempt_number}")
        
        with httpx.Client(timeout=webhook.timeout) as client:
            response = client.request(
                method=webhook.http_method,
                url=webhook.url,
                headers=headers,
                json=webhook.payload if webhook.payload else None
            )
        
        # Update execution record
        execution.status = 'success' if response.is_success else 'failed'
        execution.response_code = response.status_code
        execution.response_body = response.text[:10000]  # Limit to 10KB
        execution.save()
        
        # Update webhook last execution time
        webhook.last_execution_at = timezone.now()
        webhook.save(update_fields=['last_execution_at'])
        
        if response.is_success:
            logger.info(f"Webhook {webhook.name} executed successfully: {response.status_code}")
        else:
            logger.warning(f"Webhook {webhook.name} failed with status {response.status_code}")
            
            # Retry if attempts remaining
            if attempt_number < webhook.max_retries:
                execution.status = 'retrying'
                execution.save()
                
                # Calculate exponential backoff
                delay = webhook.retry_delay * (2 ** (attempt_number - 1))
                
                logger.info(f"Retrying webhook {webhook.name} in {delay} seconds")
                self.apply_async(
                    args=[webhook_id, attempt_number + 1],
                    countdown=delay
                )
        
        return {
            'status': execution.status,
            'response_code': response.status_code,
            'attempt': attempt_number
        }
        
    except httpx.TimeoutException as e:
        logger.error(f"Webhook {webhook.name} timed out: {str(e)}")
        execution.status = 'failed'
        execution.error_message = f"Request timed out after {webhook.timeout} seconds"
        execution.save()
        
        # Retry if attempts remaining
        if attempt_number < webhook.max_retries:
            execution.status = 'retrying'
            execution.save()
            
            delay = webhook.retry_delay * (2 ** (attempt_number - 1))
            self.apply_async(
                args=[webhook_id, attempt_number + 1],
                countdown=delay
            )
        
    except Exception as e:
        logger.error(f"Webhook {webhook.name} execution error: {str(e)}", exc_info=True)
        execution.status = 'failed'
        execution.error_message = str(e)[:1000]
        execution.save()
        
        # Retry if attempts remaining
        if attempt_number < webhook.max_retries:
            execution.status = 'retrying'
            execution.save()
            
            delay = webhook.retry_delay * (2 ** (attempt_number - 1))
            self.apply_async(
                args=[webhook_id, attempt_number + 1],
                countdown=delay
            )


def schedule_webhook(webhook_id):
    """
    Schedule a webhook based on its type (one-time or recurring).
    """
    from .models import Webhook
    
    try:
        webhook = Webhook.objects.get(id=webhook_id)
    except Webhook.DoesNotExist:
        logger.error(f"Cannot schedule webhook {webhook_id}: not found")
        return
    
    if webhook.schedule_type == 'once':
        # Schedule one-time task
        eta = webhook.scheduled_at
        if eta and eta > timezone.now():
            result = execute_webhook.apply_async(
                args=[webhook_id],
                eta=eta
            )
            
            # Store task ID for cancellation
            webhook.celery_task_id = result.id
            webhook.save(update_fields=['celery_task_id'])
            
            logger.info(f"Scheduled one-time webhook {webhook.name} for {eta}")
        else:
            logger.warning(f"Cannot schedule webhook {webhook.name}: scheduled time is in the past")
    
    elif webhook.schedule_type == 'recurring':
        # Parse cron expression
        from croniter import croniter
        
        try:
            cron_parts = webhook.cron_expression.split()
            if len(cron_parts) != 5:
                raise ValueError("Cron expression must have 5 fields")
            
            minute, hour, day_of_month, month, day_of_week = cron_parts
            
            # Create or get crontab schedule
            schedule, created = CrontabSchedule.objects.get_or_create(
                minute=minute,
                hour=hour,
                day_of_week=day_of_week,
                day_of_month=day_of_month,
                month_of_year=month,
                timezone=webhook.timezone
            )
            
            # Create or update periodic task
            periodic_task, created = PeriodicTask.objects.update_or_create(
                name=f'webhook_{webhook.id}_{webhook.name}',
                defaults={
                    'crontab': schedule,
                    'task': 'webhooks.tasks.execute_webhook',
                    'args': json.dumps([webhook_id]),
                    'enabled': webhook.is_active,
                }
            )
            
            # Store periodic task ID
            webhook.celery_periodic_task_id = periodic_task.id
            webhook.save(update_fields=['celery_periodic_task_id'])
            
            logger.info(f"Scheduled recurring webhook {webhook.name} with cron: {webhook.cron_expression}")
            
        except Exception as e:
            logger.error(f"Failed to schedule recurring webhook {webhook.name}: {str(e)}")


def cancel_webhook_schedule(webhook_id):
    """
    Cancel scheduled webhook execution.
    """
    from .models import Webhook
    from celery import current_app
    
    try:
        webhook = Webhook.objects.get(id=webhook_id)
    except Webhook.DoesNotExist:
        logger.error(f"Cannot cancel webhook {webhook_id}: not found")
        return
    
    if webhook.schedule_type == 'once' and webhook.celery_task_id:
        # Revoke one-time task
        try:
            current_app.control.revoke(webhook.celery_task_id, terminate=True)
            logger.info(f"Revoked one-time task for webhook {webhook.name}")
        except Exception as e:
            logger.warning(f"Failed to revoke task {webhook.celery_task_id}: {str(e)}")
    
    elif webhook.schedule_type == 'recurring' and webhook.celery_periodic_task_id:
        # Disable or delete periodic task
        try:
            PeriodicTask.objects.filter(id=webhook.celery_periodic_task_id).update(enabled=False)
            logger.info(f"Disabled periodic task for webhook {webhook.name}")
        except Exception as e:
            logger.warning(f"Failed to disable periodic task: {str(e)}")
    
    # Mark webhook as inactive
    webhook.is_active = False
    webhook.save(update_fields=['is_active'])
