#!/bin/bash

# Installation script for systemd services
# Run with sudo: sudo ./install_services.sh

set -e

echo "🚀 Installing CronHooks systemd services..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo "❌ Please run as root: sudo ./install_services.sh"
   exit 1
fi

# Get the project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "📁 Project directory: $PROJECT_DIR"

# Copy service files to systemd directory
echo "📋 Copying service files..."
cp "$PROJECT_DIR/systemd/cronhooks-web.service" /etc/systemd/system/
cp "$PROJECT_DIR/systemd/cronhooks-worker.service" /etc/systemd/system/
cp "$PROJECT_DIR/systemd/cronhooks-beat.service" /etc/systemd/system/

# Update paths in service files if not using /opt/cronhooks
if [ "$PROJECT_DIR" != "/opt/cronhooks" ]; then
    echo "⚙️  Updating paths in service files..."
    sed -i "s|/opt/cronhooks|$PROJECT_DIR|g" /etc/systemd/system/cronhooks-*.service
fi

# Create log directory
echo "📁 Creating log directory..."
mkdir -p /var/log/cronhooks
chown -R cronhooks:cronhooks /var/log/cronhooks 2>/dev/null || true

# Reload systemd
echo "🔄 Reloading systemd..."
systemctl daemon-reload

# Show status
echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Enable services: sudo systemctl enable cronhooks-*"
echo "2. Start services: sudo systemctl start cronhooks-*"
echo "3. Check status: sudo systemctl status cronhooks-*"
echo ""
echo "📊 Useful commands:"
echo "  sudo systemctl status cronhooks-web      # Check web service"
echo "  sudo systemctl status cronhooks-worker   # Check worker service"
echo "  sudo systemctl status cronhooks-beat     # Check beat service"
echo "  sudo journalctl -u cronhooks-* -f        # View logs in real-time"
echo ""
