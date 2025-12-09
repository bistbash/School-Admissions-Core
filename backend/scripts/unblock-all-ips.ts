/**
 * Emergency script to unblock ALL IPs
 * Use this if you need to unblock everything
 * Usage: npx tsx scripts/unblock-all-ips.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function unblockAllIPs() {
  try {
    console.log('Attempting to unblock ALL IPs...');
    
    const result = await prisma.blockedIP.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    console.log(`✅ Successfully unblocked ${result.count} IP address(es)`);
  } catch (error: any) {
    console.error(`❌ Error unblocking IPs: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

unblockAllIPs();


