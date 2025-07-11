// IOC Meta BI Real-Time Data Processing System - Main Export
// Complete real-time ETL and streaming architecture for IOC's meta BI tool

// Core Real-Time Processing Components
export {
  RealTimeProcessingSystem,
  createDefaultRealTimeProcessingConfig,
  createRealTimeProcessingSystem,
  type RealTimeProcessingConfig,
  type ProcessingStats,
  type DataPipeline,
  type AlertRule
} from './realtime-processing';

// Stream Processing Architecture
export {
  StreamProcessor,
  createDefaultStreamProcessingConfig,
  createStreamProcessor,
  type StreamProcessingConfig,
  type StreamEvent,
  type ProcessingResult,
  type StreamMetrics,
  type StreamCheckpoint
} from './stream-processing';

// Change Data Capture System
export {
  CDCSystem,
  createDefaultCDCConfig,
  createCDCSystem,
  type CDCConfig,
  type CDCEvent,
  type CDCMetrics,
  type CDCCheckpoint
} from './cdc-system';

// ETL Pipeline
export {
  ETLPipeline,
  createDefaultETLConfig,
  createETLPipeline,
  type ETLConfig,
  type ETLJob,
  type ETLMetrics,
  type DataRecord
} from './etl-pipeline';

// Message Queue System
export {
  MessageQueue,
  createDefaultMessageQueueConfig,
  createMessageQueue,
  type MessageQueueConfig,
  type QueueMessage,
  type DeliveryAttempt,
  type QueueMetrics,
  type ConsumerMetrics,
  type ProducerMetrics,
  type MessageHandler,
  type MessageFilter
} from './message-queue';

// Monitoring and Alerting
export {
  MonitoringSystem,
  createDefaultMonitoringConfig,
  createMonitoringSystem,
  type MonitoringConfig,
  type HealthCheckEndpoint,
  type MetricPoint,
  type AlertRule as MonitoringAlertRule,
  type AlertInstance,
  type NotificationRecord,
  type MonitoringMetrics,
  type HealthCheckResult
} from './monitoring-alerting';

// Existing Anonymization System (re-export for convenience)
export {
  AnonymizationSystem,
  createAnonymizationSystem,
  createDefaultSystemConfig,
  createProductionAnonymizationSystem,
  createDevelopmentAnonymizationSystem,
  createHIPAAAnonymizationSystem,
  createGDPRAnonymizationSystem,
  type AnonymizationSystemConfig
} from './anonymization-system';

/**
 * Real-Time Processing System Factory - Quick Start
 * 
 * Creates a complete real-time data processing system with all components
 * configured for production use with IOC's assessment data.
 */
export function createProductionRealTimeSystem(options: {
  // Database connections
  primaryDbUrl: string;
  analyticsDbUrl: string;
  
  // Processing configuration
  enableRealTime?: boolean;
  enableBatch?: boolean;
  enableCDC?: boolean;
  
  // Quality and compliance
  anonymizationLevel?: 'basic' | 'standard' | 'strict';
  complianceRegulations?: string[];
  
  // Performance
  enableAutoScaling?: boolean;
  maxInstances?: number;
  
  // Monitoring
  enableMonitoring?: boolean;
  alertingChannels?: string[];
  
  // Optional overrides
  customConfig?: Partial<RealTimeProcessingConfig>;
}): RealTimeProcessingSystem {
  
  const config = createDefaultRealTimeProcessingConfig();
  
  // Apply database connections
  config.dataSources.primary.connectionString = options.primaryDbUrl;
  config.outputs.analyticsDatabase.connectionString = options.analyticsDbUrl;
  
  // Configure processing modes
  if (options.enableRealTime !== undefined) {
    config.processing.enableRealTimeProcessing = options.enableRealTime;
  }
  
  if (options.enableBatch !== undefined) {
    config.processing.enableBatchProcessing = options.enableBatch;
  }
  
  if (options.enableCDC !== undefined) {
    config.dataSources.primary.enableCDC = options.enableCDC;
  }
  
  // Configure quality and compliance
  if (options.anonymizationLevel) {
    config.quality.anonymizationLevel = options.anonymizationLevel;
  }
  
  if (options.complianceRegulations) {
    config.quality.complianceRegulations = options.complianceRegulations;
  }
  
  // Configure scaling
  if (options.enableAutoScaling !== undefined) {
    config.performance.enableAutoScaling = options.enableAutoScaling;
  }
  
  if (options.maxInstances) {
    config.system.maxInstances = options.maxInstances;
  }
  
  // Configure monitoring
  if (options.enableMonitoring !== undefined) {
    config.monitoring.enableMetrics = options.enableMonitoring;
    config.monitoring.enableAlerting = options.enableMonitoring;
  }
  
  if (options.alertingChannels) {
    config.monitoring.alertingRules.forEach(rule => {
      rule.channels = options.alertingChannels!;
    });
  }
  
  // Apply custom overrides
  if (options.customConfig) {
    Object.assign(config, options.customConfig);
  }
  
  return new RealTimeProcessingSystem(config);
}

