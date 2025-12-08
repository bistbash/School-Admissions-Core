# School Admissions Core

A full-stack application for managing military resources (soldiers, departments, roles, and rooms) with a React frontend and Express backend.

## Features

- ✅ **Secure Authentication** - JWT-based authentication with bcrypt password hashing
- ✅ **API Keys** - Secure API key authentication for programmatic access
- ✅ **User Registration & Login** - Secure user registration and login system
- ✅ **Audit Logging** - Comprehensive audit trail of all system activities
- ✅ **SOC API** - Security Operations Center API for monitoring and analysis
- ✅ **IP Blocking** - Block malicious IP addresses automatically
- ✅ **Incident Management** - SOC Analyst tools for managing security events
- ✅ CRUD operations for Soldiers, Departments, Roles, and Rooms
- ✅ Input validation with Zod
- ✅ Type-safe API with TypeScript
- ✅ Error handling middleware
- ✅ RTL (Right-to-Left) Hebrew UI support
- ✅ Edit functionality for all resources
- ✅ Protected routes requiring authentication

## Tech Stack

### Backend
- **Node.js** with **Express**
- **TypeScript**
- **Prisma** ORM with SQLite
- **Zod** for validation
- **bcrypt** for password hashing
- **jsonwebtoken** for JWT authentication

### Frontend
- **React 19** with **TypeScript**
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Axios** for API calls

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

**IMPORTANT**: Edit `.env` and set a strong `JWT_SECRET`:
```bash
# Generate a secure secret:
openssl rand -base64 32

# Add to .env:
JWT_SECRET=your-generated-secret-here
```

4. Run database migrations:
```bash
npx prisma migrate dev
```

5. Seed the database with initial admin user (optional but recommended):
```bash
npm run seed
```

This will create:
- Initial admin user (email: `admin@school.local`, password: `Admin123!@#`)
- Default department and role
- All system permissions

**Important**: Change the admin password after first login!

You can customize the seed data by setting environment variables:
- `ADMIN_EMAIL` - Admin email (default: `admin@school.local`)
- `ADMIN_PASSWORD` - Admin password (default: `Admin123!@#`)
- `ADMIN_NAME` - Admin name (default: `System Administrator`)
- `DEFAULT_DEPARTMENT_NAME` - Default department name
- `DEFAULT_ROLE_NAME` - Default role name

6. Start the development server:
```bash
npm run dev
```

The backend will run on `http://localhost:3000`

**Auto-seeding**: If you set `AUTO_SEED=true` in your `.env` file, the server will automatically seed the database on startup if it's empty (development only).

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (optional):
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Project Structure

```
School-Admissions-Core/
├── backend/
│   ├── src/
│   │   ├── lib/           # Shared utilities (prisma, errors, validation)
│   │   ├── modules/       # Feature modules (soldiers, departments, etc.)
│   │   └── server.ts      # Express server setup
│   └── prisma/
│       └── schema.prisma  # Database schema
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── lib/           # API client and utilities
│   │   ├── types/         # TypeScript type definitions
│   │   └── App.tsx        # Main app component
│   └── ...
└── docs/                  # Comprehensive documentation
    ├── security/          # Security documentation
    ├── features/          # Feature documentation
    ├── guides/            # How-to guides
    └── improvements/      # Improvement documentation
```

## Documentation

תיעוד מקיף של המערכת נמצא בתיקיית [`docs/`](./docs/):

- **[📚 Documentation Overview](./docs/README.md)** - סקירה כללית של כל התיעוד
- **[🔒 Security](./docs/security/)** - תיעוד אבטחה מקיף
- **[⚙️ Features](./docs/features/)** - תיעוד תכונות המערכת
- **[📖 Guides](./docs/guides/)** - מדריכים והנחיות
- **[🚀 Improvements](./docs/improvements/)** - תיעוד שיפורים שבוצעו

### Quick Links

- [Admin System](./docs/features/ADMIN_SYSTEM.md) - מערכת ניהול מנהלים
- [Permissions System](./docs/features/PERMISSIONS_SYSTEM.md) - מערכת הרשאות
- [Security Assessment](./docs/security/SECURITY_ASSESSMENT.md) - הערכת אבטחה
- [How to Check Admin](./docs/guides/HOW_TO_CHECK_ADMIN.md) - איך לבדוק אם משתמש הוא admin
- [Large File Uploads](./docs/guides/LARGE_FILE_UPLOADS.md) - העלאת קבצים גדולים
- [Database Seeding](./docs/guides/DATABASE_SEEDING.md) - מדריך ליצירת משתמש אדמין ראשוני

## API Endpoints

### Authentication (Public)
- `POST /api/auth/register` - Register a new user/soldier
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info (Protected)

### Soldiers (Protected - Requires Authentication)
- `GET /api/soldiers` - Get all soldiers
- `GET /api/soldiers/:id` - Get soldier by ID
- `POST /api/soldiers` - Create soldier (Note: Use /auth/register for new users)
- `PUT /api/soldiers/:id` - Update soldier
- `DELETE /api/soldiers/:id` - Delete soldier

### Departments
- `GET /api/departments` - Get all departments
- `GET /api/departments/:id` - Get department by ID
- `POST /api/departments` - Create department
- `GET /api/departments/:id/commanders` - Get department commanders
- `DELETE /api/departments/:id` - Delete department

### Roles
- `GET /api/roles` - Get all roles
- `GET /api/roles/:id` - Get role by ID
- `POST /api/roles` - Create role
- `DELETE /api/roles/:id` - Delete role

### Rooms
- `GET /api/rooms` - Get all rooms
- `GET /api/rooms/:id` - Get room by ID
- `POST /api/rooms` - Create room
- `DELETE /api/rooms/:id` - Delete room

## Improvements Made

### Backend
- ✅ Prisma client singleton pattern to prevent multiple instances
- ✅ Centralized error handling with custom error classes
- ✅ Input validation using Zod schemas
- ✅ Proper TypeScript types throughout
- ✅ Better HTTP status codes (201 for creation)
- ✅ Environment variable configuration
- ✅ CORS configuration

### Frontend
- ✅ Centralized API client with error handling
- ✅ TypeScript types for all data structures
- ✅ Edit functionality for all resources
- ✅ Better error display (no more alerts)
- ✅ Loading states
- ✅ Environment variable support
- ✅ Removed `any` types

## Future Improvements

- [ ] Add authentication and authorization
- [ ] Add pagination for large datasets
- [ ] Add search and filtering
- [ ] Add unit and integration tests
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Migrate to PostgreSQL for production
- [ ] Add logging (Winston/Pino)
- [ ] Add rate limiting
- [ ] Add request/response logging middleware
- [ ] Add Docker support
- [ ] Add CI/CD pipeline

## License

ISC

