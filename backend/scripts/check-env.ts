/**
 * Check environment variables script
 * Usage: npx tsx scripts/check-env.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// ASCII Art Banner
const BANNER = `
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║         🔍 Environment Variables Check Tool              ║
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

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  defaultValue?: string;
}

const requiredEnvVars: EnvVar[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'Database connection string',
    defaultValue: 'file:./dev.db',
  },
  {
    name: 'JWT_SECRET',
    required: true,
    description: 'JWT secret key for token signing',
  },
  {
    name: 'PORT',
    required: false,
    description: 'Server port',
    defaultValue: '3000',
  },
  {
    name: 'NODE_ENV',
    required: false,
    description: 'Node environment',
    defaultValue: 'development',
  },
  {
    name: 'FRONTEND_URL',
    required: false,
    description: 'Frontend URL for CORS',
    defaultValue: 'http://localhost:5173',
  },
];

function checkEnvFile() {
  console.log(BANNER);
  printHeader('Checking Environment Variables');
  console.log('');

  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');

  // Check if .env exists
  if (!fs.existsSync(envPath)) {
    printError('.env file not found!');
    printInfo(`Expected location: ${envPath}`);
    
    if (fs.existsSync(envExamplePath)) {
      printInfo('Found .env.example file. You can copy it:');
      console.log(`  ${BOLD}cp .env.example .env${RESET}`);
    }
    console.log('');
    return false;
  }

  printSuccess('.env file found');
  console.log('');

  // Read .env file
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars: Record<string, string> = {};

  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').replace(/^["']|["']$/g, '');
      }
    }
  });

  // Check required variables
  let allValid = true;
  printHeader('Required Variables:');
  
  for (const envVar of requiredEnvVars) {
    const value = envVars[envVar.name] || process.env[envVar.name];
    
    if (envVar.required && !value) {
      printError(`${envVar.name}: Missing (REQUIRED)`);
      printInfo(`  Description: ${envVar.description}`);
      allValid = false;
    } else if (value) {
      const displayValue = envVar.name === 'JWT_SECRET' 
        ? `${value.substring(0, 10)}...` 
        : value;
      printSuccess(`${envVar.name}: ${displayValue}`);
    } else if (envVar.defaultValue) {
      printWarning(`${envVar.name}: Not set (using default: ${envVar.defaultValue})`);
    } else {
      printInfo(`${envVar.name}: Not set (optional)`);
    }
  }

  console.log('');
  
  // Check JWT_SECRET strength
  const jwtSecret = envVars.JWT_SECRET || process.env.JWT_SECRET;
  if (jwtSecret) {
    if (jwtSecret.length < 32) {
      printWarning('JWT_SECRET is too short (recommended: 32+ characters)');
    } else if (jwtSecret === 'change-me-in-production' || jwtSecret.includes('change-me')) {
      printWarning('JWT_SECRET appears to be a default value. Change it in production!');
    } else {
      printSuccess('JWT_SECRET looks secure');
    }
  }

  console.log('');
  
  if (allValid) {
    printSuccess('All required environment variables are set!');
  } else {
    printError('Some required environment variables are missing!');
    process.exit(1);
  }
  
  console.log('');
}

checkEnvFile();
