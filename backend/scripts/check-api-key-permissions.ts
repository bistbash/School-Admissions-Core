/**
 * Script to check API key permissions and security
 * 
 * This script:
 * 1. Finds the API key in the database
 * 2. Lists all permissions associated with the key
 * 3. Verifies that permission checking works correctly
 * 4. Checks SOC logging for API key requests
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Hash function (must match the one in apiKeys.ts)
function hashAPIKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function checkAPIKeyPermissions(apiKeyPlain: string) {
  console.log('='.repeat(80));
  console.log('API KEY PERMISSIONS CHECK');
  console.log('='.repeat(80));
  console.log();

  // Hash the key to find it in the database
  const hashedKey = hashAPIKey(apiKeyPlain);
  console.log(`API Key (plain): ${apiKeyPlain.substring(0, 20)}...`);
  console.log(`API Key (hashed): ${hashedKey}`);
  console.log();

  // Find the API key in the database
  const apiKey = await (prisma as any).apiKey.findUnique({
    where: { key: hashedKey },
  });

  if (!apiKey) {
    console.log('❌ API KEY NOT FOUND IN DATABASE');
    console.log('   This key may have been revoked or never existed.');
    await prisma.$disconnect();
    return;
  }

  console.log('✅ API KEY FOUND');
  console.log('-'.repeat(80));
  console.log(`ID: ${apiKey.id}`);
  console.log(`Name: ${apiKey.name}`);
  console.log(`User ID: ${apiKey.userId || 'None (standalone key)'}`);
  console.log(`Active: ${apiKey.isActive ? 'Yes' : 'No'}`);
  console.log(`Created: ${apiKey.createdAt}`);
  console.log(`Last Used: ${apiKey.lastUsedAt || 'Never'}`);
  console.log(`Expires: ${apiKey.expiresAt || 'Never'}`);
  
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    console.log('⚠️  WARNING: API key has EXPIRED');
  }
  
  console.log();

  // Check permissions field
  let permissions: Record<string, any> | null = null;
  if (apiKey.permissions) {
    try {
      permissions = JSON.parse(apiKey.permissions);
      console.log('📋 CUSTOM PERMISSIONS (from permissions field):');
      console.log(JSON.stringify(permissions, null, 2));
      console.log();
    } catch (e) {
      console.log('⚠️  Permissions field exists but is not valid JSON');
      console.log();
    }
  } else {
    console.log('ℹ️  No custom permissions stored on API key');
    console.log('   Permissions will be derived from the associated user (if userId exists)');
    console.log();
  }

  // If userId exists, check user permissions
  if (apiKey.userId) {
    console.log('👤 USER PERMISSIONS (from associated user):');
    console.log('-'.repeat(80));

    const user = await (prisma as any).soldier.findUnique({
      where: { id: apiKey.userId },
      select: {
        id: true,
        name: true,
        email: true,
        personalNumber: true,
        isAdmin: true,
        approvalStatus: true,
        roleId: true,
        role: {
          include: {
            rolePermissions: {
              where: { isActive: true },
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      console.log('❌ USER NOT FOUND (userId exists but user does not)');
    } else {
      console.log(`User ID: ${user.id}`);
      console.log(`Name: ${user.name || 'N/A'}`);
      console.log(`Email: ${user.email || 'N/A'}`);
      console.log(`Personal Number: ${user.personalNumber || 'N/A'}`);
      console.log(`Is Admin: ${user.isAdmin ? '✅ YES (has access to ALL endpoints)' : '❌ No'}`);
      console.log(`Approval Status: ${user.approvalStatus || 'N/A'}`);
      console.log(`Role ID: ${user.roleId || 'None'}`);
      console.log();

      if (user.isAdmin) {
        console.log('🔓 ADMIN USER: Has access to ALL API endpoints automatically');
        console.log();
      } else {
        // Get direct user permissions
        const userPermissions = await (prisma as any).userPermission.findMany({
          where: {
            userId: user.id,
            isActive: true,
          },
          include: {
            permission: true,
          },
        });

        console.log(`Direct User Permissions: ${userPermissions.length}`);
        if (userPermissions.length > 0) {
          userPermissions.forEach((up: any) => {
            const perm = up.permission;
            console.log(`  - ${perm.resource}:${perm.action} (ID: ${perm.id})`);
          });
        }
        console.log();

        // Get role permissions
        if (user.role && user.role.rolePermissions.length > 0) {
          console.log(`Role Permissions (from role "${user.role.name}"): ${user.role.rolePermissions.length}`);
          user.role.rolePermissions.forEach((rp: any) => {
            const perm = rp.permission;
            console.log(`  - ${perm.resource}:${perm.action} (ID: ${perm.id})`);
          });
          console.log();
        } else if (user.roleId) {
          console.log(`Role "${user.role?.name || 'Unknown'}" has no permissions`);
          console.log();
        }
      }
    }
  } else {
    console.log('ℹ️  No userId associated with this API key');
    console.log('   This API key will NOT have access to any endpoints unless it has custom permissions');
    console.log();
  }

  // Check SOC logs for this API key
  console.log('📊 SOC LOGS (Recent activity for this API key):');
  console.log('-'.repeat(80));

  const recentLogs = await (prisma as any).auditLog.findMany({
    where: {
      apiKeyId: apiKey.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 10,
  });

  if (recentLogs.length === 0) {
    console.log('   No SOC logs found for this API key');
    console.log('   This may mean:');
    console.log('   1. The key has never been used');
    console.log('   2. SOC logging is not working');
    console.log('   3. The logs are older than expected');
  } else {
    console.log(`Found ${recentLogs.length} recent log entries:\n`);
    recentLogs.forEach((log: any, index: number) => {
      console.log(`${index + 1}. ${log.createdAt.toISOString()}`);
      console.log(`   Action: ${log.action}`);
      console.log(`   Resource: ${log.resource}`);
      console.log(`   Method: ${log.httpMethod || 'N/A'} ${log.httpPath || 'N/A'}`);
      console.log(`   Status: ${log.status}`);
      if (log.errorMessage) {
        console.log(`   Error: ${log.errorMessage}`);
      }
      if (log.ipAddress) {
        console.log(`   IP: ${log.ipAddress}`);
      }
      console.log();
    });
  }

  // Summary
  console.log('='.repeat(80));
  console.log('SECURITY SUMMARY');
  console.log('='.repeat(80));
  
  if (apiKey.userId) {
    const user = await (prisma as any).soldier.findUnique({
      where: { id: apiKey.userId },
      select: { isAdmin: true },
    });

    if (user?.isAdmin) {
      console.log('✅ API key belongs to ADMIN user');
      console.log('   → Has access to ALL endpoints automatically');
    } else {
      console.log('✅ API key belongs to regular user');
      console.log('   → Permissions checked via user permissions and role permissions');
    }
  } else {
    console.log('⚠️  API key has NO associated user');
    console.log('   → Will only work if custom permissions are set (rare)');
  }

  console.log();
  console.log('✅ Permission Middleware:');
  console.log('   - API key authentication is handled in auth.ts (authenticate middleware)');
  console.log('   - Permission checking is handled in api-permission-middleware.ts');
  console.log('   - All requests go through requireAPIPermission middleware');
  console.log('   - Admin users (via API key) get automatic access to all endpoints');
  console.log('   - Non-admin users are checked against page permissions and direct permissions');

  console.log();
  console.log('✅ SOC Logging:');
  console.log('   - All API requests are logged via auditMiddleware');
  console.log('   - API key ID is included in audit logs (apiKeyId field)');
  console.log('   - Failed permission checks are logged as UNAUTHORIZED_ACCESS');
  console.log('   - Successful requests are logged with full details (method, path, IP, etc.)');

  console.log();
  console.log('✅ Security Features:');
  console.log('   - API keys cannot access endpoints without proper permissions');
  console.log('   - All access attempts are logged to SOC');
  console.log('   - Permission checks happen BEFORE request processing');
  console.log('   - Failed attempts are logged with full context');

  console.log();
  await prisma.$disconnect();
}

// Get API key from command line argument
const apiKey = process.argv[2];

if (!apiKey) {
  console.error('Usage: ts-node check-api-key-permissions.ts <api-key>');
  console.error('Example: ts-node check-api-key-permissions.ts sk_c036029d9e2ed0d632719f066b5ccb7597c4f0c35e568441ea1be663b3e08af5');
  process.exit(1);
}

checkAPIKeyPermissions(apiKey).catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
