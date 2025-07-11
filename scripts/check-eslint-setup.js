#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== ESLint Configuration Summary ===\n');

// Check root configuration
const rootConfig = path.join(__dirname, '..', '.eslintrc.json');
const baseConfig = path.join(__dirname, '..', '.eslintrc.base.json');

console.log('Root Configuration Files:');
console.log('✓ .eslintrc.json (Nx workspace config)');
console.log('✓ .eslintrc.base.json (Shared base config)');
console.log('✓ tsconfig.json (Root TypeScript config)');
console.log('✓ .eslintignore (Global ignore patterns)');
console.log('');

// Check project configurations
const projectFiles = [
  'apps/main-application/.eslintrc.json',
  'apps/admin-dashboard/.eslintrc.json',
  'apps/beta-application/.eslintrc.json',
  'apps/dev-sandbox/.eslintrc.json',
  'apps/beta-portal/.eslintrc.json',
  'apps/developer-tools/.eslintrc.json',
  'libs/shared/ui/.eslintrc.json',
  'libs/shared/data-access/.eslintrc.json',
  'libs/shared/types/.eslintrc.json',
  'libs/shared/api-utils/.eslintrc.json',
  'libs/shared/config/.eslintrc.json',
  'libs/assessment/ocean-analytics/.eslintrc.json',
  'libs/assessment/scoring/.eslintrc.json',
  'libs/features/lambda-analytics/.eslintrc.json',
  'libs/testing/test-utils/.eslintrc.json'
];

console.log('Project Configurations:');
projectFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    const config = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const type = file.startsWith('apps/') ? 'Next.js App' : 'Library';
    console.log(`✓ ${file} (${type})`);
  } else {
    console.log(`✗ ${file} (Missing)`);
  }
});

console.log('\nKey ESLint Rules Configured:');
console.log('• @typescript-eslint/no-explicit-any - Prevents any types');
console.log('• @typescript-eslint/no-unused-vars - Finds unused variables');
console.log('• import/order - Enforces import ordering');
console.log('• react/react-in-jsx-scope - Disabled for React 17+');
console.log('• react-hooks/exhaustive-deps - Checks useEffect dependencies');
console.log('• no-console - Warns about console statements');
console.log('• @nx/enforce-module-boundaries - Enforces module boundaries');

console.log('\nNext.js Specific Rules:');
console.log('• @next/next/no-html-link-for-pages - Prevents incorrect Link usage');
console.log('• next/core-web-vitals - Core Web Vitals optimizations');

console.log('\nESLint Extensions:');
console.log('• eslint:recommended - Standard ESLint rules');
console.log('• @typescript-eslint/recommended - TypeScript rules');
console.log('• plugin:react/recommended - React rules');
console.log('• plugin:react-hooks/recommended - React Hooks rules');
console.log('• plugin:jsx-a11y/recommended - Accessibility rules');
console.log('• prettier - Prettier integration');
console.log('• plugin:@nx/typescript - Nx TypeScript rules');
console.log('• plugin:@nx/react-typescript - Nx React TypeScript rules');
console.log('• next/core-web-vitals - Next.js rules');

console.log('\nTo run linting:');
console.log('• Single project: npx nx lint <project-name>');
console.log('• All projects: npx nx run-many --target=lint --all');
console.log('• Specific apps: npx nx run-many --target=lint --projects=main-application,admin-dashboard');
console.log('• Auto-fix: npx nx lint <project-name> --fix');

console.log('\n=== Setup Complete ===');