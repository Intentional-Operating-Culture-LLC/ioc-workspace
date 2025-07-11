/**
 * @fileoverview Build analytics for IOC Core
 * @description Analyzes build performance and provides insights
 */

import { BuildMetrics } from './types';

export interface BuildAnalyticsConfig {
  enableDetailedTracking?: boolean;
  storeHistory?: boolean;
  historyLimit?: number;
  reportingEndpoint?: string;
}

export class BuildAnalytics {
  private config: BuildAnalyticsConfig;
  private buildHistory: BuildMetrics[] = [];
  private currentBuild: Partial<BuildMetrics> = {};

  constructor(config: BuildAnalyticsConfig = {}) {
    this.config = {
      enableDetailedTracking: true,
      storeHistory: true,
      historyLimit: 100,
      ...config
    };
  }

  public startBuild(buildId: string): void {
    this.currentBuild = {
      buildId,
      buildTime: Date.now(),
      bundleSize: 0,
      chunkCount: 0,
      moduleCount: 0,
      dependencyCount: 0,
      warnings: [],
      errors: [],
      cacheHitRate: 0,
      timestamp: Date.now()
    };
  }

  public endBuild(): BuildMetrics {
    const endTime = Date.now();
    const buildMetrics: BuildMetrics = {
      ...this.currentBuild,
      buildTime: endTime - (this.currentBuild.buildTime || endTime),
      timestamp: endTime
    } as BuildMetrics;

    if (this.config.storeHistory) {
      this.addToHistory(buildMetrics);
    }

    if (this.config.reportingEndpoint) {
      this.sendBuildMetrics(buildMetrics);
    }

    return buildMetrics;
  }

  public recordBundleSize(size: number): void {
    this.currentBuild.bundleSize = size;
  }

  public recordChunkCount(count: number): void {
    this.currentBuild.chunkCount = count;
  }

  public recordModuleCount(count: number): void {
    this.currentBuild.moduleCount = count;
  }

  public recordDependencyCount(count: number): void {
    this.currentBuild.dependencyCount = count;
  }

  public recordWarning(warning: string): void {
    if (!this.currentBuild.warnings) {
      this.currentBuild.warnings = [];
    }
    this.currentBuild.warnings.push(warning);
  }

  public recordError(error: string): void {
    if (!this.currentBuild.errors) {
      this.currentBuild.errors = [];
    }
    this.currentBuild.errors.push(error);
  }

  public recordCacheHitRate(rate: number): void {
    this.currentBuild.cacheHitRate = rate;
  }

  private addToHistory(metrics: BuildMetrics): void {
    this.buildHistory.push(metrics);
    
    if (this.buildHistory.length > this.config.historyLimit!) {
      this.buildHistory.shift();
    }
  }

  private async sendBuildMetrics(metrics: BuildMetrics): Promise<void> {
    try {
      await fetch(this.config.reportingEndpoint!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics)
      });
    } catch (error) {
      console.error('Failed to send build metrics:', error);
    }
  }

  public getBuildHistory(): BuildMetrics[] {
    return [...this.buildHistory];
  }

  public getAverageBuildTime(): number {
    if (this.buildHistory.length === 0) return 0;
    
    const total = this.buildHistory.reduce((sum, build) => sum + build.buildTime, 0);
    return total / this.buildHistory.length;
  }

  public getBuildTrend(): 'improving' | 'degrading' | 'stable' {
    if (this.buildHistory.length < 5) return 'stable';
    
    const recent = this.buildHistory.slice(-5);
    const earlier = this.buildHistory.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, build) => sum + build.buildTime, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, build) => sum + build.buildTime, 0) / earlier.length;
    
    const improvement = (earlierAvg - recentAvg) / earlierAvg;
    
    if (improvement > 0.1) return 'improving';
    if (improvement < -0.1) return 'degrading';
    return 'stable';
  }

  public getBundleSizeTrend(): 'improving' | 'degrading' | 'stable' {
    if (this.buildHistory.length < 5) return 'stable';
    
    const recent = this.buildHistory.slice(-5);
    const earlier = this.buildHistory.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, build) => sum + build.bundleSize, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, build) => sum + build.bundleSize, 0) / earlier.length;
    
    const improvement = (earlierAvg - recentAvg) / earlierAvg;
    
    if (improvement > 0.05) return 'improving';
    if (improvement < -0.05) return 'degrading';
    return 'stable';
  }

  public getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.buildHistory.length === 0) return recommendations;
    
    const avgBuildTime = this.getAverageBuildTime();
    const latest = this.buildHistory[this.buildHistory.length - 1];
    
    // Build time recommendations
    if (avgBuildTime > 30000) { // 30 seconds
      recommendations.push('Consider enabling build caching to reduce build times');
    }
    
    if (latest.cacheHitRate < 0.5) {
      recommendations.push('Cache hit rate is low, review caching strategy');
    }
    
    // Bundle size recommendations
    if (latest.bundleSize > 5000000) { // 5MB
      recommendations.push('Bundle size is large, consider code splitting');
    }
    
    // Error and warning recommendations
    if (latest.warnings.length > 10) {
      recommendations.push('High number of warnings, review and fix build warnings');
    }
    
    if (latest.errors.length > 0) {
      recommendations.push('Build errors detected, fix before production deployment');
    }
    
    // Dependency recommendations
    if (latest.dependencyCount > 1000) {
      recommendations.push('High dependency count, audit and remove unused dependencies');
    }
    
    return recommendations;
  }

  public generateReport(): any {
    const latest = this.buildHistory[this.buildHistory.length - 1];
    
    return {
      currentBuild: latest,
      averageBuildTime: this.getAverageBuildTime(),
      buildTrend: this.getBuildTrend(),
      bundleSizeTrend: this.getBundleSizeTrend(),
      totalBuilds: this.buildHistory.length,
      successRate: this.buildHistory.filter(b => b.errors.length === 0).length / this.buildHistory.length,
      recommendations: this.getOptimizationRecommendations(),
      timestamp: Date.now()
    };
  }

  public clearHistory(): void {
    this.buildHistory = [];
  }
}

export const buildAnalytics = new BuildAnalytics();