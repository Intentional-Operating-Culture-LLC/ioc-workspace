// IOC Meta BI Real-Time Processing Framework
// Production-ready real-time data processing system integrating all components

import { EventEmitter } from 'events';
import { StreamProcessor, createDefaultStreamProcessingConfig } from './stream-processing';
import { CDCSystem, createDefaultCDCConfig } from './cdc-system';
import { ETLPipeline, createDefaultETLConfig } from './etl-pipeline';
import { MessageQueue, createDefaultMessageQueueConfig } from './message-queue';
import { AnonymizationSystem } from './anonymization-system';

export interface RealTimeProcessingConfig {
  // System configuration
  system: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    region: string;
    enableHighAvailability: boolean;
    enableAutoScaling: boolean;
    maxInstances: number;
    minInstances: number;
  };
  
  // Data sources configuration
  dataSources: {
    primary: {
      type: 'postgresql' | 'mysql' | 'mongodb';
      connectionString: string;
      tables: string[];
      enableCDC: boolean;
      cdcConfig?: any;
    };
    secondary?: {
      type: 'postgresql' | 'mysql' | 'mongodb';
      connectionString: string;
      tables: string[];
      enableCDC: boolean;
      cdcConfig?: any;
    };
    external: {
      apis: string[];
      webhooks: string[];
      messageQueues: string[];
    };
  };
  
  // Processing configuration
  processing: {
    enableRealTimeProcessing: boolean;
    enableBatchProcessing: boolean;
    enableStreamProcessing: boolean;
    enableETLProcessing: boolean;
    processingMode: 'realtime' | 'batch' | 'hybrid';
    batchInterval: number;
    realtimeLatencyTarget: number;
    throughputTarget: number;
  };
  
  // Output destinations
  outputs: {
    analyticsDatabase: {
      type: 'postgresql' | 'mysql' | 'mongodb' | 'bigquery' | 'snowflake';
      connectionString: string;
      database: string;
      schema: string;
      enablePartitioning: boolean;
      partitionStrategy: 'time' | 'hash' | 'range';
    };
    dataWarehouse?: {
      type: 'snowflake' | 'bigquery' | 'redshift';
      connectionString: string;
      dataset: string;
      enableScheduledLoads: boolean;
      loadSchedule: string;
    };
    realTimeOutputs: {
      messageQueues: string[];
      webhooks: string[];
      apis: string[];
    };
  };
  
  // Quality and compliance
  quality: {
    enableDataQuality: boolean;
    qualityThreshold: number;
    enableAnonymization: boolean;
    anonymizationLevel: 'basic' | 'standard' | 'strict';
    complianceRegulations: string[];
    enableAuditLogging: boolean;
    retentionPeriod: number;
  };
  
  // Performance and scaling
  performance: {
    enableAutoScaling: boolean;
    scalingMetrics: string[];
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    enableLoadBalancing: boolean;
    enableCaching: boolean;
    cacheStrategy: 'redis' | 'memory' | 'distributed';
    enableCompression: boolean;
  };
  
  // Monitoring and alerting
  monitoring: {
    enableMetrics: boolean;
    metricsProvider: 'prometheus' | 'cloudwatch' | 'datadog';
    metricsInterval: number;
    enableAlerting: boolean;
    alertingProvider: 'pagerduty' | 'slack' | 'email' | 'webhook';
    alertingRules: AlertRule[];
    enableDashboard: boolean;
    dashboardConfig: any;
  };
  
  // Error handling and recovery
  errorHandling: {
    enableErrorRecovery: boolean;
    retryStrategy: 'exponential' | 'linear' | 'fixed';
    maxRetries: number;
    backoffMultiplier: number;
    enableCircuitBreaker: boolean;
    circuitBreakerThreshold: number;
    enableDeadLetterQueue: boolean;
    dlqRetentionPeriod: number;
  };
  
  // Integration configuration
  integrations: {
    messageQueue: any;
    streamProcessor: any;
    cdcSystem: any;
    etlPipeline: any;
    anonymizationSystem: any;
  };
}

export interface AlertRule {
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number;
  channels: string[];
}

