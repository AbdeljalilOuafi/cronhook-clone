"""
URL patterns for Slack OAuth integration.
"""
from django.urls import path
from . import views

app_name = 'slack_integration'

urlpatterns = [
    # OAuth flow
    path('oauth/callback', views.slack_oauth_callback, name='oauth-callback'),
    path('oauth/install', views.slack_oauth_install, name='oauth-install'),
    
    # Account management
    path('accounts/', views.list_slack_accounts, name='list-accounts'),
    path('accounts/<str:workspace_id>/disconnect', views.disconnect_slack_account, name='disconnect-account'),
    
    # Testing
    path('oauth/test', views.slack_oauth_test, name='oauth-test'),
]
