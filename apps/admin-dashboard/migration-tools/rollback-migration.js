#!/usr/bin/env node
/**
 * IOC Core to Nx Migration Rollback Script
 * Provides rollback capabilities in case migration needs to be reversed
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const config = require('./migration-config');

class MigrationRollback {
  constructor(options = {}) {
    this.config = config;
    this.options = options;
    this.stats = {
      filesRestored: 0,
      directoriesRemoved: 0,
      errors: [],
    };
  }

  async rollback() {
    console.log(chalk.blue.bold('\n🔄 Starting Migration Rollback\n'));

    try {
      // Confirm rollback
      if (!this.options.force) {
        console.log(chalk.yellow('⚠️  This will remove the Nx workspace and restore from backup.'));
        console.log(chalk.yellow('    Use --force to skip this confirmation.\n'));
        
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise(resolve => {
          readline.question('Continue with rollback? (yes/no): ', resolve);
        });
        readline.close();

        if (answer.toLowerCase() !== 'yes') {
          console.log(chalk.gray('Rollback cancelled.'));
          return;
        }
      }

      // Find backup
      const backup = await this.findLatestBackup();
      if (!backup) {
        throw new Error('No backup found. Cannot rollback without backup.');
      }

      console.log(chalk.cyan(`📦 Using backup: ${backup}`));

      // Remove Nx workspace
      if (await fs.pathExists(this.config.paths.target)) {
        console.log(chalk.yellow('🗑️  Removing Nx workspace...'));
        await this.removeDirectory(this.config.paths.target);
      }

      // Restore from backup if different from source
      if (backup !== this.config.paths.source) {
        console.log(chalk.yellow('📥 Restoring from backup...'));
        await this.restoreFromBackup(backup);
      }

      // Restore Git state
      if (this.options.restoreGit) {
        console.log(chalk.yellow('🔧 Restoring Git state...'));
        await this.restoreGitState();
      }

      console.log(chalk.green.bold('\n✅ Rollback completed successfully!\n'));
      this.printStats();

    } catch (error) {
      console.error(chalk.red.bold('\n❌ Rollback failed:'), error);
      process.exit(1);
    }
  }

  async findLatestBackup() {
    const backupPattern = `${this.config.paths.source}-backup-*`;
    const { stdout } = await execAsync(`ls -d ${backupPattern} 2>/dev/null | sort -r | head -1`);
    
    const backup = stdout.trim();
    if (backup && await fs.pathExists(backup)) {
      return backup;
    }

    // If no backup exists, check if original source is intact
    if (await fs.pathExists(this.config.paths.source)) {
      const hasContent = await this.verifySourceIntegrity();
      if (hasContent) {
        return this.config.paths.source;
      }
    }

    return null;
  }

  async verifySourceIntegrity() {
    // Check if source directory has expected structure
    const expectedDirs = ['apps', 'packages'];
    for (const dir of expectedDirs) {
      if (!await fs.pathExists(path.join(this.config.paths.source, dir))) {
        return false;
      }
    }
    return true;
  }

  async removeDirectory(directory) {
    try {
      await fs.remove(directory);
      this.stats.directoriesRemoved++;
      console.log(chalk.gray(`  ✓ Removed: ${directory}`));
    } catch (error) {
      this.stats.errors.push({
        action: 'remove',
        path: directory,
        error: error.message,
      });
      throw error;
    }
  }

  async restoreFromBackup(backupPath) {
    try {
      // Copy backup to original location
      await fs.copy(backupPath, this.config.paths.source, {
        overwrite: true,
        preserveTimestamps: true,
      });

      // Count restored files
      const files = await this.countFiles(this.config.paths.source);
      this.stats.filesRestored = files;

      console.log(chalk.green(`  ✓ Restored ${files} files from backup`));

      // Optionally remove backup after successful restore
      if (this.options.removeBackup) {
        await fs.remove(backupPath);
        console.log(chalk.gray(`  ✓ Removed backup: ${backupPath}`));
      }

    } catch (error) {
      this.stats.errors.push({
        action: 'restore',
        path: backupPath,
        error: error.message,
      });
      throw error;
    }
  }

  async countFiles(directory) {
    const { stdout } = await execAsync(
      `find "${directory}" -type f ! -path "*/node_modules/*" ! -path "*/.next/*" | wc -l`
    );
    return parseInt(stdout.trim(), 10);
  }

  async restoreGitState() {
    try {
      const cwd = this.config.paths.source;

      // Check for uncommitted changes
      const { stdout: status } = await execAsync('git status --porcelain', { cwd });
      
      if (status.trim()) {
        console.log(chalk.yellow('  ⚠️  Uncommitted changes detected'));
        
        if (this.options.force) {
          // Reset hard if forced
          await execAsync('git reset --hard HEAD', { cwd });
          console.log(chalk.gray('  ✓ Reset to HEAD'));
        } else {
          // Stash changes
          await execAsync('git stash push -m "Migration rollback stash"', { cwd });
          console.log(chalk.gray('  ✓ Stashed uncommitted changes'));
        }
      }

      // Clean untracked files
      await execAsync('git clean -fd', { cwd });
      console.log(chalk.gray('  ✓ Cleaned untracked files'));

    } catch (error) {
      this.stats.errors.push({
        action: 'git-restore',
        error: error.message,
      });
      console.log(chalk.yellow(`  ⚠️  Git restore failed: ${error.message}`));
    }
  }

  printStats() {
    console.log(chalk.cyan('📈 Rollback Statistics:'));
    console.log(`  • Files restored: ${this.stats.filesRestored}`);
    console.log(`  • Directories removed: ${this.stats.directoriesRemoved}`);
    
    if (this.stats.errors.length > 0) {
      console.log(chalk.red(`  • Errors: ${this.stats.errors.length}`));
      for (const error of this.stats.errors) {
        console.log(chalk.red(`    - ${error.action}: ${error.error}`));
      }
    }
  }
}

// CLI interface
if (require.main === module) {
  const yargs = require('yargs/yargs');
  const { hideBin } = require('yargs/helpers');

  const argv = yargs(hideBin(process.argv))
    .option('force', {
      alias: 'f',
      type: 'boolean',
      description: 'Skip confirmation prompts',
    })
    .option('restore-git', {
      alias: 'g',
      type: 'boolean',
      description: 'Restore Git working tree to clean state',
      default: true,
    })
    .option('remove-backup', {
      alias: 'r',
      type: 'boolean',
      description: 'Remove backup after successful rollback',
      default: false,
    })
    .help()
    .argv;

  const rollback = new MigrationRollback({
    force: argv.force,
    restoreGit: argv.restoreGit,
    removeBackup: argv.removeBackup,
  });

  rollback.rollback().catch(console.error);
}

module.exports = MigrationRollback;