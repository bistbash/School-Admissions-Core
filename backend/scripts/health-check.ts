/**
 * Health check script for the API
 * Usage: npx tsx scripts/health-check.ts
 */

import axios from 'axios';

// ASCII Art Banner
const BANNER = `
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║              💚 Health Check Tool                        ║
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

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

interface HealthCheck {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST';
  requiresAuth?: boolean;
}

const healthChecks: HealthCheck[] = [
  {
    name: 'API Server',
    endpoint: '/api/health',
    method: 'GET',
  },
  {
    name: 'Database Connection',
    endpoint: '/api/health/db',
    method: 'GET',
  },
];

async function performHealthCheck() {
  console.log(BANNER);
  printInfo(`Checking API at: ${BOLD}${API_BASE_URL}${RESET}`);
  console.log('');

  let allHealthy = true;

  for (const check of healthChecks) {
    try {
      printHeader(`Checking: ${check.name}`);
      const startTime = Date.now();
      
      const response = await axios.request({
        method: check.method,
        url: `${API_BASE_URL}${check.endpoint}`,
        timeout: 5000,
      });

      const responseTime = Date.now() - startTime;
      
      if (response.status === 200) {
        printSuccess(`${check.name}: Healthy (${responseTime}ms)`);
      } else {
        printWarning(`${check.name}: Unexpected status ${response.status}`);
        allHealthy = false;
      }
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        printError(`${check.name}: Server not running`);
        printInfo('Make sure the backend server is running: npm run dev');
      } else if (error.response) {
        printError(`${check.name}: Status ${error.response.status}`);
      } else {
        printError(`${check.name}: ${error.message}`);
      }
      allHealthy = false;
    }
    console.log('');
  }

  console.log('');
  if (allHealthy) {
    printSuccess('All health checks passed!');
  } else {
    printError('Some health checks failed!');
    process.exit(1);
  }
  console.log('');
}

performHealthCheck().catch((error) => {
  printError(`Fatal error: ${error.message}`);
  process.exit(1);
});
