/**
 * Script to unblock an IP address
 * Usage: npx tsx scripts/unblock-ip.ts <IP_ADDRESS>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ASCII Art
const BANNER = `
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║              🔓 Unblock IP Address Tool                 ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`;

// Colors
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function printSuccess(msg: string) {
  console.log(`${GREEN}✅ ${msg}${RESET}`);
}

function printWarning(msg: string) {
  console.log(`${YELLOW}⚠️  ${msg}${RESET}`);
}

function printError(msg: string) {
  console.log(`${RED}❌ ${msg}${RESET}`);
}

function printInfo(msg: string) {
  console.log(`${CYAN}ℹ️  ${msg}${RESET}`);
}

async function unblockIP(ipAddress: string) {
  console.log(BANNER);
  printInfo(`Attempting to unblock IP: ${BOLD}${ipAddress}${RESET}...`);
  console.log('');

  try {
    const result = await prisma.blockedIP.updateMany({
      where: { ipAddress },
      data: { isActive: false },
    });

    if (result.count > 0) {
      printSuccess(`Successfully unblocked IP: ${ipAddress}`);
      printInfo(`${result.count} record(s) updated`);
    } else {
      printWarning(`No blocked IP found for: ${ipAddress}`);
      printInfo('The IP might not be blocked or already unblocked');
    }
  } catch (error: any) {
    printError(`Error unblocking IP: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get IP address from command line arguments
const ipAddress = process.argv[2];

if (!ipAddress) {
  console.log(BANNER);
  printError('IP address is required');
  console.log('');
  console.log(`${BOLD}Usage:${RESET}`);
  console.log(`  npx tsx scripts/unblock-ip.ts <IP_ADDRESS>`);
  console.log('');
  console.log(`${BOLD}Example:${RESET}`);
  console.log(`  npx tsx scripts/unblock-ip.ts 192.168.1.1`);
  console.log('');
  process.exit(1);
}

unblockIP(ipAddress);
