#!/usr/bin/env node
/**
 * IOC Core to Nx Import Path Transformation Script
 * Uses AST parsing to safely transform import paths
 */

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');
const ts = require('typescript');
const config = require('./migration-config');

class ImportTransformer {
  constructor(options = {}) {
    this.config = config;
    this.options = options;
    this.stats = {
      filesProcessed: 0,
      importsTransformed: 0,
      errors: [],
      transformations: [],
    };
  }

  async transform(targetDir) {
    console.log(chalk.blue.bold('\n🔄 Starting Import Path Transformation\n'));

    try {
      const files = await this.getSourceFiles(targetDir);
      
      for (const file of files) {
        await this.transformFile(file);
      }

      console.log(chalk.green.bold('\n✅ Import transformation completed!\n'));
      this.printStats();

      if (this.options.generateReport) {
        await this.generateReport(targetDir);
      }

    } catch (error) {
      console.error(chalk.red.bold('\n❌ Transformation failed:'), error);
      process.exit(1);
    }
  }

  async getSourceFiles(directory) {
    const patterns = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
    const files = [];

    for (const pattern of patterns) {
      const matches = glob.sync(path.join(directory, pattern), {
        nodir: true,
        ignore: ['**/node_modules/**', '**/*.d.ts'],
      });
      files.push(...matches);
    }

    return files;
  }

  async transformFile(filePath) {
    try {
      console.log(chalk.gray(`  → Processing: ${path.relative(this.config.paths.target, filePath)}`));
      
      const content = await fs.readFile(filePath, 'utf8');
      const ext = path.extname(filePath);
      
      let transformed;
      if (ext === '.ts' || ext === '.tsx') {
        transformed = this.transformTypeScript(content, filePath);
      } else {
        transformed = this.transformJavaScript(content, filePath);
      }

      if (transformed.hasChanges) {
        await fs.writeFile(filePath, transformed.code);
        this.stats.filesProcessed++;
        this.stats.importsTransformed += transformed.transformCount;
        this.stats.transformations.push({
          file: filePath,
          transforms: transformed.transforms,
        });
      }

    } catch (error) {
      this.stats.errors.push({
        file: filePath,
        error: error.message,
      });
      console.error(chalk.red(`    ✗ Error: ${error.message}`));
    }
  }

