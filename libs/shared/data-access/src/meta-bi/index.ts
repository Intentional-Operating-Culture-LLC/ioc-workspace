// IOC Meta BI Anonymization Pipeline
// Complete GDPR/HIPAA compliant data anonymization system
// Production-ready with quality assurance, compliance validation, and audit logging

// Core Anonymization Engine
export {
  AnonymizationEngine,
  AnonymizationConfig,
  AnonymizationResult,
  AnonymizedData,
  PIIDetectionRule,
  ReIdentificationRisk,
  createAnonymizationEngine
} from './anonymization-engine';

// Real-time Pipeline
export {
  AnonymizationPipeline,
  PipelineConfig,
  ProcessingMetrics,
  PipelineEvent,
  createDefaultPipelineConfig
} from './anonymization-pipeline';

// Compliance Validation
export {
  ComplianceValidator,
  ComplianceRule,
  ComplianceResult,
  ComplianceViolation,
  ComplianceReport,
  ValidationContext,
  DPIAAssessment,
  createComplianceValidator
} from './compliance-validator';

// Quality Assurance
export {
  QualityAssuranceEngine,
  QualityMetrics,
  QualityAssessment,
  QualityIssue,
  QualityRule,
  QualityContext,
  RiskAssessment,
  ValidationReport,
  createQualityAssuranceEngine
} from './quality-assurance';

// Batch Processing
export {
  BatchProcessor,
  BatchJobConfig,
  BatchJobStatus,
  BatchJobResult,
  BatchCheckpoint,
  createDefaultBatchConfig
} from './batch-processor';

// Audit Logging
export {
  AuditLogger,
  AuditEvent,
  AuditQuery,
  AuditReport,
  ComplianceMonitoringRule,
  DataSubjectRights,
  RetentionPolicy,
  createAuditLogger
} from './audit-logger';

// Analytics Database System
export {
  AnalyticsDatabase,
  AnalyticsDBConfig,
  createDefaultAnalyticsDBConfig
} from './analytics-db';

export {
  AnalyticsOperations,
  AnalyticsOperationsConfig,
  createAnalyticsOperations,
  createDefaultAnalyticsOperationsConfig
} from './analytics-operations';

export {
  AnalyticsQueryInterface,
  createAnalyticsQueryInterface
} from './analytics-query-interface';

export {
  DatabaseManager,
  createDatabaseManager
} from './database-management';

export {
  AnalyticsSystem,
  createAnalyticsSystem,
  createDefaultAnalyticsSystemConfig
} from './analytics-main';

// Analytics Engine (existing)
export {
  AnalyticsEngine,
  AnalyticsEngineConfig,
  AnalyticsAggregationEngine,
  RealTimeAnalyticsProcessor,
  createDefaultAnalyticsConfig
} from './analytics';

// Complete System Integration
export {
  AnonymizationSystem,
  AnonymizationSystemConfig,
  SystemMetrics,
  SystemHealth,
  createDefaultSystemConfig,
  createAnonymizationSystem
} from './anonymization-system';

// Type exports for better TypeScript support
export type {
  // Engine types
  AnonymizationConfig as IAnonymizationConfig,
  AnonymizedData as IAnonymizedData,
  ReIdentificationRisk as IReIdentificationRisk,
  
  // Pipeline types
  PipelineConfig as IPipelineConfig,
  ProcessingMetrics as IProcessingMetrics,
  
  // Compliance types
  ComplianceReport as IComplianceReport,
  ComplianceViolation as IComplianceViolation,
  ValidationContext as IValidationContext,
  
  // Quality types
  QualityMetrics as IQualityMetrics,
  QualityAssessment as IQualityAssessment,
  QualityIssue as IQualityIssue,
  
  // Batch types
  BatchJobConfig as IBatchJobConfig,
  BatchJobStatus as IBatchJobStatus,
  BatchJobResult as IBatchJobResult,
  
  // Audit types
  AuditEvent as IAuditEvent,
  AuditReport as IAuditReport,
  
  // System types
  AnonymizationSystemConfig as IAnonymizationSystemConfig,
  SystemMetrics as ISystemMetrics,
  SystemHealth as ISystemHealth
} from './anonymization-system';

/**
 * Quick Start Factory Functions
 */

