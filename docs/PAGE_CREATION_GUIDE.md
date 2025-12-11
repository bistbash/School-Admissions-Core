# Page Creation Guide

How to create new pages in the system.

---

## Quick Method

Use the page generator:

```bash
cd backend
npm run create-page
```

The tool will:
1. Update `permission-registry.ts`
2. Create React component
3. Generate documentation

---

## Manual Method

### 1. Add to Permission Registry

```typescript
// backend/src/lib/permissions/permission-registry.ts
'my-page': {
  page: 'my-page',
  displayName: 'My Page',
  displayNameHebrew: 'הדף שלי',
  category: 'general',
  viewAPIs: [
    { resource: 'my-resource', action: 'read', method: 'GET', path: '/api/my-resource' }
  ],
  editAPIs: [
    { resource: 'my-resource', action: 'create', method: 'POST', path: '/api/my-resource' }
  ],
  supportsEditMode: true
}
```

### 2. Seed Permissions

```bash
npm run seed-permissions
```

### 3. Create Frontend Page

```tsx
// frontend/src/features/my-page/MyPage.tsx
export function MyPage() {
  return <PageWrapper title="My Page">Content</PageWrapper>;
}
```

### 4. Add Route

```tsx
// frontend/src/App.tsx
<Route 
  path="my-page" 
  element={
    <PermissionGuard page="my-page" pageAction="view">
      <MyPage />
    </PermissionGuard>
  } 
/>
```

### 5. Protect API Routes

```typescript
// backend/src/modules/my-resource/my-resource.routes.ts
router.get(
  '/',
  requireResourcePagePermission('my-resource', 'read'),
  controller.getAll
);
```

---

## Next Steps

1. Add to sidebar navigation
2. Create API endpoints (if needed)
3. Test permissions
4. Update documentation
