/**
 * Utility to ensure admin users always have all permissions
 * This can be run after creating an admin or as a maintenance task
 */

import { prisma } from '../database/prisma';
import { PAGE_PERMISSIONS, getAPIPermissionsForPage } from './permission-registry';
import { logger } from '../utils/logger';

/**
 * Ensure all admin users have all permissions
 * This grants all page and API permissions to all admin users
 */
export async function ensureAdminPermissions() {
  logger.info('Ensuring all admin users have all permissions...');

  // Find all admin users
  const admins = await prisma.soldier.findMany({
    where: { isAdmin: true },
    select: { id: true, email: true },
  });

  if (admins.length === 0) {
    logger.info('No admin users found');
    return { adminsProcessed: 0, permissionsGranted: 0 };
  }

  let totalPermissionsGranted = 0;

  for (const admin of admins) {
    logger.info({ adminId: admin.id, email: admin.email }, 'Processing admin user');

    // Grant all page permissions
    for (const [pageKey, pagePermission] of Object.entries(PAGE_PERMISSIONS)) {
      // Grant view permission
      const viewPermName = `page:${pageKey}:view`;
      const viewPerm = await prisma.permission.findUnique({
        where: { name: viewPermName },
      });

      if (viewPerm) {
        // Check if permission already granted
        const existingView = await prisma.userPermission.findUnique({
          where: {
            userId_permissionId: {
              userId: admin.id,
              permissionId: viewPerm.id,
            },
          },
        });

        if (!existingView) {
          await prisma.userPermission.create({
            data: {
              userId: admin.id,
              permissionId: viewPerm.id,
              grantedBy: admin.id, // Admin grants to themselves
              isActive: true,
            },
          });
          totalPermissionsGranted++;
        }
      }

      // Grant edit permission
      const editPermName = `page:${pageKey}:edit`;
      const editPerm = await prisma.permission.findUnique({
        where: { name: editPermName },
      });

      if (editPerm) {
        const existingEdit = await prisma.userPermission.findUnique({
          where: {
            userId_permissionId: {
              userId: admin.id,
              permissionId: editPerm.id,
            },
          },
        });

        if (!existingEdit) {
          await prisma.userPermission.create({
            data: {
              userId: admin.id,
              permissionId: editPerm.id,
              grantedBy: admin.id,
              isActive: true,
            },
          });
          totalPermissionsGranted++;
        }
      }

      // Grant all API permissions for view
      const viewAPIs = getAPIPermissionsForPage(pageKey, 'view');
      for (const apiPerm of viewAPIs) {
        const permName = `${apiPerm.resource}:${apiPerm.action}`;
        const permission = await prisma.permission.findUnique({
          where: { name: permName },
        });

        if (permission) {
          const existing = await prisma.userPermission.findUnique({
            where: {
              userId_permissionId: {
                userId: admin.id,
                permissionId: permission.id,
              },
            },
          });

          if (!existing) {
            await prisma.userPermission.create({
              data: {
                userId: admin.id,
                permissionId: permission.id,
                grantedBy: admin.id,
                isActive: true,
              },
            });
            totalPermissionsGranted++;
          }
        }
      }

      // Grant all API permissions for edit
      const editAPIs = getAPIPermissionsForPage(pageKey, 'edit');
      for (const apiPerm of editAPIs) {
        const permName = `${apiPerm.resource}:${apiPerm.action}`;
        const permission = await prisma.permission.findUnique({
          where: { name: permName },
        });

        if (permission) {
          const existing = await prisma.userPermission.findUnique({
            where: {
              userId_permissionId: {
                userId: admin.id,
                permissionId: permission.id,
              },
            },
          });

          if (!existing) {
            await prisma.userPermission.create({
              data: {
                userId: admin.id,
                permissionId: permission.id,
                grantedBy: admin.id,
                isActive: true,
              },
            });
            totalPermissionsGranted++;
          }
        }
      }
    }
  }

  logger.info(
    {
      adminsProcessed: admins.length,
      permissionsGranted: totalPermissionsGranted,
    },
    'Admin permissions ensured'
  );

  return {
    adminsProcessed: admins.length,
    permissionsGranted: totalPermissionsGranted,
  };
}

// Run if called directly
if (require.main === module) {
  ensureAdminPermissions()
    .then((result) => {
      console.log('Admin permissions ensured:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to ensure admin permissions:', error);
      process.exit(1);
    });
}