/**
 * Create a production-ready anonymization system with sensible defaults
 */
export function createProductionAnonymizationSystem(options: {
  primaryDbUrl: string;
  analyticsDbUrl: string;
  regulations?: string[];
  qualityThreshold?: number;
  riskThreshold?: number;
  enableStrictMode?: boolean;
} = {
  primaryDbUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/ioc_main',
  analyticsDbUrl: process.env.ANALYTICS_DB_URL || 'postgresql://localhost:5432/ioc_analytics'
}): AnonymizationSystem {
  const config = createDefaultSystemConfig();
  
  // Override with provided options
  config.database.primaryConnection = options.primaryDbUrl;
  config.database.analyticsConnection = options.analyticsDbUrl;
  
  if (options.regulations) {
    config.compliance.enabledRegulations = options.regulations;
  }
  
  if (options.qualityThreshold !== undefined) {
    config.quality.qualityThreshold = options.qualityThreshold;
  }
  
  if (options.riskThreshold !== undefined) {
    config.quality.riskThreshold = options.riskThreshold;
  }
  
  if (options.enableStrictMode !== undefined) {
    config.compliance.strictMode = options.enableStrictMode;
  }
  
  return new AnonymizationSystem(config);
}

/**
 * Create a development anonymization system with relaxed settings
 */
export function createDevelopmentAnonymizationSystem(options: {
  primaryDbUrl?: string;
  analyticsDbUrl?: string;
} = {}): AnonymizationSystem {
  const config = createDefaultSystemConfig();
  
  // Development-friendly settings
  config.compliance.strictMode = false;
  config.quality.qualityThreshold = 70;
  config.quality.riskThreshold = 50;
  config.audit.encryptSensitiveData = false;
  config.performance.maxConcurrentJobs = 2;
  
  if (options.primaryDbUrl) {
    config.database.primaryConnection = options.primaryDbUrl;
  }
  
  if (options.analyticsDbUrl) {
    config.database.analyticsConnection = options.analyticsDbUrl;
  }
  
  return new AnonymizationSystem(config);
}

/**
 * Create a HIPAA-compliant anonymization system
 */
export function createHIPAAAnonymizationSystem(options: {
  primaryDbUrl: string;
  analyticsDbUrl: string;
  enableSafeHarbor?: boolean;
} = {
  primaryDbUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/ioc_main',
  analyticsDbUrl: process.env.ANALYTICS_DB_URL || 'postgresql://localhost:5432/ioc_analytics'
}): AnonymizationSystem {
  const config = createDefaultSystemConfig();
  
  // HIPAA-specific settings
  config.database.primaryConnection = options.primaryDbUrl;
  config.database.analyticsConnection = options.analyticsDbUrl;
  config.compliance.enabledRegulations = ['HIPAA'];
  config.compliance.strictMode = true;
  config.anonymization.compliance.mode = 'HIPAA';
  config.quality.qualityThreshold = 95;
  config.quality.riskThreshold = 10;
  config.audit.encryptSensitiveData = true;
  config.audit.retentionPeriod = 2555; // 7 years for HIPAA
  
  // Enhanced anonymization for HIPAA
  config.anonymization.compliance.kAnonymity = 10;
  config.anonymization.compliance.lDiversity = 3;
  config.anonymization.geographic.postalCodeGeneralization = 2; // Only first 3 digits
  config.anonymization.temporal.dateGranularity = 'month'; // Less precise dates
  
  return new AnonymizationSystem(config);
}

/**
 * Create a GDPR-compliant anonymization system
 */
export function createGDPRAnonymizationSystem(options: {
  primaryDbUrl: string;
  analyticsDbUrl: string;
  enableRightToErasure?: boolean;
  dataRetentionDays?: number;
} = {
  primaryDbUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/ioc_main',
  analyticsDbUrl: process.env.ANALYTICS_DB_URL || 'postgresql://localhost:5432/ioc_analytics'
}): AnonymizationSystem {
  const config = createDefaultSystemConfig();
  
  // GDPR-specific settings
  config.database.primaryConnection = options.primaryDbUrl;
  config.database.analyticsConnection = options.analyticsDbUrl;
  config.compliance.enabledRegulations = ['GDPR'];
  config.compliance.strictMode = true;
  config.anonymization.compliance.mode = 'GDPR';
  config.quality.qualityThreshold = 90;
  config.quality.riskThreshold = 20;
  
  // GDPR data retention
  if (options.dataRetentionDays) {
    config.anonymization.retention.anonymizedDataDays = options.dataRetentionDays;
  }
  
  // Enhanced privacy protections
  config.anonymization.compliance.kAnonymity = 5;
  config.anonymization.compliance.enableDifferentialPrivacy = true;
  config.anonymization.compliance.epsilonValue = 0.1;
  
  return new AnonymizationSystem(config);
}

