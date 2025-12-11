#!/usr/bin/env tsx
/**
 * Test script to make API requests with a specific API key
 * Usage: tsx scripts/test-api-key.ts <api-key>
 */

import axios from 'axios';

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
  console.log('🔑 Testing API Key:', API_KEY.substring(0, 20) + '...');
  console.log('📍 Base URL:', BASE_URL);
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

  for (const test of tests) {
    try {
      console.log(`\n📡 Testing: ${test.name}`);
      console.log(`   ${test.method} ${test.endpoint}`);
      
      const response = await apiClient.request({
        method: test.method as any,
        url: test.endpoint,
      });

      console.log(`   ✅ Status: ${response.status}`);
      
      if (test.endpoint.includes('audit-logs')) {
        const logs = response.data?.logs || [];
        console.log(`   📊 Found ${logs.length} logs`);
        if (logs.length > 0) {
          console.log(`   📝 Latest log: ${logs[0].action} ${logs[0].resource} - ${logs[0].status}`);
          if (logs[0].isPinned) {
            console.log(`   📌 This log is PINNED!`);
          }
        }
      } else if (test.endpoint.includes('stats')) {
        console.log(`   📊 Total logs: ${response.data?.totalLogs || 0}`);
        console.log(`   📊 Recent failures: ${response.data?.recentFailures || 0}`);
      } else if (test.endpoint.includes('students')) {
        const students = Array.isArray(response.data) ? response.data : response.data?.students || [];
        console.log(`   👥 Found ${students.length} students`);
      } else if (test.endpoint.includes('api-keys')) {
        const keys = Array.isArray(response.data) ? response.data : [];
        console.log(`   🔑 Found ${keys.length} API keys`);
        if (keys.length > 0) {
          const currentKey = keys.find((k: any) => k.id);
          if (currentKey) {
            console.log(`   🔑 Current key: ${currentKey.name || 'Unnamed'} (ID: ${currentKey.id})`);
          }
        }
      } else {
        console.log(`   📦 Response data keys: ${Object.keys(response.data || {}).join(', ')}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.response?.status || 'Unknown'} - ${error.response?.data?.error || error.message}`);
      if (error.response?.data?.message) {
        console.log(`   💬 Message: ${error.response.data.message}`);
      }
    }
  }

  console.log('\n✅ API Key testing completed!');
  console.log('\n💡 Check the audit logs to see all the requests that were made.');
}

testAPIKey().catch(console.error);
