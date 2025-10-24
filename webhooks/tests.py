"""
Tests for webhooks app.
"""
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Webhook, WebhookExecution


class WebhookModelTest(TestCase):
    """Test Webhook model."""
    
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
    
    def test_create_onetime_webhook(self):
        """Test creating a one-time webhook."""
        scheduled_time = timezone.now() + timedelta(hours=1)
        webhook = Webhook.objects.create(
            user=self.user,
            name='Test Webhook',
            url='https://example.com/webhook',
            http_method='POST',
            schedule_type='once',
            scheduled_at=scheduled_time
        )
        self.assertEqual(webhook.schedule_type, 'once')
        self.assertIsNotNone(webhook.scheduled_at)
    
    def test_create_recurring_webhook(self):
        """Test creating a recurring webhook."""
        webhook = Webhook.objects.create(
            user=self.user,
            name='Recurring Webhook',
            url='https://example.com/webhook',
            http_method='POST',
            schedule_type='recurring',
            cron_expression='*/5 * * * *'
        )
        self.assertEqual(webhook.schedule_type, 'recurring')
        self.assertEqual(webhook.cron_expression, '*/5 * * * *')


class WebhookAPITest(APITestCase):
    """Test Webhook API endpoints."""
    
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client.force_authenticate(user=self.user)
    
    def test_create_onetime_webhook(self):
        """Test creating a one-time webhook via API."""
        scheduled_time = (timezone.now() + timedelta(hours=1)).isoformat()
        data = {
            'name': 'API Test Webhook',
            'url': 'https://example.com/webhook',
            'http_method': 'POST',
            'schedule_type': 'once',
            'scheduled_at': scheduled_time,
            'payload': {'message': 'test'}
        }
        response = self.client.post('/api/webhooks/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Webhook.objects.count(), 1)
    
    def test_create_recurring_webhook(self):
        """Test creating a recurring webhook via API."""
        data = {
            'name': 'Recurring API Webhook',
            'url': 'https://example.com/webhook',
            'http_method': 'POST',
            'schedule_type': 'recurring',
            'cron_expression': '0 */2 * * *',
            'payload': {'status': 'check'}
        }
        response = self.client.post('/api/webhooks/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_list_webhooks(self):
        """Test listing webhooks."""
        Webhook.objects.create(
            user=self.user,
            name='Test 1',
            url='https://example.com/1',
            schedule_type='recurring',
            cron_expression='*/5 * * * *'
        )
        response = self.client.get('/api/webhooks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_cancel_webhook(self):
        """Test canceling a webhook."""
        webhook = Webhook.objects.create(
            user=self.user,
            name='To Cancel',
            url='https://example.com/webhook',
            schedule_type='recurring',
            cron_expression='*/5 * * * *',
            is_active=True
        )
        response = self.client.post(f'/api/webhooks/{webhook.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        webhook.refresh_from_db()
        self.assertFalse(webhook.is_active)
