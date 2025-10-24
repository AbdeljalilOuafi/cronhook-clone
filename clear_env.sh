#!/bin/bash

# Clear Environment Variables Script
# Use this when you change .env values and want to ensure they're reloaded

echo "🧹 Clearing cached environment variables..."

# Unset all CronHooks environment variables
unset SECRET_KEY
unset DEBUG
unset ALLOWED_HOSTS
unset DATABASE_URL
unset REDIS_URL
unset CELERY_BROKER_URL
unset CELERY_RESULT_BACKEND
unset DEFAULT_WEBHOOK_TIMEOUT
unset MAX_RETRY_ATTEMPTS

echo "✅ Environment variables cleared!"
echo ""
echo "💡 Note: These variables will be reloaded from .env file when you run:"
echo "   - python manage.py [command]"
echo "   - ./setup.sh"
echo "   - make [command]"
echo ""
echo "🔄 To reload and run a command immediately:"
echo "   source clear_env.sh && python manage.py migrate"