/**
 * Development Real-Time System Factory
 * 
 * Creates a development-friendly system with relaxed settings
 */
export function createDevelopmentRealTimeSystem(options: {
  primaryDbUrl?: string;
  analyticsDbUrl?: string;
  enableMockData?: boolean;
} = {}): RealTimeProcessingSystem {
  
  const config = createDefaultRealTimeProcessingConfig();
  
  // Development-friendly settings
  config.system.environment = 'development';
  config.system.enableAutoScaling = false;
  config.system.minInstances = 1;
  config.system.maxInstances = 2;
  
  config.quality.anonymizationLevel = 'basic';
  config.quality.qualityThreshold = 70;
  
  config.performance.enableAutoScaling = false;
  config.monitoring.enableAlerting = false;
  config.alerting.quietHours.enabled = true; // Reduce noise in dev
  
  // Use memory-based storage for development
  config.integrations.messageQueue.queue.type = 'memory';
  
  if (options.primaryDbUrl) {
    config.dataSources.primary.connectionString = options.primaryDbUrl;
  }
  
  if (options.analyticsDbUrl) {
    config.outputs.analyticsDatabase.connectionString = options.analyticsDbUrl;
  }
  
  return new RealTimeProcessingSystem(config);
}

/**
 * HIPAA Compliant Real-Time System Factory
 * 
 * Creates a HIPAA-compliant system with enhanced security and auditing
 */
export function createHIPAARealTimeSystem(options: {
  primaryDbUrl: string;
  analyticsDbUrl: string;
  enableSafeHarbor?: boolean;
  auditLogRetention?: number;
}): RealTimeProcessingSystem {
  
  const config = createDefaultRealTimeProcessingConfig();
  
  // HIPAA-specific configuration
  config.dataSources.primary.connectionString = options.primaryDbUrl;
  config.outputs.analyticsDatabase.connectionString = options.analyticsDbUrl;
  
  config.quality.complianceRegulations = ['HIPAA'];
  config.quality.anonymizationLevel = 'strict';
  config.quality.qualityThreshold = 95;
  config.quality.enableAuditLogging = true;
  config.quality.retentionPeriod = options.auditLogRetention || 2555; // 7 years
  
  // Enhanced monitoring for HIPAA
  config.monitoring.enableMetrics = true;
  config.monitoring.enableAlerting = true;
  config.monitoring.alertingRules.push({
    name: 'hipaa_compliance_violation',
    condition: 'compliance_violations > threshold',
    threshold: 0,
    severity: 'critical',
    cooldown: 0,
    channels: ['email', 'pagerduty']
  });
  
  // Secure message processing
  config.integrations.messageQueue.message.enableEncryption = true;
  config.integrations.messageQueue.reliability.enableDurability = true;
  
  return new RealTimeProcessingSystem(config);
}

/**
 * GDPR Compliant Real-Time System Factory
 * 
 * Creates a GDPR-compliant system with privacy-by-design
 */
