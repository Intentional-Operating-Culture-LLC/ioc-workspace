#!/usr/bin/env node

/**
 * Smoke Tests for Production Deployments
 * Run after deployment to verify critical functionality
 */

const https = require('https');
const { URL } = require('url');

const TIMEOUT = 30000; // 30 seconds

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Get URL from command line or environment
const targetUrl = process.argv[2] || process.env.SMOKE_TEST_URL;

if (!targetUrl) {
  console.error(`${colors.red}Error: No URL provided${colors.reset}`);
  console.log('Usage: npm run e2e:smoke -- --url=https://example.com');
  process.exit(1);
}

// Test definitions
const tests = [
  {
    name: 'Homepage loads',
    path: '/',
    expectedStatus: 200,
    expectedContent: ['<!DOCTYPE html>', '<html']
  },
  {
    name: 'API health check',
    path: '/api/health',
    expectedStatus: 200,
    expectedJSON: true,
    expectedFields: ['status', 'timestamp']
  },
  {
    name: 'Static assets load',
    path: '/favicon.ico',
    expectedStatus: 200
  },
  {
    name: 'Login page accessible',
    path: '/login',
    expectedStatus: 200,
    expectedContent: ['login', 'Login']
  },
  {
    name: 'Assessment API responds',
    path: '/api/assessments',
    expectedStatus: [200, 401] // May require auth
  },
  {
    name: '404 page works',
    path: '/non-existent-page-12345',
    expectedStatus: 404
  },
  {
    name: 'Robots.txt exists',
    path: '/robots.txt',
    expectedStatus: 200
  },
  {
    name: 'Security headers present',
    path: '/',
    expectedHeaders: [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection'
    ]
  }
];

// Test runner
async function runTest(test, baseUrl) {
  const url = new URL(test.path, baseUrl);
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = https.get(url.toString(), { timeout: TIMEOUT }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const duration = Date.now() - startTime;
        const result = {
          name: test.name,
          path: test.path,
          status: res.statusCode,
          duration,
          success: true,
          errors: []
        };
        
        // Check status code
        if (test.expectedStatus) {
          const expectedStatuses = Array.isArray(test.expectedStatus) 
            ? test.expectedStatus 
            : [test.expectedStatus];
          
          if (!expectedStatuses.includes(res.statusCode)) {
            result.success = false;
            result.errors.push(`Expected status ${expectedStatuses.join(' or ')}, got ${res.statusCode}`);
          }
        }
        
        // Check content
        if (test.expectedContent && result.success) {
          for (const content of test.expectedContent) {
            if (!data.toLowerCase().includes(content.toLowerCase())) {
              result.success = false;
              result.errors.push(`Expected content "${content}" not found`);
            }
          }
        }
        
        // Check JSON response
        if (test.expectedJSON && result.success) {
          try {
            const json = JSON.parse(data);
            if (test.expectedFields) {
              for (const field of test.expectedFields) {
                if (!(field in json)) {
                  result.success = false;
                  result.errors.push(`Expected JSON field "${field}" not found`);
                }
              }
            }
          } catch (e) {
            result.success = false;
            result.errors.push('Response is not valid JSON');
          }
        }
        
        // Check headers
        if (test.expectedHeaders && result.success) {
          for (const header of test.expectedHeaders) {
            if (!res.headers[header.toLowerCase()]) {
              result.success = false;
              result.errors.push(`Expected header "${header}" not found`);
            }
          }
        }
        
        resolve(result);
      });
    });
    
    req.on('error', (err) => {
      resolve({
        name: test.name,
        path: test.path,
        success: false,
        errors: [`Request failed: ${err.message}`],
        duration: Date.now() - startTime
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: test.name,
        path: test.path,
        success: false,
        errors: ['Request timed out'],
        duration: TIMEOUT
      });
    });
  });
}

// Main execution
async function main() {
  console.log(`${colors.blue}Running smoke tests for: ${targetUrl}${colors.reset}\n`);
  
  const results = [];
  let passedCount = 0;
  let failedCount = 0;
  
  // Run tests sequentially to avoid overwhelming the server
  for (const test of tests) {
    process.stdout.write(`Running: ${test.name}... `);
    const result = await runTest(test, targetUrl);
    results.push(result);
    
    if (result.success) {
      console.log(`${colors.green}✓ PASSED${colors.reset} (${result.duration}ms)`);
      passedCount++;
    } else {
      console.log(`${colors.red}✗ FAILED${colors.reset} (${result.duration}ms)`);
      console.log(`  ${colors.red}${result.errors.join('\n  ')}${colors.reset}`);
      failedCount++;
    }
  }
  
  // Summary
  console.log(`\n${colors.blue}Summary:${colors.reset}`);
  console.log(`${colors.green}Passed: ${passedCount}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedCount}${colors.reset}`);
  console.log(`Total: ${results.length}`);
  
  // Performance summary
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  console.log(`\n${colors.blue}Performance:${colors.reset}`);
  console.log(`Average response time: ${avgDuration.toFixed(0)}ms`);
  
  // Exit with appropriate code
  process.exit(failedCount > 0 ? 1 : 0);
}

// Run the tests
main().catch((err) => {
  console.error(`${colors.red}Unexpected error: ${err.message}${colors.reset}`);
  process.exit(1);
});