export interface ProcessingStats {
  realTimeStats: {
    totalEvents: number;
    eventsPerSecond: number;
    averageLatency: number;
    errorRate: number;
    backpressureEvents: number;
  };
  batchStats: {
    totalBatches: number;
    batchesPerHour: number;
    averageBatchSize: number;
    averageBatchTime: number;
    failedBatches: number;
  };
  cdcStats: {
    totalChanges: number;
    changesPerSecond: number;
    currentLag: number;
    averageLag: number;
    replicationHealth: 'healthy' | 'degraded' | 'unhealthy';
  };
  qualityStats: {
    dataQualityScore: number;
    anomaliesDetected: number;
    complianceViolations: number;
    anonymizationSuccessRate: number;
  };
  systemStats: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkThroughput: number;
    activeConnections: number;
  };
}

export interface DataPipeline {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error' | 'paused';
  type: 'realtime' | 'batch' | 'hybrid';
  source: string;
  destination: string;
  stats: ProcessingStats;
  config: any;
  lastUpdated: Date;
}

export class RealTimeProcessingSystem extends EventEmitter {
  private config: RealTimeProcessingConfig;
  private streamProcessor?: StreamProcessor;
  private cdcSystem?: CDCSystem;
  private etlPipeline?: ETLPipeline;
  private messageQueue?: MessageQueue;
  private anonymizationSystem?: AnonymizationSystem;
  
  private pipelines: Map<string, DataPipeline> = new Map();
  private isRunning = false;
  private stats: ProcessingStats = this.initializeStats();
  private scalingInstances: Set<string> = new Set();
  
  constructor(config: RealTimeProcessingConfig) {
    super();
    this.config = config;
    this.initializeComponents();
    this.setupMonitoring();
    this.setupErrorHandling();
  }
  
  private initializeStats(): ProcessingStats {
    return {
      realTimeStats: {
        totalEvents: 0,
        eventsPerSecond: 0,
        averageLatency: 0,
        errorRate: 0,
        backpressureEvents: 0
      },
      batchStats: {
        totalBatches: 0,
        batchesPerHour: 0,
        averageBatchSize: 0,
        averageBatchTime: 0,
        failedBatches: 0
      },
      cdcStats: {
        totalChanges: 0,
        changesPerSecond: 0,
        currentLag: 0,
        averageLag: 0,
        replicationHealth: 'healthy'
      },
      qualityStats: {
        dataQualityScore: 100,
        anomaliesDetected: 0,
        complianceViolations: 0,
        anonymizationSuccessRate: 100
      },
      systemStats: {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkThroughput: 0,
        activeConnections: 0
      }
    };
  }
  
