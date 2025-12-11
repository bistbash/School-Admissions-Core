/**
 * Reset database script
 * Usage: npx tsx scripts/reset-db.ts [--confirm]
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

// ASCII Art Banner
const BANNER = `
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║            🗑️  Database Reset Tool                       ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`;

// Colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function printSuccess(msg: string) {
  console.log(`${GREEN}✅ ${msg}${RESET}`);
}

function printError(msg: string) {
  console.log(`${RED}❌ ${msg}${RESET}`);
}

function printWarning(msg: string) {
  console.log(`${YELLOW}⚠️  ${msg}${RESET}`);
}

function printInfo(msg: string) {
  console.log(`${CYAN}ℹ️  ${msg}${RESET}`);
}

function printHeader(msg: string) {
  console.log(`${BOLD}${BLUE}${msg}${RESET}`);
}

async function resetDatabase() {
  console.log(BANNER);
  printWarning('This will DELETE ALL DATA from the database!');
  printInfo('This action cannot be undone.');
  console.log('');

  const args = process.argv.slice(2);
  const confirmed = args.includes('--confirm');

  if (!confirmed) {
    printError('This is a destructive operation. Use --confirm flag to proceed.');
    console.log('');
    console.log(`${BOLD}Usage:${RESET}`);
    console.log(`  npx tsx scripts/reset-db.ts --confirm`);
    console.log('');
    process.exit(1);
  }

  try {
    printInfo('Resetting database...');
    
    // Run Prisma reset
    printInfo('Running Prisma reset...');
    execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
    
    printSuccess('Database reset completed successfully!');
    printInfo('Run "npm run seed" to populate initial data.');
    console.log('');
  } catch (error: any) {
    printError(`Failed to reset database: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();
