#!/bin/bash

# Docker stop script for Business Empire
# This script helps you stop the application gracefully

set -e

echo "🛑 Stopping Business Empire..."

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed."
    exit 1
fi

# Stop services
echo "⏹️  Stopping services..."
docker-compose down

# Optional: Remove volumes (uncomment if you want to reset data)
# echo "🗑️  Removing volumes..."
# docker-compose down -v

# Optional: Remove images (uncomment if you want to clean up images)
# echo "🧹 Removing images..."
# docker-compose down --rmi all

echo "✅ Business Empire stopped successfully!"
echo ""
echo "💡 Tips:"
echo "   - To start again: ./scripts/docker-start.sh"
echo "   - To remove all data: docker-compose down -v"
echo "   - To clean up images: docker-compose down --rmi all"
