# Docker Setup for Business Empire

This guide will help you run the Business Empire application using Docker and Docker Compose.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)
- At least 4GB of available RAM
- At least 10GB of available disk space

## Quick Start

1. **Clone and navigate to the project:**
   ```bash
   cd /root/projects/business-empire
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your actual configuration values
   ```

3. **Start the application:**
   ```bash
   ./scripts/docker-start.sh
   ```

4. **Access the application:**
   - Application: http://localhost:3000
   - MongoDB: localhost:27017
   - Redis: localhost:6379
   - Nginx: http://localhost:80

## Manual Setup

If you prefer to run commands manually:

### 1. Build and Start Services

```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

### 2. Stop Services

```bash
# Stop services
docker-compose down

# Stop and remove volumes (resets all data)
docker-compose down -v

# Stop and remove images
docker-compose down --rmi all
```

## Services Overview

### Application (app)
- **Port:** 3000
- **Image:** Built from local Dockerfile
- **Dependencies:** MongoDB, Redis
- **Features:** Next.js app with Socket.io, Discord bot integration

### MongoDB (mongodb)
- **Port:** 27017
- **Image:** mongo:7.0
- **Credentials:** admin/password123
- **Database:** business-empire
- **Features:** Persistent data storage, health checks

### Redis (redis)
- **Port:** 6379
- **Image:** redis:7-alpine
- **Features:** Caching, session storage

### Nginx (nginx)
- **Ports:** 80, 443
- **Image:** nginx:alpine
- **Features:** Reverse proxy, load balancing, SSL termination

## Environment Configuration

Copy `env.example` to `.env` and configure the following variables:

### Required Variables
```bash
# Database
MONGODB_URI=mongodb://admin:password123@mongodb:27017/business-empire?authSource=admin

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Discord (if using Discord features)
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_GUILD_ID=your-discord-guild-id
```

### Optional Variables
```bash
# Redis
REDIS_URL=redis://redis:6379

# File uploads
MAX_FILE_SIZE=10485760
UPLOAD_DIR=public/uploads

# Performance
NODE_OPTIONS=--max-old-space-size=4096
```

## Data Persistence

### Volumes
- `mongodb_data`: MongoDB data persistence
- `redis_data`: Redis data persistence
- `./public/uploads`: File uploads (mounted from host)
- `./logs`: Application logs (mounted from host)

### Backup and Restore

#### Backup MongoDB
```bash
# Create backup
docker-compose exec mongodb mongodump --uri="mongodb://admin:password123@localhost:27017/business-empire?authSource=admin" --out /backup

# Copy backup to host
docker cp business-empire-mongodb:/backup ./mongodb-backup
```

#### Restore MongoDB
```bash
# Copy backup to container
docker cp ./mongodb-backup business-empire-mongodb:/restore

# Restore database
docker-compose exec mongodb mongorestore --uri="mongodb://admin:password123@localhost:27017/business-empire?authSource=admin" /restore
```

## Development

### Development Mode
For development with hot reloading:

```bash
# Start only database services
docker-compose up -d mongodb redis

# Run app in development mode
npm run dev
```

### Debugging

#### View Application Logs
```bash
docker-compose logs -f app
```

#### Access MongoDB Shell
```bash
docker-compose exec mongodb mongosh -u admin -p password123
```

#### Access Redis CLI
```bash
docker-compose exec redis redis-cli
```

#### Access Application Container
```bash
docker-compose exec app sh
```

## Production Deployment

### Security Considerations
1. Change default passwords in `.env`
2. Use strong `NEXTAUTH_SECRET`
3. Configure proper CORS origins
4. Set up SSL certificates
5. Use Docker secrets for sensitive data

### Performance Optimization
1. Increase `NODE_OPTIONS` memory limit
2. Configure Redis for caching
3. Use CDN for static assets
4. Enable gzip compression in Nginx
5. Set up monitoring and logging

### Scaling
```bash
# Scale application instances
docker-compose up --scale app=3 -d

# Use external load balancer
# Configure Nginx upstream for multiple app instances
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
sudo netstat -tulpn | grep :3000

# Stop conflicting services or change ports in docker-compose.yml
```

#### MongoDB Connection Issues
```bash
# Check MongoDB logs
docker-compose logs mongodb

# Verify connection string in .env
# Ensure MongoDB is healthy: docker-compose ps
```

#### Memory Issues
```bash
# Increase Docker memory limit
# Add to docker-compose.yml:
# deploy:
#   resources:
#     limits:
#       memory: 2G
```

#### File Permission Issues
```bash
# Fix upload directory permissions
sudo chown -R 1001:1001 public/uploads
sudo chmod -R 755 public/uploads
```

### Health Checks
```bash
# Check all services
docker-compose ps

# Test application health
curl http://localhost:3000/api/health

# Test MongoDB
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Test Redis
docker-compose exec redis redis-cli ping
```

## Useful Commands

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app

# Restart specific service
docker-compose restart app

# Update and restart
docker-compose pull && docker-compose up -d

# Clean up unused resources
docker system prune -a

# View resource usage
docker stats
```

## Support

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Verify environment variables in `.env`
3. Ensure all required ports are available
4. Check Docker and Docker Compose versions
5. Review the troubleshooting section above

For additional help, check the main project documentation or create an issue in the project repository.
