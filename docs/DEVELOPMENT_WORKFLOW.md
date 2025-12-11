# מדריך Workflow פיתוח

מדריך מקיף ל-workflow פיתוח במערכת School Admissions Core.

---

## תוכן עניינים

1. [Setup ראשוני](#setup-ראשוני)
2. [Workflow יומי](#workflow-יומי)
3. [יצירת Feature חדש](#יצירת-feature-חדש)
4. [Git Workflow](#git-workflow)
5. [Testing](#testing)
6. [Code Review](#code-review)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Setup ראשוני

### 1. Clone Repository

```bash
git clone <repository-url>
cd School-Admissions-Core
```

### 2. Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your configuration

# Run migrations
npx prisma migrate dev

# Seed database
npm run seed
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:3000/api" > .env
```

### 4. Verify Setup

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

פתח `http://localhost:5173` ובדוק שהכל עובד.

---

## Workflow יומי

### בוקר

1. **Pull Latest Changes**
   ```bash
   git pull origin main
   ```

2. **Update Dependencies** (אם צריך)
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd frontend
   npm install
   ```

3. **Run Migrations** (אם יש חדשות)
   ```bash
   cd backend
   npx prisma migrate dev
   ```

4. **Start Development Servers**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

### במהלך היום

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Develop Feature**
   - כתוב קוד
   - בדוק שהכל עובד
   - Commit changes

3. **Test Changes**
   ```bash
   # Backend tests
   cd backend
   npm test
   
   # Frontend tests
   cd frontend
   npm test
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

### סוף יום

1. **Push Changes**
   ```bash
   git push origin feature/my-feature
   ```

2. **Create Pull Request** (אם מוכן)

---

## יצירת Feature חדש

### שלב 1: תכנון

1. **Define Requirements**
   - מה ה-feature צריך לעשות?
   - איזה API endpoints נדרשים?
   - איזה UI components נדרשים?
   - איזה permissions נדרשים?

2. **Design Database Schema** (אם צריך)
   - איזה models חדשים?
   - איזה relations?
   - איזה indexes?

### שלב 2: Backend Development

1. **Create Database Migration** (אם צריך)
   ```bash
   cd backend
   npx prisma migrate dev --name add_new_feature
   ```

2. **Create Module**
   ```bash
   mkdir -p src/modules/my-feature
   # Create controller, service, routes
   ```

3. **Implement API**
   - Service layer
   - Controller layer
   - Routes
   - Permissions

4. **Test API**
   ```bash
   # Use Postman/curl/API client
   curl http://localhost:3000/api/my-feature
   ```

### שלב 3: Frontend Development

1. **Create Feature**
   ```bash
   mkdir -p src/features/my-feature
   # Create page component
   ```

2. **Add Route**
   ```tsx
   // App.tsx
   <Route path="my-feature" element={<MyFeaturePage />} />
   ```

3. **Implement UI**
   - Components
   - API integration
   - State management
   - Permissions

4. **Test UI**
   - בדוק שהכל עובד
   - בדוק permissions
   - בדוק error handling

### שלב 4: Integration

1. **Test End-to-End**
   - בדוק את כל ה-flow
   - בדוק edge cases
   - בדוק error scenarios

2. **Update Documentation**
   - עדכן API docs
   - עדכן user docs
   - עדכן developer docs

---

## Git Workflow

### Branch Strategy

- **main** - Production-ready code
- **develop** - Development branch (אם יש)
- **feature/*** - New features
- **bugfix/*** - Bug fixes
- **hotfix/*** - Critical fixes

### Commit Messages

השתמש ב-Conventional Commits:

```
feat: add new feature
fix: fix bug
docs: update documentation
style: code formatting
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

### Pull Request Process

1. **Create PR**
   - Title: Clear description
   - Description: What changed and why
   - Link to issues (אם יש)

2. **Code Review**
   - Request review from team
   - Address feedback
   - Update PR

3. **Merge**
   - Squash and merge (מומלץ)
   - Delete branch after merge

---

## Testing

### Backend Tests

```bash
cd backend
npm test
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Manual Testing Checklist

- [ ] Feature works as expected
- [ ] Permissions are enforced
- [ ] Error handling works
- [ ] UI is responsive
- [ ] Dark mode works
- [ ] No console errors
- [ ] No TypeScript errors

---

## Code Review

### Checklist

- [ ] Code follows style guide
- [ ] No TypeScript errors
- [ ] No console.log statements
- [ ] Error handling is proper
- [ ] Permissions are checked
- [ ] Audit logging is implemented
- [ ] Documentation is updated
- [ ] Tests pass

### Review Comments

- **Must Fix** - Critical issues
- **Should Fix** - Important improvements
- **Nice to Have** - Optional improvements

---

## Deployment

### Development

```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

### Production

ראה `docs/deployment/PHYSICAL_SERVER_DEPLOYMENT.md` לפרטים.

---

## Troubleshooting

### Database Issues

```bash
# Reset database (development only!)
cd backend
npx prisma migrate reset

# Regenerate Prisma Client
npx prisma generate
```

### Dependency Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000  # Backend
lsof -i :5173  # Frontend

# Kill process
kill -9 <PID>
```

### Migration Issues

```bash
# Check migration status
npx prisma migrate status

# Reset migrations (development only!)
npx prisma migrate reset
```

---

## Best Practices

### 1. Code Quality

- ✅ TypeScript strict mode
- ✅ No `any` types
- ✅ Proper error handling
- ✅ Input validation
- ✅ Permission checks

### 2. Security

- ✅ Always check permissions
- ✅ Validate all input
- ✅ Use parameterized queries (Prisma)
- ✅ Audit log important actions
- ✅ Never log sensitive data

### 3. Performance

- ✅ Use database indexes
- ✅ Paginate large lists
- ✅ Cache when appropriate
- ✅ Optimize queries

### 4. Documentation

- ✅ Document complex logic
- ✅ Update API docs
- ✅ Update user docs
- ✅ Keep README updated

---

## סיכום

מדריך זה מכסה את ה-workflow הבסיסי של פיתוח במערכת. למידע נוסף:

- [Architecture Guide](./ARCHITECTURE.md)
- [Backend Development Guide](./BACKEND_DEVELOPMENT.md)
- [Frontend Development Guide](./FRONTEND_DEVELOPMENT.md)
- [Database Guide](./DATABASE_GUIDE.md)
