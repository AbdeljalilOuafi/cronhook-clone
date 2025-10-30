"""
Admin configuration for Slack integration.
"""
from django.contrib import admin
from .models import SlackAccount


@admin.register(SlackAccount)
class SlackAccountAdmin(admin.ModelAdmin):
    """Admin interface for SlackAccount model."""
    
    list_display = [
        'workspace_id',
        'workspace_name',
        'workspace_url',
        'client_account',
        'onsync_bot_user_id',
        'created_at',
    ]
    
    list_filter = [
        'created_at',
        'client_account',
    ]
    
    search_fields = [
        'workspace_id',
        'workspace_name',
        'workspace_url',
    ]
    
    readonly_fields = [
        'workspace_id',
        'created_at',
        'updated_at',
    ]
    
    fieldsets = (
        ('Workspace Information', {
            'fields': ('workspace_id', 'workspace_name', 'workspace_url')
        }),
        ('Bot Configuration', {
            'fields': ('slack_access_token', 'onsync_bot_user_id')
        }),
        ('Account Association', {
            'fields': ('client_account',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        """Make workspace_id readonly only when editing existing object."""
        if obj:  # Editing existing object
            return self.readonly_fields
        return ['created_at', 'updated_at']  # Creating new object
