# מדריך פיתוח Frontend

מדריך מקיף לפיתוח Frontend במערכת School Admissions Core.

---

## תוכן עניינים

1. [התחלה מהירה](#התחלה-מהירה)
2. [מבנה הפרויקט](#מבנה-הפרויקט)
3. [יצירת Feature חדש](#יצירת-feature-חדש)
4. [Components](#components)
5. [State Management](#state-management)
6. [Routing](#routing)
7. [API Integration](#api-integration)
8. [Permissions](#permissions)
9. [Styling](#styling)
10. [Best Practices](#best-practices)

---

## התחלה מהירה

### דרישות

- Node.js 18+
- npm או yarn

### התקנה

```bash
cd frontend
npm install
```

### הגדרת Environment

צור קובץ `.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

### הרצת שרת פיתוח

```bash
npm run dev
```

האפליקציה תרוץ על `http://localhost:5173`

---

## מבנה הפרויקט

```
frontend/
├── src/
│   ├── features/                # תכונות לפי עמוד
│   │   ├── auth/               # אימות
│   │   ├── dashboard/         # דף בית
│   │   ├── students/           # ניהול תלמידים
│   │   ├── permissions/        # ניהול הרשאות
│   │   └── soc/                # מרכז אבטחה
│   │
│   ├── shared/                 # קומפוננטים משותפים
│   │   ├── components/         # Layout components
│   │   ├── ui/                 # UI components
│   │   ├── hooks/              # Custom hooks
│   │   └── lib/                # Utilities & API client
│   │
│   ├── types/                  # TypeScript types
│   └── App.tsx                 # נקודת כניסה
```

---

## יצירת Feature חדש

### שלב 1: יצירת תיקייה

```bash
mkdir -p src/features/my-feature
```

### שלב 2: יצירת Page Component

`src/features/my-feature/MyFeaturePage.tsx`:

```tsx
import React from 'react';
import { PageWrapper } from '@/shared/components/PageWrapper';
import { Card } from '@/shared/ui/Card';

export function MyFeaturePage() {
  return (
    <PageWrapper title="My Feature">
      <Card>
        <h2>My Feature Content</h2>
        {/* Your content here */}
      </Card>
    </PageWrapper>
  );
}
```

### שלב 3: הוספה ל-Router

`src/App.tsx`:

```tsx
import { MyFeaturePage } from './features/my-feature/MyFeaturePage';

// In Routes
<Route 
  path="my-feature" 
  element={
    <PermissionGuard page="my-feature" pageAction="view" fallback={<Error403Page />}>
      <ErrorHandler>
        <MyFeaturePage />
      </ErrorHandler>
    </PermissionGuard>
  } 
/>
```

### שלב 4: הוספה ל-Navigation

עדכן את `useDynamicNavigation.ts` או הוסף ל-sidebar.

---

## Components

### UI Components

המערכת כוללת ספריית UI components ב-`shared/ui/`:

```tsx
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
```

### דוגמה: שימוש ב-Button

```tsx
<Button 
  onClick={handleClick}
  variant="primary"
  size="md"
>
  Click Me
</Button>
```

### דוגמה: שימוש ב-Modal

```tsx
import { Modal } from '@/shared/ui/Modal';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="My Modal"
      >
        <p>Modal content</p>
      </Modal>
    </>
  );
}
```

---

## State Management

### Local State

```tsx
import { useState } from 'react';

function MyComponent() {
  const [count, setCount] = useState(0);
  
  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

### Context API

המערכת משתמשת ב-Context API לניהול state גלובלי:

```tsx
// Auth Context
import { useAuth } from '@/features/auth/AuthContext';

function MyComponent() {
  const { user, isLoading, logout } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  
  return <div>Hello, {user?.name}</div>;
}
```

```tsx
// Permissions Context
import { usePermissions } from '@/features/permissions/PermissionsContext';

function MyComponent() {
  const { hasPagePermission, hasResourcePermission } = usePermissions();
  
  if (!hasPagePermission('students', 'view')) {
    return <div>No access</div>;
  }
  
  return <div>Students content</div>;
}
```

---

## Routing

### React Router

המערכת משתמשת ב-React Router:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

<Routes>
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/students" element={<StudentsPage />} />
</Routes>
```

### Protected Routes

```tsx
import { PermissionGuard } from '@/features/permissions/PermissionGuard';

<Route 
  path="students" 
  element={
    <PermissionGuard page="students" pageAction="view" fallback={<Error403Page />}>
      <StudentsPage />
    </PermissionGuard>
  } 
/>
```

### Navigation

```tsx
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();
  
  const handleClick = () => {
    navigate('/students');
  };
  
  return <button onClick={handleClick}>Go to Students</button>;
}
```

---

## API Integration

### API Client

המערכת כוללת API client ב-`shared/lib/api.ts`:

```tsx
import { apiClient } from '@/shared/lib/api';

// GET request
const students = await apiClient.get('/students');

// POST request
const newStudent = await apiClient.post('/students', {
  idNumber: '123456789',
  firstName: 'John',
  lastName: 'Doe',
});

// PUT request
await apiClient.put(`/students/${id}`, {
  firstName: 'Jane',
});

// DELETE request
await apiClient.delete(`/students/${id}`);
```

### עם Error Handling

```tsx
import { apiClient } from '@/shared/lib/api';

async function fetchStudents() {
  try {
    const response = await apiClient.get('/students');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch students:', error);
    throw error;
  }
}
```

### עם Loading State

```tsx
import { useState, useEffect } from 'react';
import { apiClient } from '@/shared/lib/api';

function StudentsList() {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const response = await apiClient.get('/students');
        setStudents(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <ul>
      {students.map(student => (
        <li key={student.id}>{student.firstName}</li>
      ))}
    </ul>
  );
}
```

---

## Permissions

### Permission Guard

```tsx
import { PermissionGuard } from '@/features/permissions/PermissionGuard';

<PermissionGuard 
  page="students" 
  pageAction="view" 
  fallback={<Error403Page />}
>
  <StudentsPage />
</PermissionGuard>
```

### Permission Hooks

```tsx
import { usePermissions } from '@/features/permissions/PermissionsContext';

function MyComponent() {
  const { hasPagePermission, hasResourcePermission } = usePermissions();
  
  const canView = hasPagePermission('students', 'view');
  const canEdit = hasPagePermission('students', 'edit');
  const canCreate = hasResourcePermission('students', 'create');
  
  return (
    <div>
      {canView && <div>View content</div>}
      {canEdit && <button>Edit</button>}
      {canCreate && <button>Create</button>}
    </div>
  );
}
```

---

## Styling

### Tailwind CSS

המערכת משתמשת ב-Tailwind CSS:

```tsx
<div className="flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-800">
  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
    Hello World
  </h1>
</div>
```

### Dark Mode

המערכת תומכת ב-Dark Mode אוטומטית:

```tsx
// Classes מתאימים אוטומטית ל-dark mode
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Content
</div>
```

### Responsive Design

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>
```

---

## Best Practices

### 1. Component Structure

```tsx
// ✅ Good - Clear structure
export function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  return (
    <PageWrapper title="Students">
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <StudentsList students={students} />
      )}
    </PageWrapper>
  );
}
```

### 2. Type Safety

```tsx
// ✅ Good - TypeScript types
interface Student {
  id: number;
  firstName: string;
  lastName: string;
}

function StudentsList({ students }: { students: Student[] }) {
  return (
    <ul>
      {students.map(student => (
        <li key={student.id}>{student.firstName}</li>
      ))}
    </ul>
  );
}
```

### 3. Error Handling

```tsx
// ✅ Good - Error handling
function MyComponent() {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // fetch data
      } catch (err) {
        setError(err as Error);
      }
    }
    fetchData();
  }, []);

  if (error) return <div>Error: {error.message}</div>;
  
  return <div>Content</div>;
}
```

### 4. Loading States

```tsx
// ✅ Good - Loading states
function MyComponent() {
  const [isLoading, setIsLoading] = useState(true);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <div>Content</div>;
}
```

### 5. Permissions

```tsx
// ✅ Good - Always check permissions
function MyComponent() {
  const { hasPagePermission } = usePermissions();

  if (!hasPagePermission('students', 'view')) {
    return <Error403Page />;
  }

  return <div>Content</div>;
}
```

### 6. Code Organization

```tsx
// ✅ Good - Feature-based organization
// features/students/
//   ├── StudentsPage.tsx
//   ├── StudentsList.tsx
//   ├── AddStudentModal.tsx
//   └── hooks/
//       └── useStudents.ts
```

---

## Scripts שימושיים

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run preview         # Preview production build

# Linting
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint errors

# Type checking
npm run type-check      # Check TypeScript types
```

---

## סיכום

מדריך זה מכסה את היסודות של פיתוח Frontend במערכת. למידע נוסף:

- [Architecture Guide](./ARCHITECTURE.md)
- [Backend Development Guide](./BACKEND_DEVELOPMENT.md)
- [Permissions System](./PERMISSIONS_SYSTEM.md)
