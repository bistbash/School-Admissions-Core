# School Admissions Core

Complete school management system with advanced permissions and enterprise-level security.

---

## Quick Setup

```bash
# Run setup script
./setup.sh

# Or manually:
cd backend && npm install && npx prisma migrate dev && npm run seed
cd ../frontend && npm install
```

---

## Start Development

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`

---

## Default Admin

After seeding:
- Email: `admin@school.local`
- Password: `Admin123!@#`

**⚠️ Change password after first login!**

---

## Tech Stack

**Backend:**
- Node.js + Express 5
- TypeScript
- Prisma ORM (SQLite)
- JWT + API Keys

**Frontend:**
- React 19
- TypeScript
- Vite
- Tailwind CSS

---

## Key Features

- **Student Management**: Full CRUD with Excel upload
- **Cohorts & Classes**: Automatic grade calculation
- **Permissions System**: Page-based with auto API permissions
- **Security**: SOC, audit logging, IP blocking, rate limiting
- **API Keys**: Secure API key management

---

## Documentation

See [docs/README.md](./docs/README.md) for complete developer documentation:

- [Developer Guide](./docs/DEVELOPER_GUIDE.md) - Quick reference
- [Architecture](./docs/ARCHITECTURE.md) - System architecture
- [Permissions & Security](./docs/PERMISSIONS_AND_SECURITY.md) - Security guide
- [Grades, Cohorts & Classes](./docs/GRADES_COHORTS_CLASSES.md) - Academic system
- [API Reference](./docs/API_REFERENCE.md) - API endpoints

---

## Project Structure

```
backend/          # Express API
frontend/         # React app
docs/             # Documentation
setup.sh          # Setup script
```

---

## Environment Variables

### Backend (.env)

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
PORT=3000
FRONTEND_URL="http://localhost:5173"
AUTO_SEED="true"
```

### Frontend (.env)

```env
VITE_API_URL="http://localhost:3000/api"
```

---

## Scripts

### Backend

```bash
npm run dev              # Start dev server
npm run seed             # Seed database
npm run seed-permissions # Seed permissions
npx prisma studio        # Open Prisma Studio
```

### Frontend

```bash
npm run dev              # Start dev server
npm run build            # Build for production
```

---

## License

ISC