  private initializeComponents(): void {
    // Initialize message queue
    if (this.config.integrations.messageQueue) {
      this.messageQueue = new MessageQueue(this.config.integrations.messageQueue);
      this.setupMessageQueueHandlers();
    }
    
    // Initialize anonymization system
    if (this.config.quality.enableAnonymization) {
      this.anonymizationSystem = new AnonymizationSystem({
        database: {
          primaryConnection: this.config.dataSources.primary.connectionString,
          analyticsConnection: this.config.outputs.analyticsDatabase.connectionString
        },
        anonymization: {
          compliance: {
            mode: this.config.quality.complianceRegulations.includes('GDPR') ? 'GDPR' : 'HIPAA',
            enableKAnonymity: this.config.quality.anonymizationLevel !== 'basic',
            kAnonymity: this.getKAnonymityValue(),
            enableLDiversity: this.config.quality.anonymizationLevel !== 'basic',
            lDiversity: this.getLDiversityValue()
          }
        },
        compliance: {
          enabledRegulations: this.config.quality.complianceRegulations,
          strictMode: this.config.quality.anonymizationLevel === 'strict'
        },
        quality: {
          enableQualityAssurance: this.config.quality.enableDataQuality,
          qualityThreshold: this.config.quality.qualityThreshold
        }
      });
    }
    
    // Initialize stream processor
    if (this.config.processing.enableStreamProcessing) {
      const streamConfig = this.config.integrations.streamProcessor || createDefaultStreamProcessingConfig();
      streamConfig.integration.anonymizationSystem = this.config.quality.enableAnonymization;
      this.streamProcessor = new StreamProcessor(streamConfig);
      this.setupStreamProcessorHandlers();
    }
    
    // Initialize CDC system
    if (this.config.dataSources.primary.enableCDC && this.config.processing.enableRealTimeProcessing) {
      const cdcConfig = this.config.integrations.cdcSystem || createDefaultCDCConfig();
      cdcConfig.database = {
        host: this.extractHostFromConnectionString(this.config.dataSources.primary.connectionString),
        port: this.extractPortFromConnectionString(this.config.dataSources.primary.connectionString),
        database: this.extractDatabaseFromConnectionString(this.config.dataSources.primary.connectionString),
        username: this.extractUsernameFromConnectionString(this.config.dataSources.primary.connectionString),
        password: this.extractPasswordFromConnectionString(this.config.dataSources.primary.connectionString),
        ssl: false,
        maxConnections: 10
      };
      cdcConfig.cdc.tables = this.config.dataSources.primary.tables;
      cdcConfig.integration.enableAnonymization = this.config.quality.enableAnonymization;
      
      this.cdcSystem = new CDCSystem(cdcConfig);
      this.setupCDCHandlers();
    }
    
    // Initialize ETL pipeline
    if (this.config.processing.enableETLProcessing) {
      const etlConfig = this.config.integrations.etlPipeline || createDefaultETLConfig();
      etlConfig.extract.sources.primary.connectionString = this.config.dataSources.primary.connectionString;
      etlConfig.extract.sources.primary.tables = this.config.dataSources.primary.tables;
      etlConfig.load.targets.primary.connectionString = this.config.outputs.analyticsDatabase.connectionString;
      etlConfig.transform.stages.anonymization.enabled = this.config.quality.enableAnonymization;
      etlConfig.transform.stages.anonymization.regulations = this.config.quality.complianceRegulations;
      etlConfig.transform.stages.anonymization.anonymizationLevel = this.config.quality.anonymizationLevel;
      
      this.etlPipeline = new ETLPipeline(etlConfig);
      this.setupETLHandlers();
    }
  }
  
  // Component event handlers
  private setupMessageQueueHandlers(): void {
    if (!this.messageQueue) return;
    
    this.messageQueue.on('message_processed', (data) => {
      this.stats.realTimeStats.totalEvents++;
      this.emit('message_processed', data);
    });
    
    this.messageQueue.on('message_processing_failed', (data) => {
      this.stats.realTimeStats.errorRate = this.calculateErrorRate();
      this.emit('processing_error', data);
    });
    
    this.messageQueue.on('alert', (alert) => {
      this.handleAlert('message_queue', alert);
    });
  }
  
  private setupStreamProcessorHandlers(): void {
    if (!this.streamProcessor) return;
    
    this.streamProcessor.on('event_processed', (data) => {
      this.stats.realTimeStats.totalEvents++;
      this.updateLatencyStats(data.processingTime);
      this.emit('stream_event_processed', data);
    });
    
    this.streamProcessor.on('backpressure_activated', (data) => {
      this.stats.realTimeStats.backpressureEvents++;
      this.handleBackpressure(data);
    });
    
    this.streamProcessor.on('batch_processed', (data) => {
      this.stats.batchStats.totalBatches++;
      this.stats.batchStats.averageBatchTime = data.processingTime;
      this.emit('batch_processed', data);
    });
  }
  
  private setupCDCHandlers(): void {
    if (!this.cdcSystem) return;
    
    this.cdcSystem.on('cdc_event', (event) => {
      this.stats.cdcStats.totalChanges++;
      this.updateCDCStats();
      
      // Forward to stream processor if available
      if (this.streamProcessor) {
        this.streamProcessor.ingestEvent({
          source: 'cdc',
          eventType: `${event.table}_${event.operation.toLowerCase()}`,
          data: event,
          metadata: {
            version: '1.0.0',
            schema: 'cdc-event-v1',
            priority: 'medium',
            retryCount: 0
          }
        });
      }
    });
    
    this.cdcSystem.on('lag_alert', (data) => {
      this.stats.cdcStats.currentLag = data.currentLag;
      this.handleAlert('cdc', {
        type: 'lag_exceeded',
        value: data.currentLag,
        threshold: data.maxAllowed
      });
    });
  }
  
