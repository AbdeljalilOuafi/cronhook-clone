"""
Serializers for URL Shortener API.
"""
from rest_framework import serializers
from .models import ShortURL, ClickAnalytics


class ShortURLCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating short URLs.
    Used by n8n workflows to shorten Stripe payment links.
    """
    # Make domain optional - will use account's short_url_domain if not provided
    domain = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = ShortURL
        fields = ['original_url', 'domain', 'title', 'short_code', 'expires_at']
        extra_kwargs = {
            'short_code': {'required': False},  # Auto-generated if not provided
            'title': {'required': False},
            'expires_at': {'required': False},
        }
    
    def validate_domain(self, value):
        """Validate that the domain belongs to the account"""
        if value:
            account = self.context.get('account')
            if account and value != account.short_url_domain:
                raise serializers.ValidationError(
                    f"Domain '{value}' does not match your account's short URL domain."
                )
        return value
    
    def validate_original_url(self, value):
        """Basic URL validation"""
        if not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError("URL must start with http:// or https://")
        return value
    
    def create(self, validated_data):
        """Create short URL with account context"""
        account = self.context.get('account')
        
        # Use account's domain if not provided
        if 'domain' not in validated_data or not validated_data['domain']:
            if not account.short_url_domain:
                raise serializers.ValidationError({
                    'domain': 'No domain specified and account has no default short URL domain configured.'
                })
            validated_data['domain'] = account.short_url_domain
        
        validated_data['account'] = account
        return super().create(validated_data)


class ShortURLResponseSerializer(serializers.ModelSerializer):
    """
    Serializer for short URL responses.
    Returns all relevant data including the full short URL.
    """
    full_short_url = serializers.ReadOnlyField()
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = ShortURL
        fields = [
            'id',
            'short_code',
            'original_url',
            'domain',
            'full_short_url',
            'title',
            'clicks',
            'is_active',
            'is_expired',
            'created_at',
            'updated_at',
            'expires_at',
        ]
        read_only_fields = ['id', 'short_code', 'clicks', 'created_at', 'updated_at']
    
    def get_is_expired(self, obj):
        """Check if URL is expired"""
        return obj.is_expired()


class ClickAnalyticsSerializer(serializers.ModelSerializer):
    """
    Serializer for click analytics data.
    """
    class Meta:
        model = ClickAnalytics
        fields = [
            'id',
            'clicked_at',
            'ip_address',
            'user_agent',
            'referer',
            'country',
            'city',
        ]


class ShortURLStatsSerializer(serializers.Serializer):
    """
    Serializer for aggregated statistics on a short URL.
    """
    short_url = ShortURLResponseSerializer()
    total_clicks = serializers.IntegerField()
    recent_clicks = serializers.ListField(
        child=ClickAnalyticsSerializer()
    )
    clicks_by_day = serializers.DictField()
    clicks_by_country = serializers.DictField()


class BulkShortURLSerializer(serializers.Serializer):
    """
    Serializer for bulk URL shortening operations.
    Useful for n8n workflows that need to shorten multiple URLs at once.
    """
    urls = serializers.ListField(
        child=serializers.URLField(),
        min_length=1,
        max_length=100
    )
    domain = serializers.CharField(required=False)
    
    def validate_domain(self, value):
        """Validate domain belongs to account"""
        if value:
            account = self.context.get('account')
            if account and value != account.short_url_domain:
                raise serializers.ValidationError(
                    f"Domain '{value}' does not match your account's short URL domain."
                )
        return value
