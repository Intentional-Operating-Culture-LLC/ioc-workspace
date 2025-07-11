/**
 * @fileoverview Performance baseline measurement for IOC Core
 * @description Captures current performance metrics before optimization
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface PerformanceBaseline {
  timestamp: string;
  bundleSizes: {
    production: BundleSize;
    beta: BundleSize;
    dev: BundleSize;
  };
  buildTimes: {
    production: number;
    beta: number;
    dev: number;
  };
  dependencies: {
    total: number;
    production: number;
    dev: number;
    topTen: Array<{ name: string; size: number }>;
  };
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}

interface BundleSize {
  total: number;
  gzipped: number;
  chunks: number;
  largestChunk: number;
}

export class PerformanceBaselineMeasurer {
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async captureBaseline(): Promise<PerformanceBaseline> {
    console.log('📊 Capturing performance baseline...\n');

    const baseline: PerformanceBaseline = {
      timestamp: new Date().toISOString(),
      bundleSizes: await this.measureBundleSizes(),
      buildTimes: await this.measureBuildTimes(),
      dependencies: await this.analyzeDependencies(),
      memoryUsage: this.captureMemoryUsage()
    };

    return baseline;
  }

  private async measureBundleSizes(): Promise<PerformanceBaseline['bundleSizes']> {
    const sizes: any = {};
    const apps = ['production', 'beta', 'dev'];

    for (const app of apps) {
      const buildDir = path.join(this.rootDir, 'apps', app, '.next');
      
      if (fs.existsSync(buildDir)) {
        sizes[app] = await this.getAppBundleSize(buildDir);
      } else {
        sizes[app] = {
          total: 0,
          gzipped: 0,
          chunks: 0,
          largestChunk: 0
        };
      }
    }

    return sizes;
  }

  private async getAppBundleSize(buildDir: string): Promise<BundleSize> {
    let total = 0;
    let chunks = 0;
    let largestChunk = 0;

    const chunksDir = path.join(buildDir, 'static', 'chunks');
    
    if (fs.existsSync(chunksDir)) {
      const files = fs.readdirSync(chunksDir);
      
      for (const file of files) {
        if (file.endsWith('.js')) {
          const filePath = path.join(chunksDir, file);
          const stats = fs.statSync(filePath);
          total += stats.size;
          chunks++;
          largestChunk = Math.max(largestChunk, stats.size);
        }
      }
    }

    return {
      total,
      gzipped: Math.round(total * 0.35), // Estimate
      chunks,
      largestChunk
    };
  }

  private async measureBuildTimes(): Promise<PerformanceBaseline['buildTimes']> {
    const times: any = {};
    const apps = ['production', 'beta', 'dev'];

    console.log('⏱️  Measuring build times...\n');

    for (const app of apps) {
      console.log(`Building ${app}...`);
      const start = Date.now();
      
      try {
        execSync(`npm run build:${app}`, {
          cwd: this.rootDir,
          stdio: 'pipe'
        });
        times[app] = Date.now() - start;
        console.log(`✅ ${app} built in ${times[app]}ms\n`);
      } catch (error) {
        console.error(`❌ Failed to build ${app}\n`);
        times[app] = 0;
      }
    }

    return times;
  }

  private async analyzeDependencies(): Promise<PerformanceBaseline['dependencies']> {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(this.rootDir, 'package.json'), 'utf-8')
    );

    const deps = Object.keys(packageJson.dependencies || {});
    const devDeps = Object.keys(packageJson.devDependencies || {});

    // Get sizes of top dependencies
    const topTen: Array<{ name: string; size: number }> = [];
    const nodeModulesDir = path.join(this.rootDir, 'node_modules');

    for (const dep of deps.slice(0, 20)) {
      const depPath = path.join(nodeModulesDir, dep);
      if (fs.existsSync(depPath)) {
        const size = this.getDirectorySize(depPath);
        topTen.push({ name: dep, size });
      }
    }

    topTen.sort((a, b) => b.size - a.size);

    return {
      total: deps.length + devDeps.length,
      production: deps.length,
      dev: devDeps.length,
      topTen: topTen.slice(0, 10)
    };
  }

  private getDirectorySize(dirPath: string): number {
    let size = 0;
    
    try {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory() && file !== 'node_modules') {
          size += this.getDirectorySize(filePath);
        } else if (stats.isFile()) {
          size += stats.size;
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return size;
  }

  private captureMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss
    };
  }

  generateReport(baseline: PerformanceBaseline): string {
    let report = '# Performance Baseline Report\n\n';
    report += `Generated: ${baseline.timestamp}\n\n`;

    report += '## Bundle Sizes\n\n';
    report += '| Application | Total Size | Gzipped | Chunks | Largest Chunk |\n';
    report += '|-------------|------------|---------|--------|---------------|\n';
    
    for (const [app, sizes] of Object.entries(baseline.bundleSizes)) {
      report += `| ${app} | ${(sizes.total / 1024 / 1024).toFixed(2)} MB | ${(sizes.gzipped / 1024 / 1024).toFixed(2)} MB | ${sizes.chunks} | ${(sizes.largestChunk / 1024).toFixed(1)} KB |\n`;
    }

    report += '\n## Build Times\n\n';
    report += '| Application | Build Time |\n';
    report += '|-------------|------------|\n';
    
    for (const [app, time] of Object.entries(baseline.buildTimes)) {
      report += `| ${app} | ${(time / 1000).toFixed(1)}s |\n`;
    }

    report += '\n## Dependencies\n\n';
    report += `- **Total Dependencies**: ${baseline.dependencies.total}\n`;
    report += `- **Production Dependencies**: ${baseline.dependencies.production}\n`;
    report += `- **Dev Dependencies**: ${baseline.dependencies.dev}\n\n`;

    report += '### Top 10 Dependencies by Size\n\n';
    report += '| Package | Size |\n';
    report += '|---------|------|\n';
    
    for (const dep of baseline.dependencies.topTen) {
      report += `| ${dep.name} | ${(dep.size / 1024 / 1024).toFixed(2)} MB |\n`;
    }

    report += '\n## Memory Usage\n\n';
    report += `- **Heap Used**: ${(baseline.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB\n`;
    report += `- **Heap Total**: ${(baseline.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB\n`;
    report += `- **External**: ${(baseline.memoryUsage.external / 1024 / 1024).toFixed(2)} MB\n`;
    report += `- **RSS**: ${(baseline.memoryUsage.rss / 1024 / 1024).toFixed(2)} MB\n`;

    return report;
  }
}

export async function capturePerformanceBaseline(rootDir: string) {
  const measurer = new PerformanceBaselineMeasurer(rootDir);
  const baseline = await measurer.captureBaseline();
  
  // Save results
  const reportsDir = path.join(rootDir, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Save JSON results
  fs.writeFileSync(
    path.join(reportsDir, 'performance-baseline.json'),
    JSON.stringify(baseline, null, 2)
  );

  // Save markdown report
  const report = measurer.generateReport(baseline);
  fs.writeFileSync(
    path.join(reportsDir, 'performance-baseline.md'),
    report
  );

  console.log(`\n✅ Performance baseline captured! Reports saved to ${reportsDir}`);
  
  return baseline;
}