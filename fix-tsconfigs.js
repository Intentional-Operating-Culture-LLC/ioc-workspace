#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const tsconfigs = [
  'libs/assessment/ocean-analytics/tsconfig.json',
  'libs/assessment/scoring/tsconfig.json',
  'libs/features/lambda-analytics/tsconfig.json',
  'libs/testing/test-utils/tsconfig.json',
  'libs/shared/types/tsconfig.json',
  'libs/shared/api-utils/tsconfig.json',
  'libs/shared/ui/tsconfig.json',
  'libs/shared/data-access/tsconfig.json',
];

tsconfigs.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix extends path
    content = content.replace(
      /"extends":\s*"\.\.\/tsconfig\.base\.json"/,
      '"extends": "../../../tsconfig.base.json"'
    );
    
    // Write back
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${file}`);
  }
});

console.log('\n✨ TSConfig fixes complete!');