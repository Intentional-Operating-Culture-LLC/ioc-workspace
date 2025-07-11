/**
 * @fileoverview Performance dashboard for IOC Core
 * @description Aggregates and presents performance data
 */

import { DashboardMetrics, WebVitalsMetrics, PerformanceAlert, PerformanceRecommendation } from './types';

export interface PerformanceDashboardConfig {
  enableRealTimeUpdates?: boolean;
  updateInterval?: number;
  enableRecommendations?: boolean;
  enableAlerts?: boolean;
}

export class PerformanceDashboard {
  private config: PerformanceDashboardConfig;
  private currentMetrics: DashboardMetrics;

  constructor(config: PerformanceDashboardConfig = {}) {
    this.config = {
      enableRealTimeUpdates: false,
      updateInterval: 5000,
      enableRecommendations: true,
      enableAlerts: true,
      ...config
    };

    this.currentMetrics = this.initializeMetrics();
  }

  private initializeMetrics(): DashboardMetrics {
    return {
      vitals: {},
      resources: [],
      bundle: {
        totalBundleSize: 0,
        gzippedBundleSize: 0,
        chunkCount: 0,
        duplicateCount: 0,
        unusedCodePercentage: 0,
        recommendations: [],
        timestamp: Date.now()
      },
      build: {
        buildId: '',
        buildTime: 0,
        bundleSize: 0,
        chunkCount: 0,
        moduleCount: 0,
        dependencyCount: 0,
        warnings: [],
        errors: [],
        cacheHitRate: 0,
        timestamp: Date.now()
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        arrayBuffers: 0,
        timestamp: Date.now(),
        isLeaking: false
      },
      alerts: [],
      recommendations: []
    };
  }

  public getCurrentMetrics(): DashboardMetrics {
    return { ...this.currentMetrics };
  }

  public getPerformanceScore(): number {
    const vitals = this.currentMetrics.vitals;
    let score = 100;

    // Deduct points for poor web vitals
    if (vitals.lcp && vitals.lcp > 2500) score -= 20;
    if (vitals.fcp && vitals.fcp > 1800) score -= 15;
    if (vitals.cls && vitals.cls > 0.1) score -= 20;
    if (vitals.fid && vitals.fid > 100) score -= 15;
    if (vitals.ttfb && vitals.ttfb > 800) score -= 10;

    // Deduct points for large bundle
    if (this.currentMetrics.bundle.totalBundleSize > 5000000) score -= 10;

    // Deduct points for memory issues
    if (this.currentMetrics.memory.isLeaking) score -= 15;

    // Deduct points for active alerts
    score -= this.currentMetrics.alerts.length * 5;

    return Math.max(0, Math.min(100, score));
  }

  public getHealthStatus(): 'excellent' | 'good' | 'fair' | 'poor' {
    const score = this.getPerformanceScore();
    
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  public generateReport(): any {
    return {
      timestamp: Date.now(),
      performanceScore: this.getPerformanceScore(),
      healthStatus: this.getHealthStatus(),
      metrics: this.currentMetrics,
      summary: {
        totalAlerts: this.currentMetrics.alerts.length,
        criticalAlerts: this.currentMetrics.alerts.filter(a => a.severity === 'critical').length,
        recommendationsCount: this.currentMetrics.recommendations.length,
        highImpactRecommendations: this.currentMetrics.recommendations.filter(r => r.impact === 'high').length
      }
    };
  }
}

export const performanceDashboard = new PerformanceDashboard();