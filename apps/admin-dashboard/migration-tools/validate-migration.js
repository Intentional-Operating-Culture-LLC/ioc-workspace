#!/usr/bin/env node
/**
 * IOC Core to Nx Migration Validation Script
 * Validates the completeness and correctness of the migration
 */

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const config = require('./migration-config');

class MigrationValidator {
  constructor(options = {}) {
    this.config = config;
    this.options = options;
    this.results = {
      valid: true,
      checks: [],
      warnings: [],
      errors: [],
    };
  }

  async validate() {
    console.log(chalk.blue.bold('\n🔍 Validating IOC Core to Nx Migration\n'));

    const checks = [
      this.checkDirectoryStructure.bind(this),
      this.checkProjectConfigurations.bind(this),
      this.checkImportPaths.bind(this),
      this.checkDependencies.bind(this),
      this.checkBuildSystem.bind(this),
      this.checkTypeScript.bind(this),
      this.checkLinting.bind(this),
      this.checkTests.bind(this),
      this.checkGitIntegrity.bind(this),
    ];

    for (const check of checks) {
      await check();
    }

    this.printResults();

    if (this.options.generateReport) {
      await this.generateReport();
    }

    return this.results.valid;
  }

  async checkDirectoryStructure() {
    console.log(chalk.yellow('📁 Checking directory structure...'));
    
    const requiredDirs = [
      'apps',
      'libs',
      'tools',
      'node_modules',
    ];

    for (const dir of requiredDirs) {
      const fullPath = path.join(this.config.paths.target, dir);
      const exists = await fs.pathExists(fullPath);
      
      this.addCheck({
        name: `Directory exists: ${dir}`,
        passed: exists,
        message: exists ? '✓' : `Missing required directory: ${dir}`,
      });
    }

    // Check app migrations
    for (const [source, target] of Object.entries(this.config.mappings.apps)) {
      const targetPath = path.join(this.config.paths.target, target);
      const exists = await fs.pathExists(targetPath);
      
      this.addCheck({
        name: `App migrated: ${source} → ${target}`,
        passed: exists,
        message: exists ? '✓' : `App not found at: ${targetPath}`,
      });
    }

    // Check library migrations
    for (const [source, target] of Object.entries(this.config.mappings.packages)) {
      const targetPath = path.join(this.config.paths.target, target);
      const exists = await fs.pathExists(targetPath);
      
      this.addCheck({
        name: `Library migrated: ${source} → ${target}`,
        passed: exists,
        message: exists ? '✓' : `Library not found at: ${targetPath}`,
      });
    }
  }

  async checkProjectConfigurations() {
    console.log(chalk.yellow('⚙️  Checking project configurations...'));

    // Check nx.json
    const nxJsonPath = path.join(this.config.paths.target, 'nx.json');
    const nxJsonExists = await fs.pathExists(nxJsonPath);
    
    this.addCheck({
      name: 'nx.json exists',
      passed: nxJsonExists,
      message: nxJsonExists ? '✓' : 'Missing nx.json configuration',
    });

    if (nxJsonExists) {
      try {
        const nxJson = await fs.readJson(nxJsonPath);
        this.addCheck({
          name: 'nx.json is valid JSON',
          passed: true,
          message: '✓',
        });

        // Check for required properties
        const requiredProps = ['targetDefaults', 'defaultProject'];
        for (const prop of requiredProps) {
          this.addCheck({
            name: `nx.json has ${prop}`,
            passed: prop in nxJson,
            message: prop in nxJson ? '✓' : `Missing ${prop} in nx.json`,
          });
        }
      } catch (error) {
        this.addCheck({
          name: 'nx.json is valid JSON',
          passed: false,
          message: `Invalid JSON: ${error.message}`,
        });
      }
    }

    // Check project.json files
    const projectJsonFiles = glob.sync(
      path.join(this.config.paths.target, '**/project.json'),
      { ignore: '**/node_modules/**' }
    );

    for (const projectFile of projectJsonFiles) {
      const projectName = path.basename(path.dirname(projectFile));
      
      try {
        const projectJson = await fs.readJson(projectFile);
        
        this.addCheck({
          name: `Project config: ${projectName}`,
          passed: true,
          message: '✓',
        });

        // Validate required fields
        const requiredFields = ['name', 'projectType', 'targets'];
        for (const field of requiredFields) {
          const hasField = field in projectJson;
          if (!hasField) {
            this.addWarning(`Project ${projectName} missing field: ${field}`);
          }
        }
      } catch (error) {
        this.addCheck({
          name: `Project config: ${projectName}`,
          passed: false,
          message: `Invalid project.json: ${error.message}`,
        });
      }
    }
  }

