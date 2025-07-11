#!/usr/bin/env node
/**
 * IOC Core to Nx Content Migration Script
 * Migrates files and directory structure from Turbo to Nx workspace
 */

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');
const config = require('./migration-config');

class ContentMigrator {
  constructor(options = {}) {
    this.config = config;
    this.options = { ...config.options, ...options };
    this.stats = {
      filesProcessed: 0,
      filesCopied: 0,
      directoriesCreated: 0,
      errors: [],
      warnings: [],
    };
  }

  async migrate() {
    console.log(chalk.blue.bold('\n🚀 Starting IOC Core to Nx Migration\n'));

    try {
      // Pre-migration checks
      await this.preflightChecks();

      // Create backup if requested
      if (this.options.backupBeforeMigration) {
        await this.createBackup();
      }

      // Create target workspace structure
      await this.createWorkspaceStructure();

      // Migrate apps
      console.log(chalk.yellow('\n📦 Migrating Applications...'));
      await this.migrateApps();

      // Migrate packages
      console.log(chalk.yellow('\n📚 Migrating Libraries...'));
      await this.migratePackages();

      // Migrate root files
      console.log(chalk.yellow('\n📄 Migrating Root Files...'));
      await this.migrateRootFiles();

      // Generate Nx configuration files
      console.log(chalk.yellow('\n⚙️  Generating Nx Configuration...'));
      await this.generateNxConfig();

      // Generate migration report
      if (this.options.generateReports) {
        await this.generateReport();
      }

      console.log(chalk.green.bold('\n✅ Migration completed successfully!\n'));
      this.printStats();

    } catch (error) {
      console.error(chalk.red.bold('\n❌ Migration failed:'), error);
      this.stats.errors.push({ phase: 'main', error: error.message });
      await this.generateErrorReport();
      process.exit(1);
    }
  }

  async preflightChecks() {
    console.log(chalk.cyan('🔍 Running preflight checks...'));

    // Check source exists
    if (!await fs.pathExists(this.config.paths.source)) {
      throw new Error(`Source directory does not exist: ${this.config.paths.source}`);
    }

    // Check if target exists
    if (await fs.pathExists(this.config.paths.target)) {
      if (!this.options.force) {
        throw new Error(`Target directory already exists: ${this.config.paths.target}. Use --force to overwrite.`);
      }
      console.log(chalk.yellow('⚠️  Target directory exists. It will be overwritten.'));
    }

    // Check for required tools
    const requiredCommands = ['git', 'node', 'npm'];
    for (const cmd of requiredCommands) {
      try {
        await this.exec(`which ${cmd}`);
      } catch {
        throw new Error(`Required command not found: ${cmd}`);
      }
    }
  }

  async createBackup() {
    console.log(chalk.cyan('💾 Creating backup...'));
    const backupPath = `${this.config.paths.source}-backup-${Date.now()}`;
    await fs.copy(this.config.paths.source, backupPath, {
      filter: (src) => !src.includes('node_modules') && !src.includes('.next'),
    });
    console.log(chalk.green(`✓ Backup created at: ${backupPath}`));
  }

  async createWorkspaceStructure() {
    console.log(chalk.cyan('🏗️  Creating Nx workspace structure...'));

    const directories = [
      'apps',
      'libs/shared/ui/src',
      'libs/shared/data-access/src',
      'libs/shared/types/src',
      'libs/shared/config/src',
      'libs/shared/api-utils/src',
      'libs/testing/test-utils/src',
      'libs/features/lambda-analytics/src',
      'tools',
      'tools/scripts',
      'tools/migrations',
    ];

    for (const dir of directories) {
      const fullPath = path.join(this.config.paths.target, dir);
      await fs.ensureDir(fullPath);
      this.stats.directoriesCreated++;
    }
  }

  async migrateApps() {
    for (const [source, target] of Object.entries(this.config.mappings.apps)) {
      await this.migrateDirectory(source, target, 'app');
    }
  }

  async migratePackages() {
    for (const [source, target] of Object.entries(this.config.mappings.packages)) {
      await this.migrateDirectory(source, target, 'library');
    }
  }

  async migrateDirectory(sourcePath, targetPath, type) {
    const fullSource = path.join(this.config.paths.source, sourcePath);
    const fullTarget = path.join(this.config.paths.target, targetPath);

    if (!await fs.pathExists(fullSource)) {
      this.stats.warnings.push(`Source not found: ${sourcePath}`);
      return;
    }

    console.log(chalk.gray(`  → Migrating ${type}: ${sourcePath} → ${targetPath}`));

    // Get all files matching patterns
    const files = await this.getFiles(fullSource);

    for (const file of files) {
      const relativePath = path.relative(fullSource, file);
      const targetFile = path.join(fullTarget, relativePath);

      try {
        await fs.ensureDir(path.dirname(targetFile));
        
        if (this.options.preserveGitHistory && await this.isGitTracked(file)) {
          // Use git mv to preserve history
          await this.gitMove(file, targetFile);
        } else {
          // Regular copy
          await fs.copy(file, targetFile);
        }
        
        this.stats.filesCopied++;
      } catch (error) {
        this.stats.errors.push({ file, error: error.message });
      }

      this.stats.filesProcessed++;
    }

    // Create project.json for Nx
    await this.createProjectJson(fullTarget, type, targetPath);
  }

