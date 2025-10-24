"""
Models for webhook scheduling and execution tracking.
"""
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import URLValidator
from django.utils import timezone


class Webhook(models.Model):
    """
    Represents a scheduled webhook that can be triggered once or repeatedly.
    """
    
    HTTP_METHODS = [
        ('GET', 'GET'),
        ('POST', 'POST'),
        ('PUT', 'PUT'),
        ('PATCH', 'PATCH'),
        ('DELETE', 'DELETE'),
    ]
    
    SCHEDULE_TYPES = [
        ('once', 'One-time'),
        ('recurring', 'Recurring'),
    ]
    
    # Ownership
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='webhooks')
    
    # Basic info
    name = models.CharField(max_length=255, help_text="Descriptive name for the webhook")
    url = models.URLField(max_length=2048, validators=[URLValidator()], help_text="Target endpoint URL")
    http_method = models.CharField(max_length=10, choices=HTTP_METHODS, default='POST')
    
    # Request configuration
    headers = models.JSONField(default=dict, blank=True, help_text="Custom HTTP headers as JSON")
    payload = models.JSONField(default=dict, blank=True, help_text="Request body as JSON")
    
    # Scheduling
    schedule_type = models.CharField(max_length=20, choices=SCHEDULE_TYPES)
    cron_expression = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        help_text="Cron expression for recurring webhooks (e.g., '*/5 * * * *')"
    )
    scheduled_at = models.DateTimeField(
        blank=True, 
        null=True,
        help_text="Scheduled datetime for one-time webhooks (UTC)"
    )
    timezone = models.CharField(max_length=50, default='UTC', help_text="User's timezone")
    
    # Status
    is_active = models.BooleanField(default=True, help_text="Whether the webhook is enabled")
    
    # Retry configuration
    max_retries = models.IntegerField(default=3, help_text="Maximum retry attempts on failure")
    retry_delay = models.IntegerField(default=60, help_text="Seconds between retries")
    timeout = models.IntegerField(default=30, help_text="Request timeout in seconds")
    
    # Celery integration
    celery_task_id = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        help_text="Celery task ID for one-time webhooks"
    )
    celery_periodic_task_id = models.IntegerField(
        blank=True, 
        null=True,
        help_text="ID of PeriodicTask for recurring webhooks"
    )
    
    # Timestamps
    last_execution_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['schedule_type']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_schedule_type_display()})"
    
    def clean(self):
        """Validate model constraints."""
        from django.core.exceptions import ValidationError
        
        if self.schedule_type == 'once' and not self.scheduled_at:
            raise ValidationError("One-time webhooks must have a scheduled_at datetime")
        
        if self.schedule_type == 'recurring' and not self.cron_expression:
            raise ValidationError("Recurring webhooks must have a cron_expression")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class WebhookExecution(models.Model):
    """
    Tracks each execution attempt of a webhook.
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('retrying', 'Retrying'),
    ]
    
    webhook = models.ForeignKey(Webhook, on_delete=models.CASCADE, related_name='executions')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Response data
    response_code = models.IntegerField(blank=True, null=True, help_text="HTTP status code")
    response_body = models.TextField(blank=True, help_text="Response content")
    error_message = models.TextField(blank=True, help_text="Error details if failed")
    
    # Retry tracking
    attempt_number = models.IntegerField(default=1, help_text="Current attempt number")
    
    # Timestamp
    executed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-executed_at']
        indexes = [
            models.Index(fields=['webhook', '-executed_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.webhook.name} - {self.status} (Attempt {self.attempt_number})"
