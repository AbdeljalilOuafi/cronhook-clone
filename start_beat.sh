#!/bin/bash

# Celery beat start script
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
