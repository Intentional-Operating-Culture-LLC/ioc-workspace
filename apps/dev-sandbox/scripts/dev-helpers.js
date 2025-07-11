#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

// Utility functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset}  ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset}  ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}\n`)
};

// Command handlers
const commands = {
  // Clean build artifacts and caches
  clean: () => {
    log.section('Cleaning build artifacts and caches...');
    
    const dirsToClean = ['.next', 'node_modules/.cache', 'coverage', '.turbo'];
    const filesToClean = ['tsconfig.tsbuildinfo'];
    
    dirsToClean.forEach(dir => {
      const fullPath = path.join(process.cwd(), dir);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        log.success(`Removed ${dir}`);
      }
    });
    
    filesToClean.forEach(file => {
      const fullPath = path.join(process.cwd(), file);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        log.success(`Removed ${file}`);
      }
    });
  },

  // Analyze bundle size
  analyze: () => {
    log.section('Analyzing bundle size...');
    try {
      execSync('ANALYZE=true npm run build', { stdio: 'inherit' });
    } catch (error) {
      log.error('Bundle analysis failed');
      process.exit(1);
    }
  },

  // Check TypeScript types
  typecheck: () => {
    log.section('Running TypeScript type check...');
    try {
      execSync('tsc --noEmit', { stdio: 'inherit' });
      log.success('No type errors found');
    } catch (error) {
      log.error('Type check failed');
      process.exit(1);
    }
  },

  // Run all checks (lint, typecheck, test)
  check: () => {
    log.section('Running all checks...');
    
    const checks = [
      { name: 'Linting', cmd: 'npm run lint' },
      { name: 'Type checking', cmd: 'tsc --noEmit' },
      { name: 'Testing', cmd: 'npm test' }
    ];
    
    let failed = false;
    
    checks.forEach(({ name, cmd }) => {
      try {
        log.info(`Running ${name}...`);
        execSync(cmd, { stdio: 'pipe' });
        log.success(`${name} passed`);
      } catch (error) {
        log.error(`${name} failed`);
        failed = true;
      }
    });
    
    if (failed) {
      log.error('\nSome checks failed');
      process.exit(1);
    } else {
      log.success('\nAll checks passed!');
    }
  },

  // Generate component index
  'index-components': () => {
    log.section('Generating component index...');
    
    const componentsDir = path.join(process.cwd(), 'components');
    const indexPath = path.join(componentsDir, 'index.ts');
    
    const components = [];
    
    function scanDir(dir, basePath = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      entries.forEach(entry => {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          // Check if it's a component directory (has index.ts)
          if (fs.existsSync(path.join(fullPath, 'index.ts'))) {
            components.push(relativePath);
          } else {
            // Recurse into subdirectory
            scanDir(fullPath, relativePath);
          }
        }
      });
    }
    
    scanDir(componentsDir);
    
    const indexContent = `// Auto-generated component index
// Generated on ${new Date().toISOString()}

${components.map(comp => `export * from './${comp}';`).join('\n')}
`;
    
    fs.writeFileSync(indexPath, indexContent);
    log.success(`Generated index with ${components.length} components`);
  },

  // Setup git hooks
  'setup-hooks': () => {
    log.section('Setting up git hooks...');
    
    const huskyDir = path.join(process.cwd(), '.husky');
    
    if (!fs.existsSync(huskyDir)) {
      fs.mkdirSync(huskyDir, { recursive: true });
    }
    
    // Pre-commit hook
    const preCommitContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run lint-staged
`;
    
    fs.writeFileSync(path.join(huskyDir, 'pre-commit'), preCommitContent);
    fs.chmodSync(path.join(huskyDir, 'pre-commit'), '755');
    
    log.success('Git hooks installed');
  },

  // List available scripts
  scripts: () => {
    log.section('Available Scripts');
    
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    const scripts = packageJson.scripts || {};
    
    Object.entries(scripts).forEach(([name, cmd]) => {
      console.log(`  ${colors.cyan}${name.padEnd(20)}${colors.reset} ${colors.dim}${cmd}${colors.reset}`);
    });
  },

  // Environment info
  info: () => {
    log.section('Environment Information');
    
    const info = {
      'Node.js': process.version,
      'npm': execSync('npm --version').toString().trim(),
      'OS': process.platform,
      'Architecture': process.arch,
      'Working Directory': process.cwd()
    };
    
    Object.entries(info).forEach(([key, value]) => {
      console.log(`  ${key.padEnd(20)} ${colors.dim}${value}${colors.reset}`);
    });
    
    // Check for required env vars
    log.section('Environment Variables');
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXTAUTH_SECRET'
    ];
    
    requiredEnvVars.forEach(envVar => {
      const exists = process.env[envVar] !== undefined;
      const status = exists ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
      console.log(`  ${status} ${envVar}`);
    });
  },

  // Help command
  help: () => {
    console.log(`
${colors.cyan}${colors.bright}IOC Dev Helpers${colors.reset}

${colors.dim}Usage:${colors.reset}
  dev-helpers <command>

${colors.dim}Commands:${colors.reset}
  ${colors.cyan}clean${colors.reset}             Clean build artifacts and caches
  ${colors.cyan}analyze${colors.reset}           Analyze bundle size
  ${colors.cyan}typecheck${colors.reset}         Run TypeScript type checking
  ${colors.cyan}check${colors.reset}             Run all checks (lint, types, tests)
  ${colors.cyan}index-components${colors.reset}  Generate component index file
  ${colors.cyan}setup-hooks${colors.reset}       Setup git hooks
  ${colors.cyan}scripts${colors.reset}           List available npm scripts
  ${colors.cyan}info${colors.reset}              Show environment information
  ${colors.cyan}help${colors.reset}              Show this help message

${colors.dim}Examples:${colors.reset}
  dev-helpers clean
  dev-helpers check
  dev-helpers info
`);
  }
};

// Main execution
const command = process.argv[2] || 'help';

if (commands[command]) {
  commands[command]();
} else {
  log.error(`Unknown command: ${command}`);
  commands.help();
  process.exit(1);
}