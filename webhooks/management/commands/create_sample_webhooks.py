"""
Management command to create sample webhooks for testing.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from webhooks.models import Webhook


class Command(BaseCommand):
    help = 'Create sample webhooks for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            default='admin',
            help='Username to create webhooks for (default: admin)',
        )

    def handle(self, *args, **options):
        username = options['username']
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User "{username}" does not exist. Create user first.')
            )
            return
        
        # Sample webhook URL (webhook.site is a free service for testing)
        test_url = 'https://webhook.site/unique-id-here'
        
        self.stdout.write('Creating sample webhooks...\n')
        
        # 1. One-time webhook (5 minutes from now)
        onetime_webhook = Webhook.objects.create(
            user=user,
            name='Test One-Time Webhook',
            url=test_url,
            http_method='POST',
            schedule_type='once',
            scheduled_at=timezone.now() + timedelta(minutes=5),
            payload={
                'message': 'This is a one-time webhook',
                'timestamp': timezone.now().isoformat()
            },
            headers={
                'X-Custom-Header': 'OneTime'
            }
        )
        self.stdout.write(
            self.style.SUCCESS(
                f'✓ Created one-time webhook (ID: {onetime_webhook.id}) '
                f'scheduled for {onetime_webhook.scheduled_at}'
            )
        )
        
        # 2. Recurring webhook - every 5 minutes
        recurring_5min = Webhook.objects.create(
            user=user,
            name='Test Recurring - Every 5 Minutes',
            url=test_url,
            http_method='POST',
            schedule_type='recurring',
            cron_expression='*/5 * * * *',
            payload={
                'message': 'This webhook runs every 5 minutes',
                'interval': '5 minutes'
            }
        )
        self.stdout.write(
            self.style.SUCCESS(
                f'✓ Created recurring webhook (ID: {recurring_5min.id}) - Every 5 minutes'
            )
        )
        
        # 3. Recurring webhook - every hour
        recurring_hourly = Webhook.objects.create(
            user=user,
            name='Test Recurring - Hourly',
            url=test_url,
            http_method='GET',
            schedule_type='recurring',
            cron_expression='0 * * * *',
            payload={}
        )
        self.stdout.write(
            self.style.SUCCESS(
                f'✓ Created recurring webhook (ID: {recurring_hourly.id}) - Every hour'
            )
        )
        
        # 4. Webhook with custom headers
        custom_headers = Webhook.objects.create(
            user=user,
            name='Test Custom Headers',
            url=test_url,
            http_method='POST',
            schedule_type='recurring',
            cron_expression='*/10 * * * *',
            headers={
                'Authorization': 'Bearer test-token',
                'X-API-Key': 'sample-api-key',
                'X-Request-ID': 'test-request-123'
            },
            payload={
                'data': 'webhook with custom headers'
            }
        )
        self.stdout.write(
            self.style.SUCCESS(
                f'✓ Created webhook with custom headers (ID: {custom_headers.id})'
            )
        )
        
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS(f'\n✓ Created {4} sample webhooks for user "{username}"'))
        self.stdout.write('\nNext steps:')
        self.stdout.write('1. Update webhook URLs with your test endpoint (e.g., webhook.site)')
        self.stdout.write('2. Start Celery worker and beat')
        self.stdout.write('3. Monitor execution in Django admin or via API\n')
