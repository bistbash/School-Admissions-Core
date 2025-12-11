# Guides

How-to guides and tutorials.

---

## Files

- **[HOW_TO_CHECK_ADMIN.md](./HOW_TO_CHECK_ADMIN.md)** - Check if user is admin
- **[LARGE_FILE_UPLOADS.md](./LARGE_FILE_UPLOADS.md)** - Upload large files
- **[RATE_LIMITING.md](./RATE_LIMITING.md)** - Rate limiting guide
- **[UNBLOCK_IP.md](./UNBLOCK_IP.md)** - Unblock IP address
- **[DATABASE_SEEDING.md](./DATABASE_SEEDING.md)** - Database seeding

---

## Quick Reference

### Check Admin
```typescript
const user = await apiClient.get('/auth/me');
const isAdmin = user.data.isAdmin;
```

### Upload Large File
```bash
POST /api/students/upload
# Regular: 10MB, Trusted: 200MB, Admin: 500MB
```

### Unblock IP
```bash
cd backend
npx tsx scripts/unblock-ip.ts YOUR_IP
```
