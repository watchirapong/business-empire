#!/bin/bash

echo "🔄 Restarting Business Empire App..."

# Kill any process running on port 3001
echo "🔫 Killing any process on port 3001..."
PORT_PID=$(lsof -ti:3001)
if [ ! -z "$PORT_PID" ]; then
    echo "Found process $PORT_PID on port 3001, killing it..."
    kill -9 $PORT_PID
    sleep 2
else
    echo "No process found on port 3001"
fi

# Verify port is free
if netstat -tlnp | grep :3001 > /dev/null; then
    echo "❌ Port 3001 is still in use, trying to force kill..."
    sudo fuser -k 3001/tcp
    sleep 3
fi

# Restart PM2 app
echo "🚀 Restarting PM2 app..."
pm2 restart business-empire

# Wait a moment for the app to start
sleep 5

# Check if app is running
if pm2 status | grep "business-empire" | grep "online" > /dev/null; then
    echo "✅ App is running successfully!"
    
    # Test the API
    echo "🧪 Testing API..."
    if curl -s "http://localhost:3001/api/tcas-analysis?action=statistics" | grep -q "success"; then
        echo "✅ API is working correctly!"
        echo "🌐 Your app is available at: http://localhost:3001"
    else
        echo "❌ API test failed"
    fi
else
    echo "❌ App failed to start"
    pm2 logs business-empire --lines 10
fi

echo "📊 Current PM2 status:"
pm2 status
