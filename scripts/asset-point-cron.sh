#!/bin/bash

# Asset Point Bot Cron Script
# This script runs every 2 hours to give AssetPoint to the target user

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_PATH="$PROJECT_DIR/scripts/asset-point-bot.js"

# Change to project directory
cd "$PROJECT_DIR"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "$(date): Error - Node.js is not installed or not in PATH" >&2
    exit 1
fi

# Check if the script exists
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "$(date): Error - Asset point bot script not found at $SCRIPT_PATH" >&2
    exit 1
fi

# Run the asset point bot
echo "$(date): Starting Asset Point Bot..."
node "$SCRIPT_PATH"

if [ $? -eq 0 ]; then
    echo "$(date): Asset Point Bot completed successfully"
else
    echo "$(date): Asset Point Bot failed with exit code $?" >&2
    exit 1
fi
