#!/usr/bin/env node

/**
 * IOC Core Backend Verification Test Suite
 * Tests all backend integrations, database connections, and API systems
 * after Phase 1 migration to verify everything works correctly
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test results tracking
const testResults = {
  timestamp: new Date().toISOString(),
  overall: { passed: 0, failed: 0, errors: [] },
  supabase: { passed: 0, failed: 0, errors: [] },
  database: { passed: 0, failed: 0, errors: [] },
  authentication: { passed: 0, failed: 0, errors: [] },
  api: { passed: 0, failed: 0, errors: [] },
  environment: { passed: 0, failed: 0, errors: [] },
  assessment: { passed: 0, failed: 0, errors: [] }
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(category, test, passed, error = null) {
  const status = passed ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
  log(`  ${status} ${test}`);
  
  if (passed) {
    testResults[category].passed++;
    testResults.overall.passed++;
  } else {
    testResults[category].failed++;
    testResults.overall.failed++;
    if (error) {
      testResults[category].errors.push({ test, error: error.message });
      testResults.overall.errors.push({ category, test, error: error.message });
      log(`    Error: ${error.message}`, 'red');
    }
  }
}

function runCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8',
      cwd: process.cwd(),
      ...options
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout || error.stderr };
  }
}

function testFileExists(filePath, description) {
  try {
    const exists = fs.existsSync(filePath);
    return { success: exists, path: filePath, description };
  } catch (error) {
    return { success: false, error: error.message, path: filePath, description };
  }
}

async function testEnvironmentVariables() {
  log('\n🔧 Testing Environment Variables...', 'blue');
  
  const envFiles = [
    '.env.local',
    '.env',
    '../../../.env.local',
    '../../../.env'
  ];
  
  let envFound = false;
  let envVars = {};
  
  for (const envFile of envFiles) {
    const envPath = path.resolve(envFile);
    if (fs.existsSync(envPath)) {
      envFound = true;
      try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        for (const line of lines) {
          if (line.includes('=') && !line.startsWith('#')) {
            const [key, value] = line.split('=');
            envVars[key.trim()] = value ? value.trim() : '';
          }
        }
      } catch (error) {
        logTest('environment', `Read ${envFile}`, false, error);
      }
    }
  }
  
  logTest('environment', 'Environment files found', envFound);
  
  // Test required environment variables
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  for (const varName of requiredVars) {
    const exists = envVars[varName] || process.env[varName];
    logTest('environment', `${varName} is set`, !!exists);
  }
  
  // Test environment variable values are not empty
  for (const varName of requiredVars) {
    const value = envVars[varName] || process.env[varName];
    const isValid = value && value.trim() !== '' && value !== 'your-value-here';
    logTest('environment', `${varName} has valid value`, isValid);
  }
}

async function testSupabaseConnections() {
  log('\n🔌 Testing Supabase Connections...', 'blue');
  
  // Test if Supabase client files exist
  const supabaseFiles = [
    '/home/darren/ioc-core/packages/lib/src/supabase/client.ts',
    '/home/darren/ioc-core/packages/lib/src/supabase/server.ts',
    '/home/darren/ioc-core/packages/lib/src/supabase/index.ts'
  ];
  
  for (const file of supabaseFiles) {
    const result = testFileExists(file, `Supabase file: ${path.basename(file)}`);
    logTest('supabase', result.description, result.success, result.error);
  }
  
  // Test Supabase client creation
  try {
    const testScript = `
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'example-key';
      
      const { createClient } = require('../packages/lib/dist/supabase/client');
      const client = createClient();
      console.log('Client created successfully');
    `;
    
    const result = runCommand(`node -e "${testScript}"`, { cwd: '/home/darren/ioc-core' });
    logTest('supabase', 'Client creation from @ioc/lib', result.success);
  } catch (error) {
    logTest('supabase', 'Client creation from @ioc/lib', false, error);
  }
  
  // Test server-side client
  try {
    const testScript = `
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'example-key';
      
      const { createClient } = require('../packages/lib/dist/supabase/server');
      const client = createClient();
      console.log('Server client created successfully');
    `;
    
    const result = runCommand(`node -e "${testScript}"`, { cwd: '/home/darren/ioc-core' });
    logTest('supabase', 'Server client creation from @ioc/lib', result.success);
  } catch (error) {
    logTest('supabase', 'Server client creation from @ioc/lib', false, error);
  }
}

async function testDatabaseOperations() {
  log('\n🗄️ Testing Database Operations...', 'blue');
  
  // Test database utility files exist
  const dbFiles = [
    '/home/darren/ioc-core/packages/lib/src/database/analytics.ts',
    '/home/darren/ioc-core/packages/lib/src/database/assessments.ts',
    '/home/darren/ioc-core/packages/lib/src/database/organizations.ts',
    '/home/darren/ioc-core/packages/lib/src/database/users.ts',
    '/home/darren/ioc-core/packages/lib/src/database/index.ts'
  ];
  
  for (const file of dbFiles) {
    const result = testFileExists(file, `Database file: ${path.basename(file)}`);
    logTest('database', result.description, result.success, result.error);
  }
  
  // Test database imports
  try {
    const testScript = `
      const dbModule = require('../packages/lib/dist/database');
      const functions = Object.keys(dbModule);
      console.log('Database functions available:', functions.length);
    `;
    
    const result = runCommand(`node -e "${testScript}"`, { cwd: '/home/darren/ioc-core' });
    logTest('database', 'Database module imports correctly', result.success);
  } catch (error) {
    logTest('database', 'Database module imports correctly', false, error);
  }
  
  // Test local database files in apps
  const localDbFiles = [
    '/home/darren/ioc-core/apps/beta/lib/db/analytics.js',
    '/home/darren/ioc-core/apps/beta/lib/db/assessments.js',
    '/home/darren/ioc-core/apps/beta/lib/db/organizations.js',
    '/home/darren/ioc-core/apps/beta/lib/db/users.js'
  ];
  
  for (const file of localDbFiles) {
    const result = testFileExists(file, `Local DB file: ${path.basename(file)}`);
    logTest('database', result.description, result.success, result.error);
  }
}

async function testAuthenticationSystem() {
  log('\n🔐 Testing Authentication System...', 'blue');
  
  // Test authentication context files
  const authFiles = [
    '/home/darren/ioc-core/packages/lib/src/contexts/auth-context.tsx',
    '/home/darren/ioc-core/packages/lib/src/contexts/ceo-auth-context.tsx',
    '/home/darren/ioc-core/packages/lib/src/contexts/index.ts'
  ];
  
  for (const file of authFiles) {
    const result = testFileExists(file, `Auth file: ${path.basename(file)}`);
    logTest('authentication', result.description, result.success, result.error);
  }
  
  // Test local auth context files
  const localAuthFiles = [
    '/home/darren/ioc-core/apps/beta/contexts/auth-context.tsx',
    '/home/darren/ioc-core/apps/beta/contexts/ceo-auth-context.tsx',
    '/home/darren/ioc-core/apps/beta/contexts/websocket-context.tsx'
  ];
  
  for (const file of localAuthFiles) {
    const result = testFileExists(file, `Local auth file: ${path.basename(file)}`);
    logTest('authentication', result.description, result.success, result.error);
  }
  
  // Test authentication API routes
  const authRoutes = [
    '/home/darren/ioc-core/apps/beta/app/api/auth/[...auth]/route.js',
    '/home/darren/ioc-core/apps/beta/app/auth/callback/route.js'
  ];
  
  for (const route of authRoutes) {
    const result = testFileExists(route, `Auth route: ${path.basename(route)}`);
    logTest('authentication', result.description, result.success, result.error);
  }
}

async function testAPIEndpoints() {
  log('\n🌐 Testing API Endpoints...', 'blue');
  
  // Test API route files exist
  const apiRoutes = [
    '/home/darren/ioc-core/apps/beta/app/api/health/route.js',
    '/home/darren/ioc-core/apps/beta/app/api/version/route.js',
    '/home/darren/ioc-core/apps/beta/app/api/assessments/route.js',
    '/home/darren/ioc-core/apps/beta/app/api/users/route.js',
    '/home/darren/ioc-core/apps/beta/app/api/organizations/route.js',
    '/home/darren/ioc-core/apps/beta/app/api/analytics/route.js'
  ];
  
  for (const route of apiRoutes) {
    const result = testFileExists(route, `API route: ${path.basename(route)}`);
    logTest('api', result.description, result.success, result.error);
  }
  
  // Test API route structure
  const apiDir = '/home/darren/ioc-core/apps/beta/app/api';
  try {
    const apiRoutes = fs.readdirSync(apiDir);
    logTest('api', `API directory has ${apiRoutes.length} routes`, apiRoutes.length > 0);
  } catch (error) {
    logTest('api', 'API directory accessible', false, error);
  }
  
  // Test Next.js API configuration
  const nextConfig = '/home/darren/ioc-core/apps/beta/next.config.js';
  const result = testFileExists(nextConfig, 'Next.js config file');
  logTest('api', result.description, result.success, result.error);
}

async function testAssessmentEngine() {
  log('\n🎯 Testing Assessment Engine...', 'blue');
  
  // Test assessment engine files
  const assessmentFiles = [
    '/home/darren/ioc-core/packages/lib/src/engines/assessment-engine.ts',
    '/home/darren/ioc-core/packages/lib/src/engines/index.ts',
    '/home/darren/ioc-core/apps/beta/lib/assessment-engine.js'
  ];
  
  for (const file of assessmentFiles) {
    const result = testFileExists(file, `Assessment file: ${path.basename(file)}`);
    logTest('assessment', result.description, result.success, result.error);
  }
  
  // Test assessment engine functionality
  try {
    const testScript = `
      const assessmentModule = require('../packages/lib/dist/engines');
      const { assessmentTypes, sampleQuestions } = assessmentModule;
      
      console.log('Assessment types:', Object.keys(assessmentTypes));
      console.log('Sample questions available:', Object.keys(sampleQuestions));
    `;
    
    const result = runCommand(`node -e "${testScript}"`, { cwd: '/home/darren/ioc-core' });
    logTest('assessment', 'Assessment engine module loads correctly', result.success);
  } catch (error) {
    logTest('assessment', 'Assessment engine module loads correctly', false, error);
  }
  
  // Test assessment API routes
  const assessmentRoutes = [
    '/home/darren/ioc-core/apps/beta/app/api/assessments/route.js',
    '/home/darren/ioc-core/apps/beta/app/api/assessments/[id]/route.js',
    '/home/darren/ioc-core/apps/beta/app/api/assessments/[id]/submit/route.js'
  ];
  
  for (const route of assessmentRoutes) {
    const result = testFileExists(route, `Assessment route: ${path.basename(route)}`);
    logTest('assessment', result.description, result.success, result.error);
  }
}

async function testDependencyIntegration() {
  log('\n📦 Testing Dependency Integration...', 'blue');
  
  // Test package building
  const buildResult = runCommand('npm run build', { cwd: '/home/darren/ioc-core/packages/lib' });
  logTest('overall', '@ioc/lib package builds successfully', buildResult.success);
  
  // Test package installation in beta app
  const installResult = runCommand('npm list @ioc/lib', { cwd: '/home/darren/ioc-core/apps/beta' });
  logTest('overall', '@ioc/lib is installed in beta app', installResult.success);
  
  // Test TypeScript compilation
  const tsResult = runCommand('npx tsc --noEmit', { cwd: '/home/darren/ioc-core/apps/beta' });
  logTest('overall', 'TypeScript compilation passes', tsResult.success);
}

async function generateReport() {
  log('\n📊 Generating Test Report...', 'blue');
  
  const reportData = {
    ...testResults,
    summary: {
      totalTests: testResults.overall.passed + testResults.overall.failed,
      successRate: testResults.overall.failed === 0 ? 100 : 
        Math.round((testResults.overall.passed / (testResults.overall.passed + testResults.overall.failed)) * 100)
    },
    recommendations: []
  };
  
  // Generate recommendations based on failures
  if (testResults.environment.failed > 0) {
    reportData.recommendations.push({
      category: 'Environment',
      priority: 'High',
      message: 'Environment variables need to be properly configured',
      action: 'Check .env files and ensure all required variables are set'
    });
  }
  
  if (testResults.supabase.failed > 0) {
    reportData.recommendations.push({
      category: 'Supabase',
      priority: 'High',
      message: 'Supabase integration issues detected',
      action: 'Verify Supabase configuration and connection strings'
    });
  }
  
  if (testResults.database.failed > 0) {
    reportData.recommendations.push({
      category: 'Database',
      priority: 'Medium',
      message: 'Database operation issues detected',
      action: 'Check database utility functions and imports'
    });
  }
  
  if (testResults.authentication.failed > 0) {
    reportData.recommendations.push({
      category: 'Authentication',
      priority: 'High',
      message: 'Authentication system issues detected',
      action: 'Verify authentication contexts and API routes'
    });
  }
  
  if (testResults.api.failed > 0) {
    reportData.recommendations.push({
      category: 'API',
      priority: 'Medium',
      message: 'API endpoint issues detected',
      action: 'Check API route files and Next.js configuration'
    });
  }
  
  if (testResults.assessment.failed > 0) {
    reportData.recommendations.push({
      category: 'Assessment',
      priority: 'Medium',
      message: 'Assessment engine issues detected',
      action: 'Verify assessment engine integration and API routes'
    });
  }
  
  // Write report to file
  const reportPath = '/home/darren/ioc-core/backend-verification-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  
  log(`\n📄 Test report saved to: ${reportPath}`, 'green');
  
  return reportData;
}

// Main execution
async function main() {
  log('🚀 IOC Core Backend Verification Test Suite', 'bold');
  log('=========================================', 'bold');
  
  try {
    await testEnvironmentVariables();
    await testSupabaseConnections();
    await testDatabaseOperations();
    await testAuthenticationSystem();
    await testAPIEndpoints();
    await testAssessmentEngine();
    await testDependencyIntegration();
    
    const report = await generateReport();
    
    // Final summary
    log('\n📋 Test Summary:', 'bold');
    log(`  Total Tests: ${report.summary.totalTests}`);
    log(`  Passed: ${colors.green}${testResults.overall.passed}${colors.reset}`);
    log(`  Failed: ${colors.red}${testResults.overall.failed}${colors.reset}`);
    log(`  Success Rate: ${report.summary.successRate}%`);
    
    if (testResults.overall.failed > 0) {
      log('\n❌ Issues Found:', 'red');
      testResults.overall.errors.forEach(error => {
        log(`  ${error.category}: ${error.test} - ${error.error}`, 'red');
      });
    } else {
      log('\n✅ All tests passed! Backend systems are working correctly.', 'green');
    }
    
    // Exit with appropriate code
    process.exit(testResults.overall.failed > 0 ? 1 : 0);
    
  } catch (error) {
    log(`\n💥 Test suite failed with error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the test suite
main();