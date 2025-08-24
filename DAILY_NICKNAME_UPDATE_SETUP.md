# Daily Nickname Update System Setup

This guide explains how to set up automatic daily nickname updates for all users in your Discord server.

## 🎯 What This Does

- ✅ **Automatically updates all user nicknames** every day at a scheduled time
- ✅ **Tracks nickname history** for all users
- ✅ **Handles rate limiting** to avoid Discord API issues
- ✅ **Provides detailed logging** of the update process
- ✅ **Secure authentication** to prevent unauthorized access

## 🔧 Setup Requirements

### 1. Environment Variables

Add this to your `.env` file:

```env
# Existing variables...
DISCORD_BOT_TOKEN=your-discord-bot-token
MONGODB_URI=your-mongodb-connection-string

# New variable for cron job security
CRON_SECRET=your-secure-random-secret-key-here
```

**Generate a secure secret:**
```bash
# Generate a random 32-character secret
openssl rand -hex 32
```

### 2. API Endpoint

The system creates a new API endpoint at `/api/cron/update-nicknames` that:
- Accepts POST requests with Bearer token authentication
- Fetches all active users from the database
- Updates their nicknames from Discord
- Tracks changes in the UsernameHistory collection

### 3. Cron Job Setup

#### Option A: Using crontab (Recommended)

1. **Edit the crontab:**
```bash
crontab -e
```

2. **Add the daily job (runs at 2:00 AM every day):**
```bash
# Daily nickname update at 2:00 AM
0 2 * * * CRON_SECRET=your-secret-here /root/projects/business-empire/scripts/update-nicknames-cron.sh >> /var/log/nickname-updates.log 2>&1
```

3. **Alternative times:**
```bash
# Run at 6:00 AM daily
0 6 * * * CRON_SECRET=your-secret-here /root/projects/business-empire/scripts/update-nicknames-cron.sh >> /var/log/nickname-updates.log 2>&1

# Run every 6 hours
0 */6 * * * CRON_SECRET=your-secret-here /root/projects/business-empire/scripts/update-nicknames-cron.sh >> /var/log/nickname-updates.log 2>&1

# Run every hour (for testing)
0 * * * * CRON_SECRET=your-secret-here /root/projects/business-empire/scripts/update-nicknames-cron.sh >> /var/log/nickname-updates.log 2>&1
```

#### Option B: Using systemd timer (Alternative)

1. **Create a service file:**
```bash
sudo nano /etc/systemd/system/nickname-update.service
```

```ini
[Unit]
Description=Daily Nickname Update Service
After=network.target

[Service]
Type=oneshot
Environment=CRON_SECRET=your-secret-here
ExecStart=/root/projects/business-empire/scripts/update-nicknames-cron.sh
User=root
```

2. **Create a timer file:**
```bash
sudo nano /etc/systemd/system/nickname-update.timer
```

```ini
[Unit]
Description=Daily Nickname Update Timer
Requires=nickname-update.service

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

3. **Enable and start the timer:**
```bash
sudo systemctl enable nickname-update.timer
sudo systemctl start nickname-update.timer
```

## 🚀 Testing the System

### 1. Manual Test

Test the API endpoint manually:

```bash
# Test with curl
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-here" \
  https://hamsterhub.fun/api/cron/update-nicknames
```

### 2. Test the Script

```bash
# Set the secret and run the script
export CRON_SECRET=your-secret-here
./scripts/update-nicknames-cron.sh
```

### 3. Check Logs

```bash
# View cron logs
tail -f /var/log/nickname-updates.log

# Check system logs
journalctl -u nickname-update.service -f
```

## 📊 Monitoring

### 1. Log Files

The system creates detailed logs:
- **Cron logs**: `/var/log/nickname-updates.log`
- **Application logs**: Check your Next.js application logs
- **System logs**: `journalctl -u nickname-update.service`

### 2. API Response Format

The API returns detailed results:

```json
{
  "success": true,
  "message": "Daily nickname update completed",
  "timestamp": "2024-01-15T02:00:00.000Z",
  "results": {
    "total": 150,
    "updated": 5,
    "noChange": 140,
    "notInServer": 3,
    "noNickname": 2,
    "failed": 0,
    "errors": []
  }
}
```

### 3. Database Monitoring

Check the `UsernameHistory` collection in MongoDB:

```javascript
// View recent nickname changes
db.usernamehistories.find().sort({lastUpdated: -1}).limit(10)

// Count total users with history
db.usernamehistories.countDocuments()

// Find users with recent changes
db.usernamehistories.find({
  lastUpdated: {
    $gte: new Date(Date.now() - 24*60*60*1000) // Last 24 hours
  }
})
```

## 🔒 Security Considerations

### 1. Secret Management

- **Use a strong, random secret** for `CRON_SECRET`
- **Never commit secrets** to version control
- **Rotate secrets periodically** (every 3-6 months)

### 2. Access Control

- **API endpoint is protected** by Bearer token authentication
- **Only cron jobs** should call this endpoint
- **Manual access is disabled** in production

### 3. Rate Limiting

- **Built-in delays** between API calls (100ms)
- **Discord API limits** are respected
- **Error handling** for rate limit responses

## 🛠️ Troubleshooting

### Common Issues

1. **"Unauthorized" error:**
   - Check that `CRON_SECRET` is set correctly
   - Verify the secret matches in both environment and script

2. **"Discord bot token not configured":**
   - Ensure `DISCORD_BOT_TOKEN` is set in environment
   - Verify the bot has proper permissions

3. **"User not found in server":**
   - Users must be members of the Discord server
   - Bot must have permission to view server members

4. **Rate limiting errors:**
   - The system includes delays, but Discord may still rate limit
   - Check Discord API documentation for current limits

### Debug Commands

```bash
# Check if cron is running
crontab -l

# Check cron logs
tail -f /var/log/syslog | grep CRON

# Test the script manually
./scripts/update-nicknames-cron.sh

# Check MongoDB connection
mongo --eval "db.runCommand('ping')"

# View recent API calls
tail -f /var/log/nginx/access.log | grep update-nicknames
```

## 📈 Performance Considerations

### 1. Processing Time

- **~100ms delay** between each user to avoid rate limiting
- **Estimated time**: 1-2 minutes for 100 users
- **Memory usage**: Minimal, processes users sequentially

### 2. Database Impact

- **Read operations**: Fetches all active users
- **Write operations**: Updates UsernameHistory collection
- **Indexes**: Ensure `userId` is indexed in UsernameHistory

### 3. Discord API Usage

- **2 API calls per user**: Member data + User data
- **Rate limit**: 50 requests per second (Discord's limit)
- **Built-in delays** prevent hitting rate limits

## 🔄 Maintenance

### 1. Regular Tasks

- **Monitor logs** for errors or issues
- **Check Discord API status** if updates fail
- **Review nickname changes** periodically
- **Update bot permissions** if needed

### 2. Backup

- **UsernameHistory collection** contains valuable data
- **Regular backups** recommended
- **Export data** before major changes

### 3. Updates

- **Keep Discord bot token** updated
- **Monitor Discord API changes**
- **Update script** if needed

## 🎉 Success!

Once set up, your system will:

1. **Automatically update nicknames** every day at the scheduled time
2. **Track all nickname changes** in the database
3. **Provide detailed logs** of the process
4. **Handle errors gracefully** without affecting the main application
5. **Keep user data synchronized** with Discord

The investment game will now always use the most up-to-date nicknames from your Discord server!
