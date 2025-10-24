"""
Django admin configuration for webhooks.
"""
from django.contrib import admin
from .models import Webhook, WebhookExecution


@admin.register(Webhook)
class WebhookAdmin(admin.ModelAdmin):
    """Admin interface for Webhook model."""
    
    list_display = [
        'name', 'user', 'url', 'http_method', 'schedule_type', 
        'is_active', 'last_execution_at', 'created_at'
    ]
    list_filter = ['schedule_type', 'is_active', 'http_method', 'created_at']
    search_fields = ['name', 'url', 'user__username']
    readonly_fields = [
        'celery_task_id', 'celery_periodic_task_id', 
        'last_execution_at', 'created_at', 'updated_at'
    ]
    
    fieldsets = [
        ('Basic Information', {
            'fields': ['user', 'name', 'url', 'http_method']
        }),
        ('Request Configuration', {
            'fields': ['headers', 'payload', 'timeout']
        }),
        ('Schedule', {
            'fields': ['schedule_type', 'cron_expression', 'scheduled_at', 'timezone', 'is_active']
        }),
        ('Retry Settings', {
            'fields': ['max_retries', 'retry_delay']
        }),
        ('System Fields', {
            'fields': [
                'celery_task_id', 'celery_periodic_task_id', 
                'last_execution_at', 'created_at', 'updated_at'
            ],
            'classes': ['collapse']
        }),
    ]
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related('user')


@admin.register(WebhookExecution)
class WebhookExecutionAdmin(admin.ModelAdmin):
    """Admin interface for WebhookExecution model."""
    
    list_display = [
        'webhook', 'status', 'response_code', 
        'attempt_number', 'executed_at'
    ]
    list_filter = ['status', 'executed_at']
    search_fields = ['webhook__name', 'error_message']
    readonly_fields = [
        'webhook', 'status', 'response_code', 'response_body',
        'error_message', 'attempt_number', 'executed_at'
    ]
    
    fieldsets = [
        ('Execution Info', {
            'fields': ['webhook', 'status', 'attempt_number', 'executed_at']
        }),
        ('Response', {
            'fields': ['response_code', 'response_body']
        }),
        ('Error Details', {
            'fields': ['error_message'],
            'classes': ['collapse']
        }),
    ]
    
    def has_add_permission(self, request):
        """Prevent manual creation of executions."""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Make executions read-only."""
        return False
    
    def get_queryset(self, request):
        """Optimize queries."""
        return super().get_queryset(request).select_related('webhook', 'webhook__user')
