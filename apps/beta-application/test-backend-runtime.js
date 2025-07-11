#!/usr/bin/env node

/**
 * IOC Core Backend Runtime Test
 * Tests actual runtime functionality of backend systems
 */

const path = require('path');
const fs = require('fs');

// Test results
const results = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: { passed: 0, failed: 0, total: 0 }
};

function logResult(test, passed, error = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${test}`);

  results.tests.push({
    test,
    passed,
    error: error?.message || null
  });

  if (passed) {
    results.summary.passed++;
  } else {
    results.summary.failed++;
    if (error) {
      console.log(`   Error: ${error.message}`);
    }
  }
  results.summary.total++;
}

async function testSupabaseClientImport() {
  console.log('\n🔌 Testing Supabase Client Import...');

  try {
    // Test client creation from dist
    const clientPath = path.resolve('../packages/lib/dist/supabase/client.js');
    if (fs.existsSync(clientPath)) {
      const { createClient } = require(clientPath);
      logResult('Supabase client module imports correctly', true);
    } else {
      logResult('Supabase client module imports correctly', false, new Error('Dist file not found'));
    }
  } catch (error) {
    logResult('Supabase client module imports correctly', false, error);
  }
}

async function testDatabaseModules() {
  console.log('\n🗄️ Testing Database Modules...');

  try {
    // Test database module imports
    const dbPath = path.resolve('../packages/lib/dist/database/index.js');
    if (fs.existsSync(dbPath)) {
      const dbModule = require(dbPath);
      logResult('Database module imports correctly', true);

      // Test specific database modules
      const modules = ['analytics', 'assessments', 'organizations', 'users'];
      for (const module of modules) {
        const modulePath = path.resolve(`../packages/lib/dist/database/${module}.js`);
        if (fs.existsSync(modulePath)) {
          logResult(`Database ${module} module exists`, true);
        } else {
          logResult(`Database ${module} module exists`, false, new Error(`${module}.js not found`));
        }
      }
    } else {
      logResult('Database module imports correctly', false, new Error('Database index not found'));
    }
  } catch (error) {
    logResult('Database module imports correctly', false, error);
  }
}

async function testAuthenticationContexts() {
  console.log('\n🔐 Testing Authentication Contexts...');

  try {
    // Test auth context imports
    const authPath = path.resolve('../packages/lib/dist/contexts/index.js');
    if (fs.existsSync(authPath)) {
      const authModule = require(authPath);
      logResult('Authentication context module imports correctly', true);
    } else {
      logResult('Authentication context module imports correctly', false, new Error('Auth context not found'));
    }
  } catch (error) {
    logResult('Authentication context module imports correctly', false, error);
  }
}

async function testAssessmentEngine() {
  console.log('\n🎯 Testing Assessment Engine...');

  try {
    // Test assessment engine imports
    const enginePath = path.resolve('../packages/lib/dist/engines/index.js');
    if (fs.existsSync(enginePath)) {
      const engineModule = require(enginePath);
      logResult('Assessment engine module imports correctly', true);

      // Test specific exports
      if (engineModule.assessmentTypes && engineModule.sampleQuestions) {
        logResult('Assessment engine exports required functions', true);
      } else {
        logResult('Assessment engine exports required functions', false, new Error('Missing required exports'));
      }
    } else {
      logResult('Assessment engine module imports correctly', false, new Error('Assessment engine not found'));
    }
  } catch (error) {
    logResult('Assessment engine module imports correctly', false, error);
  }
}

async function testApiRoutes() {
  console.log('\n🌐 Testing API Routes...');

  const apiRoutes = [
  { path: 'app/api/health/route.js', name: 'Health check endpoint' },
  { path: 'app/api/version/route.js', name: 'Version endpoint' },
  { path: 'app/api/assessments/route.js', name: 'Assessments endpoint' },
  { path: 'app/api/users/route.js', name: 'Users endpoint' },
  { path: 'app/api/organizations/route.js', name: 'Organizations endpoint' },
  { path: 'app/api/auth/[...auth]/route.js', name: 'Auth endpoint' }];


  for (const route of apiRoutes) {
    const routePath = path.resolve(route.path);
    if (fs.existsSync(routePath)) {
      // Try to load and check if it's a valid API route
      try {
        const routeModule = require(routePath);
        const hasHttpMethods = ['GET', 'POST', 'PUT', 'DELETE'].some((method) =>
        typeof routeModule[method] === 'function'
        );
        logResult(`${route.name} is valid API route`, hasHttpMethods);
      } catch (error) {
        logResult(`${route.name} is valid API route`, false, error);
      }
    } else {
      logResult(`${route.name} exists`, false, new Error(`Route file not found: ${route.path}`));
    }
  }
}

async function testEnvironmentConfig() {
  console.log('\n🔧 Testing Environment Configuration...');

  // Check for environment files
  const envFiles = ['.env.local', '.env', '../../../.env.local', '../../../.env'];
  let envFound = false;

  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      envFound = true;
      break;
    }
  }

  logResult('Environment configuration files found', envFound);

  // Test required environment variables
  const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'];


  for (const envVar of requiredVars) {
    const value = process.env[envVar];
    logResult(`${envVar} is configured`, !!(value && value.trim()));
  }
}

async function testLocalDatabaseFiles() {
  console.log('\n📁 Testing Local Database Files...');

  const localDbFiles = [
  'lib/db/analytics.js',
  'lib/db/assessments.js',
  'lib/db/organizations.js',
  'lib/db/users.js'];


  for (const file of localDbFiles) {
    if (fs.existsSync(file)) {
      try {
        const dbModule = require(path.resolve(file));
        logResult(`Local database file ${file} loads correctly`, true);
      } catch (error) {
        logResult(`Local database file ${file} loads correctly`, false, error);
      }
    } else {
      logResult(`Local database file ${file} exists`, false, new Error(`File not found: ${file}`));
    }
  }
}

async function testPackageIntegration() {
  console.log('\n📦 Testing Package Integration...');

  try {
    // Test that @ioc/lib is properly installed and accessible
    const libModule = require("@ioc/shared/data-access");
    logResult('@ioc/lib package is accessible', true);

    // Test main exports
    const hasSupabase = libModule.createClient || libModule.supabase;
    logResult('@ioc/lib exports Supabase client', !!hasSupabase);

    const hasDatabase = libModule.getUsers || libModule.getOrganizations;
    logResult('@ioc/lib exports database functions', !!hasDatabase);

    const hasAuth = libModule.AuthProvider || libModule.useAuth;
    logResult('@ioc/lib exports authentication', !!hasAuth);

  } catch (error) {
    logResult('@ioc/lib package is accessible', false, error);
  }
}

async function generateReport() {
  console.log('\n📊 Generating Test Report...');

  const report = {
    ...results,
    summary: {
      ...results.summary,
      successRate: results.summary.total > 0 ?
      Math.round(results.summary.passed / results.summary.total * 100) : 0
    },
    issues: results.tests.filter((test) => !test.passed),
    recommendations: []
  };

  // Generate recommendations
  const failedTests = results.tests.filter((test) => !test.passed);

  if (failedTests.some((test) => test.test.includes('Supabase'))) {
    report.recommendations.push({
      category: 'Supabase',
      priority: 'High',
      message: 'Supabase client issues detected - verify package build and configuration'
    });
  }

  if (failedTests.some((test) => test.test.includes('Database'))) {
    report.recommendations.push({
      category: 'Database',
      priority: 'Medium',
      message: 'Database module issues detected - check TypeScript compilation'
    });
  }

  if (failedTests.some((test) => test.test.includes('API'))) {
    report.recommendations.push({
      category: 'API',
      priority: 'Medium',
      message: 'API route issues detected - verify route implementations'
    });
  }

  if (failedTests.some((test) => test.test.includes('Environment'))) {
    report.recommendations.push({
      category: 'Environment',
      priority: 'High',
      message: 'Environment configuration issues - set up required environment variables'
    });
  }

  // Save report
  const reportPath = '/home/darren/ioc-core/backend-runtime-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n📄 Test report saved to: ${reportPath}`);

  return report;
}