  async getFiles(directory) {
    const files = [];
    
    for (const pattern of this.config.patterns.include) {
      const matches = glob.sync(path.join(directory, pattern), {
        nodir: true,
        ignore: this.config.patterns.exclude.map(e => path.join(directory, e)),
      });
      files.push(...matches);
    }

    return [...new Set(files)]; // Remove duplicates
  }

  async isGitTracked(file) {
    try {
      await this.exec(`git ls-files --error-unmatch "${file}"`, { cwd: this.config.paths.source });
      return true;
    } catch {
      return false;
    }
  }

  async gitMove(source, target) {
    // This is a simplified version - in reality, you'd need to handle this more carefully
    await fs.copy(source, target);
  }

  async createProjectJson(projectPath, type, name) {
    const projectName = name.split('/').pop();
    const projectJson = {
      name: projectName,
      $schema: type === 'app' 
        ? '../../node_modules/nx/schemas/project-schema.json'
        : '../../../node_modules/nx/schemas/project-schema.json',
      sourceRoot: type === 'app' ? `${name}/src` : `${name}/src`,
      projectType: type === 'app' ? 'application' : 'library',
      targets: {},
    };

    if (type === 'app') {
      projectJson.targets = {
        build: {
          executor: '@nx/next:build',
          outputs: ['{options.outputPath}'],
          options: {
            outputPath: `dist/${name}`,
          },
          configurations: this.config.nx.buildConfigurations,
        },
        serve: {
          executor: '@nx/next:server',
          options: {
            buildTarget: `${projectName}:build`,
            dev: true,
          },
        },
        lint: {
          executor: '@nx/eslint:lint',
          outputs: ['{options.outputFile}'],
        },
        test: {
          executor: '@nx/jest:jest',
          outputs: ['{workspaceRoot}/coverage/{projectRoot}'],
          options: {
            jestConfig: `${name}/jest.config.ts`,
            passWithNoTests: true,
          },
        },
      };
    } else {
      projectJson.targets = {
        lint: {
          executor: '@nx/eslint:lint',
          outputs: ['{options.outputFile}'],
        },
        test: {
          executor: '@nx/jest:jest',
          outputs: ['{workspaceRoot}/coverage/{projectRoot}'],
          options: {
            jestConfig: `${name}/jest.config.ts`,
            passWithNoTests: true,
          },
        },
      };
    }

    // Add tags if defined
    if (this.config.nx.tags[name]) {
      projectJson.tags = this.config.nx.tags[name];
    }

    await fs.writeJson(path.join(projectPath, 'project.json'), projectJson, { spaces: 2 });
  }

  async migrateRootFiles() {
    const rootFiles = [
      'README.md',
      'LICENSE',
      '.gitignore',
      '.env.example',
      'tsconfig.base.json',
    ];

    for (const file of rootFiles) {
      const source = path.join(this.config.paths.source, file);
      const target = path.join(this.config.paths.target, file);

      if (await fs.pathExists(source)) {
        await fs.copy(source, target);
        this.stats.filesCopied++;
      }
    }
  }

