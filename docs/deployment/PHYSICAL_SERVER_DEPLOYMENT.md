# Physical Server Deployment Guide

Complete deployment guide for deploying the School Admissions Core application on a physical Linux server, including database migration from SQLite to PostgreSQL, process management, reverse proxy setup, and production configuration.

## Overview

This guide covers deploying the School Admissions Core application (Node.js/Express backend + React/Vite frontend) on a physical Linux server with PostgreSQL database.

## Prerequisites

- Physical server running Linux (Ubuntu/Debian recommended)
- Root or sudo access
- Node.js 18+ installed
- PostgreSQL installed
- Nginx installed (for reverse proxy)
- PM2 installed (for process management)
- Domain name (optional, for SSL later)

## Step 1: Server Preparation

### 1.1 Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+ (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Install build tools (for native dependencies)
sudo apt install -y build-essential
```

### 1.2 Create Application User

```bash
# Create dedicated user for the application
sudo useradd -m -s /bin/bash schoolapp
sudo mkdir -p /opt/school-admissions
sudo chown schoolapp:schoolapp /opt/school-admissions
```

## Step 2: Database Migration (SQLite → PostgreSQL)

### 2.1 Set Up PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE school_admissions;
CREATE USER schoolapp WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE school_admissions TO schoolapp;
\q
```

### 2.2 Update Prisma Schema

**File: `backend/prisma/schema.prisma`**

Change the datasource configuration:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 2.3 Migrate Database

```bash
cd backend

# Update .env with PostgreSQL connection string
# DATABASE_URL="postgresql://schoolapp:password@localhost:5432/school_admissions?schema=public"

# Generate Prisma client for PostgreSQL
npm run prisma:generate

# Run migrations
npx prisma migrate deploy

# (Optional) Migrate data from SQLite if needed
# You'll need a custom migration script to export from SQLite and import to PostgreSQL
```

## Step 3: Build and Deploy Application

### 3.1 Clone/Transfer Code to Server

```bash
# As schoolapp user
cd /opt/school-admissions
git clone <your-repo-url> .
# OR transfer files via SCP/SFTP
```

### 3.2 Backend Setup

```bash
cd /opt/school-admissions/backend

# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Set up environment variables
cp .env.example .env
# Edit .env with production values:
# - NODE_ENV=production
# - PORT=3000
# - DATABASE_URL=postgresql://schoolapp:password@localhost:5432/school_admissions
# - JWT_SECRET=<strong-secret>
# - FRONTEND_URL=https://your-domain.com (or http://your-ip)
```

### 3.3 Frontend Setup

```bash
cd /opt/school-admissions/frontend

# Install dependencies
npm install

# Build for production
npm run build

# The build output will be in frontend/dist/
```

## Step 4: Process Management with PM2

### 4.1 Create PM2 Ecosystem File

**File: `ecosystem.config.js` (in project root)**

```javascript
module.exports = {
  apps: [{
    name: 'school-admissions-api',
    script: './backend/dist/server.js',
    cwd: '/opt/school-admissions',
    instances: 2, // Use multiple instances for load balancing
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/school-app/api-error.log',
    out_file: '/var/log/school-app/api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
```

### 4.2 Start Application with PM2

```bash
# Create log directory
sudo mkdir -p /var/log/school-app
sudo chown schoolapp:schoolapp /var/log/school-app

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions shown
```

## Step 5: Nginx Reverse Proxy Configuration

### 5.1 Create Nginx Configuration

**File: `/etc/nginx/sites-available/school-admissions`**

```nginx
# Backend API
upstream backend {
    least_conn;
    server localhost:3000;
    server localhost:3001; # If using PM2 cluster mode
}

server {
    listen 80;
    server_name your-domain.com; # Or your server IP

    # Frontend static files
    location / {
        root /opt/school-admissions/frontend/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=3600";
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for large uploads
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoints
    location /health {
        proxy_pass http://backend;
        access_log off;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
}
```

### 5.2 Enable and Test Nginx

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/school-admissions /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Step 6: SSL/TLS Setup (For Later)

### 6.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 Obtain SSL Certificate

```bash
# When ready, run:
sudo certbot --nginx -d your-domain.com

# Certbot will automatically configure Nginx for HTTPS
# Certificates auto-renew via cron
```

## Step 7: Firewall Configuration

### 7.1 Configure UFW Firewall

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS (when SSL is set up)
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

## Step 8: Backup Strategy

### 8.1 Database Backup Script

**File: `/opt/school-admissions/scripts/backup-db.sh`**

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/school-admissions"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup PostgreSQL database
pg_dump -U schoolapp school_admissions > $BACKUP_DIR/db_backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/db_backup_$DATE.sql

# Keep only last 30 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### 8.2 Set Up Automated Backups

```bash
# Create backup directory
sudo mkdir -p /opt/backups/school-admissions
sudo chown schoolapp:schoolapp /opt/backups/school-admissions

# Make script executable
chmod +x /opt/school-admissions/scripts/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /opt/school-admissions/scripts/backup-db.sh
```

## Step 9: Monitoring and Logs

### 9.1 PM2 Monitoring

```bash
# Monitor application
pm2 monit

# View logs
pm2 logs school-admissions-api

# Check status
pm2 status
```

### 9.2 System Logs

- Application logs: `/var/log/school-app/`
- Nginx logs: `/var/log/nginx/`
- PostgreSQL logs: `/var/log/postgresql/`

## Step 10: Deployment Workflow

### 10.1 Update Process

```bash
# SSH into server
ssh user@your-server

# Navigate to app directory
cd /opt/school-admissions

# Pull latest changes
git pull origin main

# Backend updates
cd backend
npm install --production
npm run build
npm run prisma:generate
npx prisma migrate deploy

# Frontend updates
cd ../frontend
npm install
npm run build

# Restart application
pm2 restart school-admissions-api

# Reload Nginx (if config changed)
sudo nginx -t && sudo systemctl reload nginx
```

## Step 11: Environment Variables Checklist

Ensure these are set in `backend/.env`:

- `NODE_ENV=production`
- `PORT=3000`
- `DATABASE_URL=postgresql://schoolapp:password@localhost:5432/school_admissions`
- `JWT_SECRET=<strong-random-secret>`
- `FRONTEND_URL=http://your-ip` (or https://your-domain.com when SSL is ready)
- Any other required environment variables

## Step 12: Security Hardening

- Change default PostgreSQL port (optional)
- Set up fail2ban for SSH protection
- Configure automatic security updates
- Review and restrict file permissions
- Set up log rotation
- Configure rate limiting (already in code, verify settings)

## Troubleshooting

### Common Issues

**Application won't start:**
- Check PM2 logs: `pm2 logs school-admissions-api`
- Verify environment variables are set correctly
- Check database connection: `psql -U schoolapp -d school_admissions`

**Nginx errors:**
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Test configuration: `sudo nginx -t`
- Verify file permissions on frontend/dist directory

**Database connection issues:**
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify database user permissions
- Check connection string in .env file

**Port conflicts:**
- Check what's using ports: `sudo netstat -tlnp | grep -E '3000|80|443'`
- Verify firewall rules: `sudo ufw status`

## Next Steps After Deployment

1. Test all API endpoints
2. Verify frontend loads correctly
3. Test authentication flow
4. Set up domain and SSL when ready
5. Configure monitoring alerts
6. Document server access and credentials securely
7. Set up automated deployment (optional: GitHub Actions, GitLab CI, etc.)

## Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Let's Encrypt/Certbot Documentation](https://certbot.eff.org/)
