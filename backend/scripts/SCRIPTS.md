# Scripts Documentation

Complete guide to all available scripts in the School Admissions Core project.

---

## Setup Scripts

### `setup.sh` (Root)
**Quick setup script for the entire project**

```bash
./setup.sh
```

**What it does:**
- Checks Node.js and npm versions
- Installs backend and frontend dependencies
- Creates `.env` files with generated JWT_SECRET
- Runs database migrations
- Seeds database with initial data
- Seeds permissions

**Location:** `/setup.sh`

---

## Database Scripts

### `reset-db.ts`
**Reset the database (DESTRUCTIVE)**

```bash
npx tsx scripts/reset-db.ts --confirm
```

**What it does:**
- Drops all database tables
- Runs migrations from scratch
- ⚠️ **WARNING:** Deletes all data!

**Use when:**
- Starting fresh development
- Testing migrations
- Resolving database issues

**Location:** `backend/scripts/reset-db.ts`

### `backup-db.sh`
**Backup PostgreSQL database**

```bash
./scripts/backup-db.sh
```

**What it does:**
- Creates SQL dump of database
- Compresses backup with gzip
- Removes backups older than 30 days

**Configuration:**
- `BACKUP_DIR`: Backup directory (default: `/opt/backups/school-admissions`)
- `DB_NAME`: Database name (default: `school_admissions`)
- `DB_USER`: Database user (default: `schoolapp`)

**Location:** `backend/scripts/backup-db.sh`

---

## IP Management Scripts

### `unblock-ip.ts`
**Unblock a specific IP address**

```bash
npx tsx scripts/unblock-ip.ts <IP_ADDRESS>
```

**Example:**
```bash
npx tsx scripts/unblock-ip.ts 192.168.1.100
```

**What it does:**
- Sets `isActive = false` for the specified IP
- Shows confirmation message

**Location:** `backend/scripts/unblock-ip.ts`

### `unblock-all-ips.ts`
**Unblock ALL IP addresses (EMERGENCY)**

```bash
npx tsx scripts/unblock-all-ips.ts
```

**What it does:**
- Unblocks all currently blocked IPs
- ⚠️ **WARNING:** Use only in emergencies!

**Location:** `backend/scripts/unblock-all-ips.ts`

### `list-blocked-ips.ts`
**List all blocked IP addresses**

```bash
npx tsx scripts/list-blocked-ips.ts
```

**What it does:**
- Shows all active blocked IPs
- Displays reason, blocked date, expiration
- Shows how to unblock each IP

**Location:** `backend/scripts/list-blocked-ips.ts`

---

## Development Scripts

### `create-page.ts`
**Interactive page generator**

```bash
npm run create-page
# or
npx tsx scripts/create-page.ts
```

**What it does:**
- Guides you through creating a new page
- Updates `permission-registry.ts`
- Creates React component
- Generates documentation

**Location:** `backend/scripts/create-page.ts`

### `test-api-key.ts`
**Test API key functionality**

```bash
npx tsx scripts/test-api-key.ts <api-key>
```

**What it does:**
- Tests API key authentication
- Makes sample requests to various endpoints
- Shows response status and data

**Location:** `backend/scripts/test-api-key.ts`

---

## Utility Scripts

### `check-env.ts`
**Check environment variables**

```bash
npx tsx scripts/check-env.ts
```

**What it does:**
- Verifies `.env` file exists
- Checks all required environment variables
- Validates JWT_SECRET strength
- Shows missing or invalid variables

**Location:** `backend/scripts/check-env.ts`

### `health-check.ts`
**Check API health status**

```bash
npx tsx scripts/health-check.ts
```

**What it does:**
- Checks if API server is running
- Tests database connection
- Shows response times
- Exits with error code if unhealthy

**Location:** `backend/scripts/health-check.ts`

---

## NPM Scripts

These scripts are available via `npm run` in the backend directory:

### Database
```bash
npm run seed              # Seed database
npm run seed-permissions # Seed permissions
npm run reset:seed       # Reset and seed
```

### Prisma
```bash
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
```

### IP Management
```bash
npm run unblock-ip       # Unblock IP (requires IP argument)
npm run unblock-all      # Unblock all IPs
npm run list-blocked     # List blocked IPs
```

### Development
```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run create-page      # Create new page
```

---

## Script Categories

### 🔧 Setup & Configuration
- `setup.sh` - Initial project setup
- `check-env.ts` - Environment validation

### 💾 Database
- `reset-db.ts` - Reset database
- `backup-db.sh` - Backup database

### 🔒 Security & IP Management
- `unblock-ip.ts` - Unblock specific IP
- `unblock-all-ips.ts` - Unblock all IPs
- `list-blocked-ips.ts` - List blocked IPs

### 🛠️ Development Tools
- `create-page.ts` - Page generator
- `test-api-key.ts` - API key testing
- `health-check.ts` - Health monitoring

---

## Best Practices

1. **Always use `--confirm` for destructive operations**
   - `reset-db.ts --confirm`
   - `unblock-all-ips.ts` (shows warning)

2. **Check environment before running scripts**
   ```bash
   npx tsx scripts/check-env.ts
   ```

3. **Verify health after setup**
   ```bash
   npx tsx scripts/health-check.ts
   ```

4. **Backup before reset**
   ```bash
   ./scripts/backup-db.sh  # If using PostgreSQL
   ```

5. **Use scripts in order**
   - Setup: `./setup.sh`
   - Check: `npx tsx scripts/check-env.ts`
   - Health: `npx tsx scripts/health-check.ts`

---

## Troubleshooting

### Script fails with "command not found"
- Make sure you're in the correct directory
- Check that Node.js is installed: `node --version`
- Verify script exists: `ls scripts/`

### Database scripts fail
- Check `.env` file exists
- Verify `DATABASE_URL` is correct
- Run `npx tsx scripts/check-env.ts`

### IP scripts don't work
- Make sure database is running
- Check that IP blocking is enabled
- Verify you have admin permissions

### Health check fails
- Ensure backend server is running: `npm run dev`
- Check API URL in script matches your setup
- Verify database connection

---

## Adding New Scripts

When creating new scripts:

1. **Add ASCII art banner** (see examples)
2. **Use color functions** for output
3. **Add error handling** with try/catch
4. **Include usage instructions** in banner
5. **Update this documentation**

Example template:
```typescript
// ASCII Art Banner
const BANNER = `...`;

// Colors
const GREEN = '\x1b[32m';
// ...

function printSuccess(msg: string) {
  console.log(`${GREEN}✅ ${msg}${RESET}`);
}
```

---

## Quick Reference

| Script | Purpose | Destructive |
|--------|---------|-------------|
| `setup.sh` | Initial setup | No |
| `reset-db.ts` | Reset database | ⚠️ Yes |
| `backup-db.sh` | Backup database | No |
| `unblock-ip.ts` | Unblock IP | No |
| `unblock-all-ips.ts` | Unblock all | ⚠️ Yes |
| `list-blocked-ips.ts` | List IPs | No |
| `create-page.ts` | Create page | No |
| `test-api-key.ts` | Test API key | No |
| `check-env.ts` | Check env vars | No |
| `health-check.ts` | Health check | No |

---

## Support

For issues with scripts:
1. Check this documentation
2. Run `npx tsx scripts/check-env.ts`
3. Verify Node.js version (18+)
4. Check script permissions: `chmod +x scripts/*.sh`
