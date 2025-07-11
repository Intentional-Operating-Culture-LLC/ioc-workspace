#!/usr/bin/env node
/**
 * IOC Core to Nx Complete Migration Script
 * Orchestrates the entire migration process
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ContentMigrator = require('./migrate-content');
const ImportTransformer = require('./transform-imports');
const MigrationValidator = require('./validate-migration');
const config = require('./migration-config');

class CompleteMigration {
  constructor(options = {}) {
    this.config = config;
    this.options = {
      ...config.options,
      ...options,
    };
    this.startTime = Date.now();
  }

  async run() {
    console.log(chalk.blue.bold('\n🚀 IOC Core to Nx Complete Migration\n'));
    console.log(chalk.gray('This process will:'));
    console.log(chalk.gray('  1. Migrate content to Nx workspace structure'));
    console.log(chalk.gray('  2. Transform import paths'));
    console.log(chalk.gray('  3. Validate the migration'));
    console.log(chalk.gray('  4. Generate comprehensive reports\n'));

    try {
      // Step 1: Content Migration
      console.log(chalk.yellow.bold('\n📦 Step 1: Content Migration\n'));
      const contentMigrator = new ContentMigrator(this.options);
      await contentMigrator.migrate();

      // Step 2: Import Transformation
      console.log(chalk.yellow.bold('\n🔄 Step 2: Import Transformation\n'));
      const importTransformer = new ImportTransformer({
        generateReport: true,
      });
      await importTransformer.transform(this.config.paths.target);

      // Step 3: Additional Setup
      console.log(chalk.yellow.bold('\n⚙️  Step 3: Additional Setup\n'));
      await this.additionalSetup();

      // Step 4: Validation
      console.log(chalk.yellow.bold('\n✅ Step 4: Validation\n'));
      const validator = new MigrationValidator({
        generateReport: true,
      });
      const isValid = await validator.validate();

      // Final Report
      await this.generateFinalReport(isValid);

      if (isValid) {
        console.log(chalk.green.bold('\n🎉 Migration completed successfully!\n'));
        this.printNextSteps();
      } else {
        console.log(chalk.yellow.bold('\n⚠️  Migration completed with issues. Please review the validation report.\n'));
      }

    } catch (error) {
      console.error(chalk.red.bold('\n❌ Migration failed:'), error);
      console.log(chalk.yellow('\n💡 You can rollback the migration using:'));
      console.log(chalk.gray('   node rollback-migration.js\n'));
      process.exit(1);
    }
  }

  async additionalSetup() {
    console.log(chalk.cyan('🔧 Running additional setup tasks...'));

    // Create .nvmrc
    await this.createNvmrc();

    // Create prettier config
    await this.createPrettierConfig();

    // Create VS Code settings
    await this.createVSCodeSettings();

    // Initialize dependencies
    if (this.options.installDependencies) {
      await this.installDependencies();
    }
  }

  async createNvmrc() {
    const nvmrcPath = path.join(this.config.paths.target, '.nvmrc');
    await fs.writeFile(nvmrcPath, '18.17.0\n');
    console.log(chalk.gray('  ✓ Created .nvmrc'));
  }

  async createPrettierConfig() {
    const prettierConfig = {
      singleQuote: true,
      trailingComma: 'es5',
      printWidth: 100,
      semi: true,
      tabWidth: 2,
    };

    const configPath = path.join(this.config.paths.target, '.prettierrc');
    await fs.writeJson(configPath, prettierConfig, { spaces: 2 });
    console.log(chalk.gray('  ✓ Created .prettierrc'));
  }

  async createVSCodeSettings() {
    const vscodeDir = path.join(this.config.paths.target, '.vscode');
    await fs.ensureDir(vscodeDir);

    const settings = {
      'editor.formatOnSave': true,
      'editor.defaultFormatter': 'esbenp.prettier-vscode',
      'typescript.tsdk': 'node_modules/typescript/lib',
      'nx.enable': true,
      'files.exclude': {
        '**/.git': true,
        '**/.svn': true,
        '**/.hg': true,
        '**/CVS': true,
        '**/.DS_Store': true,
        '**/Thumbs.db': true,
        'node_modules': true,
        '.next': true,
        'dist': true,
      },
    };

    const extensions = {
      recommendations: [
        'nrwl.angular-console',
        'esbenp.prettier-vscode',
        'dbaeumer.vscode-eslint',
        'ms-vscode.vscode-typescript-next',
      ],
    };

    await fs.writeJson(
      path.join(vscodeDir, 'settings.json'),
      settings,
      { spaces: 2 }
    );
    
    await fs.writeJson(
      path.join(vscodeDir, 'extensions.json'),
      extensions,
      { spaces: 2 }
    );

    console.log(chalk.gray('  ✓ Created VS Code settings'));
  }

  async installDependencies() {
    console.log(chalk.cyan('📦 Installing dependencies...'));
    
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      await execAsync('npm install', {
        cwd: this.config.paths.target,
      });
      console.log(chalk.gray('  ✓ Dependencies installed'));
    } catch (error) {
      console.log(chalk.yellow('  ⚠️  Failed to install dependencies. Run npm install manually.'));
    }
  }

  async generateFinalReport(isValid) {
    const duration = Date.now() - this.startTime;
    const durationMinutes = Math.round(duration / 1000 / 60);

    const report = {
      timestamp: new Date().toISOString(),
      duration: {
        ms: duration,
        minutes: durationMinutes,
      },
      source: this.config.paths.source,
      target: this.config.paths.target,
      status: isValid ? 'SUCCESS' : 'COMPLETED_WITH_ISSUES',
      mappings: {
        apps: Object.keys(this.config.mappings.apps).length,
        libraries: Object.keys(this.config.mappings.packages).length,
      },
      reports: [
        'migration-report.json',
        'import-transformation-report.json',
        'migration-validation-report.json',
      ],
    };

    const reportPath = path.join(
      this.config.paths.target,
      'migration-final-report.json'
    );

    await fs.writeJson(reportPath, report, { spaces: 2 });

    // Also create a markdown summary
    const markdown = `# IOC Core to Nx Migration Report

## Summary
- **Status**: ${report.status}
- **Duration**: ${report.duration.minutes} minutes
- **Date**: ${new Date(report.timestamp).toLocaleString()}

## Migration Details
- **Source**: \`${report.source}\`
- **Target**: \`${report.target}\`

## Items Migrated
- **Applications**: ${report.mappings.apps}
- **Libraries**: ${report.mappings.libraries}

## Generated Reports
${report.reports.map(r => `- \`${r}\``).join('\n')}

