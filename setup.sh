#!/bin/bash

# Setup script for CronHooks project

echo "🚀 Setting up CronHooks project..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📚 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual configuration!"
fi

# Start Docker services
echo "🐳 Starting PostgreSQL and Redis..."
docker compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Clear any cached DATABASE_URL from environment
# This ensures Django reads fresh from .env file

# Create migrations for webhooks app
echo "📝 Creating migrations for webhooks app..."
python3 manage.py makemigrations webhooks

# Run migrations
echo "🔄 Running database migrations..."
python3 manage.py migrate

# Create superuser prompt
echo ""
echo "👤 Would you like to create a superuser? (y/n)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    python3 manage.py createsuperuser
fi

# Make scripts executable
chmod +x start_worker.sh
chmod +x start_beat.sh

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update .env with your configuration"
echo "2. Start the Django server: python3 manage.py runserver"
echo "3. In a new terminal, start Celery worker: ./start_worker.sh"
echo "4. In another terminal, start Celery beat: ./start_beat.sh"
echo ""
echo "🌐 Access the API at: http://localhost:8000/api/"
echo "📚 API Documentation: http://localhost:8000/api/schema/swagger-ui/"
echo "🔧 Admin panel: http://localhost:8000/admin/"
