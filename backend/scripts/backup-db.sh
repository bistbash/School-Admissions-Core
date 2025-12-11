#!/bin/bash
#
# Database Backup Script for School Admissions Core
# This script backs up the PostgreSQL database and compresses the backup.
# It automatically removes backups older than 30 days.
#
# Usage: ./backup-db.sh
#

# ASCII Art Banner
cat << "EOF"

╔══════════════════════════════════════════════════════════╗
║                                                          ║
║              💾 Database Backup Tool                    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝

EOF

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ️  $1${NC}"; }

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/school-admissions}"
DB_NAME="${DB_NAME:-school_admissions}"
DB_USER="${DB_USER:-schoolapp}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/db_backup_${DATE}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"
print_info "Backup directory: ${BOLD}${BACKUP_DIR}${NC}"

# Check if PostgreSQL is available
if ! command -v pg_dump &> /dev/null; then
    print_error "pg_dump command not found. Please install PostgreSQL client tools."
    exit 1
fi

# Perform backup
print_info "Starting database backup..."
print_info "Database: ${BOLD}${DB_NAME}${NC}"
print_info "User: ${BOLD}${DB_USER}${NC}"
echo ""

pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    print_success "Backup completed successfully"
    print_info "File: ${BOLD}${BACKUP_FILE}${NC}"
    print_info "Size: ${BOLD}${BACKUP_SIZE}${NC}"
    echo ""
    
    # Compress backup
    print_info "Compressing backup..."
    gzip "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        COMPRESSED_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
        print_success "Backup compressed successfully"
        print_info "File: ${BOLD}${BACKUP_FILE}.gz${NC}"
        print_info "Size: ${BOLD}${COMPRESSED_SIZE}${NC}"
        echo ""
        
        # Remove backups older than 30 days
        print_info "Cleaning up old backups (older than 30 days)..."
        OLD_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 | wc -l)
        
        if [ "$OLD_COUNT" -gt 0 ]; then
            find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
            print_info "Removed ${OLD_COUNT} old backup(s)"
        else
            print_info "No old backups to remove"
        fi
        
        echo ""
        print_success "Backup process completed successfully!"
        exit 0
    else
        print_error "Failed to compress backup"
        exit 1
    fi
else
    print_error "Database backup failed"
    exit 1
fi
