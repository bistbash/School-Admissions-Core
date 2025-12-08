/**
 * Reset Database and Seed Script
 * 
 * This script resets the database (deletes all data) and then runs the seed script
 * to create a fresh database with initial admin user.
 * 
 * ⚠️ WARNING: This will DELETE ALL DATA in the database!
 * 
 * Usage:
 *   npm run reset:seed
 *   or
 *   tsx src/lib/database/reset-and-seed.ts
 */

import { execSync } from 'child_process';
import { seedDatabase } from './seed';
import { logger } from '../utils/logger';

async function resetAndSeed() {
  logger.info('Starting database reset and seed...');

  try {
    // Step 1: Reset database (this will delete all data)
    logger.info('Step 1: Resetting database (this will delete all data)...');
    console.log('\n⚠️  WARNING: This will DELETE ALL DATA in the database!\n');

    execSync('npx prisma migrate reset --force --skip-seed', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    logger.info('Database reset completed');

    // Step 2: Run seed script
    logger.info('Step 2: Running seed script...');
    const seedResult = await seedDatabase();

    if ('success' in seedResult && seedResult.success) {
      console.log('\n✅ Database reset and seeding completed successfully!\n');
      console.log('📧 Admin Credentials:');
      console.log(`   Email: ${seedResult.admin.email}`);
      if ('password' in seedResult.admin && seedResult.admin.password) {
        console.log(`   Password: ${seedResult.admin.password}`);
      }
      if (seedResult.department) {
        console.log(`   Department: ${seedResult.department.name}`);
      } else {
        console.log(`   Department: None (admin can add later)`);
      }
      if (seedResult.role) {
        console.log(`   Role: ${seedResult.role.name}`);
      } else {
        console.log(`   Role: None (admin can add later)`);
      }
      console.log(`\n⚠️  IMPORTANT: Change the admin password after first login!\n`);
      process.exit(0);
    } else {
      const errorMessage = 'skipped' in seedResult ? seedResult.message : 'Unknown error';
      console.error('\n❌ Seeding failed:', errorMessage);
      process.exit(1);
    }
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Database reset and seed failed');
    console.error('\n❌ Database reset and seed failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  resetAndSeed();
}

export { resetAndSeed };
