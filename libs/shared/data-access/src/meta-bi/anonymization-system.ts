// Complete Anonymization System Integration
// Main orchestrator for GDPR/HIPAA compliant data anonymization pipeline

import { EventEmitter } from 'events';
import { Pool } from 'pg';
import { 
  AnonymizationEngine,
  AnonymizationConfig,
  createAnonymizationEngine 
} from './anonymization-engine';
import { 
  AnonymizationPipeline,
  PipelineConfig,
  createDefaultPipelineConfig 
} from './anonymization-pipeline';
import { 
  ComplianceValidator,
  ValidationContext,
  createComplianceValidator 
} from './compliance-validator';
import { 
  QualityAssuranceEngine,
  QualityContext,
  createQualityAssuranceEngine 
} from './quality-assurance';
import { 
  BatchProcessor,
  BatchJobConfig,
  createDefaultBatchConfig 
} from './batch-processor';
import { 
  AuditLogger,
  createAuditLogger 
} from './audit-logger';
import { 
  AnalyticsDatabase,
  createDefaultAnalyticsDBConfig 
} from './analytics-db';

export interface AnonymizationSystemConfig {
  // Database configuration
  database: {
    primaryConnection: string;
    analyticsConnection: string;
    enableSeparateAnalyticsDB: boolean;
    connectionPoolSize: number;
  };
  
  // Anonymization configuration
  anonymization: AnonymizationConfig;
  
  // Pipeline configuration
  pipeline: PipelineConfig;
  
  // Compliance configuration
  compliance: {
    enabledRegulations: string[];
    strictMode: boolean;
    autoRemediation: boolean;
    alertWebhookUrl?: string;
  };
  
  // Quality configuration
  quality: {
    enableRealTimeValidation: boolean;
    qualityThreshold: number;
    riskThreshold: number;
    sampleRate: number;
  };
  
  // Audit configuration
  audit: {
    enableComprehensiveLogging: boolean;
    retentionPeriod: number;
    encryptSensitiveData: boolean;
    realTimeAlerts: boolean;
  };
  
  // Performance configuration
  performance: {
    enablePerformanceMonitoring: boolean;
    maxConcurrentJobs: number;
    memoryThreshold: number;
    cpuThreshold: number;
  };
}

export interface SystemMetrics {
  pipeline: {
    totalProcessed: number;
    successRate: number;
    avgProcessingTime: number;
    currentThroughput: number;
    queueDepth: number;
    errorRate: number;
  };
  quality: {
    avgQualityScore: number;
    avgRiskScore: number;
    criticalIssues: number;
    totalValidations: number;
    validationSuccessRate: number;
  };
  compliance: {
    avgComplianceScore: number;
    totalViolations: number;
    criticalViolations: number;
    regulationBreakdown: Record<string, number>;
  };
  system: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    uptime: number;
    activeConnections: number;
  };
  audit: {
    totalEvents: number;
    securityEvents: number;
    complianceEvents: number;
    criticalEvents: number;
    eventIngestionRate: number;
  };
}

export interface SystemHealth {
  overall: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DOWN';
  components: {
    anonymizationEngine: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DOWN';
    pipeline: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DOWN';
    complianceValidator: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DOWN';
    qualityAssurance: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DOWN';
    auditLogger: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DOWN';
    database: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DOWN';
  };
  alerts: Array<{
    component: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    timestamp: string;
    acknowledged: boolean;
  }>;
  lastHealthCheck: string;
}

/**
 * Complete Anonymization System
 * Orchestrates all components for production-ready data anonymization
 */
