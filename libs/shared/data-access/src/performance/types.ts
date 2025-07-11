/**
 * @fileoverview Performance monitoring types
 * @description Type definitions for performance monitoring system
 */

export interface CoreWebVitals {
  cls: number;
  fcp: number;
  fid: number;
  lcp: number;
  ttfb: number;
  inp?: number;
}

export interface PerformanceMetrics {
  buildTime: number;
  bundleSize: number;
  pageLoadTime: number;
  renderTime: number;
  interactionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  cacheHitRate: number;
  errorRate: number;
}

export interface BundleAnalysisOld {
  totalSize: number;
  gzippedSize: number;
  chunks: ChunkInfo[];
  assets: AssetInfo[];
  modules: ModuleInfo[];
  dependencies: DependencyInfo[];
}

export interface ChunkInfo {
  name: string;
  size: number;
  files: string[];
  modules: string[];
}

export interface AssetInfo {
  name: string;
  size: number;
  type: string;
  compressed: boolean;
}

export interface ModuleInfo {
  name: string;
  size: number;
  chunks: string[];
  depth: number;
}

export interface DependencyInfo {
  name: string;
  version: string;
  size: number;
  usedBy: string[];
}

export interface PerformanceAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  metric: string;
  value: number;
  threshold: number;
  url?: string;
  userId?: string;
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
}

export interface BuildAnalytics {
  buildId: string;
  buildTime: number;
  buildTimestamp: string;
  bundleSize: number;
  dependencies: number;
  warnings: number;
  errors: number;
  cacheHitRate: number;
  environment: string;
  version: string;
}

export interface MemoryProfile {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  timestamp: string;
}

export interface PerformanceReportOld {
  id: string;
  timestamp: string;
  environment: string;
  version: string;
  metrics: PerformanceMetrics;
  vitals: CoreWebVitals;
  bundle: BundleAnalysisOld;
  build: BuildAnalytics;
  memory: MemoryProfile;
  alerts: PerformanceAlert[];
}

export interface PerformanceConfig {
  enableMonitoring: boolean;
  enableBundleAnalysis: boolean;
  enableMemoryProfiling: boolean;
  enableAlerts: boolean;
  reportingInterval: number;
  thresholds: PerformanceThreshold[];
  environment: string;
  version: string;
}

export interface PerformanceDashboardData {
  overview: {
    totalUsers: number;
    averageLoadTime: number;
    errorRate: number;
    performanceScore: number;
  };
  vitals: CoreWebVitals;
  trends: {
    loadTime: number[];
    errorRate: number[];
    bundleSize: number[];
    memoryUsage: number[];
  };
  alerts: PerformanceAlert[];
  recommendations: PerformanceRecommendation[];
}

export interface PerformanceRecommendation {
  id: string;
  type: 'optimization' | 'warning' | 'info';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  category: 'bundle' | 'runtime' | 'network' | 'memory';
  implementation: string;
}

// Additional types for performance monitoring
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url: string;
  connection: string;
}

export interface WebVitalsMetrics {
  cls?: number;
  fcp?: number;
  fid?: number;
  lcp?: number;
  ttfb?: number;
  inp?: number;
}

export interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  chunks: ChunkAnalysis[];
  dependencies: DependencyAnalysis[];
  duplicates: DuplicateAnalysis[];
  unusedCode: UnusedCodeAnalysis[];
}

export interface ChunkAnalysis {
  name: string;
  size: number;
  gzippedSize: number;
  modules: string[];
  isLarge: boolean;
}

export interface DependencyAnalysis {
  name: string;
  size: number;
  gzippedSize: number;
  version: string;
  isExternal: boolean;
  usageCount: number;
  usedBy: string[];
}

export interface DuplicateAnalysis {
  name: string;
  versions: string[];
  totalSize: number;
  locations: string[];
}

export interface UnusedCodeAnalysis {
  file: string;
  unusedBytes: number;
  totalBytes: number;
  percentage: number;
}

export interface BundleMetric {
  totalBundleSize: number;
  gzippedBundleSize: number;
  chunkCount: number;
  duplicateCount: number;
  unusedCodePercentage: number;
  recommendations: string[];
  timestamp: number;
}

export interface ResourceTiming {
  name: string;
  duration: number;
  size: number;
  type: string;
  startTime: number;
  endTime: number;
}

export interface PerformanceReport {
  sessionDuration: number;
  totalMetrics: number;
  averageResourceLoadTime: number;
  slowestResource: string;
  totalResourcesLoaded: number;
  connectionType: string;
  timestamp: number;
  aggregates: any;
}

export interface BuildMetrics {
  buildId: string;
  buildTime: number;
  bundleSize: number;
  chunkCount: number;
  moduleCount: number;
  dependencyCount: number;
  warnings: string[];
  errors: string[];
  cacheHitRate: number;
  timestamp: number;
}

export interface MemorySnapshot {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  timestamp: number;
  isLeaking: boolean;
}

export interface PerformanceAlertRule {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export interface DashboardMetrics {
  vitals: WebVitalsMetrics;
  resources: ResourceTiming[];
  bundle: BundleMetric;
  build: BuildMetrics;
  memory: MemorySnapshot;
  alerts: PerformanceAlert[];
  recommendations: PerformanceRecommendation[];
}