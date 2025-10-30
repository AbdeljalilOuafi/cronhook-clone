"""
Serializers for Slack integration.
"""
from rest_framework import serializers
from .models import SlackAccount


class SlackAccountSerializer(serializers.ModelSerializer):
    """
    Serializer for SlackAccount model.
    """
    class Meta:
        model = SlackAccount
        fields = [
            'workspace_id',
            'workspace_name',
            'workspace_url',
            'onsync_bot_user_id',
            'client_account',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Customize output - don't expose access token"""
        data = super().to_representation(instance)
        # Never expose the access token in API responses
        return data