export class AnonymizationSystem extends EventEmitter {
  private config: AnonymizationSystemConfig;
  private primaryDb: Pool;
  private analyticsDb: AnalyticsDatabase;
  private anonymizationEngine: AnonymizationEngine;
  private pipeline: AnonymizationPipeline;
  private complianceValidator: ComplianceValidator;
  private qualityEngine: QualityAssuranceEngine;
  private auditLogger: AuditLogger;
  private batchProcessor?: BatchProcessor;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  private metrics: SystemMetrics;
  private healthStatus: SystemHealth;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  
  constructor(config: AnonymizationSystemConfig) {
    super();
    this.config = config;
    this.metrics = this.initializeMetrics();
    this.healthStatus = this.initializeHealthStatus();
    
    // Initialize database connections
    this.primaryDb = new Pool({
      connectionString: config.database.primaryConnection,
      max: config.database.connectionPoolSize
    });
    
    const analyticsDbConfig = createDefaultAnalyticsDBConfig();
    analyticsDbConfig.host = new URL(config.database.analyticsConnection).hostname;
    analyticsDbConfig.port = parseInt(new URL(config.database.analyticsConnection).port) || 5432;
    analyticsDbConfig.database = new URL(config.database.analyticsConnection).pathname.substring(1);
    
    this.analyticsDb = new AnalyticsDatabase(analyticsDbConfig);
  }
  