export function createGDPRRealTimeSystem(options: {
  primaryDbUrl: string;
  analyticsDbUrl: string;
  enableRightToErasure?: boolean;
  dataRetentionDays?: number;
}): RealTimeProcessingSystem {
  
  const config = createDefaultRealTimeProcessingConfig();
  
  // GDPR-specific configuration
  config.dataSources.primary.connectionString = options.primaryDbUrl;
  config.outputs.analyticsDatabase.connectionString = options.analyticsDbUrl;
  
  config.quality.complianceRegulations = ['GDPR'];
  config.quality.anonymizationLevel = 'standard';
  config.quality.qualityThreshold = 90;
  config.quality.enableAuditLogging = true;
  
  if (options.dataRetentionDays) {
    config.quality.retentionPeriod = options.dataRetentionDays;
  }
  
  // Privacy-enhanced processing
  config.processing.enableRealTimeProcessing = true;
  config.processing.processingMode = 'hybrid';
  
  // GDPR monitoring
  config.monitoring.alertingRules.push({
    name: 'gdpr_data_retention_violation',
    condition: 'data_age > threshold',
    threshold: options.dataRetentionDays || 365,
    severity: 'warning',
    cooldown: 86400000, // 24 hours
    channels: ['email']
  });
  
  return new RealTimeProcessingSystem(config);
}

/**
 * High-Performance Real-Time System Factory
 * 
 * Creates a high-performance system optimized for throughput
 */
export function createHighPerformanceRealTimeSystem(options: {
  primaryDbUrl: string;
  analyticsDbUrl: string;
  targetThroughput?: number;
  targetLatency?: number;
  enableCaching?: boolean;
}): RealTimeProcessingSystem {
  
  const config = createDefaultRealTimeProcessingConfig();
  
  // High-performance configuration
  config.dataSources.primary.connectionString = options.primaryDbUrl;
  config.outputs.analyticsDatabase.connectionString = options.analyticsDbUrl;
  
  config.processing.throughputTarget = options.targetThroughput || 10000;
  config.processing.realtimeLatencyTarget = options.targetLatency || 100;
  
  config.performance.enableAutoScaling = true;
  config.performance.enableCaching = options.enableCaching ?? true;
  config.performance.enableCompression = true;
  
  // Optimized components
  config.integrations.streamProcessor.stream.maxConcurrentProcessors = 20;
  config.integrations.streamProcessor.stream.batchSize = 1000;
  config.integrations.messageQueue.producer.batchSize = 1000;
  config.integrations.messageQueue.consumer.concurrency = 20;
  
  // Enhanced monitoring
  config.monitoring.metricsInterval = 5000; // More frequent metrics
  config.monitoring.alertingRules.push({
    name: 'throughput_below_target',
    condition: 'throughput < threshold',
    threshold: options.targetThroughput || 10000,
    severity: 'warning',
    cooldown: 300000,
    channels: ['slack']
  });
  
  return new RealTimeProcessingSystem(config);
}

/**
 * System Status and Health Check Utilities
 */
