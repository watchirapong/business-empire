#!/bin/bash

# Docker startup script for Business Empire
# This script helps you start the application with Docker

set -e

echo "🚀 Starting Business Empire with Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p public/uploads/shop
mkdir -p public/uploads/hamsterboard
mkdir -p public/uploads/shop-files
mkdir -p public/uploads/shop-images
mkdir -p logs
mkdir -p ssl

# Set proper permissions
chmod 755 public/uploads
chmod 755 logs

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from example..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ Created .env file from env.example"
        echo "🔧 Please edit .env file with your actual configuration values"
    else
        echo "❌ env.example file not found. Please create .env file manually."
        exit 1
    fi
fi

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
docker-compose ps

# Show logs
echo "📋 Recent logs:"
docker-compose logs --tail=20

echo ""
echo "✅ Business Empire is starting up!"
echo "🌐 Application: http://localhost:3000"
echo "🗄️  MongoDB: localhost:27017"
echo "📊 Redis: localhost:6379"
echo "🔧 Nginx: http://localhost:80"
echo ""
echo "📝 To view logs: docker-compose logs -f"
echo "🛑 To stop: docker-compose down"
echo "🔄 To restart: docker-compose restart"
echo ""
echo "🔧 To access MongoDB:"
echo "   docker-compose exec mongodb mongosh -u admin -p password123"
echo ""
echo "🔧 To access Redis:"
echo "   docker-compose exec redis redis-cli"
