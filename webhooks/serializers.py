"""
Serializers for webhook API endpoints.
"""
from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from croniter import croniter
from .models import Webhook, WebhookExecution, WebhookFolder, Account


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_superuser']
        read_only_fields = ['id', 'username', 'email', 'is_superuser']


class AccountSerializer(serializers.ModelSerializer):
    """Serializer for Account model."""
    
    class Meta:
        model = Account
        fields = [
            'id', 'name', 'email', 'ceo_name', 'niche', 'location',
            'domain_name_main', 'website_url', 'date_joined',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class WebhookFolderSerializer(serializers.ModelSerializer):
    """Serializer for webhook folders."""
    
    webhook_count = serializers.ReadOnlyField()
    total_webhook_count = serializers.ReadOnlyField()
    full_path = serializers.ReadOnlyField()
    subfolders = serializers.SerializerMethodField()
    
    class Meta:
        model = WebhookFolder
        fields = [
            'id', 'name', 'description', 'color', 'icon', 
            'parent', 'account', 'webhook_count', 'total_webhook_count', 
            'full_path', 'subfolders', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_subfolders(self, obj):
        """Get immediate subfolders (not recursive)."""
        subfolders = obj.subfolders.all()
        return WebhookFolderSerializer(subfolders, many=True, context=self.context).data
    
    def create(self, validated_data):
        """Create folder and set user from request context."""
        validated_data['user'] = self.context['request'].user
        # Keep the account field if provided in the data
        return super().create(validated_data)
    
    def validate(self, data):
        """Validate folder constraints."""
        # Check for circular references in parent-child relationship
        parent = data.get('parent')
        if parent and self.instance:
            # Check if trying to set parent to self or a descendant
            current = parent
            while current:
                if current.id == self.instance.id:
                    raise serializers.ValidationError({
                        'parent': 'Cannot create circular folder references'
                    })
                current = current.parent
        
        return data


class WebhookExecutionSerializer(serializers.ModelSerializer):
    """Serializer for webhook execution history."""
    
    class Meta:
        model = WebhookExecution
        fields = [
            'id', 'status', 'response_code', 'response_body', 
            'error_message', 'attempt_number', 'executed_at'
        ]
        read_only_fields = fields


class WebhookSerializer(serializers.ModelSerializer):
    """Serializer for webhook CRUD operations."""
    
    execution_count = serializers.SerializerMethodField()
    last_execution_status = serializers.SerializerMethodField()
    folder_name = serializers.CharField(source='folder.name', read_only=True)
    folder_color = serializers.CharField(source='folder.color', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    account_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = Webhook
        fields = [
            'id', 'name', 'url', 'http_method', 'headers', 'payload',
            'schedule_type', 'cron_expression', 'scheduled_at', 'timezone',
            'is_active', 'max_retries', 'retry_delay', 'timeout',
            'folder', 'folder_name', 'folder_color',
            'account', 'account_name', 'account_id',
            'last_execution_at', 'execution_count', 'last_execution_status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['last_execution_at', 'created_at', 'updated_at']
    
    def get_execution_count(self, obj):
        """Get total number of executions."""
        return obj.executions.count()
    
    def get_last_execution_status(self, obj):
        """Get status of last execution."""
        last_execution = obj.executions.first()
        return last_execution.status if last_execution else None
    
    def validate_cron_expression(self, value):
        """Validate cron expression syntax."""
        if value:
            try:
                croniter(value)
            except Exception as e:
                raise serializers.ValidationError(f"Invalid cron expression: {str(e)}")
        return value
    
    def validate_timezone(self, value):
        """Validate timezone string."""
        if value:
            import pytz
            try:
                pytz.timezone(value)
            except pytz.exceptions.UnknownTimeZoneError:
                raise serializers.ValidationError(f"Invalid timezone: {value}")
        return value
    
    def validate_scheduled_at(self, value):
        """Validate scheduled datetime is in the future."""
        if value and value <= timezone.now():
            raise serializers.ValidationError("Scheduled time must be in the future")
        return value
    
    def validate(self, data):
        """Cross-field validation."""
        schedule_type = data.get('schedule_type')
        
        # Validate one-time webhooks
        if schedule_type == 'once':
            if not data.get('scheduled_at'):
                raise serializers.ValidationError({
                    'scheduled_at': 'This field is required for one-time webhooks'
                })
            if data.get('cron_expression'):
                raise serializers.ValidationError({
                    'cron_expression': 'Cron expression should not be set for one-time webhooks'
                })
        
        # Validate recurring webhooks
        elif schedule_type == 'recurring':
            if not data.get('cron_expression'):
                raise serializers.ValidationError({
                    'cron_expression': 'This field is required for recurring webhooks'
                })
            if data.get('scheduled_at'):
                raise serializers.ValidationError({
                    'scheduled_at': 'Scheduled time should not be set for recurring webhooks'
                })
        
        return data
    
    def create(self, validated_data):
        """Create webhook and schedule task."""
        # Set user from request context
        validated_data['user'] = self.context['request'].user
        
        # Handle account_id from request body
        account_id = validated_data.pop('account_id', None)
        if account_id:
            validated_data['account_id'] = account_id
        elif 'account' not in validated_data:
            # Fallback: check if user is acting on behalf of an account
            # (stored in request session/context for superusers)
            request = self.context.get('request')
            if request and hasattr(request, 'selected_account_id'):
                validated_data['account_id'] = request.selected_account_id
        
        webhook = super().create(validated_data)
        
        # Schedule the webhook
        from .tasks import schedule_webhook
        schedule_webhook(webhook.id)
        
        return webhook
    
    def update(self, instance, validated_data):
        """Update webhook and reschedule if needed."""
        # Handle account_id from request body
        account_id = validated_data.pop('account_id', None)
        if account_id:
            validated_data['account_id'] = account_id
        
        # Cancel existing schedule
        from .tasks import cancel_webhook_schedule
        cancel_webhook_schedule(instance.id)
        
        # Update instance
        webhook = super().update(instance, validated_data)
        
        # Reschedule if active
        if webhook.is_active:
            from .tasks import schedule_webhook
            schedule_webhook(webhook.id)
        
        return webhook


class WebhookCreateSerializer(WebhookSerializer):
    """Serializer for creating webhooks with minimal fields."""
    
    class Meta(WebhookSerializer.Meta):
        fields = [
            'name', 'url', 'http_method', 'headers', 'payload',
            'schedule_type', 'cron_expression', 'scheduled_at', 'timezone',
            'max_retries', 'retry_delay', 'timeout', 'folder', 'account', 'account_id'
        ]


class WebhookListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing webhooks."""
    
    execution_count = serializers.SerializerMethodField()
    last_execution_status = serializers.SerializerMethodField()
    folder_name = serializers.CharField(source='folder.name', read_only=True)
    folder_color = serializers.CharField(source='folder.color', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    
    class Meta:
        model = Webhook
        fields = [
            'id', 'name', 'url', 'http_method', 'schedule_type',
            'is_active', 'folder', 'folder_name', 'folder_color',
            'account', 'account_name',
            'last_execution_at', 'execution_count', 'last_execution_status',
            'created_at'
        ]
        read_only_fields = fields
    
    def get_execution_count(self, obj):
        return obj.executions.count()
    
    def get_last_execution_status(self, obj):
        """Get status of last execution."""
        last_execution = obj.executions.first()
        return last_execution.status if last_execution else None
