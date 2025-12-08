/**
 * Seed script to initialize all page and API permissions
 * Run this after database migrations to ensure all permissions exist
 */

import { prisma } from '../database/prisma';
import { PAGE_PERMISSIONS, getAPIPermissionsForPage } from './permission-registry';
import { logger } from '../utils/logger';

export async function seedPermissions() {
  logger.info('Starting permission seeding...');

  const permissionsCreated: string[] = [];
  const permissionsSkipped: string[] = [];

  // Create all page permissions
  for (const [pageKey, pagePermission] of Object.entries(PAGE_PERMISSIONS)) {
    // Create view permission
    const viewPermName = `page:${pageKey}:view`;
    const viewPerm = await prisma.permission.upsert({
      where: { name: viewPermName },
      update: {
        description: `View ${pagePermission.displayName} page`,
        resource: 'page',
        action: `${pageKey}:view`,
      },
      create: {
        name: viewPermName,
        description: `View ${pagePermission.displayName} page`,
        resource: 'page',
        action: `${pageKey}:view`,
      },
    });
    permissionsCreated.push(viewPermName);

    // Create edit permission
    const editPermName = `page:${pageKey}:edit`;
    const editPerm = await prisma.permission.upsert({
      where: { name: editPermName },
      update: {
        description: `Edit ${pagePermission.displayName} page`,
        resource: 'page',
        action: `${pageKey}:edit`,
      },
      create: {
        name: editPermName,
        description: `Edit ${pagePermission.displayName} page`,
        resource: 'page',
        action: `${pageKey}:edit`,
      },
    });
    permissionsCreated.push(editPermName);

    // Create API permissions for view
    const viewAPIs = getAPIPermissionsForPage(pageKey, 'view');
    for (const apiPerm of viewAPIs) {
      const permName = `${apiPerm.resource}:${apiPerm.action}`;
      const existing = await prisma.permission.findUnique({
        where: { name: permName },
      });

      if (!existing) {
        await prisma.permission.create({
          data: {
            name: permName,
            resource: apiPerm.resource,
            action: apiPerm.action,
            description: apiPerm.description,
          },
        });
        permissionsCreated.push(permName);
      } else {
        permissionsSkipped.push(permName);
      }
    }

    // Create API permissions for edit
    const editAPIs = getAPIPermissionsForPage(pageKey, 'edit');
    for (const apiPerm of editAPIs) {
      const permName = `${apiPerm.resource}:${apiPerm.action}`;
      const existing = await prisma.permission.findUnique({
        where: { name: permName },
      });

      if (!existing) {
        await prisma.permission.create({
          data: {
            name: permName,
            resource: apiPerm.resource,
            action: apiPerm.action,
            description: apiPerm.description,
          },
        });
        permissionsCreated.push(permName);
      } else {
        permissionsSkipped.push(permName);
      }
    }
  }

  logger.info({
    created: permissionsCreated.length,
    skipped: permissionsSkipped.length,
  }, 'Permission seeding completed');

  return {
    created: permissionsCreated.length,
    skipped: permissionsSkipped.length,
    total: permissionsCreated.length + permissionsSkipped.length,
  };
}

// Run if called directly
if (require.main === module) {
  seedPermissions()
    .then((result) => {
      console.log('Seeding completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