export class RealTimeSystemUtils {
  /**
   * Get comprehensive system health status
   */
  static async getSystemHealth(system: RealTimeProcessingSystem): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, any>;
    metrics: ProcessingStats;
    recommendations: string[];
  }> {
    const health = system.getSystemHealth();
    const stats = system.getStats();
    
    // Determine overall health
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const recommendations: string[] = [];
    
    // Check error rates
    if (stats.realTimeStats.errorRate > 0.05) {
      overall = 'degraded';
      recommendations.push('High error rate detected - investigate processing failures');
    }
    
    // Check latency
    if (stats.realTimeStats.averageLatency > 5000) {
      overall = overall === 'healthy' ? 'degraded' : 'unhealthy';
      recommendations.push('High latency detected - consider scaling up resources');
    }
    
    // Check CDC health
    if (stats.cdcStats.replicationHealth !== 'healthy') {
      overall = 'degraded';
      recommendations.push('CDC replication lag detected - check database connectivity');
    }
    
    // Check system resources
    if (stats.systemStats.cpuUsage > 80) {
      overall = overall === 'healthy' ? 'degraded' : 'unhealthy';
      recommendations.push('High CPU usage - consider adding more instances');
    }
    
    if (stats.systemStats.memoryUsage > 80) {
      overall = overall === 'healthy' ? 'degraded' : 'unhealthy';
      recommendations.push('High memory usage - investigate memory leaks or scale up');
    }
    
    return {
      overall,
      components: health,
      metrics: stats,
      recommendations
    };
  }
  
  /**
   * Get performance recommendations
   */
  static getPerformanceRecommendations(stats: ProcessingStats): string[] {
    const recommendations: string[] = [];
    
    if (stats.realTimeStats.backpressureEvents > 0) {
      recommendations.push('Backpressure detected - increase processing capacity or batch sizes');
    }
    
    if (stats.batchStats.failedBatches > 0) {
      recommendations.push('Batch failures detected - investigate data quality or processing logic');
    }
    
    if (stats.qualityStats.dataQualityScore < 90) {
      recommendations.push('Low data quality score - review data validation rules');
    }
    
    if (stats.qualityStats.complianceViolations > 0) {
      recommendations.push('Compliance violations detected - review anonymization settings');
    }
    
    return recommendations;
  }
  
  /**
   * Generate system configuration summary
   */
  static generateConfigSummary(config: RealTimeProcessingConfig): {
    summary: string;
    features: string[];
    compliance: string[];
    performance: string[];
  } {
    const features: string[] = [];
    const compliance: string[] = [];
    const performance: string[] = [];
    
    if (config.processing.enableRealTimeProcessing) features.push('Real-time processing');
    if (config.processing.enableBatchProcessing) features.push('Batch processing');
    if (config.dataSources.primary.enableCDC) features.push('Change data capture');
    if (config.quality.enableAnonymization) features.push('Data anonymization');
    
    compliance.push(...config.quality.complianceRegulations);
    
    if (config.performance.enableAutoScaling) performance.push('Auto-scaling');
    if (config.performance.enableCaching) performance.push('Caching');
    if (config.performance.enableLoadBalancing) performance.push('Load balancing');
    
    const summary = `IOC Real-Time Processing System v${config.system.version} 
Environment: ${config.system.environment}
Region: ${config.system.region}
Processing Mode: ${config.processing.processingMode}
Anonymization Level: ${config.quality.anonymizationLevel}`;
    
    return { summary, features, compliance, performance };
  }
}

/**
 * Version and System Information
 */
export const REALTIME_SYSTEM_INFO = {
  name: 'IOC Meta BI Real-Time Processing System',
  version: '1.0.0',
  buildDate: new Date().toISOString(),
  components: [
    'Stream Processing Engine',
    'Change Data Capture System',
    'ETL Pipeline Framework',
    'Message Queue System',
    'Monitoring & Alerting',
    'Anonymization Pipeline'
  ],
  capabilities: [
    'Real-time data ingestion from operational database',
    'Event-driven processing pipeline with fault tolerance',
    'Comprehensive anonymization with GDPR/HIPAA compliance',
    'Auto-scaling based on load with backpressure handling',
    'Dead letter queues for failed message recovery',
    'Real-time dashboard updates and analytics',
    'Data validation and quality assurance',
    'Performance monitoring and alerting'
  ],
  supportedDataSources: ['PostgreSQL', 'MySQL', 'MongoDB'],
  supportedOutputs: ['PostgreSQL', 'MySQL', 'BigQuery', 'Snowflake', 'InfluxDB'],
  messageQueues: ['Redis', 'RabbitMQ', 'Kafka', 'AWS SQS'],
  complianceStandards: ['GDPR', 'HIPAA', 'CCPA', 'PIPEDA']
};

/**
 * Default export for convenience
 */
export default {
  // Main system
  RealTimeProcessingSystem,
  
  // Factory functions
  createProductionRealTimeSystem,
  createDevelopmentRealTimeSystem,
  createHIPAARealTimeSystem,
  createGDPRRealTimeSystem,
  createHighPerformanceRealTimeSystem,
  
  // Utilities
  RealTimeSystemUtils,
  
  // System info
  REALTIME_SYSTEM_INFO
};