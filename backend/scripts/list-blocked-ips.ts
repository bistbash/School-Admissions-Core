/**
 * Script to list all blocked IPs
 * Usage: npx tsx scripts/list-blocked-ips.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ASCII Art
const BANNER = `
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║              📋 List Blocked IPs Tool                   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`;

// Colors
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
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

function printInfo(msg: string) {
  console.log(`${CYAN}ℹ️  ${msg}${RESET}`);
}

function printHeader(msg: string) {
  console.log(`${BOLD}${BLUE}${msg}${RESET}`);
}

async function listBlockedIPs() {
  console.log(BANNER);

  try {
    const blockedIPs = await prisma.blockedIP.findMany({
      where: { isActive: true },
      orderBy: { blockedAt: 'desc' },
    });

    if (blockedIPs.length === 0) {
      printSuccess('No IPs are currently blocked');
      return;
    }

    console.log('');
    printHeader(`Found ${blockedIPs.length} blocked IP(s):`);
    console.log('');

    blockedIPs.forEach((ip, index) => {
      console.log(`${BOLD}${index + 1}.${RESET} IP: ${CYAN}${ip.ipAddress}${RESET}`);
      console.log(`   Reason: ${ip.reason || 'No reason provided'}`);
      console.log(`   Blocked at: ${ip.blockedAt.toLocaleString()}`);
      
      if (ip.expiresAt) {
        const isExpired = ip.expiresAt < new Date();
        const status = isExpired ? `${RED}(EXPIRED)${RESET}` : '';
        console.log(`   Expires at: ${ip.expiresAt.toLocaleString()} ${status}`);
      } else {
        console.log(`   Status: ${YELLOW}PERMANENT${RESET}`);
      }
      console.log('');
    });

    console.log('');
    printInfo('To unblock an IP, use:');
    console.log(`  ${BOLD}npx tsx scripts/unblock-ip.ts <IP_ADDRESS>${RESET}`);
    console.log('');
  } catch (error: any) {
    printError(`Error listing blocked IPs: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

listBlockedIPs();
