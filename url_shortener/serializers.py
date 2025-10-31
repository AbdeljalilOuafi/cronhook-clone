"""
Serializers for URL Shortener API.
"""
from rest_framework import serializers
from .models import ShortURL, ClickAnalytics


class ShortURLCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating short URLs.
    Used by n8n workflows to shorten Stripe payment links.
    
    Domain handling:
    - If domain is provided, it will be used (must be in ALLOWED_SHORT_URL_DOMAINS)
    - If not provided, uses request domain from middleware
    - Falls back to account.short_url_domain with 'pay.' prefix
    """
    # Explicitly declare optional fields that won't be in the model's required fields
    domain = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    short_code = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=10)
    
    class Meta:
        model = ShortURL
        fields = ['original_url', 'title', 'expires_at', 'domain', 'short_code']
        extra_kwargs = {
            'title': {'required': False},
            'expires_at': {'required': False},
        }
    
    def validate_original_url(self, value):
        """Basic URL validation"""
        if not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError("URL must start with http:// or https://")
        return value
    
    def create(self, validated_data):
        """Create short URL with account context"""
        from django.conf import settings
        
        account = self.context.get('account')
        request = self.context.get('request')
        
        # Determine domain to use
        domain = validated_data.get('domain')
        
        if not domain:
            # Try to get domain from request (set by middleware)
            if request and hasattr(request, 'original_host'):
                domain = request.original_host
            # Fall back to account's short_url_domain with 'pay.' prefix
            elif account and account.short_url_domain:
                # If account has 'onsync-test.xyz', use 'pay.onsync-test.xyz'
                base_domain = account.short_url_domain
                if not base_domain.startswith('pay.'):
                    domain = f'pay.{base_domain}'
                else:
                    domain = base_domain
            else:
                raise serializers.ValidationError({
                    'domain': 'No domain specified and could not determine domain automatically.'
                })
        
        # Validate domain is in allowed list
        allowed_domains = getattr(settings, 'ALLOWED_SHORT_URL_DOMAINS', [])
        if allowed_domains and domain not in allowed_domains:
            raise serializers.ValidationError({
                'domain': f"Domain '{domain}' is not in the allowed domains list."
            })
        
        validated_data['domain'] = domain
        validated_data['account'] = account
        
        # Remove None values for optional fields
        if 'short_code' in validated_data and not validated_data['short_code']:
            validated_data.pop('short_code')
        
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