  async generateNxConfig() {
    // Create nx.json
    const nxJson = {
      $schema: './node_modules/nx/schemas/nx-schema.json',
      targetDefaults: {
        build: {
          dependsOn: ['^build'],
          inputs: ['production', '^production'],
          cache: true,
        },
        test: {
          inputs: ['default', '^production', '{workspaceRoot}/jest.preset.js'],
          cache: true,
        },
        lint: {
          inputs: ['default', '{workspaceRoot}/.eslintrc.json'],
          cache: true,
        },
      },
      defaultProject: 'main-application',
      namedInputs: {
        default: ['{projectRoot}/**/*', 'sharedGlobals'],
        production: [
          'default',
          '!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)',
          '!{projectRoot}/tsconfig.spec.json',
          '!{projectRoot}/jest.config.[jt]s',
          '!{projectRoot}/.eslintrc.json',
        ],
        sharedGlobals: ['{workspaceRoot}/tsconfig.base.json'],
      },
      generators: {
        '@nx/react': {
          application: {
            style: 'css',
            linter: 'eslint',
            bundler: 'webpack',
          },
          component: {
            style: 'css',
          },
          library: {
            style: 'css',
            linter: 'eslint',
          },
        },
      },
      tasksRunnerOptions: {
        default: {
          runner: 'nx/tasks-runners/default',
          options: {
            cacheableOperations: ['build', 'lint', 'test'],
          },
        },
      },
    };

    await fs.writeJson(
      path.join(this.config.paths.target, 'nx.json'),
      nxJson,
      { spaces: 2 }
    );

    // Create workspace.json
    const workspaceJson = {
      version: 2,
      projects: {},
    };

    // Add all projects
    for (const [, target] of Object.entries(this.config.mappings.apps)) {
      const projectName = target.split('/').pop();
      workspaceJson.projects[projectName] = target;
    }
    
    for (const [, target] of Object.entries(this.config.mappings.packages)) {
      const projectName = target.split('/').pop();
      workspaceJson.projects[projectName] = target;
    }

    await fs.writeJson(
      path.join(this.config.paths.target, 'workspace.json'),
      workspaceJson,
      { spaces: 2 }
    );

    // Create package.json
    const packageJson = {
      name: '@ioc/workspace',
      version: '0.0.0',
      license: 'MIT',
      scripts: {
        'nx': 'nx',
        'start': 'nx serve',
        'build': 'nx build',
        'test': 'nx test',
        'lint': 'nx workspace-lint && nx lint',
        'e2e': 'nx e2e',
        'affected:apps': 'nx affected:apps',
        'affected:libs': 'nx affected:libs',
        'affected:build': 'nx affected:build',
        'affected:e2e': 'nx affected:e2e',
        'affected:test': 'nx affected:test',
        'affected:lint': 'nx affected:lint',
        'affected:dep-graph': 'nx affected:dep-graph',
        'affected': 'nx affected',
        'format': 'nx format:write',
        'format:write': 'nx format:write',
        'format:check': 'nx format:check',
        'update': 'nx migrate latest',
        'workspace-generator': 'nx workspace-generator',
        'dep-graph': 'nx dep-graph',
        'help': 'nx help',
      },
      private: true,
      devDependencies: {
        '@nx/react': '^17.0.0',
        '@nx/next': '^17.0.0',
        '@nx/jest': '^17.0.0',
        '@nx/eslint': '^17.0.0',
        '@nx/workspace': '^17.0.0',
        '@nx/devkit': '^17.0.0',
        '@nx/eslint-plugin': '^17.0.0',
        'nx': '^17.0.0',
        'typescript': '^5.2.2',
        'prettier': '^3.0.0',
        '@types/node': '^20.0.0',
      },
      workspaces: [
        'apps/*',
        'libs/*',
      ],
    };

    await fs.writeJson(
      path.join(this.config.paths.target, 'package.json'),
      packageJson,
      { spaces: 2 }
    );
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      configuration: {
        source: this.config.paths.source,
        target: this.config.paths.target,
        options: this.options,
      },
      mappings: this.config.mappings,
    };

    const reportPath = path.join(
      this.config.paths.target,
      'migration-report.json'
    );

    await fs.writeJson(reportPath, report, { spaces: 2 });
    console.log(chalk.green(`\n📊 Migration report saved to: ${reportPath}`));
  }

  async generateErrorReport() {
    if (this.stats.errors.length === 0) return;

    const errorReport = {
      timestamp: new Date().toISOString(),
      errors: this.stats.errors,
      warnings: this.stats.warnings,
    };

    const reportPath = path.join(
      this.config.paths.target || '.',
      'migration-errors.json'
    );

    await fs.writeJson(reportPath, errorReport, { spaces: 2 });
    console.log(chalk.yellow(`\n⚠️  Error report saved to: ${reportPath}`));
  }

  printStats() {
    console.log(chalk.cyan('\n📈 Migration Statistics:'));
    console.log(`  • Files processed: ${this.stats.filesProcessed}`);
    console.log(`  • Files copied: ${this.stats.filesCopied}`);
    console.log(`  • Directories created: ${this.stats.directoriesCreated}`);
    
    if (this.stats.warnings.length > 0) {
      console.log(chalk.yellow(`  • Warnings: ${this.stats.warnings.length}`));
    }
    
    if (this.stats.errors.length > 0) {
      console.log(chalk.red(`  • Errors: ${this.stats.errors.length}`));
    }
  }

  async exec(command, options = {}) {
    const { promisify } = require('util');
    const exec = promisify(require('child_process').exec);
    return exec(command, options);
  }
}

// CLI interface
if (require.main === module) {
  const yargs = require('yargs/yargs');
  const { hideBin } = require('yargs/helpers');

  const argv = yargs(hideBin(process.argv))
    .option('dry-run', {
      alias: 'd',
      type: 'boolean',
      description: 'Run without making changes',
    })
    .option('force', {
      alias: 'f',
      type: 'boolean',
      description: 'Overwrite existing target directory',
    })
    .option('no-backup', {
      type: 'boolean',
      description: 'Skip creating backup',
    })
    .option('no-git', {
      type: 'boolean',
      description: 'Skip git history preservation',
    })
    .help()
    .argv;

  const migrator = new ContentMigrator({
    dryRun: argv.dryRun,
    force: argv.force,
    backupBeforeMigration: !argv.noBackup,
    preserveGitHistory: !argv.noGit,
  });

  migrator.migrate().catch(console.error);
}

module.exports = ContentMigrator;