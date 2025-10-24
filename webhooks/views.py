"""
API views for webhook management.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Webhook, WebhookExecution
from .serializers import (
    WebhookSerializer,
    WebhookCreateSerializer,
    WebhookListSerializer,
    WebhookExecutionSerializer
)
from .tasks import cancel_webhook_schedule


class WebhookViewSet(viewsets.ModelViewSet):
    """
    ViewSet for webhook CRUD operations.
    
    list: Get all webhooks for the authenticated user
    create: Create a new webhook
    retrieve: Get details of a specific webhook
    update: Update a webhook (reschedules it)
    partial_update: Partially update a webhook
    destroy: Delete a webhook
    cancel: Cancel a scheduled webhook
    executions: Get execution history for a webhook
    """
    
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['schedule_type', 'is_active', 'http_method']
    
    def get_queryset(self):
        """Filter webhooks by authenticated user."""
        return Webhook.objects.filter(user=self.request.user).prefetch_related('executions')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return WebhookListSerializer
        elif self.action == 'create':
            return WebhookCreateSerializer
        return WebhookSerializer
    
    def perform_destroy(self, instance):
        """Cancel schedule before deleting webhook."""
        cancel_webhook_schedule(instance.id)
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancel a scheduled webhook.
        
        This will:
        - Revoke pending Celery tasks (for one-time webhooks)
        - Disable periodic tasks (for recurring webhooks)
        - Mark webhook as inactive
        """
        webhook = self.get_object()
        
        if not webhook.is_active:
            return Response(
                {'detail': 'Webhook is already inactive'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cancel_webhook_schedule(webhook.id)
        
        return Response(
            {'detail': f'Webhook "{webhook.name}" has been canceled'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get'])
    def executions(self, request, pk=None):
        """
        Get execution history for a webhook.
        
        Returns paginated list of webhook executions with response details.
        """
        webhook = self.get_object()
        executions = webhook.executions.all()
        
        page = self.paginate_queryset(executions)
        if page is not None:
            serializer = WebhookExecutionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = WebhookExecutionSerializer(executions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Activate a canceled webhook.
        
        This will reschedule the webhook if it was previously canceled.
        """
        webhook = self.get_object()
        
        if webhook.is_active:
            return Response(
                {'detail': 'Webhook is already active'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate schedule is still valid
        from django.utils import timezone
        if webhook.schedule_type == 'once' and webhook.scheduled_at <= timezone.now():
            return Response(
                {'detail': 'Cannot activate one-time webhook: scheduled time is in the past'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        webhook.is_active = True
        webhook.save()
        
        # Reschedule
        from .tasks import schedule_webhook
        schedule_webhook(webhook.id)
        
        return Response(
            {'detail': f'Webhook "{webhook.name}" has been activated'},
            status=status.HTTP_200_OK
        )
