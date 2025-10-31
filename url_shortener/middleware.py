"""
Middleware for handling multiple domains in URL shortener.
"""
from django.conf import settings
from webhooks.models import Account


class MultiDomainMiddleware:
    """
    Middleware to handle requests from multiple short URL domains.
    
    This validates that incoming requests are from registered domains
    and adds domain context to the request.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        # Cache of valid domains (refreshed periodically)
        self._valid_domains_cache = None
    
    def __call__(self, request):
        # Get the host from request
        host = request.get_host().split(':')[0]  # Remove port if present
        
        # Add domain to request for easy access
        request.short_url_domain = host
        
        # Check if this is a short URL domain
        request.is_short_url_domain = self._is_valid_short_url_domain(host)
        
        response = self.get_response(request)
        return response
    
    def _is_valid_short_url_domain(self, domain):
        """
        Check if domain is a registered short URL domain.
        Uses caching to avoid hitting DB on every request.
        """
        # Exclude main app domains
        main_domains = [
            'schedules.onsync.ai',
            'sch.onsync.ai',
            'slack.onsync.ai',
            'localhost',
            '127.0.0.1',
        ]
        
        if domain in main_domains:
            return False
        
        # Check if domain is registered in any account
        # In production, you might want to cache this
        return Account.objects.filter(
            short_url_domain=domain
        ).exists()
    
    def _get_valid_domains(self):
        """
        Get all valid short URL domains from database.
        Could be cached with timeout for performance.
        """
        return list(
            Account.objects
            .exclude(short_url_domain__isnull=True)
            .exclude(short_url_domain='')
            .values_list('short_url_domain', flat=True)
        )
