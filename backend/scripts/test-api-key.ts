#!/usr/bin/env tsx
/**
 * Test script to make API requests with a specific API key
 * Usage: tsx scripts/test-api-key.ts <api-key>
 */

import axios from 'axios';

// ASCII Art Banner
const BANNER = `
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║              🔑 API Key Testing Tool                     ║
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

function printInfo(msg: string) {
  console.log(`${CYAN}ℹ️  ${msg}${RESET}`);
}

function printHeader(msg: string) {
  console.log(`${BOLD}${BLUE}${msg}${RESET}`);
}

const API_KEY = process.argv[2] || 'sk_0e4ce30b4c42a32ac88a3fe2ea0ebf3cf13e5c3a540cbe383ab526d93d4a4836';
const BASE_URL = process.env.API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
  },
});

async function testAPIKey() {
  console.log(BANNER);
  printInfo(`Testing API Key: ${BOLD}${API_KEY.substring(0, 20)}...${RESET}`);
  printInfo(`Base URL: ${BOLD}${BASE_URL}${RESET}`);
  console.log('');

  const tests = [
    {
      name: 'Get API Keys (check key info)',
      endpoint: '/api/api-keys',
      method: 'GET',
    },
    {
      name: 'Get SOC Stats',
      endpoint: '/api/soc/stats',
      method: 'GET',
    },
    {
      name: 'Get Audit Logs (last 5)',
      endpoint: '/api/soc/audit-logs?limit=5',
      method: 'GET',
    },
    {
      name: 'Get Students (last 3)',
      endpoint: '/api/students?limit=3',
      method: 'GET',
    },
    {
      name: 'Get Cohorts',
      endpoint: '/api/cohorts',
      method: 'GET',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      printHeader(`Testing: ${test.name}`);
      const response = await apiClient.request({
        method: test.method as any,
        url: test.endpoint,
      });
      
      printSuccess(`Status: ${response.status}`);
      if (response.data) {
        const dataSize = JSON.stringify(response.data).length;
        printInfo(`Response size: ${dataSize} bytes`);
      }
      passed++;
    } catch (error: any) {
      if (error.response) {
        printError(`Status: ${error.response.status} - ${error.response.statusText}`);
        if (error.response.data?.error) {
          printError(`Error: ${error.response.data.error}`);
        }
      } else {
        printError(`Error: ${error.message}`);
      }
      failed++;
    }
    console.log('');
  }

  console.log('');
  printHeader('Test Summary');
  printSuccess(`Passed: ${passed}`);
  if (failed > 0) {
    printError(`Failed: ${failed}`);
  } else {
    printSuccess('All tests passed!');
  }
  console.log('');
}

testAPIKey().catch((error) => {
  printError(`Fatal error: ${error.message}`);
  process.exit(1);
});