  async checkImportPaths() {
    console.log(chalk.yellow('🔗 Checking import paths...'));

    const sourceFiles = glob.sync(
      path.join(this.config.paths.target, '**/*.{ts,tsx,js,jsx}'),
      { ignore: '**/node_modules/**' }
    );

    let invalidImports = 0;
    let validImports = 0;

    for (const file of sourceFiles.slice(0, 100)) { // Sample first 100 files
      const content = await fs.readFile(file, 'utf8');
      
      // Check for old import patterns
      const oldImportPatterns = [
        /@ioc\/(ui|lib|types|config)(?!\/)/,
        /from ['"]\.\.\/\.\.\/packages\//,
        /from ['"]\.\.\/\.\.\/\.\.\/packages\//,
      ];

      for (const pattern of oldImportPatterns) {
        if (pattern.test(content)) {
          invalidImports++;
          this.addWarning(`Old import pattern found in: ${path.relative(this.config.paths.target, file)}`);
        }
      }

      // Check for new import patterns
      const newImportPattern = /@ioc\/(shared|features|testing)\//;
      if (newImportPattern.test(content)) {
        validImports++;
      }
    }

    this.addCheck({
      name: 'Import paths transformed',
      passed: invalidImports === 0,
      message: invalidImports === 0 
        ? `✓ All imports updated (sampled ${sourceFiles.length} files)`
        : `Found ${invalidImports} files with old import patterns`,
    });
  }

  async checkDependencies() {
    console.log(chalk.yellow('📦 Checking dependencies...'));

    const packageJsonPath = path.join(this.config.paths.target, 'package.json');
    
    if (await fs.pathExists(packageJsonPath)) {
      try {
        const packageJson = await fs.readJson(packageJsonPath);
        
        // Check for Nx dependencies
        const requiredDeps = [
          '@nx/workspace',
          '@nx/react',
          '@nx/next',
          'nx',
        ];

        for (const dep of requiredDeps) {
          const hasDep = 
            (packageJson.dependencies && dep in packageJson.dependencies) ||
            (packageJson.devDependencies && dep in packageJson.devDependencies);
          
          this.addCheck({
            name: `Dependency: ${dep}`,
            passed: hasDep,
            message: hasDep ? '✓' : `Missing required dependency: ${dep}`,
          });
        }

        // Check workspace configuration
        const hasWorkspaces = 'workspaces' in packageJson;
        this.addCheck({
          name: 'Workspaces configured',
          passed: hasWorkspaces,
          message: hasWorkspaces ? '✓' : 'Missing workspaces configuration',
        });

      } catch (error) {
        this.addError(`Failed to read package.json: ${error.message}`);
      }
    } else {
      this.addError('Missing root package.json');
    }
  }

  async checkBuildSystem() {
    console.log(chalk.yellow('🏗️  Checking build system...'));

    try {
      // Check if Nx CLI is available
      const { stdout } = await execAsync('npx nx --version', {
        cwd: this.config.paths.target,
      });

      this.addCheck({
        name: 'Nx CLI available',
        passed: true,
        message: `✓ Nx version: ${stdout.trim()}`,
      });

      // Try to run nx graph
      try {
        await execAsync('npx nx graph --file=graph.json', {
          cwd: this.config.paths.target,
        });

        this.addCheck({
          name: 'Nx dependency graph',
          passed: true,
          message: '✓ Dependency graph can be generated',
        });

        // Clean up
        await fs.remove(path.join(this.config.paths.target, 'graph.json'));
      } catch (error) {
        this.addCheck({
          name: 'Nx dependency graph',
          passed: false,
          message: 'Failed to generate dependency graph',
        });
      }

    } catch (error) {
      this.addCheck({
        name: 'Nx CLI available',
        passed: false,
        message: 'Nx CLI not found or not working',
      });
    }
  }

  async checkTypeScript() {
    console.log(chalk.yellow('📘 Checking TypeScript configuration...'));

    const tsconfigPath = path.join(this.config.paths.target, 'tsconfig.base.json');
    const tsconfigExists = await fs.pathExists(tsconfigPath);

    this.addCheck({
      name: 'tsconfig.base.json exists',
      passed: tsconfigExists,
      message: tsconfigExists ? '✓' : 'Missing tsconfig.base.json',
    });

    if (tsconfigExists) {
      try {
        const tsconfig = await fs.readJson(tsconfigPath);
        
        // Check for path mappings
        const hasPaths = tsconfig.compilerOptions && tsconfig.compilerOptions.paths;
        this.addCheck({
          name: 'TypeScript path mappings',
          passed: hasPaths,
          message: hasPaths ? '✓' : 'Missing path mappings in tsconfig',
        });

        if (hasPaths) {
          // Validate path mappings match our import mappings
          for (const [, nxPath] of Object.entries(this.config.importMappings)) {
            const hasMapping = nxPath in tsconfig.compilerOptions.paths;
            if (!hasMapping) {
              this.addWarning(`Missing TypeScript path mapping for: ${nxPath}`);
            }
          }
        }
      } catch (error) {
        this.addError(`Invalid tsconfig.base.json: ${error.message}`);
      }
    }
  }

  async checkLinting() {
    console.log(chalk.yellow('🧹 Checking linting configuration...'));

    const eslintrcPath = path.join(this.config.paths.target, '.eslintrc.json');
    const eslintrcExists = await fs.pathExists(eslintrcPath);

    this.addCheck({
      name: 'ESLint configuration',
      passed: eslintrcExists,
      message: eslintrcExists ? '✓' : 'Missing .eslintrc.json',
    });

    // Check for Nx ESLint plugin
    if (eslintrcExists) {
      try {
        const eslintrc = await fs.readJson(eslintrcPath);
        const hasNxPlugin = 
          eslintrc.plugins && eslintrc.plugins.includes('@nx') ||
          eslintrc.extends && eslintrc.extends.some(e => e.includes('@nx'));

        this.addCheck({
          name: 'Nx ESLint plugin',
          passed: hasNxPlugin,
          message: hasNxPlugin ? '✓' : 'Missing @nx ESLint configuration',
        });
      } catch (error) {
        this.addWarning(`Could not parse .eslintrc.json: ${error.message}`);
      }
    }
  }

  async checkTests() {
    console.log(chalk.yellow('🧪 Checking test configuration...'));

    // Check for Jest configuration
    const jestConfigPaths = [
      'jest.config.js',
      'jest.config.ts',
      'jest.preset.js',
    ];

    let jestConfigFound = false;
    for (const configFile of jestConfigPaths) {
      const configPath = path.join(this.config.paths.target, configFile);
      if (await fs.pathExists(configPath)) {
        jestConfigFound = true;
        break;
      }
    }

    this.addCheck({
      name: 'Jest configuration',
      passed: jestConfigFound,
      message: jestConfigFound ? '✓' : 'Missing Jest configuration',
    });

    // Check for test files
    const testFiles = glob.sync(
      path.join(this.config.paths.target, '**/*.{spec,test}.{ts,tsx,js,jsx}'),
      { ignore: '**/node_modules/**' }
    );

    this.addCheck({
      name: 'Test files',
      passed: testFiles.length > 0,
      message: testFiles.length > 0 
        ? `✓ Found ${testFiles.length} test files`
        : 'No test files found',
    });
  }

  async checkGitIntegrity() {
    console.log(chalk.yellow('🔧 Checking Git integrity...'));

    try {
      // Check if it's a git repository
      await execAsync('git status', { cwd: this.config.paths.target });

      this.addCheck({
        name: 'Git repository',
        passed: true,
        message: '✓',
      });

      // Check for uncommitted changes
      const { stdout } = await execAsync('git status --porcelain', {
        cwd: this.config.paths.target,
      });

      const hasUncommittedChanges = stdout.trim().length > 0;
      this.addCheck({
        name: 'Git working tree',
        passed: !hasUncommittedChanges,
        message: hasUncommittedChanges 
          ? 'Has uncommitted changes'
          : '✓ Clean working tree',
      });

    } catch (error) {
      this.addCheck({
        name: 'Git repository',
        passed: false,
        message: 'Not a Git repository or Git not available',
      });
    }
  }

  addCheck(check) {
    this.results.checks.push(check);
    if (!check.passed) {
      this.results.valid = false;
    }
  }

  addWarning(message) {
    this.results.warnings.push(message);
  }

  addError(message) {
    this.results.errors.push(message);
    this.results.valid = false;
  }

  printResults() {
    console.log(chalk.blue.bold('\n📊 Validation Results\n'));

    // Print checks
    const passed = this.results.checks.filter(c => c.passed).length;
    const total = this.results.checks.length;

    console.log(chalk.cyan(`Checks: ${passed}/${total} passed`));
    
    for (const check of this.results.checks) {
      const icon = check.passed ? chalk.green('✓') : chalk.red('✗');
      const name = check.passed ? chalk.gray(check.name) : chalk.red(check.name);
      console.log(`  ${icon} ${name}: ${check.message}`);
    }

    // Print warnings
    if (this.results.warnings.length > 0) {
      console.log(chalk.yellow(`\n⚠️  Warnings (${this.results.warnings.length}):`));
      for (const warning of this.results.warnings) {
        console.log(chalk.yellow(`  • ${warning}`));
      }
    }

    // Print errors
    if (this.results.errors.length > 0) {
      console.log(chalk.red(`\n❌ Errors (${this.results.errors.length}):`));
      for (const error of this.results.errors) {
        console.log(chalk.red(`  • ${error}`));
      }
    }

    // Final result
    if (this.results.valid) {
      console.log(chalk.green.bold('\n✅ Migration validation PASSED!\n'));
    } else {
      console.log(chalk.red.bold('\n❌ Migration validation FAILED!\n'));
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      targetDirectory: this.config.paths.target,
      valid: this.results.valid,
      summary: {
        totalChecks: this.results.checks.length,
        passedChecks: this.results.checks.filter(c => c.passed).length,
        warnings: this.results.warnings.length,
        errors: this.results.errors.length,
      },
      details: this.results,
    };

    const reportPath = path.join(
      this.config.paths.target,
      'migration-validation-report.json'
    );

    await fs.writeJson(reportPath, report, { spaces: 2 });
    console.log(chalk.green(`\n📄 Validation report saved to: ${reportPath}`));
  }
}

// CLI interface
if (require.main === module) {
  const yargs = require('yargs/yargs');
  const { hideBin } = require('yargs/helpers');

  const argv = yargs(hideBin(process.argv))
    .option('report', {
      alias: 'r',
      type: 'boolean',
      description: 'Generate validation report',
      default: true,
    })
    .option('fix', {
      alias: 'f',
      type: 'boolean',
      description: 'Attempt to fix issues automatically',
    })
    .help()
    .argv;

  const validator = new MigrationValidator({
    generateReport: argv.report,
    autoFix: argv.fix,
  });

  validator.validate()
    .then(valid => {
      process.exit(valid ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Validation error:'), error);
      process.exit(1);
    });
}

module.exports = MigrationValidator;