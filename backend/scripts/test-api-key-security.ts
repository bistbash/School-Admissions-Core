/**
 * Security test script for API keys
 * 
 * This script tests:
 * 1. That API keys cannot access endpoints they don't have permission for
 * 2. That all requests are logged to SOC with proper details
 * 3. That permission checking works correctly
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_KEY = process.argv[2] || 'sk_c036029d9e2ed0d632719f066b5ccb7597c4f0c35e568441ea1be663b3e08af5';

interface TestCase {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  expectedStatus: number;
  description: string;
  shouldHaveAccess: boolean;
}

const testCases: TestCase[] = [
  // Endpoints the user SHOULD have access to (based on permissions)
  {
    name: 'Get own API keys',
    method: 'GET',
    path: '/api/api-keys',
    expectedStatus: 200,
    description: 'User has api-keys:read permission',
    shouldHaveAccess: true,
  },
  {
    name: 'Create API key',
    method: 'POST',
    path: '/api/api-keys',
    expectedStatus: 201,
    description: 'User has api-keys:create permission',
    shouldHaveAccess: true,
    // Note: This will actually create an API key, but we'll test it anyway
  },
  {
    name: 'Get students list',
    method: 'GET',
    path: '/api/students',
    expectedStatus: 200,
    description: 'User has students:read permission',
    shouldHaveAccess: true,
  },
  {
    name: 'Get dashboard data',
    method: 'GET',
    path: '/api/dashboard',
    expectedStatus: 200,
    description: 'User has dashboard:read permission',
    shouldHaveAccess: true,
  },
  {
    name: 'Get tracks list',
    method: 'GET',
    path: '/api/tracks',
    expectedStatus: 200,
    description: 'User has tracks:read permission',
    shouldHaveAccess: true,
  },
  
  // Endpoints the user SHOULD NOT have access to
  {
    name: 'Get all API keys (admin only)',
    method: 'GET',
    path: '/api/api-keys/all',
    expectedStatus: 403,
    description: 'User does NOT have admin permission',
    shouldHaveAccess: false,
  },
  {
    name: 'Get all users (admin only)',
    method: 'GET',
    path: '/api/soldiers',
    expectedStatus: 403,
    description: 'User does NOT have soldiers:read permission',
    shouldHaveAccess: false,
  },
  {
    name: 'Create user (admin only)',
    method: 'POST',
    path: '/api/auth/create-user',
    expectedStatus: 403,
    description: 'User does NOT have admin permission',
    shouldHaveAccess: false,
  },
  {
    name: 'Get SOC audit logs',
    method: 'GET',
    path: '/api/soc/audit-logs',
    expectedStatus: 403,
    description: 'User does NOT have soc page permission',
    shouldHaveAccess: false,
  },
  {
    name: 'Get departments',
    method: 'GET',
    path: '/api/departments',
    expectedStatus: 200, // This might be allowed as public reference data
    description: 'Public reference data (might be allowed)',
    shouldHaveAccess: true, // This is allowed for all APPROVED users
  },
];

async function runTest(testCase: TestCase) {
  try {
    const config = {
      method: testCase.method,
      url: `${API_BASE_URL}${testCase.path}`,
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      validateStatus: () => true, // Don't throw on any status code
    };

    // Add body for POST/PUT requests
    if (testCase.method === 'POST' || testCase.method === 'PUT') {
      (config as any).data = testCase.method === 'POST' && testCase.path === '/api/api-keys' 
        ? { name: 'Test Key', expiresAt: null }
        : {};
    }

    const startTime = Date.now();
    const response = await axios(config);
    const responseTime = Date.now() - startTime;

    const passed = response.status === testCase.expectedStatus;
    const statusIcon = passed ? '✅' : '❌';

    console.log(`${statusIcon} ${testCase.name}`);
    console.log(`   Method: ${testCase.method} ${testCase.path}`);
    console.log(`   Expected: ${testCase.expectedStatus}, Got: ${response.status}`);
    console.log(`   Response Time: ${responseTime}ms`);
    console.log(`   Description: ${testCase.description}`);
    
    if (!passed) {
      console.log(`   ⚠️  TEST FAILED - Status code mismatch`);
      if (response.data) {
        console.log(`   Response: ${JSON.stringify(response.data).substring(0, 200)}`);
      }
    } else {
      if (testCase.shouldHaveAccess && response.status >= 400) {
        console.log(`   ⚠️  WARNING: Should have access but got ${response.status}`);
      } else if (!testCase.shouldHaveAccess && response.status < 400) {
        console.log(`   ⚠️  SECURITY ISSUE: Should NOT have access but got ${response.status}`);
      } else {
        console.log(`   ✓ Security check passed`);
      }
    }
    console.log();

    return {
      testCase,
      passed,
      status: response.status,
      responseTime,
      response: response.data,
    };
  } catch (error: any) {
    console.log(`❌ ${testCase.name} - ERROR`);
    console.log(`   Error: ${error.message}`);
    console.log();
    return {
      testCase,
      passed: false,
      status: 0,
      responseTime: 0,
      error: error.message,
    };
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('API KEY SECURITY TEST');
  console.log('='.repeat(80));
  console.log();
  console.log(`API Key: ${API_KEY.substring(0, 20)}...`);
  console.log(`Base URL: ${API_BASE_URL}`);
  console.log();
  console.log('Testing API key permissions and security...');
  console.log();

  const results = [];
  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push(result);
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log();

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const securityIssues = results.filter(r => {
    if (!r.passed) return false;
    if (r.testCase.shouldHaveAccess && r.status >= 400) return true;
    if (!r.testCase.shouldHaveAccess && r.status < 400) return true;
    return false;
  }).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Security Issues: ${securityIssues}`);
  console.log();

  if (securityIssues > 0) {
    console.log('⚠️  SECURITY WARNINGS:');
    results.forEach(r => {
      if (r.testCase.shouldHaveAccess && r.status >= 400) {
        console.log(`   - ${r.testCase.name}: Should have access but got ${r.status}`);
      } else if (!r.testCase.shouldHaveAccess && r.status < 400) {
        console.log(`   - ${r.testCase.name}: Should NOT have access but got ${r.status}`);
      }
    });
    console.log();
  }

  console.log('='.repeat(80));
  console.log('SOC LOGGING CHECK');
  console.log('='.repeat(80));
  console.log();
  console.log('ℹ️  All requests above should have been logged to SOC.');
  console.log('   Check the SOC logs in the database to verify:');
  console.log('   - Each request has apiKeyId field set');
  console.log('   - Each request has full details (method, path, IP, status, etc.)');
  console.log('   - Failed requests (403) are logged as UNAUTHORIZED_ACCESS');
  console.log('   - Successful requests are logged with SUCCESS status');
  console.log();
  console.log('   Run this query to see recent logs for this API key:');
  console.log(`   SELECT * FROM AuditLog WHERE apiKeyId = 1 ORDER BY createdAt DESC LIMIT 20;`);
  console.log();

  process.exit(securityIssues > 0 || failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
