# How to Unblock Your IP Address

If you accidentally blocked your own IP address, here are several ways to unblock it:

## Method 1: Using the SOC Blacklist Interface (If you can access from another device)

1. Log in from another device/network (or ask someone else with admin access)
2. Navigate to **מרכז אבטחה (SOC)** → **רשימה שחורה (Blacklist)** tab
3. Find your IP address in the list
4. Click **הסר חסימה (Unblock)** button

## Method 2: Using the Unblock Script (Recommended)

If you have access to the server/backend:

```bash
cd backend
npx tsx scripts/unblock-ip.ts YOUR_IP_ADDRESS
```

Example:
```bash
npx tsx scripts/unblock-ip.ts 192.168.1.100
```

## Method 3: Using Prisma Studio

1. Open Prisma Studio:
```bash
cd backend
npx prisma studio
```

2. Navigate to `BlockedIP` table
3. Find your IP address
4. Edit the record and set `isActive` to `false`
5. Save

## Method 4: Direct SQL (Emergency)

If you have direct database access:

```sql
-- Unblock a specific IP
UPDATE BlockedIP SET isActive = false WHERE ipAddress = 'YOUR_IP_ADDRESS';

-- Or unblock ALL IPs (use with caution!)
UPDATE BlockedIP SET isActive = false WHERE isActive = true;
```

## Method 5: Emergency - Unblock All IPs

If you need to unblock everything:

```bash
cd backend
npx tsx scripts/unblock-all-ips.ts
```

⚠️ **Warning**: This will unblock ALL blocked IPs, not just yours.

## Finding Your IP Address

To find your current IP address:
- Visit: https://whatismyipaddress.com/
- Or check your network settings
- Or look at the last successful login in the audit logs

## Prevention

To prevent this in the future:
1. Always set an expiration date when blocking IPs
2. Test blocking on a test IP first
3. Use the "1 hour" or "24 hours" option for temporary blocks
4. Keep admin access from a different IP/network

## Notes

- Admins are never blocked (even if their IP is in the blacklist)
- Trusted users are never blocked
- The system checks `isActive = true` AND `expiresAt` (if set)
- Setting `isActive = false` immediately unblocks the IP