## Next Steps
${isValid ? `
1. Review the generated reports for any warnings
2. Run \`npm install\` in the target directory
3. Test the build: \`npx nx build main-application\`
4. Run tests: \`npx nx test\`
5. Start development: \`npx nx serve main-application\`
` : `
1. ⚠️  Review the validation report for issues
2. Fix any import path issues identified
3. Ensure all project configurations are correct
4. Re-run validation: \`node validate-migration.js\`
`}
`;

    await fs.writeFile(
      path.join(this.config.paths.target, 'MIGRATION_SUMMARY.md'),
      markdown
    );

    console.log(chalk.green(`\n📊 Final report saved to: ${reportPath}`));
    console.log(chalk.green(`📄 Summary saved to: MIGRATION_SUMMARY.md`));
  }

  printNextSteps() {
    console.log(chalk.cyan('📋 Next Steps:'));
    console.log(chalk.gray('\n1. Navigate to the new workspace:'));
    console.log(chalk.white(`   cd ${this.config.paths.target}`));
    
    console.log(chalk.gray('\n2. Install dependencies:'));
    console.log(chalk.white('   npm install'));
    
    console.log(chalk.gray('\n3. Test the build:'));
    console.log(chalk.white('   npx nx build main-application'));
    
    console.log(chalk.gray('\n4. Run tests:'));
    console.log(chalk.white('   npx nx test'));
    
    console.log(chalk.gray('\n5. Start development server:'));
    console.log(chalk.white('   npx nx serve main-application'));
    
    console.log(chalk.gray('\n6. View project graph:'));
    console.log(chalk.white('   npx nx graph'));
    
    console.log(chalk.gray('\n7. Run affected commands:'));
    console.log(chalk.white('   npx nx affected:build'));
    console.log(chalk.white('   npx nx affected:test'));
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
    .option('no-backup', {
      type: 'boolean',
      description: 'Skip creating backup',
    })
    .option('no-git', {
      type: 'boolean',
      description: 'Skip git history preservation',
    })
    .option('install', {
      alias: 'i',
      type: 'boolean',
      description: 'Install dependencies after migration',
      default: false,
    })
    .option('force', {
      alias: 'f',
      type: 'boolean',
      description: 'Overwrite existing target directory',
    })
    .help()
    .argv;

  const migration = new CompleteMigration({
    dryRun: argv.dryRun,
    backupBeforeMigration: !argv.noBackup,
    preserveGitHistory: !argv.noGit,
    installDependencies: argv.install,
    force: argv.force,
  });

  migration.run().catch(console.error);
}

module.exports = CompleteMigration;