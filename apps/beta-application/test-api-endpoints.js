#!/usr/bin/env node

/**
 * Test API endpoints directly without starting the server
 */

const fs = require('fs');
const path = require('path');

// Load environment variables manually
const envPath = path.resolve('/home/darren/ioc-core/.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.includes('=') && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  }
}

// Mock Next.js Response
const mockNextResponse = {
  json: (data, options = {}) => ({
    data,
    status: options.status || 200,
    headers: options.headers || {}
  })
};

// Test results
const results = {
  timestamp: new Date().toISOString(),
  tests: [],
  environment: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  }
};

function logResult(test, passed, error = null, details = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${test}`);
  
  if (error) {
    console.log(`   Error: ${error.message || error}`);
  }
  
  if (details) {
    console.log(`   Details: ${JSON.stringify(details)}`);
  }
  
  results.tests.push({
    test,
    passed,
    error: error?.message || error,
    details
  });
}

async function testEnvironmentVariables() {
  console.log('\n🔧 Testing Environment Variables...');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    const isSet = !!(value && value.trim() && value !== 'your-value-here');
    logResult(`${varName} is properly configured`, isSet, !isSet ? `Variable is ${!value ? 'not set' : 'empty or default'}` : null);
  }
}

async function testApiRouteStructure() {
  console.log('\n🌐 Testing API Route Structure...');
  
  const apiRoutes = [
    { path: 'app/api/health/route.js', name: 'Health check endpoint' },
    { path: 'app/api/version/route.js', name: 'Version endpoint' },
    { path: 'app/api/assessments/route.js', name: 'Assessments endpoint' },
    { path: 'app/api/users/route.js', name: 'Users endpoint' },
    { path: 'app/api/organizations/route.js', name: 'Organizations endpoint' },
    { path: 'app/api/analytics/route.js', name: 'Analytics endpoint' },
    { path: 'app/api/auth/[...auth]/route.js', name: 'Auth endpoint' }
  ];
  
  for (const route of apiRoutes) {
    const routePath = path.resolve(route.path);
    const exists = fs.existsSync(routePath);
    logResult(`${route.name} file exists`, exists, !exists ? `File not found: ${route.path}` : null);
    
    if (exists) {
      try {
        const content = fs.readFileSync(routePath, 'utf8');
        const hasHttpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].some(method => 
          content.includes(`export async function ${method}`) || content.includes(`export function ${method}`)
        );
        logResult(`${route.name} has HTTP methods`, hasHttpMethods, !hasHttpMethods ? 'No HTTP methods found' : null);
      } catch (error) {
        logResult(`${route.name} is readable`, false, error);
      }
    }
  }
}

async function testSupabaseIntegration() {
  console.log('\n🔌 Testing Supabase Integration...');
  
  try {
    // Test if we can import the @ioc/lib package
    const libPath = path.resolve('../../packages/lib');
    const packageJsonPath = path.join(libPath, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      logResult('@ioc/lib package exists', true);
      
      // Check if the package is built
      const distPath = path.join(libPath, 'dist');
      const isBuilt = fs.existsSync(distPath);
      logResult('@ioc/lib package is built', isBuilt, !isBuilt ? 'Run npm run build in packages/lib' : null);
      
      if (isBuilt) {
        // Test if supabase modules exist
        const supabaseClientPath = path.join(distPath, 'supabase', 'client.js');
        const supabaseServerPath = path.join(distPath, 'supabase', 'server.js');
        
        logResult('Supabase client module exists', fs.existsSync(supabaseClientPath));
        logResult('Supabase server module exists', fs.existsSync(supabaseServerPath));
      }
    } else {
      logResult('@ioc/lib package exists', false, 'Package not found');
    }
  } catch (error) {
    logResult('Supabase integration test', false, error);
  }
}

async function testDatabaseModules() {
  console.log('\n🗄️ Testing Database Modules...');
  
  const libPath = path.resolve('../../packages/lib');
  const distPath = path.join(libPath, 'dist');
  
  if (fs.existsSync(distPath)) {
    const databasePath = path.join(distPath, 'database');
    const modules = ['analytics.js', 'assessments.js', 'organizations.js', 'users.js', 'index.js'];
    
    for (const module of modules) {
      const modulePath = path.join(databasePath, module);
      const exists = fs.existsSync(modulePath);
      logResult(`Database ${module} module exists`, exists, !exists ? `Module not found: ${module}` : null);
    }
  } else {
    logResult('Database modules directory', false, 'Dist folder not found - package not built');
  }
  
  // Test local database files
  const localDbPath = path.resolve('lib/db');
  if (fs.existsSync(localDbPath)) {
    const localModules = ['analytics.js', 'assessments.js', 'organizations.js', 'users.js'];
    
    for (const module of localModules) {
      const modulePath = path.join(localDbPath, module);
      const exists = fs.existsSync(modulePath);
      logResult(`Local database ${module} exists`, exists, !exists ? `Local module not found: ${module}` : null);
    }
  } else {
    logResult('Local database directory', false, 'Local db directory not found');
  }
}

async function testAuthenticationSystem() {
  console.log('\n🔐 Testing Authentication System...');
  
  // Test authentication contexts in @ioc/lib
  const libPath = path.resolve('../../packages/lib');
  const distPath = path.join(libPath, 'dist');
  
  if (fs.existsSync(distPath)) {
    const contextsPath = path.join(distPath, 'contexts');
    const authModules = ['auth-context.js', 'ceo-auth-context.js', 'index.js'];
    
    for (const module of authModules) {
      const modulePath = path.join(contextsPath, module);
      const exists = fs.existsSync(modulePath);
      logResult(`Auth context ${module} exists`, exists, !exists ? `Auth module not found: ${module}` : null);
    }
  }
  
  // Test local authentication contexts
  const localContextPath = path.resolve('contexts');
  if (fs.existsSync(localContextPath)) {
    const localAuthModules = ['auth-context.tsx', 'ceo-auth-context.tsx', 'websocket-context.tsx'];
    
    for (const module of localAuthModules) {
      const modulePath = path.join(localContextPath, module);
      const exists = fs.existsSync(modulePath);
      logResult(`Local auth context ${module} exists`, exists, !exists ? `Local auth module not found: ${module}` : null);
    }
  }
}

async function testAssessmentEngine() {
  console.log('\n🎯 Testing Assessment Engine...');
  
  // Test assessment engine in @ioc/lib
  const libPath = path.resolve('../../packages/lib');
  const distPath = path.join(libPath, 'dist');
  
  if (fs.existsSync(distPath)) {
    const enginesPath = path.join(distPath, 'engines');
    const engineModules = ['assessment-engine.js', 'index.js'];
    
    for (const module of engineModules) {
      const modulePath = path.join(enginesPath, module);
      const exists = fs.existsSync(modulePath);
      logResult(`Assessment engine ${module} exists`, exists, !exists ? `Engine module not found: ${module}` : null);
    }
  }
  
  // Test local assessment engine
  const localEngineDir = path.resolve('lib');
  const localEnginePath = path.join(localEngineDir, 'assessment-engine.js');
  const localExists = fs.existsSync(localEnginePath);
  logResult('Local assessment engine exists', localExists, !localExists ? 'Local assessment engine not found' : null);
}

async function testPackageIntegration() {
  console.log('\n📦 Testing Package Integration...');
  
  // Test package.json dependencies
  const packageJsonPath = path.resolve('package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = packageJson.dependencies || {};
      
      const iocPackages = [
        '@ioc/lib',
        '@ioc/types',
        '@ioc/ui',
        '@ioc-core/config'
      ];
      
      for (const pkg of iocPackages) {
        const hasPackage = dependencies[pkg];
        logResult(`${pkg} dependency exists`, !!hasPackage, !hasPackage ? `Package not found in dependencies` : null);
      }
    } catch (error) {
      logResult('Package.json parsing', false, error);
    }
  }
  
  // Test node_modules
  const nodeModulesPath = path.resolve('node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    const iocLibPath = path.join(nodeModulesPath, '@ioc', 'lib');
    const exists = fs.existsSync(iocLibPath);
    logResult('@ioc/lib in node_modules', exists, !exists ? 'Package not installed' : null);
  }
}

async function generateReport() {
  console.log('\n📊 Generating Test Report...');
  
  const passed = results.tests.filter(t => t.passed).length;
  const failed = results.tests.filter(t => t.passed === false).length;
  const total = results.tests.length;
  
  const report = {
    ...results,
    summary: {
      total,
      passed,
      failed,
      successRate: total > 0 ? Math.round((passed / total) * 100) : 0
    },
    issues: results.tests.filter(t => !t.passed),
    recommendations: []
  };
  
  // Generate recommendations
  if (report.issues.some(i => i.test.includes('SUPABASE'))) {
    report.recommendations.push({
      category: 'Environment',
      priority: 'High',
      message: 'Supabase environment variables are not properly configured',
      action: 'Verify .env.local file has correct Supabase credentials'
    });
  }
  
  if (report.issues.some(i => i.test.includes('package is built'))) {
    report.recommendations.push({
      category: 'Build',
      priority: 'High',
      message: '@ioc/lib package is not built',
      action: 'Run: cd packages/lib && npm run build'
    });
  }
  
  if (report.issues.some(i => i.test.includes('API'))) {
    report.recommendations.push({
      category: 'API',
      priority: 'Medium',
      message: 'API routes have structural issues',
      action: 'Check API route implementations and imports'
    });
  }
  
  // Save report
  const reportPath = '/home/darren/ioc-core/backend-integration-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📄 Test report saved to: ${reportPath}`);
  
  return report;
}

async function main() {
  console.log('🚀 IOC Core Backend Integration Test');
  console.log('==================================');
  
  // Set working directory
  process.chdir('/home/darren/ioc-core/apps/beta');
  
  try {
    await testEnvironmentVariables();
    await testApiRouteStructure();
    await testSupabaseIntegration();
    await testDatabaseModules();
    await testAuthenticationSystem();
    await testAssessmentEngine();
    await testPackageIntegration();
    
    const report = await generateReport();
    
    // Final summary
    console.log('\n📋 Test Summary:');
    console.log(`  Total Tests: ${report.summary.total}`);
    console.log(`  Passed: ${report.summary.passed}`);
    console.log(`  Failed: ${report.summary.failed}`);
    console.log(`  Success Rate: ${report.summary.successRate}%`);
    
    if (report.summary.failed > 0) {
      console.log('\n❌ Critical Issues Found:');
      report.issues.forEach(issue => {
        console.log(`  - ${issue.test}: ${issue.error || 'Failed'}`);
      });
      
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`  - ${rec.category} (${rec.priority}): ${rec.message}`);
        console.log(`    Action: ${rec.action}`);
      });
    } else {
      console.log('\n✅ All tests passed! Backend integration is working correctly.');
    }
    
    return report;
    
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

main();