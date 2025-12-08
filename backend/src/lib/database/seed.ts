/**
 * Database Seed Script
 * 
 * This script initializes the database with essential data when it's empty:
 * - Creates an initial admin user (with optional department and role)
 * - Seeds all permissions
 * - Sets up trusted user for admin
 * 
 * Note: Department and role are optional - admin can add them later through the system.
 * 
 * Run this script after database migrations to set up a fresh database.
 * 
 * Usage:
 *   npm run seed
 *   or
 *   tsx src/lib/database/seed.ts
 */

import { prisma } from './prisma';
import { hashPassword } from '../auth/auth';
import { seedPermissions } from '../permissions/seed-permissions';
import { addTrustedUser } from '../security/trustedUsers';
import { logger } from '../utils/logger';

interface SeedConfig {
  adminEmail: string;
  adminPassword: string;
  adminName?: string;
  adminPersonalNumber?: string;
  defaultDepartmentName?: string;
  defaultRoleName?: string;
}

const DEFAULT_CONFIG: SeedConfig = {
  adminEmail: process.env.ADMIN_EMAIL || 'admin@school.local',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin123!@#',
  adminName: process.env.ADMIN_NAME || 'System Administrator',
  adminPersonalNumber: process.env.ADMIN_PERSONAL_NUMBER || '000000000',
  // Department and role are optional - admin can add them later through the system
  defaultDepartmentName: process.env.DEFAULT_DEPARTMENT_NAME,
  defaultRoleName: process.env.DEFAULT_ROLE_NAME,
};

/**
 * Check if database is empty (no users)
 */
async function isDatabaseEmpty(): Promise<boolean> {
  const userCount = await prisma.soldier.count();
  return userCount === 0;
}

/**
 * Create default department if it doesn't exist
 */
async function ensureDefaultDepartment(name: string) {
  const existing = await prisma.department.findFirst({
    where: { name },
  });

  if (existing) {
    logger.info({ departmentId: existing.id, name }, 'Default department already exists');
    return existing;
  }

  const department = await prisma.department.create({
    data: { name },
  });

  logger.info({ departmentId: department.id, name }, 'Created default department');
  return department;
}

/**
 * Create default role if it doesn't exist
 */
async function ensureDefaultRole(name: string) {
  const existing = await prisma.role.findFirst({
    where: { name },
  });

  if (existing) {
    logger.info({ roleId: existing.id, name }, 'Default role already exists');
    return existing;
  }

  const role = await prisma.role.create({
    data: { name },
  });

  logger.info({ roleId: role.id, name }, 'Created default role');
  return role;
}

/**
 * Create initial admin user
 */
async function createInitialAdmin(config: SeedConfig) {
  // Check if admin already exists
  const existing = await prisma.soldier.findUnique({
    where: { email: config.adminEmail },
  });

  if (existing) {
    logger.info({ userId: existing.id, email: config.adminEmail }, 'Admin user already exists');
    return existing;
  }

  // Hash password
  const hashedPassword = await hashPassword(config.adminPassword);

  // Create department and role only if names are provided
  let departmentId: number | undefined;
  let roleId: number | undefined;

  if (config.defaultDepartmentName) {
    const department = await ensureDefaultDepartment(config.defaultDepartmentName);
    departmentId = department.id;
  }

  if (config.defaultRoleName) {
    const role = await ensureDefaultRole(config.defaultRoleName);
    roleId = role.id;
  }

  // Create admin user
  const admin = await prisma.soldier.create({
    data: {
      email: config.adminEmail,
      password: hashedPassword,
      personalNumber: config.adminPersonalNumber,
      name: config.adminName,
      type: 'PERMANENT',
      departmentId: departmentId,
      roleId: roleId,
      isAdmin: true,
      isCommander: true,
      approvalStatus: 'APPROVED',
      needsProfileCompletion: false, // Admin is fully set up
    },
    include: {
      department: true,
      role: true,
    },
  });

  logger.info(
    {
      userId: admin.id,
      email: admin.email,
      name: admin.name,
      departmentId: admin.departmentId || null,
      roleId: admin.roleId || null,
    },
    'Created initial admin user'
  );

  // Add admin to trusted users
  try {
    await addTrustedUser({
      userId: admin.id,
      email: admin.email,
      name: config.adminName || `Admin (${admin.email})`,
      reason: 'Initial system administrator',
      createdBy: admin.id,
    });
    logger.info({ userId: admin.id }, 'Added admin to trusted users');
  } catch (error) {
    logger.warn({ error, userId: admin.id }, 'Failed to add admin to trusted users (non-critical)');
  }

  return admin;
}