  private setupETLHandlers(): void {
    if (!this.etlPipeline) return;
    
    this.etlPipeline.on('job_completed', (job) => {
      this.stats.batchStats.totalBatches++;
      this.emit('etl_job_completed', job);
    });
    
    this.etlPipeline.on('job_failed', (data) => {
      this.stats.batchStats.failedBatches++;
      this.emit('etl_job_failed', data);
    });
  }
  
  // System lifecycle
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('System is already running');
    }
    
    try {
      this.emit('system_starting');
      
      // Start message queue
      if (this.messageQueue) {
        await this.messageQueue.connect();
        this.emit('message_queue_connected');
      }
      
      // Start CDC system
      if (this.cdcSystem) {
        await this.cdcSystem.start();
        this.emit('cdc_started');
      }
      
      // Start ETL pipeline
      if (this.etlPipeline) {
        await this.etlPipeline.start();
        this.emit('etl_started');
      }
      
      // Start stream processing consumers
      if (this.messageQueue && this.streamProcessor) {
        await this.messageQueue.startConsumer(async (message) => {
          await this.streamProcessor!.ingestEvent({
            source: message.metadata.source,
            eventType: message.metadata.messageType,
            data: message.payload,
            metadata: {
              version: message.metadata.version,
              schema: message.metadata.schema,
              priority: message.metadata.priority,
              retryCount: message.metadata.retryCount
            }
          });
        });
      }
      
      this.isRunning = true;
      this.startPerformanceMonitoring();
      this.startAutoScaling();
      
      this.emit('system_started', {
        timestamp: new Date(),
        components: this.getActiveComponents()
      });
      
    } catch (error) {
      this.emit('system_start_error', error);
      throw error;
    }
  }
  
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    this.emit('system_stopping');
    
    // Stop components in reverse order
    if (this.etlPipeline) {
      await this.etlPipeline.stop();
    }
    
    if (this.cdcSystem) {
      await this.cdcSystem.stop();
    }
    
    if (this.streamProcessor) {
      await this.streamProcessor.shutdown();
    }
    
    if (this.messageQueue) {
      await this.messageQueue.disconnect();
    }
    
    this.isRunning = false;
    
    this.emit('system_stopped', {
      timestamp: new Date(),
      finalStats: this.stats
    });
  }
  
  async pause(): Promise<void> {
    if (this.cdcSystem) {
      await this.cdcSystem.pause();
    }
    
    if (this.streamProcessor) {
      await this.streamProcessor.pause();
    }
    
    this.emit('system_paused');
  }
  
  async resume(): Promise<void> {
    if (this.cdcSystem) {
      await this.cdcSystem.resume();
    }
    
    if (this.streamProcessor) {
      await this.streamProcessor.resume();
    }
    
    this.emit('system_resumed');
  }
  
  // Pipeline management
  async createPipeline(config: {
    name: string;
    type: 'realtime' | 'batch' | 'hybrid';
    source: string;
    destination: string;
    transformations?: any[];
    schedule?: string;
  }): Promise<string> {
    const pipelineId = this.generatePipelineId();
    
    const pipeline: DataPipeline = {
      id: pipelineId,
      name: config.name,
      status: 'stopped',
      type: config.type,
      source: config.source,
      destination: config.destination,
      stats: this.initializeStats(),
      config,
      lastUpdated: new Date()
    };
    
    this.pipelines.set(pipelineId, pipeline);
    
    this.emit('pipeline_created', pipeline);
    
    return pipelineId;
  }
  
  async startPipeline(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }
    
    pipeline.status = 'running';
    pipeline.lastUpdated = new Date();
    
    // Start pipeline based on type
    switch (pipeline.type) {
      case 'realtime':
        await this.startRealtimePipeline(pipeline);
        break;
      case 'batch':
        await this.startBatchPipeline(pipeline);
        break;
      case 'hybrid':
        await this.startHybridPipeline(pipeline);
        break;
    }
    
    this.emit('pipeline_started', pipeline);
  }
  
  async stopPipeline(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }
    
    pipeline.status = 'stopped';
    pipeline.lastUpdated = new Date();
    
    this.emit('pipeline_stopped', pipeline);
  }
  
  // Performance monitoring
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updateSystemStats();
      this.updateThroughputStats();
      this.checkPerformanceThresholds();
      
      this.emit('performance_update', this.stats);
    }, this.config.monitoring.metricsInterval);
  }
  
  private updateSystemStats(): void {
    // This would integrate with system monitoring APIs
    this.stats.systemStats = {
      cpuUsage: this.getCPUUsage(),
      memoryUsage: this.getMemoryUsage(),
      diskUsage: this.getDiskUsage(),
      networkThroughput: this.getNetworkThroughput(),
      activeConnections: this.getActiveConnections()
    };
  }
  
  private updateThroughputStats(): void {
    // Calculate events per second
    const now = Date.now();
    const timeWindow = 60000; // 1 minute
    
    // This would track events over time window
    this.stats.realTimeStats.eventsPerSecond = this.calculateEventsPerSecond(timeWindow);
    this.stats.cdcStats.changesPerSecond = this.calculateChangesPerSecond(timeWindow);
  }
  
  private updateLatencyStats(latency: number): void {
    this.stats.realTimeStats.averageLatency = 
      (this.stats.realTimeStats.averageLatency + latency) / 2;
  }
  
  private updateCDCStats(): void {
    if (this.cdcSystem) {
      const cdcMetrics = this.cdcSystem.getMetrics();
      this.stats.cdcStats.currentLag = cdcMetrics.currentLagMs;
      this.stats.cdcStats.averageLag = cdcMetrics.averageLagMs;
      
      // Determine replication health
      if (cdcMetrics.currentLagMs < 5000) {
        this.stats.cdcStats.replicationHealth = 'healthy';
      } else if (cdcMetrics.currentLagMs < 30000) {
        this.stats.cdcStats.replicationHealth = 'degraded';
      } else {
        this.stats.cdcStats.replicationHealth = 'unhealthy';
      }
    }
  }
  
  // Auto-scaling
  private startAutoScaling(): void {
    if (!this.config.performance.enableAutoScaling) return;
    
    setInterval(() => {
      this.evaluateScalingNeeds();
    }, 30000); // Check every 30 seconds
  }
  
  private async evaluateScalingNeeds(): Promise<void> {
    const metrics = this.getScalingMetrics();
    
    // Scale up conditions
    if (this.shouldScaleUp(metrics) && this.scalingInstances.size < this.config.system.maxInstances) {
      await this.scaleUp();
    }
    
    // Scale down conditions
    if (this.shouldScaleDown(metrics) && this.scalingInstances.size > this.config.system.minInstances) {
      await this.scaleDown();
    }
  }
  
  private shouldScaleUp(metrics: any): boolean {
    return (
      metrics.cpuUsage > this.config.performance.scaleUpThreshold ||
      metrics.memoryUsage > this.config.performance.scaleUpThreshold ||
      metrics.queueDepth > this.config.performance.scaleUpThreshold ||
      metrics.averageLatency > this.config.processing.realtimeLatencyTarget
    );
  }
  
  private shouldScaleDown(metrics: any): boolean {
    return (
      metrics.cpuUsage < this.config.performance.scaleDownThreshold &&
      metrics.memoryUsage < this.config.performance.scaleDownThreshold &&
      metrics.queueDepth < this.config.performance.scaleDownThreshold &&
      metrics.averageLatency < this.config.processing.realtimeLatencyTarget * 0.5
    );
  }
  
  private async scaleUp(): Promise<void> {
    const instanceId = this.generateInstanceId();
    
    // This would create a new processing instance
    // Implementation depends on deployment platform (Kubernetes, ECS, etc.)
    
    this.scalingInstances.add(instanceId);
    
    this.emit('scaled_up', {
      instanceId,
      totalInstances: this.scalingInstances.size,
      timestamp: new Date()
    });
  }
  
  private async scaleDown(): Promise<void> {
    const instanceToRemove = Array.from(this.scalingInstances)[0];
    
    // This would gracefully shutdown and remove an instance
    
    this.scalingInstances.delete(instanceToRemove);
    
    this.emit('scaled_down', {
      instanceId: instanceToRemove,
      totalInstances: this.scalingInstances.size,
      timestamp: new Date()
    });
  }
  
  // Error handling and recovery
  private setupErrorHandling(): void {
    process.on('uncaughtException', (error) => {
      this.handleCriticalError('uncaught_exception', error);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      this.handleCriticalError('unhandled_rejection', new Error(String(reason)));
    });
  }
  
  private handleCriticalError(type: string, error: Error): void {
    this.emit('critical_error', {
      type,
      error: error.message,
      stack: error.stack,
      timestamp: new Date(),
      systemStats: this.stats
    });
    
    // Attempt graceful shutdown
    this.stop().catch(() => {
      // Force exit if graceful shutdown fails
      process.exit(1);
    });
  }
  
  private handleBackpressure(data: any): void {
    this.emit('backpressure_detected', data);
    
    // Implement backpressure handling strategies
    if (this.config.performance.enableAutoScaling) {
      this.evaluateScalingNeeds();
    }
  }
  
  private handleAlert(component: string, alert: any): void {
    const alertData = {
      component,
      alert,
      timestamp: new Date(),
      severity: this.determineAlertSeverity(alert),
      systemStats: this.stats
    };
    
    this.emit('alert', alertData);
    
    // Send to external alerting systems
    this.sendExternalAlert(alertData);
  }
  
  private determineAlertSeverity(alert: any): string {
    // Logic to determine alert severity based on thresholds
    if (alert.value > alert.threshold * 2) {
      return 'critical';
    } else if (alert.value > alert.threshold * 1.5) {
      return 'high';
    } else if (alert.value > alert.threshold) {
      return 'medium';
    } else {
      return 'low';
    }
  }
  
  private async sendExternalAlert(alertData: any): Promise<void> {
    // Implementation for external alerting systems
    // This would integrate with PagerDuty, Slack, etc.
    
    if (this.config.monitoring.alertingProvider === 'webhook') {
      // Send webhook notification
    }
  }
  
  // Pipeline implementations
  private async startRealtimePipeline(pipeline: DataPipeline): Promise<void> {
    // Implementation for real-time pipeline
    if (this.streamProcessor && this.messageQueue) {
      // Set up real-time processing flow
    }
  }
  
  private async startBatchPipeline(pipeline: DataPipeline): Promise<void> {
    // Implementation for batch pipeline
    if (this.etlPipeline) {
      // Schedule batch jobs
    }
  }
  
  private async startHybridPipeline(pipeline: DataPipeline): Promise<void> {
    // Implementation for hybrid pipeline
    await this.startRealtimePipeline(pipeline);
    await this.startBatchPipeline(pipeline);
  }
  
  // Utility methods
  private generatePipelineId(): string {
    return `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateInstanceId(): string {
    return `instance_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
  
  private getActiveComponents(): string[] {
    const components = [];
    if (this.messageQueue?.isQueueConnected()) components.push('message_queue');
    if (this.streamProcessor) components.push('stream_processor');
    if (this.cdcSystem) components.push('cdc_system');
    if (this.etlPipeline) components.push('etl_pipeline');
    if (this.anonymizationSystem) components.push('anonymization_system');
    return components;
  }
  
  private getKAnonymityValue(): number {
    switch (this.config.quality.anonymizationLevel) {
      case 'strict': return 10;
      case 'standard': return 5;
      case 'basic': return 3;
      default: return 5;
    }
  }
  
  private getLDiversityValue(): number {
    switch (this.config.quality.anonymizationLevel) {
      case 'strict': return 5;
      case 'standard': return 3;
      case 'basic': return 2;
      default: return 3;
    }
  }
  
  private extractHostFromConnectionString(connectionString: string): string {
    const match = connectionString.match(/\/\/([^:@]+)/);
    return match ? match[1] : 'localhost';
  }
  
  private extractPortFromConnectionString(connectionString: string): number {
    const match = connectionString.match(/:(\d+)\//);
    return match ? parseInt(match[1]) : 5432;
  }
  
  private extractDatabaseFromConnectionString(connectionString: string): string {
    const match = connectionString.match(/\/([^?]+)/);
    return match ? match[1] : 'postgres';
  }
  
  private extractUsernameFromConnectionString(connectionString: string): string {
    const match = connectionString.match(/\/\/([^:@]+):/);
    return match ? match[1] : 'postgres';
  }
  
  private extractPasswordFromConnectionString(connectionString: string): string {
    const match = connectionString.match(/:([^@]+)@/);
    return match ? match[1] : '';
  }
  
  private calculateErrorRate(): number {
    const total = this.stats.realTimeStats.totalEvents;
    const errors = this.stats.realTimeStats.totalEvents - 
                  this.stats.realTimeStats.totalEvents; // Simplified calculation
    return total > 0 ? errors / total : 0;
  }
  
  private calculateEventsPerSecond(timeWindow: number): number {
    // Simplified calculation - would need actual time-series data
    return this.stats.realTimeStats.totalEvents / (timeWindow / 1000);
  }
  
  private calculateChangesPerSecond(timeWindow: number): number {
    // Simplified calculation - would need actual time-series data
    return this.stats.cdcStats.totalChanges / (timeWindow / 1000);
  }
  
  private getCPUUsage(): number {
    // Implementation to get CPU usage
    return Math.random() * 100; // Placeholder
  }
  
  private getMemoryUsage(): number {
    // Implementation to get memory usage
    return Math.random() * 100; // Placeholder
  }
  
  private getDiskUsage(): number {
    // Implementation to get disk usage
    return Math.random() * 100; // Placeholder
  }
  
  private getNetworkThroughput(): number {
    // Implementation to get network throughput
    return Math.random() * 1000; // Placeholder
  }
  
  private getActiveConnections(): number {
    let connections = 0;
    if (this.messageQueue?.isQueueConnected()) connections++;
    if (this.cdcSystem) connections++;
    return connections;
  }
  
  private getScalingMetrics(): any {
    return {
      cpuUsage: this.stats.systemStats.cpuUsage,
      memoryUsage: this.stats.systemStats.memoryUsage,
      queueDepth: 0, // Would get from message queue
      averageLatency: this.stats.realTimeStats.averageLatency
    };
  }
  
  private checkPerformanceThresholds(): void {
    // Check if performance is within acceptable thresholds
    if (this.stats.realTimeStats.averageLatency > this.config.processing.realtimeLatencyTarget) {
      this.handleAlert('performance', {
        type: 'latency_exceeded',
        value: this.stats.realTimeStats.averageLatency,
        threshold: this.config.processing.realtimeLatencyTarget
      });
    }
    
    if (this.stats.realTimeStats.eventsPerSecond < this.config.processing.throughputTarget) {
      this.handleAlert('performance', {
        type: 'throughput_below_target',
        value: this.stats.realTimeStats.eventsPerSecond,
        threshold: this.config.processing.throughputTarget
      });
    }
  }
  
  // Public API methods
  public getStats(): ProcessingStats {
    return { ...this.stats };
  }
  
  public getPipelines(): DataPipeline[] {
    return Array.from(this.pipelines.values());
  }
  
  public getPipeline(pipelineId: string): DataPipeline | undefined {
    return this.pipelines.get(pipelineId);
  }
  
  public getSystemHealth(): any {
    return {
      status: this.isRunning ? 'running' : 'stopped',
      components: this.getActiveComponents(),
      stats: this.stats,
      uptime: process.uptime(),
      timestamp: new Date()
    };
  }
  
  public async processEvent(event: any): Promise<string> {
    if (!this.streamProcessor) {
      throw new Error('Stream processor not available');
    }
    
    return await this.streamProcessor.ingestEvent({
      source: 'api',
      eventType: event.type || 'generic',
      data: event.data,
      metadata: {
        version: '1.0.0',
        schema: 'api-event-v1',
        priority: event.priority || 'medium',
        retryCount: 0
      }
    });
  }
  
  public async runBatchJob(config: any): Promise<string> {
    if (!this.etlPipeline) {
      throw new Error('ETL pipeline not available');
    }
    
    return await this.etlPipeline.createJob(config.name, config);
  }
}

// Default configuration
export function createDefaultRealTimeProcessingConfig(): RealTimeProcessingConfig {
  return {
    system: {
      name: 'ioc-realtime-processing',
      version: '1.0.0',
      environment: 'production',
      region: 'us-east-1',
      enableHighAvailability: true,
      enableAutoScaling: true,
      maxInstances: 10,
      minInstances: 2
    },
    
    dataSources: {
      primary: {
        type: 'postgresql',
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ioc_main',
        tables: ['users', 'organizations', 'assessments', 'assessment_responses'],
        enableCDC: true
      },
      external: {
        apis: [],
        webhooks: [],
        messageQueues: []
      }
    },
    
    processing: {
      enableRealTimeProcessing: true,
      enableBatchProcessing: true,
      enableStreamProcessing: true,
      enableETLProcessing: true,
      processingMode: 'hybrid',
      batchInterval: 3600000, // 1 hour
      realtimeLatencyTarget: 1000, // 1 second
      throughputTarget: 1000 // events per second
    },
    
    outputs: {
      analyticsDatabase: {
        type: 'postgresql',
        connectionString: process.env.ANALYTICS_DB_URL || 'postgresql://localhost:5432/ioc_analytics',
        database: 'ioc_analytics',
        schema: 'public',
        enablePartitioning: true,
        partitionStrategy: 'time'
      },
      realTimeOutputs: {
        messageQueues: [],
        webhooks: [],
        apis: []
      }
    },
    
    quality: {
      enableDataQuality: true,
      qualityThreshold: 90,
      enableAnonymization: true,
      anonymizationLevel: 'standard',
      complianceRegulations: ['GDPR', 'HIPAA'],
      enableAuditLogging: true,
      retentionPeriod: 2555 // 7 years
    },
    
    performance: {
      enableAutoScaling: true,
      scalingMetrics: ['cpu', 'memory', 'queue_depth', 'latency'],
      scaleUpThreshold: 80,
      scaleDownThreshold: 30,
      enableLoadBalancing: true,
      enableCaching: true,
      cacheStrategy: 'redis',
      enableCompression: true
    },
    
    monitoring: {
      enableMetrics: true,
      metricsProvider: 'prometheus',
      metricsInterval: 30000,
      enableAlerting: true,
      alertingProvider: 'webhook',
      alertingRules: [
        {
          name: 'high_error_rate',
          condition: 'error_rate > threshold',
          threshold: 0.05,
          severity: 'high',
          cooldown: 300000,
          channels: ['slack', 'email']
        },
        {
          name: 'high_latency',
          condition: 'average_latency > threshold',
          threshold: 5000,
          severity: 'medium',
          cooldown: 300000,
          channels: ['slack']
        }
      ],
      enableDashboard: true,
      dashboardConfig: {}
    },
    
    errorHandling: {
      enableErrorRecovery: true,
      retryStrategy: 'exponential',
      maxRetries: 3,
      backoffMultiplier: 2,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 0.5,
      enableDeadLetterQueue: true,
      dlqRetentionPeriod: 604800000 // 7 days
    },
    
    integrations: {
      messageQueue: createDefaultMessageQueueConfig(),
      streamProcessor: createDefaultStreamProcessingConfig(),
      cdcSystem: createDefaultCDCConfig(),
      etlPipeline: createDefaultETLConfig(),
      anonymizationSystem: null
    }
  };
}

// Factory function
export function createRealTimeProcessingSystem(config?: Partial<RealTimeProcessingConfig>): RealTimeProcessingSystem {
  const defaultConfig = createDefaultRealTimeProcessingConfig();
  const mergedConfig = { ...defaultConfig, ...config };
  
  return new RealTimeProcessingSystem(mergedConfig);
}