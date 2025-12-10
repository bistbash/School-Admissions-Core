/**
 * Script to unblock an IP address
 * Usage: npx tsx scripts/unblock-ip.ts <IP_ADDRESS>
 * 
 * Example: npx tsx scripts/unblock-ip.ts 192.168.1.1
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function unblockIP(ipAddress: string) {
  try {
    console.log(`Attempting to unblock IP: ${ipAddress}...`);
    
    const result = await prisma.blockedIP.updateMany({
      where: { ipAddress },
      data: { isActive: false },
    });

    if (result.count > 0) {
      console.log(`✅ Successfully unblocked IP: ${ipAddress}`);
      console.log(`   ${result.count} record(s) updated`);
    } else {
      console.log(`⚠️  No blocked IP found for: ${ipAddress}`);
      console.log(`   The IP might not be blocked or already unblocked`);
    }
  } catch (error: any) {
    console.error(`❌ Error unblocking IP: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get IP address from command line arguments
const ipAddress = process.argv[2];

if (!ipAddress) {
  console.error('❌ Error: IP address is required');
  console.log('Usage: npx tsx scripts/unblock-ip.ts <IP_ADDRESS>');
  console.log('Example: npx tsx scripts/unblock-ip.ts 192.168.1.1');
  process.exit(1);
}

unblockIP(ipAddress);



