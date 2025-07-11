/**
 * IOC Analytics Monitoring Module
 * Export all monitoring components
 */

export * from './cloudwatch-config';
export * from './dashboard-builder';
export * from './metric-aggregator';
export * from './log-optimizer';
export * from './weekly-reporter';

// Re-export key classes for convenience
export { DashboardBuilder } from './dashboard-builder';
export { MetricAggregator } from './metric-aggregator';
export { LogOptimizer, LogAggregator } from './log-optimizer';
export { WeeklyReporter } from './weekly-reporter';

// Export configuration constants
export { 
  FREE_TIER_LIMITS,
  ESSENTIAL_METRICS,
  DASHBOARD_CONFIGS,
  ALARM_CONFIGS,
  LOG_INSIGHTS_QUERIES,
  MONITORING_GROWTH_PLAN
} from './cloudwatch-config';