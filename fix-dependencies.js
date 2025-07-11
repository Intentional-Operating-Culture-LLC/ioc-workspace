#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Define the internal dependencies each app/lib should have
const dependencyMap = {
  // Apps
  'apps/admin-dashboard': ['@ioc/shared/ui', '@ioc/shared/data-access', '@ioc/shared/types', '@ioc/shared/api-utils'],
  'apps/beta-application': ['@ioc/shared/ui', '@ioc/shared/data-access', '@ioc/shared/types', '@ioc/shared/api-utils'],
  'apps/beta-portal': ['@ioc/shared/ui', '@ioc/shared/data-access', '@ioc/shared/types'],
  'apps/dev-sandbox': ['@ioc/shared/ui', '@ioc/shared/data-access', '@ioc/shared/types'],
  'apps/developer-tools': ['@ioc/shared/ui', '@ioc/shared/data-access', '@ioc/shared/types'],
  'apps/main-application': ['@ioc/shared/ui', '@ioc/shared/data-access', '@ioc/shared/types', '@ioc/shared/api-utils', '@ioc/assessment/scoring'],
  
  // Libs that depend on other libs
  'libs/shared/ui': ['@ioc/shared/types'],
  'libs/shared/data-access': ['@ioc/shared/types', '@ioc/shared/config'],
  'libs/assessment/scoring': ['@ioc/shared/types'],
  'libs/assessment/ocean-analytics': ['@ioc/shared/types', '@ioc/assessment/scoring'],
  'libs/features/lambda-analytics': ['@ioc/shared/types'],
  'libs/testing/test-utils': ['@ioc/shared/types', '@ioc/shared/data-access'],
};

// Process each package
Object.entries(dependencyMap).forEach(([pkgPath, deps]) => {
  const packageJsonPath = path.join(__dirname, pkgPath, 'package.json');
  
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Initialize dependencies if not exists
    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }
    
    // Add internal dependencies
    deps.forEach(dep => {
      packageJson.dependencies[dep] = '*';
    });
    
    // Write back
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ Updated ${pkgPath}/package.json`);
  } else {
    console.warn(`⚠️  Package.json not found: ${packageJsonPath}`);
  }
});

console.log('\n✨ Dependency updates complete!');