"""
Models for Slack OAuth integration and account management.
"""
from django.db import models
from webhooks.models import Account


class SlackAccount(models.Model):
    """
    Stores Slack workspace OAuth tokens and information.
    Maps to the 'slack_accounts' table in the database.
    """
    workspace_id = models.CharField(
        max_length=255,
        primary_key=True,
        help_text="Slack Team/Workspace ID (e.g., T12345678)"
    )
    workspace_name = models.CharField(
        max_length=255,
        help_text="Human-readable workspace name"
    )
    workspace_url = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Workspace URL (e.g., wedshape.slack.com)"
    )
    
    # OAuth tokens
    slack_access_token = models.TextField(
        help_text="Bot user OAuth access token (xoxb-...)"
    )
    
    # Bot information
    onsync_bot_user_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="OnSync bot user ID in this workspace"
    )
    
    # Link to client account
    client_account = models.ForeignKey(
        Account,
        on_delete=models.CASCADE,
        related_name='slack_accounts',
        db_column='client_account_id',
        help_text="Associated client account"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'slack_accounts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client_account']),
            models.Index(fields=['workspace_name']),
        ]
    
    def __str__(self):
        return f"{self.workspace_name} ({self.workspace_id})"
    
    @property
    def is_token_valid(self):
        """Check if the access token is still valid"""
        # You can implement token validation logic here
        return bool(self.slack_access_token)