/**
 * Main seed function
 */
export async function seedDatabase(config: Partial<SeedConfig> = {}) {
  const seedConfig = { ...DEFAULT_CONFIG, ...config };

  logger.info('Starting database seeding...');

  try {
    // Check if database is empty
    const isEmpty = await isDatabaseEmpty();

    if (!isEmpty) {
      logger.info('Database is not empty. Skipping seed (use --force to override)');
      return {
        skipped: true,
        message: 'Database already contains data',
      };
    }

    // Step 1: Seed permissions first (needed for proper setup)
    logger.info('Step 1: Seeding permissions...');
    const permissionsResult = await seedPermissions();
    logger.info({ permissionsResult }, 'Permissions seeded');

    // Step 2: Create initial admin user (department and role are optional)
    logger.info('Step 2: Creating initial admin user...');
    const admin = await createInitialAdmin(seedConfig);

    logger.info(
      {
        adminId: admin.id,
        adminEmail: admin.email,
        departmentId: admin.departmentId || null,
        roleId: admin.roleId || null,
        permissionsCreated: permissionsResult.created,
      },
      'Database seeding completed successfully'
    );

    return {
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        password: seedConfig.adminPassword, // Return password for display (only in seed)
      },
      department: admin.department ? {
        id: admin.department.id,
        name: admin.department.name,
      } : null,
      role: admin.role ? {
        id: admin.role.id,
        name: admin.role.name,
      } : null,
      permissions: {
        created: permissionsResult.created,
        skipped: permissionsResult.skipped,
      },
    };
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Database seeding failed');
    throw error;
  }
}

/**
 * Force seed (ignores existing data check)
 */
export async function forceSeedDatabase(config: Partial<SeedConfig> = {}) {
  const seedConfig = { ...DEFAULT_CONFIG, ...config };

  logger.info('Starting FORCE database seeding (ignoring existing data)...');

  try {
    // Step 1: Seed permissions
    logger.info('Step 1: Seeding permissions...');
    const permissionsResult = await seedPermissions();

    // Step 2: Create admin (will skip if exists, department and role are optional)
    logger.info('Step 2: Ensuring admin user exists...');
    const admin = await createInitialAdmin(seedConfig);

    logger.info(
      {
        adminId: admin.id,
        adminEmail: admin.email,
        departmentId: admin.departmentId || null,
        roleId: admin.roleId || null,
        permissionsCreated: permissionsResult.created,
      },
      'Force seeding completed'
    );

    return {
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
      department: admin.department ? {
        id: admin.department.id,
        name: admin.department.name,
      } : null,
      role: admin.role ? {
        id: admin.role.id,
        name: admin.role.name,
      } : null,
      permissions: {
        created: permissionsResult.created,
        skipped: permissionsResult.skipped,
      },
    };
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Force seeding failed');
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const force = args.includes('--force') || args.includes('-f');

  const seedFunction = force ? forceSeedDatabase : seedDatabase;

  seedFunction()
    .then((result) => {
      if (result.success) {
        console.log('\n✅ Database seeding completed successfully!\n');
        console.log('📧 Admin Credentials:');
        console.log(`   Email: ${result.admin.email}`);
        if ('password' in result.admin) {
          console.log(`   Password: ${result.admin.password}`);
        }
        console.log(`\n⚠️  IMPORTANT: Change the admin password after first login!\n`);
        process.exit(0);
      } else {
        console.log('\n⚠️  Seeding skipped:', result.message);
        console.log('   Use --force to seed anyway\n');
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error.message);
      process.exit(1);
    });
}
