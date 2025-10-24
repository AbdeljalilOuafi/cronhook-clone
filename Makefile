.PHONY: help setup install migrate superuser run worker beat test clean docker-up docker-down shell

help:
	@echo "CronHooks - Available Commands"
	@echo "==============================="
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make setup         - Complete project setup (recommended for first time)"
	@echo "  make install       - Install Python dependencies"
	@echo "  make migrate       - Run database migrations"
	@echo "  make superuser     - Create Django superuser"
	@echo ""
	@echo "Running Services:"
	@echo "  make run           - Start Django development server"
	@echo "  make worker        - Start Celery worker"
	@echo "  make beat          - Start Celery beat scheduler"
	@echo "  make all           - Start all services in tmux"
	@echo ""
	@echo "Docker:"
	@echo "  make docker up     - Start PostgreSQL and Redis"
	@echo "  make docker down   - Stop PostgreSQL and Redis"
	@echo "  make docker logs   - View Docker logs"
	@echo ""
	@echo "Development:"
	@echo "  make shell         - Open Django shell"
	@echo "  make test          - Run tests"
	@echo "  make sample        - Create sample webhooks"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean         - Remove Python cache files"
	@echo "  make clean-all     - Remove cache, migrations, and database"

setup:
	@echo "Setting up CronHooks..."
	@chmod +x setup.sh start_worker.sh start_beat.sh start_all.sh
	@./setup.sh

install:
	@echo "Installing dependencies..."
	@pip install --upgrade pip
	@pip install -r requirements.txt

migrate:
	@echo "Running migrations..."
	@unset DATABASE_URL && python manage.py migrate

superuser:
	@echo "Creating superuser..."
	@unset DATABASE_URL && python manage.py createsuperuser

run:
	@echo "Starting Django development server..."
	@unset DATABASE_URL && python manage.py runserver

worker:
	@echo "Starting Celery worker..."
	@unset DATABASE_URL && celery -A config worker -l info

beat:
	@echo "Starting Celery beat..."
	@unset DATABASE_URL && celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler

all:
	@echo "Starting all services in tmux..."
	@./start_all.sh

docker-up:
	@echo "Starting Docker services..."
	@docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 5

docker-down:
	@echo "Stopping Docker services..."
	@docker-compose down

docker-logs:
	@docker-compose logs -f

shell:
	@unset DATABASE_URL && python manage.py shell

test:
	@echo "Running tests..."
	@unset DATABASE_URL && python manage.py test

sample:
	@echo "Creating sample webhooks..."
	@unset DATABASE_URL && python manage.py create_sample_webhooks

clean:
	@echo "Cleaning Python cache files..."
	@find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete
	@find . -type f -name "*.pyo" -delete
	@find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	@rm -f celerybeat-schedule
	@rm -f celerybeat.pid
	@echo "Cleanup complete!"

clean-all: clean
	@echo "WARNING: This will delete the database and all migrations!"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read dummy
	@docker-compose down -v
	@find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
	@rm -f db.sqlite3
	@echo "Complete cleanup done!"

# Development helpers
format:
	@echo "Formatting code with black..."
	@black .

lint:
	@echo "Linting with flake8..."
	@flake8 --exclude=venv,migrations

check:
	@echo "Running Django checks..."
	@unset DATABASE_URL && python manage.py check

collectstatic:
	@echo "Collecting static files..."
	@unset DATABASE_URL && python manage.py collectstatic --noinput

makemigrations:
	@echo "Creating migrations..."
	@unset DATABASE_URL && python manage.py makemigrations

showmigrations:
	@echo "Showing migrations..."
	@unset DATABASE_URL && python manage.py showmigrations
