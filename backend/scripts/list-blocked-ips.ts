/**
 * Script to list all blocked IPs
 * Usage: npx tsx scripts/list-blocked-ips.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listBlockedIPs() {
  try {
    const blockedIPs = await prisma.blockedIP.findMany({
      where: { isActive: true },
      orderBy: { blockedAt: 'desc' },
    });

    if (blockedIPs.length === 0) {
      console.log('✅ No IPs are currently blocked');
      return;
    }

    console.log(`\n📋 Found ${blockedIPs.length} blocked IP(s):\n`);
    
    blockedIPs.forEach((ip, index) => {
      console.log(`${index + 1}. IP: ${ip.ipAddress}`);
      console.log(`   Reason: ${ip.reason || 'No reason provided'}`);
      console.log(`   Blocked at: ${ip.blockedAt.toLocaleString()}`);
      if (ip.expiresAt) {
        const isExpired = ip.expiresAt < new Date();
        console.log(`   Expires at: ${ip.expiresAt.toLocaleString()} ${isExpired ? '(EXPIRED)' : ''}`);
      } else {
        console.log(`   Status: PERMANENT`);
      }
      console.log('');
    });

    console.log('\nTo unblock an IP, use:');
    console.log('npx tsx scripts/unblock-ip.ts <IP_ADDRESS>\n');
  } catch (error: any) {
    console.error(`❌ Error listing blocked IPs: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

listBlockedIPs();



