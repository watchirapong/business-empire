#!/bin/bash

echo "🔄 Starting deployment update..."

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Restart the application
echo "🚀 Restarting application..."
pm2 restart business-empire

echo "✅ Deployment complete!"
echo "📊 Application status:"
pm2 list
