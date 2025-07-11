/**
 * @fileoverview Comprehensive bundle analysis tool for IOC Core
 * @description Analyzes bundle sizes, dependencies, and optimization opportunities
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { BundleAnalyzer } from './bundle-analyzer';

export interface BundleAnalysisResult {
  app: string;
  timestamp: string;
  totalSize: number;
  gzippedSize: number;
  chunks: ChunkInfo[];
  largestDependencies: DependencyInfo[];
  duplicates: string[];
  recommendations: string[];
}

interface ChunkInfo {
  name: string;
  size: number;
  gzippedSize: number;
  modules: number;
}

interface DependencyInfo {
  name: string;
  size: number;
  version: string;
  usageCount: number;
}

export class ComprehensiveBundleAnalyzer {
  private results: BundleAnalysisResult[] = [];
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async analyzeAllApps(): Promise<BundleAnalysisResult[]> {
    const apps = ['production', 'beta', 'dev'];
    
    for (const app of apps) {
      console.log(`\n📦 Analyzing ${app} bundle...`);
      const result = await this.analyzeApp(app);
      if (result) {
        this.results.push(result);
      }
    }

    return this.results;
  }

  private async analyzeApp(appName: string): Promise<BundleAnalysisResult | null> {
    const appDir = path.join(this.rootDir, 'apps', appName);
    const buildDir = path.join(appDir, '.next');

    if (!fs.existsSync(buildDir)) {
      console.log(`  ⚠️  Build directory not found for ${appName}. Skipping...`);
      return null;
    }

    try {
      // Analyze build output
      const statsFile = path.join(buildDir, 'build-stats.json');
      const chunks = await this.analyzeChunks(buildDir);
      const dependencies = await this.analyzeDependencies(appDir);
      const duplicates = await this.findDuplicates(appDir);
      
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      const gzippedSize = chunks.reduce((sum, chunk) => sum + chunk.gzippedSize, 0);

      const result: BundleAnalysisResult = {
        app: appName,
        timestamp: new Date().toISOString(),
        totalSize,
        gzippedSize,
        chunks: chunks.sort((a, b) => b.size - a.size).slice(0, 10),
        largestDependencies: dependencies.sort((a, b) => b.size - a.size).slice(0, 10),
        duplicates,
        recommendations: this.generateRecommendations(chunks, dependencies, duplicates)
      };

      return result;
    } catch (error) {
      console.error(`  ❌ Failed to analyze ${appName}:`, error);
      return null;
    }
  }

  private async analyzeChunks(buildDir: string): Promise<ChunkInfo[]> {
    const chunks: ChunkInfo[] = [];
    const chunksDir = path.join(buildDir, 'static', 'chunks');

    if (fs.existsSync(chunksDir)) {
      const files = fs.readdirSync(chunksDir);
      
      for (const file of files) {
        if (file.endsWith('.js')) {
          const filePath = path.join(chunksDir, file);
          const stats = fs.statSync(filePath);
          const content = fs.readFileSync(filePath);
          const gzippedSize = this.estimateGzipSize(content);

          chunks.push({
            name: file,
            size: stats.size,
            gzippedSize,
            modules: this.countModules(content.toString())
          });
        }
      }
    }

    return chunks;
  }

  private async analyzeDependencies(appDir: string): Promise<DependencyInfo[]> {
    const dependencies: DependencyInfo[] = [];
    const packageJsonPath = path.join(appDir, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const nodeModulesDir = path.join(appDir, 'node_modules');

      for (const [name, version] of Object.entries({
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {}
      })) {
        const depPath = path.join(nodeModulesDir, name);
        if (fs.existsSync(depPath)) {
          const size = this.getDirectorySize(depPath);
          dependencies.push({
            name,
            size,
            version: version as string,
            usageCount: await this.countUsages(appDir, name)
          });
        }
      }
    }

    return dependencies;
  }

  private async findDuplicates(appDir: string): Promise<string[]> {
    const duplicates: string[] = [];
    
    try {
      // Use npm ls to find duplicate packages
      const output = execSync('npm ls --depth=0 --json', {
        cwd: appDir,
        encoding: 'utf-8'
      });
      
      const tree = JSON.parse(output);
      const packageVersions: Map<string, Set<string>> = new Map();

      // Parse dependency tree
      this.parseDependencyTree(tree.dependencies || {}, packageVersions);

      // Find packages with multiple versions
      for (const [name, versions] of packageVersions.entries()) {
        if (versions.size > 1) {
          duplicates.push(`${name} (${Array.from(versions).join(', ')})`);
        }
      }
    } catch (error) {
      console.warn('Failed to analyze duplicates:', error);
    }

    return duplicates;
  }

  private parseDependencyTree(deps: any, packageVersions: Map<string, Set<string>>) {
    for (const [name, info] of Object.entries(deps)) {
      if (typeof info === 'object' && info !== null) {
        const depInfo = info as any;
        if (depInfo.version) {
          if (!packageVersions.has(name)) {
            packageVersions.set(name, new Set());
          }
          packageVersions.get(name)!.add(depInfo.version);
        }
        if (depInfo.dependencies) {
          this.parseDependencyTree(depInfo.dependencies, packageVersions);
        }
      }
    }
  }

  private estimateGzipSize(buffer: Buffer): number {
    // Rough estimation: gzip typically achieves 60-70% compression for JS
    return Math.round(buffer.length * 0.35);
  }

  private countModules(content: string): number {
    // Count webpack module boundaries
    const moduleMatches = content.match(/\/\*\*\*\/ function\s*\(/g) || [];
    return moduleMatches.length;
  }

  private getDirectorySize(dirPath: string): number {
    let size = 0;
    
    try {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          size += this.getDirectorySize(filePath);
        } else {
          size += stats.size;
        }
      }
    } catch (error) {
      // Ignore errors for inaccessible directories
    }

    return size;
  }

  private async countUsages(appDir: string, packageName: string): Promise<number> {
    try {
      const output = execSync(
        `grep -r "from ['"]${packageName}" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" . | wc -l`,
        { cwd: appDir, encoding: 'utf-8' }
      );
      return parseInt(output.trim(), 10);
    } catch {
      return 0;
    }
  }

  private generateRecommendations(
    chunks: ChunkInfo[],
    dependencies: DependencyInfo[],
    duplicates: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for large chunks
    const largeChunks = chunks.filter(chunk => chunk.size > 250000);
    if (largeChunks.length > 0) {
      recommendations.push(
        `Split large chunks: ${largeChunks.map(c => `${c.name} (${(c.size / 1024).toFixed(1)}KB)`).join(', ')}`
      );
    }

    // Check for large dependencies with low usage
    const underusedDeps = dependencies.filter(dep => dep.size > 100000 && dep.usageCount < 3);
    if (underusedDeps.length > 0) {
      recommendations.push(
        `Consider removing or lazy-loading: ${underusedDeps.map(d => d.name).join(', ')}`
      );
    }

    // Check for duplicates
    if (duplicates.length > 0) {
      recommendations.push(`Remove duplicate packages to save space`);
    }

    // Check for specific optimization opportunities
    const hasLodash = dependencies.some(d => d.name === 'lodash');
    if (hasLodash) {
      recommendations.push('Use lodash-es for better tree shaking');
    }

    const hasMoment = dependencies.some(d => d.name === 'moment');
    if (hasMoment) {
      recommendations.push('Replace moment.js with date-fns for smaller bundle');
    }

    return recommendations;
  }

  generateReport(): string {
    let report = '# Bundle Analysis Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    for (const result of this.results) {
      report += `## ${result.app.toUpperCase()} Application\n\n`;
      report += `- **Total Size**: ${(result.totalSize / 1024 / 1024).toFixed(2)} MB\n`;
      report += `- **Gzipped Size**: ${(result.gzippedSize / 1024 / 1024).toFixed(2)} MB\n\n`;

      report += '### Largest Chunks\n\n';
      report += '| Chunk | Size | Gzipped | Modules |\n';
      report += '|-------|------|---------|----------|\n';
      for (const chunk of result.chunks.slice(0, 5)) {
        report += `| ${chunk.name} | ${(chunk.size / 1024).toFixed(1)} KB | ${(chunk.gzippedSize / 1024).toFixed(1)} KB | ${chunk.modules} |\n`;
      }

      report += '\n### Largest Dependencies\n\n';
      report += '| Package | Size | Version | Usage Count |\n';
      report += '|---------|------|---------|-------------|\n';
      for (const dep of result.largestDependencies.slice(0, 5)) {
        report += `| ${dep.name} | ${(dep.size / 1024 / 1024).toFixed(2)} MB | ${dep.version} | ${dep.usageCount} |\n`;
      }

      if (result.duplicates.length > 0) {
        report += '\n### Duplicate Packages\n\n';
        for (const dup of result.duplicates) {
          report += `- ${dup}\n`;
        }
      }

      if (result.recommendations.length > 0) {
        report += '\n### Recommendations\n\n';
        for (const rec of result.recommendations) {
          report += `- ${rec}\n`;
        }
      }

      report += '\n---\n\n';
    }

    return report;
  }
}

// Export a function to run the analysis
export async function runBundleAnalysis(rootDir: string) {
  const analyzer = new ComprehensiveBundleAnalyzer(rootDir);
  const results = await analyzer.analyzeAllApps();
  
  // Save results
  const reportsDir = path.join(rootDir, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Save JSON results
  fs.writeFileSync(
    path.join(reportsDir, 'bundle-analysis.json'),
    JSON.stringify(results, null, 2)
  );

  // Save markdown report
  const report = analyzer.generateReport();
  fs.writeFileSync(
    path.join(reportsDir, 'bundle-analysis.md'),
    report
  );

  console.log(`\n✅ Bundle analysis complete! Reports saved to ${reportsDir}`);
  
  return results;
}