"""
Models for webhook scheduling and execution tracking.
"""
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import URLValidator
from django.utils import timezone


class Account(models.Model):
    """
    Represents a client/company account for multi-tenancy support.
    Maps to the existing 'accounts' table in the database.
    """
    name = models.CharField(max_length=255)
    email = models.EmailField(max_length=255, unique=True, null=True, blank=True)
    ceo_name = models.CharField(max_length=255, null=True, blank=True)
    niche = models.CharField(max_length=255, null=True, blank=True)
    location = models.TextField(null=True, blank=True)
    stripe_api_key = models.TextField(null=True, blank=True)
    trz_api_key = models.TextField(null=True, blank=True)  # Fixed field name
    domain_name_main = models.CharField(max_length=255, null=True, blank=True)
    website_url = models.CharField(max_length=255, null=True, blank=True)
    date_joined = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    trz_group_id = models.IntegerField(null=True, blank=True, unique=True)
    trz_admin_user_id = models.IntegerField(null=True, blank=True, unique=True)

    class Meta:
        db_table = 'accounts'  # Use existing table
        ordering = ['name']

    def __str__(self):
        return self.name


class WebhookFolder(models.Model):
    """
    Organize webhooks into folders for better management.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='webhook_folders')
    account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='webhook_folders',
        null=True,
        blank=True,
        help_text="Account this folder belongs to (for multi-tenancy)"
    )
    name = models.CharField(max_length=100, help_text="Folder name")
    description = models.TextField(blank=True, help_text="Optional folder description")
    color = models.CharField(max_length=7, default='#6366f1', help_text="Hex color code")
    icon = models.CharField(max_length=50, blank=True, help_text="Icon name (lucide-react)")
    parent = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='subfolders',
        help_text="Parent folder for nested organization"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        unique_together = [['user', 'name', 'parent']]
        indexes = [
            models.Index(fields=['user', 'parent']),
        ]
    
    def __str__(self):
        return self.full_path
    
    @property
    def webhook_count(self):
        """Count webhooks in this folder (excluding subfolders)"""
        return self.webhooks.count()
    
    @property
    def total_webhook_count(self):
        """Count webhooks in this folder and all subfolders"""
        count = self.webhooks.count()
        for subfolder in self.subfolders.all():
            count += subfolder.total_webhook_count
        return count
    
    @property
    def full_path(self):
        """Get full folder path: 'Parent / Child / Grandchild'"""
        if self.parent:
            return f"{self.parent.full_path} / {self.name}"
        return self.name


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
    account = models.ForeignKey(
        'Account',
        on_delete=models.CASCADE,
        related_name='webhooks',
        null=True,
        blank=True,
        help_text="Account this webhook belongs to (for multi-tenancy)"
    )
    
    # Organization
    folder = models.ForeignKey(
        WebhookFolder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='webhooks',
        help_text="Optional folder for organization"
    )
    
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
    
    @property
    def execution_count(self):
        """Count total executions for this webhook"""
        return self.executions.count()
    
    @property
    def last_execution_status(self):
        """Get status of the most recent execution"""
        last_exec = self.executions.first()
        return last_exec.status if last_exec else None
    
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