// Real-Time Data Processing System (NEW)
export {
  // Main real-time system
  RealTimeProcessingSystem,
  createProductionRealTimeSystem,
  createDevelopmentRealTimeSystem,
  createHIPAARealTimeSystem,
  createGDPRRealTimeSystem,
  createHighPerformanceRealTimeSystem,
  RealTimeSystemUtils,
  REALTIME_SYSTEM_INFO,
  
  // Stream processing
  StreamProcessor,
  createDefaultStreamProcessingConfig,
  createStreamProcessor,
  
  // Change data capture
  CDCSystem,
  createDefaultCDCConfig,
  createCDCSystem,
  
  // ETL pipeline
  ETLPipeline,
  createDefaultETLConfig,
  createETLPipeline,
  
  // Message queue
  MessageQueue,
  createDefaultMessageQueueConfig,
  createMessageQueue,
  
  // Monitoring and alerting
  MonitoringSystem,
  createDefaultMonitoringConfig,
  createMonitoringSystem,
  
  // Types for real-time system
  type RealTimeProcessingConfig,
  type ProcessingStats,
  type DataPipeline,
  type StreamProcessingConfig,
  type StreamEvent,
  type CDCConfig,
  type CDCEvent,
  type ETLConfig,
  type ETLJob,
  type MessageQueueConfig,
  type QueueMessage,
  type MonitoringConfig,
  type MetricPoint
} from './realtime-index';

/**
 * Version information
 */
export const VERSION = '2.0.0'; // Updated for real-time capabilities
export const BUILD_DATE = new Date().toISOString();
export const COMPLIANCE_STANDARDS = ['GDPR', 'HIPAA', 'CCPA', 'PIPEDA', 'LGPD'];
export const SUPPORTED_DATA_TYPES = [
  'user',
  'organization', 
  'assessment',
  'assessment_response',
  'analytics_event'
];

/**
 * System information and capabilities
 */
export const SYSTEM_INFO = {
  name: 'IOC Meta BI Anonymization Pipeline',
  version: VERSION,
  buildDate: BUILD_DATE,
  complianceStandards: COMPLIANCE_STANDARDS,
  supportedDataTypes: SUPPORTED_DATA_TYPES,
  features: [
    'Real-time data anonymization',
    'Batch processing for historical data',
    'GDPR/HIPAA compliance validation',
    'Quality assurance and risk assessment',
    'Comprehensive audit logging',
    'k-anonymity and l-diversity',
    'Differential privacy (optional)',
    'Automated PII detection and removal',
    'Configurable retention policies',
    'Performance monitoring and alerting',
    'Data subject rights management',
    'Compliance reporting and DPIA generation'
  ],
  privacyTechniques: [
    'Direct identifier removal',
    'Quasi-identifier generalization',
    'Data suppression',
    'Hash-based anonymization',
    'Geographic generalization',
    'Temporal generalization',
    'k-anonymity enforcement',
    'l-diversity implementation',
    't-closeness validation',
    'Differential privacy (optional)'
  ]
};

/**
 * Default export for convenience
 */
export default {
  // Main system class
  AnonymizationSystem,
  
  // Factory functions
  createAnonymizationSystem,
  createProductionAnonymizationSystem,
  createDevelopmentAnonymizationSystem,
  createHIPAAAnonymizationSystem,
  createGDPRAnonymizationSystem,
  
  // Configuration helpers
  createDefaultSystemConfig,
  createDefaultPipelineConfig,
  createDefaultBatchConfig,
  
  // System information
  VERSION,
  BUILD_DATE,
  SYSTEM_INFO
};