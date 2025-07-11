# IOC Core to Nx Migration Tools

A comprehensive toolkit for migrating the IOC Core Turbo monorepo to an Nx workspace structure.

## Overview

This migration toolkit provides automated tools to:
- Migrate directory structure from Turbo to Nx conventions
- Transform import paths using AST parsing
- Validate migration completeness
- Generate detailed reports
- Provide rollback capabilities

## Installation

```bash
cd /home/darren/ioc-core/apps/admin/migration-tools
npm install
```

## Quick Start

### Complete Migration (Recommended)

Run the complete migration process with a single command:

```bash
npm run migrate
# or
node migrate-all.js
```

Options:
- `--dry-run` - Preview changes without making them
- `--no-backup` - Skip backup creation (not recommended)
- `--install` - Install dependencies after migration
- `--force` - Overwrite existing target directory

### Step-by-Step Migration

For more control, run each step separately:

1. **Migrate Content**
   ```bash
   npm run migrate:content
   # or
   node migrate-content.js
   ```

2. **Transform Import Paths**
   ```bash
   npm run migrate:imports /home/darren/ioc-workspace
   # or
   node transform-imports.js /home/darren/ioc-workspace
   ```

3. **Validate Migration**
   ```bash
   npm run validate
   # or
   node validate-migration.js
   ```

## Migration Mappings

### Applications
- `apps/admin` → `apps/admin-dashboard`
- `apps/production` → `apps/main-application`
- `apps/beta` → `apps/beta-application`
- `apps/dev` → `apps/dev-sandbox`

### Libraries
- `packages/ui` → `libs/shared/ui`
- `packages/lib` → `libs/shared/data-access`
- `packages/types` → `libs/shared/types`
- `packages/config` → `libs/shared/config`
- `packages/api-utils` → `libs/shared/api-utils`
- `packages/test-utils` → `libs/testing/test-utils`
- `packages/lambda-analytics` → `libs/features/lambda-analytics`

### Import Path Transformations
- `@ioc/ui` → `@ioc/shared/ui`
- `@ioc/lib` → `@ioc/shared/data-access`
- `@ioc/types` → `@ioc/shared/types`
- And more...

## Tools Description

### 1. migrate-content.js
Handles the physical migration of files and directories:
- Creates Nx workspace structure
- Copies files while preserving Git history (optional)
- Generates project.json files for each project
- Creates nx.json and workspace configuration

### 2. transform-imports.js
Uses AST parsing to safely transform import paths:
- Supports TypeScript and JavaScript
- Handles static and dynamic imports
- Transforms require() calls
- Generates transformation report

### 3. validate-migration.js
Comprehensive validation of the migration:
- Checks directory structure
- Validates project configurations
- Verifies import transformations
- Tests build system setup
- Checks TypeScript configuration

### 4. rollback-migration.js
Provides safe rollback capabilities:
- Restores from backup
- Cleans up Nx workspace
- Restores Git state
- Generates rollback report

## Generated Reports

All tools generate detailed JSON reports:
- `migration-report.json` - Content migration details
- `import-transformation-report.json` - Import path changes
- `migration-validation-report.json` - Validation results
- `migration-final-report.json` - Complete migration summary
- `MIGRATION_SUMMARY.md` - Human-readable summary

## Configuration

Edit `migration-config.js` to customize:
- Source and target paths
- Directory mappings
- Import path mappings
- File patterns to include/exclude
- Nx-specific configurations

## Rollback

If you need to undo the migration:

```bash
npm run rollback
# or
node rollback-migration.js --force
```

## Troubleshooting

### Common Issues

1. **Missing dependencies**
   ```bash
   cd /home/darren/ioc-workspace
   npm install
   ```

2. **Import path not transformed**
   - Check `migration-config.js` for missing mappings
   - Re-run import transformation

3. **Build failures**
   - Verify tsconfig.base.json paths
   - Check project.json configurations

### Manual Fixes

After migration, you may need to:
1. Update environment variables
2. Configure CI/CD pipelines
3. Update deployment scripts
4. Verify API endpoints

## Post-Migration Steps

1. **Test the build**
   ```bash
   cd /home/darren/ioc-workspace
   npx nx build main-application
   ```

2. **Run tests**
   ```bash
   npx nx test
   ```

3. **View project graph**
   ```bash
   npx nx graph
   ```

4. **Start development**
   ```bash
   npx nx serve main-application
   ```

## Support

For issues or questions:
1. Check generated reports for detailed error information
2. Review validation report for specific issues
3. Use rollback if migration fails
4. Consult Nx documentation for workspace-specific questions

## License

MIT