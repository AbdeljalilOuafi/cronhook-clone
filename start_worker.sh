#!/bin/bash

# Celery worker start script
# Clear DATABASE_URL to ensure it reads from .env
unset DATABASE_URL
celery -A config worker -l info --concurrency=4
