/**
 * @fileoverview Performance monitoring utilities for IOC Core
 * @description Comprehensive performance monitoring and analytics system
 */

export { CoreWebVitals, webVitals } from './core-web-vitals';
export { BundleAnalyzer, bundleAnalyzer } from './bundle-analyzer';
export { PerformanceTracker, performanceTracker } from './performance-tracker';
export { BuildAnalytics, buildAnalytics } from './build-analytics';
export { MemoryProfiler, memoryProfiler } from './memory-profiler';
export { PerformanceAlerts, performanceAlerts } from './performance-alerts';
export { PerformanceDashboard, performanceDashboard } from './performance-dashboard';
export * from './types';

// Dashboard-specific exports for UI component
export const getDashboardData = () => {
  return {
    vitals: {
      lcp: 2.5,
      fid: 100,
      cls: 0.1,
      ttfb: 800
    },
    averagePerformanceScore: 85,
    averageLoadTime: 1200,
    totalBundleSize: 2048000,
    criticalAlerts: 2,
    recommendations: [
      'Optimize image loading with lazy loading',
      'Reduce JavaScript bundle size',
      'Enable HTTP/2 push for critical resources'
    ]
  };
};

export const getPerformanceSummary = () => {
  return {
    score: 85,
    improvements: 3,
    alerts: 2
  };
};

export const subscribeToAlerts = (callback: (alert: any) => void) => {
  // Mock implementation
  const interval = setInterval(() => {
    const mockAlert = {
      severity: Math.random() > 0.5 ? 'warning' : 'error',
      title: 'Performance Alert',
      message: 'Sample performance alert message',
      timestamp: new Date().toISOString()
    };
    callback(mockAlert);
  }, 10000);

  return () => clearInterval(interval);
};