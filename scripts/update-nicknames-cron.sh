#!/bin/bash

# Daily Nickname Update Cron Script
# This script calls the API endpoint to update all user nicknames

# Configuration
API_URL="https://hamsterhub.fun/api/cron/update-nicknames"
CRON_SECRET="${CRON_SECRET}"  # This should be set in environment or crontab

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check if CRON_SECRET is set
if [ -z "$CRON_SECRET" ]; then
    error "CRON_SECRET environment variable is not set"
    exit 1
fi

log "🔄 Starting daily nickname update process..."

# Make the API call
response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CRON_SECRET" \
    "$API_URL")

# Extract HTTP status code (last line)
http_code=$(echo "$response" | tail -n1)

# Extract response body (all lines except last)
response_body=$(echo "$response" | head -n -1)

# Check if the request was successful
if [ "$http_code" -eq 200 ]; then
    success "✅ Daily nickname update completed successfully"
    log "📊 Response: $response_body"
else
    error "❌ Daily nickname update failed with HTTP code: $http_code"
    error "📄 Response: $response_body"
    exit 1
fi

log "🎉 Daily nickname update process finished"