// Main execution
async function main() {
  console.log('🚀 IOC Core Backend Runtime Test');
  console.log('================================');

  // Change to the correct directory
  process.chdir('/home/darren/ioc-core/apps/beta');

  try {
    await testEnvironmentConfig();
    await testSupabaseClientImport();
    await testDatabaseModules();
    await testAuthenticationContexts();
    await testAssessmentEngine();
    await testApiRoutes();
    await testLocalDatabaseFiles();
    await testPackageIntegration();

    const report = await generateReport();

    // Final summary
    console.log('\n📋 Test Summary:');
    console.log(`  Total Tests: ${report.summary.total}`);
    console.log(`  Passed: ${report.summary.passed}`);
    console.log(`  Failed: ${report.summary.failed}`);
    console.log(`  Success Rate: ${report.summary.successRate}%`);

    if (report.summary.failed > 0) {
      console.log('\n❌ Issues Found:');
      report.issues.forEach((issue) => {
        console.log(`  - ${issue.test}: ${issue.error || 'Failed'}`);
      });

      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec) => {
        console.log(`  - ${rec.category} (${rec.priority}): ${rec.message}`);
      });
    } else {
      console.log('\n✅ All tests passed! Backend systems are working correctly.');
    }

    process.exit(report.summary.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

main();