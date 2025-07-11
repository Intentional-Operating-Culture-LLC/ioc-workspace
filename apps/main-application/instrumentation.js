/**
 * @fileoverview Next.js instrumentation for performance monitoring
 * @description Registers performance monitoring on app startup
 */

import {
  webVitalsMonitor,
  performanceTracker,
  bundleAnalyzer,
  buildAnalytics,
  performanceAlerts } from
"@ioc/shared/data-access/performance";

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🔍 Initializing performance monitoring...');

    // Initialize performance monitoring
    performanceTracker.onMetricsUpdate((metrics) => {
      console.log('📊 Performance metrics updated:', metrics);
    });

    // Initialize alert system
    performanceAlerts.subscribe((alert) => {
      console.log('⚠️ Performance alert:', alert);
    });

    // Record build information
    buildAnalytics.recordBuildMetrics({
      buildId: process.env.BUILD_ID,
      buildTime: parseInt(process.env.BUILD_TIME || '0'),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version
    });

    console.log('✅ Performance monitoring initialized');
  }
}