  /**
   * Initialize the anonymization system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('System is already initialized');
    }
    
    try {
      await this.auditLogger?.logSystemEvent(
        'SYSTEM_STARTUP',
        { component: 'AnonymizationSystem', phase: 'INITIALIZATION' },
        { severity: 'LOW', outcome: 'SUCCESS' }
      );
      
      // Initialize analytics database schema
      await this.analyticsDb.initializeSchema();
      
      // Initialize core components
      this.anonymizationEngine = createAnonymizationEngine();
      this.complianceValidator = createComplianceValidator(this.primaryDb);
      this.qualityEngine = createQualityAssuranceEngine(this.primaryDb);
      this.auditLogger = createAuditLogger(this.primaryDb);
      
      // Initialize pipeline
      this.pipeline = new AnonymizationPipeline(
        this.config.pipeline,
        this.anonymizationEngine,
        this.analyticsDb
      );
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      // Start metrics collection
      this.startMetricsCollection();
      
      this.isInitialized = true;
      
      this.emit('system_initialized', {
        timestamp: new Date().toISOString(),
        config: this.config
      });
      
      await this.auditLogger.logSystemEvent(
        'SYSTEM_INITIALIZED',
        { 
          component: 'AnonymizationSystem',
          enabledRegulations: this.config.compliance.enabledRegulations,
          qualityThreshold: this.config.quality.qualityThreshold
        },
        { severity: 'LOW', outcome: 'SUCCESS' }
      );
      
    } catch (error) {
      await this.auditLogger?.logSystemEvent(
        'SYSTEM_INITIALIZATION_FAILED',
        { 
          component: 'AnonymizationSystem',
          error: error instanceof Error ? error.message : String(error)
        },
        { severity: 'CRITICAL', outcome: 'FAILURE' }
      );
      
      throw error;
    }
  }
  
  /**
   * Start the anonymization system
   */
  public async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('System must be initialized before starting');
    }
    
    if (this.isRunning) {
      throw new Error('System is already running');
    }
    
    try {
      // Start pipeline
      await this.pipeline.start();
      
      this.isRunning = true;
      
      this.emit('system_started', {
        timestamp: new Date().toISOString()
      });
      
      await this.auditLogger.logSystemEvent(
        'SYSTEM_STARTED',
        { component: 'AnonymizationSystem' },
        { severity: 'LOW', outcome: 'SUCCESS' }
      );
      
    } catch (error) {
      await this.auditLogger.logSystemEvent(
        'SYSTEM_START_FAILED',
        { 
          component: 'AnonymizationSystem',
          error: error instanceof Error ? error.message : String(error)
        },
        { severity: 'CRITICAL', outcome: 'FAILURE' }
      );
      
      throw error;
    }
  }
  
  /**
   * Stop the anonymization system
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    try {
      // Stop pipeline
      await this.pipeline.stop();
      
      // Stop monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
      
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
      }
      
      // Close database connections
      await this.primaryDb.end();
      await this.analyticsDb.close();
      
      this.isRunning = false;
      
      this.emit('system_stopped', {
        timestamp: new Date().toISOString()
      });
      
      await this.auditLogger.logSystemEvent(
        'SYSTEM_STOPPED',
        { component: 'AnonymizationSystem' },
        { severity: 'LOW', outcome: 'SUCCESS' }
      );
      
    } catch (error) {
      await this.auditLogger.logSystemEvent(
        'SYSTEM_STOP_FAILED',
        { 
          component: 'AnonymizationSystem',
          error: error instanceof Error ? error.message : String(error)
        },
        { severity: 'HIGH', outcome: 'FAILURE' }
      );
      
      throw error;
    }
  }
  
  /**
   * Process data through the anonymization pipeline
   */
  public async processData(
    data: any, 
    dataType: string,
    options: {
      userId?: string;
      purpose?: string;
      legalBasis?: string;
      enableQualityCheck?: boolean;
      enableComplianceCheck?: boolean;
    } = {}
  ): Promise<string> {
    if (!this.isRunning) {
      throw new Error('System is not running');
    }
    
    const startTime = Date.now();
    
    try {
      // Process through pipeline
      const resultId = await this.pipeline.processData(data, dataType);
      
      const processingTime = Date.now() - startTime;
      
      // Log successful processing
      await this.auditLogger.logDataProcessing(
        'ANONYMIZATION',
        { id: resultId },
        { 
          success: true,
          processingTime,
          qualityScore: 0, // Would be populated by pipeline
          riskScore: 0,
          complianceScore: 0
        },
        {
          userId: options.userId,
          purpose: options.purpose || 'analytics',
          legalBasis: options.legalBasis || 'legitimate_interest'
        }
      );
      
      // Update metrics
      this.updateProcessingMetrics(true, processingTime);
      
      return resultId;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Log failed processing
      await this.auditLogger.logDataProcessing(
        'ANONYMIZATION',
        data,
        { 
          success: false,
          error: error instanceof Error ? error.message : String(error),
          processingTime
        },
        {
          userId: options.userId,
          purpose: options.purpose || 'analytics',
          legalBasis: options.legalBasis || 'legitimate_interest'
        }
      );
      
      // Update metrics
      this.updateProcessingMetrics(false, processingTime);
      
      throw error;
    }
  }
  
  /**
   * Start batch processing job
   */
  public async startBatchJob(jobConfig: BatchJobConfig): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('System must be initialized before starting batch jobs');
    }
    
    try {
      this.batchProcessor = new BatchProcessor(
        jobConfig,
        this.anonymizationEngine,
        this.analyticsDb,
        this.qualityEngine,
        this.complianceValidator
      );
      
      // Set up batch processor event listeners
      this.setupBatchProcessorEvents();
      
      const result = await this.batchProcessor.startJob();
      
      await this.auditLogger.logSystemEvent(
        'BATCH_JOB_STARTED',
        { 
          component: 'BatchProcessor',
          jobId: result.jobId,
          sourceType: jobConfig.source.type,
          outputType: jobConfig.output.type
        },
        { severity: 'LOW', outcome: 'SUCCESS' }
      );
      
      return result.jobId;
      
    } catch (error) {
      await this.auditLogger.logSystemEvent(
        'BATCH_JOB_FAILED',
        { 
          component: 'BatchProcessor',
          error: error instanceof Error ? error.message : String(error)
        },
        { severity: 'HIGH', outcome: 'FAILURE' }
      );
      
      throw error;
    }
  }
  
  /**
   * Get system metrics
   */
  public getMetrics(): SystemMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Get system health status
   */
  public getHealth(): SystemHealth {
    return { ...this.healthStatus };
  }
  
  /**
   * Get pipeline status
   */
  public getPipelineStatus(): any {
    return this.pipeline.getStatus();
  }
  
  /**
   * Validate compliance for processed data
   */
  public async validateCompliance(
    dataId: string,
    regulations: string[] = ['GDPR']
  ): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('System must be initialized');
    }
    
    // This would retrieve the anonymized data and validate it
    // For now, return a placeholder
    const validationContext: ValidationContext = {
      dataType: 'unknown',
      processingPurpose: 'analytics',
      legalBasis: 'legitimate_interest',
      dataSubjectConsent: false,
      retentionPeriod: 1095,
      geographicScope: ['EU', 'US'],
      processingDate: new Date().toISOString(),
      dataController: 'IOC_ANALYTICS',
      dataProcessor: 'IOC_ANALYTICS'
    };
    
    // Implementation would retrieve actual data
    const mockData = {
      id: dataId,
      anonymizedData: {},
      metadata: {
        anonymizedAt: new Date().toISOString(),
        method: 'comprehensive_anonymization_v1',
        version: '1.0.0',
        complianceFlags: [],
        dataQuality: 95,
        riskScore: 15
      }
    };
    
    return await this.complianceValidator.validateCompliance(
      mockData,
      validationContext,
      regulations
    );
  }
  
  /**
   * Generate compliance report
   */
  public async generateComplianceReport(
    reportType: 'COMPLIANCE' | 'SECURITY' | 'DATA_PROCESSING' | 'USER_ACTIVITY' | 'SYSTEM_HEALTH',
    period: { start: string; end: string },
    options: {
      includeAttachments?: boolean;
      format?: 'JSON' | 'PDF' | 'CSV';
      regulations?: string[];
    } = {}
  ): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('System must be initialized');
    }
    
    return await this.auditLogger.generateReport(reportType, period, options);
  }
  
  /**
   * Private helper methods
   */
  
  private initializeMetrics(): SystemMetrics {
    return {
      pipeline: {
        totalProcessed: 0,
        successRate: 0,
        avgProcessingTime: 0,
        currentThroughput: 0,
        queueDepth: 0,
        errorRate: 0
      },
      quality: {
        avgQualityScore: 0,
        avgRiskScore: 0,
        criticalIssues: 0,
        totalValidations: 0,
        validationSuccessRate: 0
      },
      compliance: {
        avgComplianceScore: 0,
        totalViolations: 0,
        criticalViolations: 0,
        regulationBreakdown: {}
      },
      system: {
        memoryUsage: 0,
        cpuUsage: 0,
        diskUsage: 0,
        uptime: 0,
        activeConnections: 0
      },
      audit: {
        totalEvents: 0,
        securityEvents: 0,
        complianceEvents: 0,
        criticalEvents: 0,
        eventIngestionRate: 0
      }
    };
  }
  
  private initializeHealthStatus(): SystemHealth {
    return {
      overall: 'HEALTHY',
      components: {
        anonymizationEngine: 'HEALTHY',
        pipeline: 'HEALTHY',
        complianceValidator: 'HEALTHY',
        qualityAssurance: 'HEALTHY',
        auditLogger: 'HEALTHY',
        database: 'HEALTHY'
      },
      alerts: [],
      lastHealthCheck: new Date().toISOString()
    };
  }
  
  private setupEventListeners(): void {
    // Pipeline events
    this.pipeline.on('data_processed', (event) => {
      this.updateProcessingMetrics(true, event.data?.processingTime || 0);
      this.emit('data_processed', event);
    });
    
    this.pipeline.on('data_failed', (event) => {
      this.updateProcessingMetrics(false, 0);
      this.emit('data_failed', event);
    });
    
    this.pipeline.on('quality_alert', (event) => {
      this.addHealthAlert('qualityAssurance', 'HIGH', event.data?.message || 'Quality issue detected');
      this.emit('quality_alert', event);
    });
    
    this.pipeline.on('performance_alert', (event) => {
      this.addHealthAlert('pipeline', 'MEDIUM', event.data?.message || 'Performance issue detected');
      this.emit('performance_alert', event);
    });
    
    // Quality engine events
    this.qualityEngine?.on('quality_assessed', (assessment) => {
      this.updateQualityMetrics(assessment);
    });
    
    this.qualityEngine?.on('quality_alert', (event) => {
      this.addHealthAlert('qualityAssurance', 'HIGH', 'Critical quality issue detected');
    });
    
    // Audit logger events
    this.auditLogger?.on('audit_event', (event) => {
      this.updateAuditMetrics(event);
    });
  }
  
  private setupBatchProcessorEvents(): void {
    if (!this.batchProcessor) return;
    
    this.batchProcessor.on('job_started', (event) => {
      this.emit('batch_job_started', event);
    });
    
    this.batchProcessor.on('job_completed', (event) => {
      this.emit('batch_job_completed', event);
    });
    
    this.batchProcessor.on('job_failed', (event) => {
      this.addHealthAlert('pipeline', 'HIGH', 'Batch job failed');
      this.emit('batch_job_failed', event);
    });
    
    this.batchProcessor.on('progress_update', (event) => {
      this.emit('batch_progress_update', event);
    });
  }
  
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }
  
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 10000); // Collect every 10 seconds
  }
  
  private async performHealthCheck(): Promise<void> {
    try {
      // Check database connectivity
      await this.primaryDb.query('SELECT 1');
      this.healthStatus.components.database = 'HEALTHY';
      
      // Check pipeline status
      const pipelineStatus = this.pipeline.getStatus();
      this.healthStatus.components.pipeline = pipelineStatus.isRunning ? 'HEALTHY' : 'WARNING';
      
      // Update overall health
      const componentStatuses = Object.values(this.healthStatus.components);
      const criticalCount = componentStatuses.filter(s => s === 'CRITICAL').length;
      const warningCount = componentStatuses.filter(s => s === 'WARNING').length;
      
      if (criticalCount > 0) {
        this.healthStatus.overall = 'CRITICAL';
      } else if (warningCount > 0) {
        this.healthStatus.overall = 'WARNING';
      } else {
        this.healthStatus.overall = 'HEALTHY';
      }
      
      this.healthStatus.lastHealthCheck = new Date().toISOString();
      
    } catch (error) {
      this.healthStatus.components.database = 'CRITICAL';
      this.healthStatus.overall = 'CRITICAL';
      
      this.addHealthAlert(
        'database',
        'CRITICAL',
        `Database connectivity check failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  private collectSystemMetrics(): void {
    // Update system metrics
    const memUsage = process.memoryUsage();
    this.metrics.system.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
    this.metrics.system.uptime = process.uptime();
    
    // Get pipeline metrics
    const pipelineStatus = this.pipeline.getStatus();
    this.metrics.pipeline.queueDepth = pipelineStatus.queueDepth;
    
    // Emit metrics update
    this.emit('metrics_updated', this.metrics);
  }
  
  private updateProcessingMetrics(success: boolean, processingTime: number): void {
    this.metrics.pipeline.totalProcessed++;
    
    if (success) {
      const successCount = this.metrics.pipeline.totalProcessed * (this.metrics.pipeline.successRate / 100);
      const newSuccessCount = successCount + 1;
      this.metrics.pipeline.successRate = (newSuccessCount / this.metrics.pipeline.totalProcessed) * 100;
      
      // Update average processing time
      const totalTime = this.metrics.pipeline.avgProcessingTime * (this.metrics.pipeline.totalProcessed - 1);
      this.metrics.pipeline.avgProcessingTime = (totalTime + processingTime) / this.metrics.pipeline.totalProcessed;
    }
    
    // Update error rate
    const errorCount = this.metrics.pipeline.totalProcessed * (this.metrics.pipeline.errorRate / 100);
    const newErrorCount = success ? errorCount : errorCount + 1;
    this.metrics.pipeline.errorRate = (newErrorCount / this.metrics.pipeline.totalProcessed) * 100;
  }
  
  private updateQualityMetrics(assessment: any): void {
    this.metrics.quality.totalValidations++;
    
    // Update running averages
    const total = this.metrics.quality.totalValidations;
    const prevAvgQuality = this.metrics.quality.avgQualityScore * (total - 1);
    const prevAvgRisk = this.metrics.quality.avgRiskScore * (total - 1);
    
    this.metrics.quality.avgQualityScore = (prevAvgQuality + assessment.overallScore) / total;
    this.metrics.quality.avgRiskScore = (prevAvgRisk + (assessment.riskLevel === 'CRITICAL' ? 100 : 
                                                        assessment.riskLevel === 'HIGH' ? 75 :
                                                        assessment.riskLevel === 'MEDIUM' ? 50 : 25)) / total;
    
    if (assessment.riskLevel === 'CRITICAL') {
      this.metrics.quality.criticalIssues++;
    }
    
    if (assessment.passedValidation) {
      const successCount = this.metrics.quality.validationSuccessRate * (total - 1) / 100;
      this.metrics.quality.validationSuccessRate = ((successCount + 1) / total) * 100;
    }
  }
  
  private updateAuditMetrics(event: any): void {
    this.metrics.audit.totalEvents++;
    
    if (event.category === 'SECURITY') {
      this.metrics.audit.securityEvents++;
    }
    
    if (event.category === 'COMPLIANCE') {
      this.metrics.audit.complianceEvents++;
    }
    
    if (event.severity === 'CRITICAL') {
      this.metrics.audit.criticalEvents++;
    }
    
    // Calculate ingestion rate (simplified)
    this.metrics.audit.eventIngestionRate = this.metrics.audit.totalEvents / (process.uptime() || 1);
  }
  
  private addHealthAlert(
    component: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    message: string
  ): void {
    const alert = {
      component,
      severity,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };
    
    this.healthStatus.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.healthStatus.alerts.length > 100) {
      this.healthStatus.alerts = this.healthStatus.alerts.slice(-100);
    }
    
    // Update component health if critical
    if (severity === 'CRITICAL' && component in this.healthStatus.components) {
      (this.healthStatus.components as any)[component] = 'CRITICAL';
    }
    
    this.emit('health_alert', alert);
  }
}

/**
 * Create default system configuration
 */
export function createDefaultSystemConfig(): AnonymizationSystemConfig {
  return {
    database: {
      primaryConnection: process.env.DATABASE_URL || 'postgresql://localhost:5432/ioc_main',
      analyticsConnection: process.env.ANALYTICS_DB_URL || 'postgresql://localhost:5432/ioc_analytics',
      enableSeparateAnalyticsDB: true,
      connectionPoolSize: 20
    },
    anonymization: {
      salts: {
        global: process.env.ANONYMIZATION_GLOBAL_SALT || 'default_global_salt',
        user: process.env.ANONYMIZATION_USER_SALT || 'default_user_salt',
        organization: process.env.ANONYMIZATION_ORG_SALT || 'default_org_salt',
        assessment: process.env.ANONYMIZATION_ASSESSMENT_SALT || 'default_assessment_salt',
        session: process.env.ANONYMIZATION_SESSION_SALT || 'default_session_salt'
      },
      compliance: {
        mode: 'GDPR',
        kAnonymity: 5,
        lDiversity: 2,
        tCloseness: 0.2,
        enableDifferentialPrivacy: false,
        epsilonValue: 0.1
      },
      geographic: {
        ipToRegion: true,
        cityToCountry: true,
        timezoneGeneralization: true,
        postalCodeGeneralization: 3
      },
      temporal: {
        dateGranularity: 'day',
        timeRounding: 15,
        ageGeneralization: 5
      },
      retention: {
        anonymizedDataDays: 2555,
        auditLogDays: 2555,
        qualityMetricsDays: 365
      },
      performance: {
        batchSize: 1000,
        parallelWorkers: 4,
        streamBufferSize: 10000,
        validationSampling: 10
      }
    },
    pipeline: createDefaultPipelineConfig(),
    compliance: {
      enabledRegulations: ['GDPR', 'HIPAA'],
      strictMode: true,
      autoRemediation: false,
      alertWebhookUrl: process.env.COMPLIANCE_ALERT_WEBHOOK
    },
    quality: {
      enableRealTimeValidation: true,
      qualityThreshold: 85,
      riskThreshold: 30,
      sampleRate: 10
    },
    audit: {
      enableComprehensiveLogging: true,
      retentionPeriod: 2555,
      encryptSensitiveData: true,
      realTimeAlerts: true
    },
    performance: {
      enablePerformanceMonitoring: true,
      maxConcurrentJobs: 4,
      memoryThreshold: 4096,
      cpuThreshold: 80
    }
  };
}

/**
 * Create anonymization system with default configuration
 */
export function createAnonymizationSystem(
  config?: Partial<AnonymizationSystemConfig>
): AnonymizationSystem {
  const defaultConfig = createDefaultSystemConfig();
  const mergedConfig = { ...defaultConfig, ...config };
  
  return new AnonymizationSystem(mergedConfig);
}