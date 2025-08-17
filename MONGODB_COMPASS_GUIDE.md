# MongoDB Compass Connection Guide

## Overview
This guide explains how to connect MongoDB Compass to your MongoDB instance running on the server.

## Server Information
- **Server IP**: 82.26.104.66
- **MongoDB Port**: 27017
- **Database Name**: business-empire
- **Authentication**: None (default setup)

## Connection Methods

### Method 1: Direct Connection (Recommended)

**Connection String:**
```
mongodb://82.26.104.66:27017
```

**Steps in MongoDB Compass:**
1. Open MongoDB Compass
2. Click "New Connection"
3. Paste the connection string above
4. Click "Connect"

### Method 2: Advanced Connection Options

**Connection String with Database:**
```
mongodb://82.26.104.66:27017/business-empire
```

**Advanced Options:**
- **Hostname**: 82.26.104.66
- **Port**: 27017
- **Authentication**: None
- **Database**: business-empire (optional)

### Method 3: Connection String with Options

```
mongodb://82.26.104.66:27017/business-empire?retryWrites=true&w=majority
```

## What You'll See in Compass

### Databases
- `business-empire` - Your main application database
- `admin` - MongoDB system database
- `local` - MongoDB local database

### Collections in business-empire
- `games` - Game state data
- `system.indexes` - Database indexes

### Sample Queries

#### View All Games
```javascript
db.games.find()
```

#### View Active Games
```javascript
db.games.find({ "phase": "playing" })
```

#### View Games by Host
```javascript
db.games.find({ "hostName": "YourHostName" })
```

#### Count Total Games
```javascript
db.games.countDocuments()
```

#### View Game Statistics
```javascript
db.games.stats()
```

## Troubleshooting

### Connection Issues

#### 1. "Connection Refused" Error
- Check if MongoDB is running: `systemctl status mongod`
- Verify port 27017 is open: `netstat -tlnp | grep 27017`

#### 2. "Timeout" Error
- Check server firewall settings
- Verify the server IP address is correct
- Try connecting from the same network

#### 3. "Authentication Failed" Error
- Current setup has no authentication
- If you added authentication, provide username/password

### Server Commands for Verification

```bash
# Check MongoDB status
systemctl status mongod

# Check if MongoDB is listening
netstat -tlnp | grep 27017

# Check MongoDB logs
tail -f /var/log/mongodb/mongod.log

# Test connection locally
mongosh --host 82.26.104.66 --port 27017
```

## Security Considerations

### Current Setup (Development)
- No authentication required
- Accessible from any IP
- Suitable for development/testing

### Production Recommendations
1. **Enable Authentication:**
   ```bash
   # Create admin user
   mongosh --eval "use admin; db.createUser({user: 'admin', pwd: 'password', roles: ['root']})"
   ```

2. **Restrict Network Access:**
   ```bash
   # Edit /etc/mongod.conf
   # Change bindIp to specific IPs
   bindIp: 127.0.0.1,82.26.104.66
   ```

3. **Enable Firewall:**
   ```bash
   ufw enable
   ufw allow from YOUR_IP to any port 27017
   ```

## Connection String Examples

### Basic Connection
```
mongodb://82.26.104.66:27017
```

### With Database
```
mongodb://82.26.104.66:27017/business-empire
```

### With Authentication (if enabled)
```
mongodb://username:password@82.26.104.66:27017/business-empire
```

### With Options
```
mongodb://82.26.104.66:27017/business-empire?retryWrites=true&w=majority&connectTimeoutMS=30000
```

## Useful Compass Features

### 1. Data Explorer
- Browse collections visually
- View document structure
- Edit documents directly

### 2. Schema Analysis
- Analyze data types
- View field distributions
- Identify data patterns

### 3. Performance Monitoring
- Monitor query performance
- View index usage
- Analyze slow queries

### 4. Aggregation Pipeline Builder
- Build complex queries visually
- Test aggregation pipelines
- Export results

## Database Operations via Compass

### Create New Collection
1. Click on database name
2. Click "Create Collection"
3. Enter collection name
4. Click "Create"

### Insert Document
1. Click on collection
2. Click "Add Data" → "Insert Document"
3. Enter JSON document
4. Click "Insert"

### Update Document
1. Find document in collection
2. Click "Edit Document"
3. Modify JSON
4. Click "Update"

### Delete Document
1. Find document in collection
2. Click "Delete Document"
3. Confirm deletion

## Monitoring Queries

### View Active Operations
```javascript
db.currentOp()
```

### View Database Stats
```javascript
db.stats()
```

### View Collection Stats
```javascript
db.games.stats()
```

### Monitor Performance
- Use Compass Performance tab
- View slow query logs
- Monitor index usage
