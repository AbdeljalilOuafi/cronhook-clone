"""
URL routing for webhooks API.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WebhookViewSet, WebhookFolderViewSet, AccountViewSet, custom_login

router = DefaultRouter()
router.register(r'webhooks', WebhookViewSet, basename='webhook')
router.register(r'folders', WebhookFolderViewSet, basename='folder')
router.register(r'accounts', AccountViewSet, basename='account')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', custom_login, name='api-login'),
    path('auth/token/', custom_login, name='api-token-auth'),  # Keep for backwards compatibility
]
