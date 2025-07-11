#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Define all package.json locations
const packageLocations = [
  'apps/admin-dashboard/package.json',
  'apps/beta-application/package.json',
  'apps/beta-portal/package.json',
  'apps/dev-sandbox/package.json',
  'apps/developer-tools/package.json',
  'apps/main-application/package.json',
  'libs/shared/ui/package.json',
  'libs/shared/data-access/package.json',
  'libs/shared/types/package.json',
  'libs/shared/config/package.json',
  'libs/shared/api-utils/package.json',
  'libs/assessment/scoring/package.json',
  'libs/assessment/ocean-analytics/package.json',
  'libs/features/lambda-analytics/package.json',
  'libs/testing/test-utils/package.json',
];

packageLocations.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (fs.existsSync(filePath)) {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (content.dependencies) {
      // Remove internal @ioc dependencies
      Object.keys(content.dependencies).forEach(dep => {
        if (dep.startsWith('@ioc/') && dep.includes('/')) {
          delete content.dependencies[dep];
        }
      });
      
      // Remove empty dependencies object
      if (Object.keys(content.dependencies).length === 0) {
        delete content.dependencies;
      }
    }
    
    // Write back
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
    console.log(`✅ Cleaned ${file}`);
  }
});

console.log('\n✨ Cleanup complete!');