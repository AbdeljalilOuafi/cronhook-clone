# Generated migration for slack_integration app

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('webhooks', '0001_initial'),  # Depends on Account model
    ]

    operations = [
        migrations.CreateModel(
            name='SlackAccount',
            fields=[
                ('workspace_id', models.CharField(help_text='Slack Team/Workspace ID (e.g., T12345678)', max_length=255, primary_key=True, serialize=False)),
                ('workspace_name', models.CharField(help_text='Human-readable workspace name', max_length=255)),
                ('workspace_url', models.CharField(blank=True, help_text='Workspace URL (e.g., wedshape.slack.com)', max_length=255, null=True)),
                ('slack_access_token', models.TextField(help_text='Bot user OAuth access token (xoxb-...)')),
                ('onsync_bot_user_id', models.CharField(blank=True, help_text='OnSync bot user ID in this workspace', max_length=255, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('client_account', models.ForeignKey(db_column='client_account_id', help_text='Associated client account', on_delete=django.db.models.deletion.CASCADE, related_name='slack_accounts', to='webhooks.account')),
            ],
            options={
                'db_table': 'slack_accounts',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='slackaccount',
            index=models.Index(fields=['client_account'], name='slack_accou_client__idx'),
        ),
        migrations.AddIndex(
            model_name='slackaccount',
            index=models.Index(fields=['workspace_name'], name='slack_accou_workspa_idx'),
        ),
    ]
