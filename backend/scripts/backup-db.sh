#!/bin/bash
#
# Database Backup Script for School Admissions Core
#
# This script backs up the PostgreSQL database and compresses the backup.
# It automatically removes backups older than 30 days.
#
# Usage:
#   ./backup-db.sh
#
# To set up automated daily backups, add to crontab:
#   0 2 * * * /opt/school-admissions/backend/scripts/backup-db.sh
#

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/school-admissions}"
DB_NAME="${DB_NAME:-school_admissions}"
DB_USER="${DB_USER:-schoolapp}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/db_backup_${DATE}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if PostgreSQL is available
if ! command -v pg_dump &> /dev/null; then
    echo "Error: pg_dump command not found. Please install PostgreSQL client tools."
    exit 1
fi

# Perform backup
echo "Starting database backup..."
pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: $BACKUP_FILE"
    
    # Compress backup
    echo "Compressing backup..."
    gzip "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo "Backup compressed: ${BACKUP_FILE}.gz"
        
        # Remove backups older than 30 days
        echo "Cleaning up old backups (older than 30 days)..."
        find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
        
        echo "Backup process completed successfully!"
        exit 0
    else
        echo "Error: Failed to compress backup"
        exit 1
    fi
else
    echo "Error: Database backup failed"
    exit 1
fi