  transformJavaScript(code, filePath) {
    let hasChanges = false;
    let transformCount = 0;
    const transforms = [];

    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy'],
    });

    traverse(ast, {
      ImportDeclaration: (path) => {
        const transformed = this.transformImportPath(path.node.source.value, filePath);
        if (transformed.changed) {
          path.node.source.value = transformed.newPath;
          hasChanges = true;
          transformCount++;
          transforms.push({
            type: 'import',
            from: transformed.oldPath,
            to: transformed.newPath,
          });
        }
      },
      CallExpression: (path) => {
        if (
          path.node.callee.name === 'require' &&
          path.node.arguments[0] &&
          t.isStringLiteral(path.node.arguments[0])
        ) {
          const transformed = this.transformImportPath(
            path.node.arguments[0].value,
            filePath
          );
          if (transformed.changed) {
            path.node.arguments[0].value = transformed.newPath;
            hasChanges = true;
            transformCount++;
            transforms.push({
              type: 'require',
              from: transformed.oldPath,
              to: transformed.newPath,
            });
          }
        }
      },
      ExportNamedDeclaration: (path) => {
        if (path.node.source) {
          const transformed = this.transformImportPath(path.node.source.value, filePath);
          if (transformed.changed) {
            path.node.source.value = transformed.newPath;
            hasChanges = true;
            transformCount++;
            transforms.push({
              type: 'export',
              from: transformed.oldPath,
              to: transformed.newPath,
            });
          }
        }
      },
      ExportAllDeclaration: (path) => {
        const transformed = this.transformImportPath(path.node.source.value, filePath);
        if (transformed.changed) {
          path.node.source.value = transformed.newPath;
          hasChanges = true;
          transformCount++;
          transforms.push({
            type: 'export-all',
            from: transformed.oldPath,
            to: transformed.newPath,
          });
        }
      },
    });

    const output = generate(ast, {
      retainLines: true,
      compact: false,
    });

    return {
      code: output.code,
      hasChanges,
      transformCount,
      transforms,
    };
  }

  transformTypeScript(code, filePath) {
    // For TypeScript files, we'll use the TypeScript compiler API
    let hasChanges = false;
    let transformCount = 0;
    const transforms = [];

    const sourceFile = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.Latest,
      true
    );

    const transformer = (context) => {
      return (rootNode) => {
        const visit = (node) => {
          // Import declarations
          if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
            const transformed = this.transformImportPath(
              node.moduleSpecifier.text,
              filePath
            );
            if (transformed.changed) {
              hasChanges = true;
              transformCount++;
              transforms.push({
                type: 'import',
                from: transformed.oldPath,
                to: transformed.newPath,
              });
              return ts.factory.updateImportDeclaration(
                node,
                node.modifiers,
                node.importClause,
                ts.factory.createStringLiteral(transformed.newPath),
                node.assertClause
              );
            }
          }

          // Export declarations
          if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
            const transformed = this.transformImportPath(
              node.moduleSpecifier.text,
              filePath
            );
            if (transformed.changed) {
              hasChanges = true;
              transformCount++;
              transforms.push({
                type: 'export',
                from: transformed.oldPath,
                to: transformed.newPath,
              });
              return ts.factory.updateExportDeclaration(
                node,
                node.modifiers,
                node.isTypeOnly,
                node.exportClause,
                ts.factory.createStringLiteral(transformed.newPath),
                node.assertClause
              );
            }
          }

          // Dynamic imports
          if (
            ts.isCallExpression(node) &&
            node.expression.kind === ts.SyntaxKind.ImportKeyword &&
            node.arguments.length === 1 &&
            ts.isStringLiteral(node.arguments[0])
          ) {
            const transformed = this.transformImportPath(
              node.arguments[0].text,
              filePath
            );
            if (transformed.changed) {
              hasChanges = true;
              transformCount++;
              transforms.push({
                type: 'dynamic-import',
                from: transformed.oldPath,
                to: transformed.newPath,
              });
              return ts.factory.updateCallExpression(
                node,
                node.expression,
                node.typeArguments,
                [ts.factory.createStringLiteral(transformed.newPath)]
              );
            }
          }

          return ts.visitEachChild(node, visit, context);
        };
        return ts.visitNode(rootNode, visit);
      };
    };

    const result = ts.transform(sourceFile, [transformer]);
    const transformedSourceFile = result.transformed[0];
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const newCode = printer.printFile(transformedSourceFile);

    return {
      code: newCode,
      hasChanges,
      transformCount,
      transforms,
    };
  }

  transformImportPath(importPath, currentFile) {
    const oldPath = importPath;
    let newPath = importPath;
    let changed = false;

    // Check if it's a package import that needs transformation
    for (const [from, to] of Object.entries(this.config.importMappings)) {
      if (importPath === from || importPath.startsWith(from + '/')) {
        newPath = importPath.replace(from, to);
        changed = true;
        break;
      }
    }

    // Handle relative imports that might need updating
    if (!changed && (importPath.startsWith('./') || importPath.startsWith('../'))) {
      const resolvedPath = this.resolveRelativePath(importPath, currentFile);
      if (resolvedPath.needsUpdate) {
        newPath = resolvedPath.newPath;
        changed = true;
      }
    }

    return { oldPath, newPath, changed };
  }

  resolveRelativePath(importPath, currentFile) {
    // This is a simplified version - you might need more complex logic
    // to handle all cases of relative imports after directory restructuring
    
    let needsUpdate = false;
    let newPath = importPath;

    // Check if the relative import crosses package boundaries
    const currentDir = path.dirname(currentFile);
    const targetPath = path.resolve(currentDir, importPath);

    // Check if the import is reaching into old package structure
    if (targetPath.includes('/packages/') || targetPath.includes('/apps/')) {
      // Try to resolve to new structure
      for (const [oldPkg, newPkg] of Object.entries(this.config.mappings.packages)) {
        if (targetPath.includes(oldPkg)) {
          // Calculate new relative path
          const packageName = Object.keys(this.config.importMappings).find(
            key => this.config.importMappings[key] === newPkg.replace('libs/', '@ioc/')
          );
          if (packageName) {
            newPath = packageName;
            needsUpdate = true;
            break;
          }
        }
      }
    }

    return { needsUpdate, newPath };
  }

  async generateReport(targetDir) {
    const report = {
      timestamp: new Date().toISOString(),
      targetDirectory: targetDir,
      stats: this.stats,
      transformationDetails: this.stats.transformations,
    };

    const reportPath = path.join(targetDir, 'import-transformation-report.json');
    await fs.writeJson(reportPath, report, { spaces: 2 });
    
    console.log(chalk.green(`\n📊 Transformation report saved to: ${reportPath}`));
  }

  printStats() {
    console.log(chalk.cyan('📈 Transformation Statistics:'));
    console.log(`  • Files processed: ${this.stats.filesProcessed}`);
    console.log(`  • Imports transformed: ${this.stats.importsTransformed}`);
    
    if (this.stats.errors.length > 0) {
      console.log(chalk.red(`  • Errors: ${this.stats.errors.length}`));
    }
  }
}

// CLI interface
if (require.main === module) {
  const yargs = require('yargs/yargs');
  const { hideBin } = require('yargs/helpers');

  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 <directory>')
    .command('$0 <directory>', 'Transform imports in the specified directory', (yargs) => {
      yargs.positional('directory', {
        describe: 'Directory to process',
        type: 'string',
      });
    })
    .option('report', {
      alias: 'r',
      type: 'boolean',
      description: 'Generate transformation report',
      default: true,
    })
    .option('dry-run', {
      alias: 'd',
      type: 'boolean',
      description: 'Show what would be transformed without making changes',
    })
    .help()
    .argv;

  const transformer = new ImportTransformer({
    generateReport: argv.report,
    dryRun: argv.dryRun,
  });

  transformer.transform(argv.directory).catch(console.error);
}

module.exports = ImportTransformer;