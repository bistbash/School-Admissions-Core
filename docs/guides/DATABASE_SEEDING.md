# Database Seeding

How to seed the database with initial data.

---

## Seed Scripts

### Seed Database

```bash
cd backend
npm run seed
```

Creates:
- Admin user
- Cohorts (1973 to current year + 1)
- Sample data (if configured)

### Seed Permissions

```bash
npm run seed-permissions
```

Creates all permissions from `permission-registry.ts`.

---

## Auto-Seed

Set in `.env`:
```env
AUTO_SEED="true"
```

Database auto-seeds on startup if empty (development only).

---

## Default Admin

After seeding:
- Email: `admin@school.local` (or from `.env`)
- Password: `Admin123!@#` (or from `.env`)

**⚠️ Change password after first login!**

---

## Environment Variables

```env
ADMIN_EMAIL=admin@school.local
ADMIN_PASSWORD=Admin123!@#
ADMIN_NAME=System Administrator
DEFAULT_DEPARTMENT_NAME=מנהלה  # Optional
DEFAULT_ROLE_NAME=מנהל מערכת  # Optional
```

---

## Reset Database

```bash
# Reset and re-seed
npm run reset:seed
```

**Warning**: This deletes all data!

---

## Troubleshooting

### Seed fails with "Database already contains data"

```bash
npm run seed:force
```

### Auto-seed not working

Check:
1. `AUTO_SEED=true` in `.env`
2. `NODE_ENV=development`
3. Database is empty
