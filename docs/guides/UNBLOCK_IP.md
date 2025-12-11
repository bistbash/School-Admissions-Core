# Unblock IP Address

How to unblock your IP address if accidentally blocked.

---

## Method 1: Using Script

```bash
cd backend
npx tsx scripts/unblock-ip.ts YOUR_IP_ADDRESS
```

---

## Method 2: Using Prisma Studio

1. Open Prisma Studio: `npx prisma studio`
2. Navigate to `BlockedIP` table
3. Find your IP
4. Set `isActive` to `false`

---

## Method 3: Direct SQL

```sql
UPDATE BlockedIP SET isActive = false WHERE ipAddress = 'YOUR_IP';
```

---

## Method 4: Unblock All

```bash
cd backend
npx tsx scripts/unblock-all-ips.ts
```

**Warning**: This unblocks ALL IPs.

---

## Prevention

1. Set expiration date when blocking IPs
2. Test blocking on test IP first
3. Keep admin access from different IP/network

---

## Notes

- Admins are never blocked
- Trusted users are never blocked
- System checks `isActive = true` AND `expiresAt` (if set)
