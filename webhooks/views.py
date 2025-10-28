"""
API views for webhook management.
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django_filters.rest_framework import DjangoFilterBackend
from .models import Webhook, WebhookExecution, WebhookFolder, Account
from .serializers import (
    WebhookSerializer,
    WebhookCreateSerializer,
    WebhookListSerializer,
    WebhookExecutionSerializer,
    WebhookFolderSerializer,
    AccountSerializer,
    UserSerializer
)
from .tasks import cancel_webhook_schedule


@api_view(['POST'])
@permission_classes([AllowAny])
def custom_login(request):
    """
    Custom login view that returns user details including is_superuser.
    """
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'detail': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(username=username, password=password)
    
    if user is None:
        return Response(
            {'detail': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    token, created = Token.objects.get_or_create(user=user)
    user_serializer = UserSerializer(user)
    
    return Response({
        'token': token.key,
        'user': user_serializer.data
    })


class AccountViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for account management (superuser only).
    
    list: Get all accounts
    retrieve: Get details of a specific account
    """
    
    queryset = Account.objects.all().order_by('name')
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'email', 'ceo_name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class WebhookFolderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for folder management.
    
    list: Get all folders for the authenticated user
    create: Create a new folder
    retrieve: Get details of a specific folder
    update: Update a folder
    partial_update: Partially update a folder
    destroy: Delete a folder
    move_webhooks: Move multiple webhooks to this folder
    stats: Get statistics for a folder
    """
    
    serializer_class = WebhookFolderSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter folders by authenticated user and optionally by account."""
        queryset = WebhookFolder.objects.filter(user=self.request.user).prefetch_related('subfolders')
        
        # Filter by account if provided in query params (for superuser viewing specific account)
        account_id = self.request.query_params.get('account')
        if account_id:
            queryset = queryset.filter(account_id=account_id)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def move_webhooks(self, request, pk=None):
        """Move multiple webhooks to this folder."""
        folder = self.get_object()
        webhook_ids = request.data.get('webhook_ids', [])
        
        if not webhook_ids:
            return Response(
                {'detail': 'webhook_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        webhooks = Webhook.objects.filter(
            id__in=webhook_ids,
            user=request.user
        )
        
        count = webhooks.update(folder=folder)
        
        return Response({
            'detail': f'Moved {count} webhook(s) to "{folder.name}"',
            'count': count
        })
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get statistics for folder."""
        folder = self.get_object()
        webhooks = folder.webhooks.all()
        
        return Response({
            'folder_name': folder.name,
            'total_webhooks': webhooks.count(),
            'active_webhooks': webhooks.filter(is_active=True).count(),
            'inactive_webhooks': webhooks.filter(is_active=False).count(),
            'total_executions': sum(w.execution_count for w in webhooks),
            'one_time_webhooks': webhooks.filter(schedule_type='once').count(),
            'recurring_webhooks': webhooks.filter(schedule_type='recurring').count(),
        })


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
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['folder', 'schedule_type', 'is_active', 'http_method', 'account']
    search_fields = ['name', 'url']
    
    def get_queryset(self):
        """Filter webhooks by authenticated user and optionally by account."""
        queryset = Webhook.objects.filter(user=self.request.user).prefetch_related('executions')
        
        # Filter by account if provided in query params (for superuser viewing specific account)
        account_id = self.request.query_params.get('account')
        if account_id:
            queryset = queryset.filter(account_id=account_id)
        
        return queryset
    
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
    
    @action(detail=False, methods=['post'])
    def bulk_move(self, request):
        """Move multiple webhooks to a folder (or remove from folder)."""
        webhook_ids = request.data.get('webhook_ids', [])
        folder_id = request.data.get('folder_id')  # None to remove from folder
        
        if not webhook_ids:
            return Response(
                {'detail': 'webhook_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        folder = None
        if folder_id:
            try:
                folder = WebhookFolder.objects.get(id=folder_id, user=request.user)
            except WebhookFolder.DoesNotExist:
                return Response(
                    {'detail': 'Folder not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        webhooks = Webhook.objects.filter(
            id__in=webhook_ids,
            user=request.user
        )
        
        count = webhooks.update(folder=folder)
        
        if folder:
            message = f'Moved {count} webhook(s) to "{folder.name}"'
        else:
            message = f'Removed {count} webhook(s) from folder'
        
        return Response({
            'detail': message,
            'count': count
        })
