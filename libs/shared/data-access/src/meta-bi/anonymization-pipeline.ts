// Real-time Anonymization Pipeline
// Stream processing and batch processing for immediate and historical data anonymization

import { EventEmitter } from 'events';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { Readable, Transform, Writable, pipeline } from 'stream';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { Pool } from 'pg';
import { 
  AnonymizationEngine, 
  AnonymizationConfig, 
  AnonymizedData,
  AnonymizationResult 
} from './anonymization-engine';
import { AnalyticsDatabase } from './analytics-db';

const pipelineAsync = promisify(pipeline);

export interface PipelineConfig {
  // Stream processing
  stream: {
    inputBufferSize: number;
    outputBufferSize: number;
    batchSize: number;
    flushInterval: number;
    maxConcurrent: number;
    retryAttempts: number;
    retryDelay: number;
  };
  
  // Worker configuration
  workers: {
    count: number;
    maxMemoryMB: number;
    timeoutMs: number;
    restartOnError: boolean;
  };
  
  // Quality assurance
  quality: {
    enableValidation: boolean;
    sampleRate: number;
    qualityThreshold: number;
    riskThreshold: number;
    auditSampleRate: number;
  };
  
  // Performance monitoring
  monitoring: {
    enableMetrics: boolean;
    metricsInterval: number;
    alertThresholds: {
      processingLatency: number;
      errorRate: number;
      memoryUsage: number;
      queueDepth: number;
    };
  };
  
  // Error handling
  errorHandling: {
    maxRetries: number;
    deadLetterQueue: boolean;
    quarantineFailures: boolean;
    notificationWebhook?: string;
  };
}

export interface ProcessingMetrics {
  processed: number;
  failed: number;
  retried: number;
  skipped: number;
  avgProcessingTime: number;
  avgQualityScore: number;
  avgRiskScore: number;
  lastProcessedAt: string;
  errorRate: number;
  throughputPerSecond: number;
  memoryUsage: number;
  queueDepth: number;
}

export interface PipelineEvent {
  type: 'data_processed' | 'data_failed' | 'quality_alert' | 'performance_alert' | 'system_error';
  timestamp: string;
  data: any;
  metadata?: any;
}

/**
 * Real-time Anonymization Pipeline
 * Handles streaming data with immediate processing and quality assurance
 */
export class AnonymizationPipeline extends EventEmitter {
  private config: PipelineConfig;
  private anonymizationEngine: AnonymizationEngine;
  private analyticsDb: AnalyticsDatabase;
  private workers: Worker[] = [];
  private metrics: ProcessingMetrics;
  private isRunning: boolean = false;
  private inputQueue: any[] = [];
  private outputQueue: AnonymizedData[] = [];
  private processingPromises: Map<string, Promise<any>> = new Map();
  private metricsInterval?: NodeJS.Timeout;
  
  constructor(
    config: PipelineConfig,
    anonymizationEngine: AnonymizationEngine,
    analyticsDb: AnalyticsDatabase
  ) {
    super();
    this.config = config;
    this.anonymizationEngine = anonymizationEngine;
    this.analyticsDb = analyticsDb;
    this.metrics = this.initializeMetrics();
  }
  
  private initializeMetrics(): ProcessingMetrics {
    return {
      processed: 0,
      failed: 0,
      retried: 0,
      skipped: 0,
      avgProcessingTime: 0,
      avgQualityScore: 0,
      avgRiskScore: 0,
      lastProcessedAt: new Date().toISOString(),
      errorRate: 0,
      throughputPerSecond: 0,
      memoryUsage: 0,
      queueDepth: 0
    };
  }
  
  /**
   * Start the anonymization pipeline
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Pipeline is already running');
    }
    
    try {
      await this.initializeWorkers();
      this.startMetricsCollection();
      this.startQueueProcessing();
      this.isRunning = true;
      
      this.emit('pipeline_started', {
        timestamp: new Date().toISOString(),
        workerCount: this.workers.length,
        config: this.config
      });
      
    } catch (error) {
      this.emit('pipeline_error', {
        type: 'startup_error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
  
  /**
   * Stop the anonymization pipeline
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // Stop metrics collection
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    // Wait for pending operations to complete
    await Promise.all(this.processingPromises.values());
    
    // Terminate workers
    await Promise.all(this.workers.map(worker => worker.terminate()));
    this.workers = [];
    
    // Flush remaining data
    await this.flushOutputQueue();
    
    this.emit('pipeline_stopped', {
      timestamp: new Date().toISOString(),
      finalMetrics: this.metrics
    });
  }
  
  /**
   * Process data through the anonymization pipeline
   */
  public async processData(data: any, dataType: string): Promise<string> {
    if (!this.isRunning) {
      throw new Error('Pipeline is not running');
    }
    
    const requestId = createHash('sha256')
      .update(`${Date.now()}_${Math.random()}`)
      .digest('hex')
      .substring(0, 16);
    
    const processingRequest = {
      id: requestId,
      data,
      dataType,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };
    
    // Add to input queue
    this.inputQueue.push(processingRequest);
    this.metrics.queueDepth = this.inputQueue.length;
    
    // Create promise for tracking completion
    const processingPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Processing timeout for request ${requestId}`));
      }, this.config.workers.timeoutMs);
      
      const checkCompletion = () => {
        const result = this.outputQueue.find(item => 
          item.metadata?.requestId === requestId
        );
        
        if (result) {
          clearTimeout(timeout);
          resolve(result.id);
        } else {
          setTimeout(checkCompletion, 100);
        }
      };
      
      checkCompletion();
    });
    
    this.processingPromises.set(requestId, processingPromise);
    
    try {
      const result = await processingPromise;
      this.processingPromises.delete(requestId);
      return result as string;
    } catch (error) {
      this.processingPromises.delete(requestId);
      throw error;
    }
  }
  
  /**
   * Create stream processing pipeline
   */
  public createStreamProcessor(): {
    input: Writable;
    output: Readable;
    error: Readable;
  } {
    const inputStream = new Writable({
      objectMode: true,
      write: (chunk, encoding, callback) => {
        this.inputQueue.push({
          id: createHash('sha256').update(JSON.stringify(chunk)).digest('hex').substring(0, 16),
          data: chunk.data,
          dataType: chunk.dataType || 'unknown',
          timestamp: new Date().toISOString(),
          retryCount: 0
        });
        callback();
      }
    });
    
    const outputStream = new Readable({
      objectMode: true,
      read: () => {
        const result = this.outputQueue.shift();
        if (result) {
          outputStream.push(result);
        } else {
          setTimeout(() => outputStream._read(), 100);
        }
      }
    });
    
    const errorStream = new Readable({
      objectMode: true,
      read: () => {
        // Implement error stream reading logic
      }
    });
    
    return { input: inputStream, output: outputStream, error: errorStream };
  }
  
  /**
   * Initialize worker processes
   */
  private async initializeWorkers(): Promise<void> {
    const workerScript = `
      const { parentPort, workerData } = require('worker_threads');
      const { AnonymizationEngine } = require('./anonymization-engine');
      
      const engine = new AnonymizationEngine(workerData.config);
      
      parentPort.on('message', async (message) => {
        try {
          const { id, data, dataType } = message;
          
          let result;
          switch (dataType) {
            case 'user':
              result = await engine.anonymizeUser(data);
              break;
            case 'organization':
              result = await engine.anonymizeOrganization(data);
              break;
            case 'assessment':
              result = await engine.anonymizeAssessment(data);
              break;
            case 'assessment_response':
              result = await engine.anonymizeAssessmentResponse(data);
              break;
            case 'analytics_event':
              result = await engine.anonymizeAnalyticsEvent(data);
              break;
            default:
              throw new Error('Unsupported data type: ' + dataType);
          }
          
          parentPort.postMessage({
            type: 'success',
            id,
            result
          });
          
        } catch (error) {
          parentPort.postMessage({
            type: 'error',
            id: message.id,
            error: error.message
          });
        }
      });
    `;
    
    for (let i = 0; i < this.config.workers.count; i++) {
      const worker = new Worker(workerScript, {
        eval: true,
        workerData: {
          config: this.anonymizationEngine['config'] // Access private config
        }
      });
      
      worker.on('message', (message) => {
        this.handleWorkerMessage(message);
      });
      
      worker.on('error', (error) => {
        this.handleWorkerError(worker, error);
      });
      
      worker.on('exit', (code) => {
        if (code !== 0 && this.isRunning) {
          this.handleWorkerExit(worker, code);
        }
      });
      
      this.workers.push(worker);
    }
  }
  
  /**
   * Handle messages from worker processes
   */
  private handleWorkerMessage(message: any): void {
    const { type, id, result, error } = message;
    
    if (type === 'success') {
      // Add to output queue
      const anonymizedData = result as AnonymizedData;
      anonymizedData.metadata = {
        ...anonymizedData.metadata,
        requestId: id,
        processedBy: 'worker',
        processedAt: new Date().toISOString()
      };
      
      this.outputQueue.push(anonymizedData);
      
      // Update metrics
      this.metrics.processed++;
      this.updateProcessingTime(Date.now() - new Date(anonymizedData.metadata.processedAt).getTime());
      this.updateQualityMetrics(anonymizedData);
      
      this.emit('data_processed', {
        type: 'data_processed',
        timestamp: new Date().toISOString(),
        data: { id: anonymizedData.id, quality: anonymizedData.metadata.dataQuality }
      });
      
    } else if (type === 'error') {
      this.metrics.failed++;
      
      // Find and retry the failed request
      const failedRequest = this.inputQueue.find(req => req.id === id);
      if (failedRequest && failedRequest.retryCount < this.config.errorHandling.maxRetries) {
        failedRequest.retryCount++;
        this.metrics.retried++;
        
        // Re-queue for retry
        setTimeout(() => {
          this.processWithWorker(failedRequest);
        }, this.config.stream.retryDelay);
        
      } else {
        // Maximum retries exceeded
        this.emit('data_failed', {
          type: 'data_failed',
          timestamp: new Date().toISOString(),
          data: { id, error, retryCount: failedRequest?.retryCount || 0 }
        });
        
        if (this.config.errorHandling.quarantineFailures) {
          this.quarantineFailedData(failedRequest);
        }
      }
    }
  }
  
  /**
   * Handle worker errors
   */
  private handleWorkerError(worker: Worker, error: Error): void {
    this.emit('system_error', {
      type: 'worker_error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
    
    if (this.config.workers.restartOnError) {
      this.restartWorker(worker);
    }
  }
  
  /**
   * Handle worker exit
   */
  private handleWorkerExit(worker: Worker, code: number): void {
    this.emit('system_error', {
      type: 'worker_exit',
      timestamp: new Date().toISOString(),
      data: { exitCode: code }
    });
    
    if (this.config.workers.restartOnError) {
      this.restartWorker(worker);
    }
  }
  
  /**
   * Restart a worker process
   */
  private async restartWorker(oldWorker: Worker): Promise<void> {
    const index = this.workers.indexOf(oldWorker);
    if (index === -1) return;
    
    try {
      await oldWorker.terminate();
      
      // Create new worker (simplified - would need actual worker script)
      const newWorker = new Worker(__filename);
      
      newWorker.on('message', (message) => {
        this.handleWorkerMessage(message);
      });
      
      newWorker.on('error', (error) => {
        this.handleWorkerError(newWorker, error);
      });
      
      newWorker.on('exit', (code) => {
        if (code !== 0 && this.isRunning) {
          this.handleWorkerExit(newWorker, code);
        }
      });
      
      this.workers[index] = newWorker;
      
    } catch (error) {
      this.emit('system_error', {
        type: 'worker_restart_failed',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Start queue processing
   */
  private startQueueProcessing(): void {
    const processQueue = () => {
      if (!this.isRunning) return;
      
      // Process batch of items from input queue
      const batchSize = Math.min(this.config.stream.batchSize, this.inputQueue.length);
      const batch = this.inputQueue.splice(0, batchSize);
      
      batch.forEach(request => {
        this.processWithWorker(request);
      });
      
      // Flush output queue if needed
      if (this.outputQueue.length >= this.config.stream.outputBufferSize) {
        this.flushOutputQueue();
      }
      
      // Update queue depth metric
      this.metrics.queueDepth = this.inputQueue.length;
      
      // Schedule next processing cycle
      setTimeout(processQueue, this.config.stream.flushInterval);
    };
    
    processQueue();
  }
  
  /**
   * Process request with available worker
   */
  private processWithWorker(request: any): void {
    const availableWorker = this.getAvailableWorker();
    if (availableWorker) {
      availableWorker.postMessage(request);
    } else {
      // No workers available, re-queue
      setTimeout(() => {
        this.processWithWorker(request);
      }, 100);
    }
  }
  
  /**
   * Get available worker
   */
  private getAvailableWorker(): Worker | null {
    // Simple round-robin selection
    // In production, would implement proper load balancing
    return this.workers[Math.floor(Math.random() * this.workers.length)] || null;
  }
  
  /**
   * Flush output queue to analytics database
   */
  private async flushOutputQueue(): Promise<void> {
    if (this.outputQueue.length === 0) return;
    
    const batch = this.outputQueue.splice(0);
    
    try {
      // Group by data type for efficient batch insertion
      const groupedData = this.groupDataByType(batch);
      
      for (const [dataType, items] of Object.entries(groupedData)) {
        await this.insertBatchToDatabase(dataType, items);
      }
      
      this.emit('batch_flushed', {
        timestamp: new Date().toISOString(),
        count: batch.length
      });
      
    } catch (error) {
      this.emit('system_error', {
        type: 'batch_flush_failed',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Re-queue failed items for retry
      this.outputQueue.unshift(...batch);
    }
  }
  
  /**
   * Group anonymized data by type
   */
  private groupDataByType(data: AnonymizedData[]): Record<string, AnonymizedData[]> {
    const grouped: Record<string, AnonymizedData[]> = {};
    
    for (const item of data) {
      const dataType = this.inferDataType(item);
      if (!grouped[dataType]) {
        grouped[dataType] = [];
      }
      grouped[dataType].push(item);
    }
    
    return grouped;
  }
  
  /**
   * Infer data type from anonymized data structure
   */
  private inferDataType(data: AnonymizedData): string {
    const anonymizedData = data.anonymizedData;
    
    if (anonymizedData.user_hash) return 'user';
    if (anonymizedData.org_hash && !anonymizedData.assessment_hash) return 'organization';
    if (anonymizedData.assessment_hash && !anonymizedData.response_hash) return 'assessment';
    if (anonymizedData.response_hash) return 'assessment_response';
    if (anonymizedData.event_hash) return 'analytics_event';
    
    return 'unknown';
  }
  
  /**
   * Insert batch to analytics database
   */
  private async insertBatchToDatabase(dataType: string, items: AnonymizedData[]): Promise<void> {
    switch (dataType) {
      case 'user':
        // Transform to user format and insert
        break;
      case 'organization':
        // Transform to organization format and insert
        break;
      case 'assessment':
        const assessments = items.map(item => this.transformToAssessment(item));
        await this.analyticsDb.insertBatch({ assessments });
        break;
      case 'assessment_response':
        const responses = items.map(item => this.transformToAssessmentResponse(item));
        await this.analyticsDb.insertBatch({ responses });
        break;
      case 'analytics_event':
        // Transform to analytics event format and insert
        break;
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
  }
  
  /**
   * Transform anonymized data to assessment format
   */
  private transformToAssessment(data: AnonymizedData): any {
    const d = data.anonymizedData;
    return {
      id: d.assessment_hash,
      org_hash: d.org_hash,
      type: d.type,
      status: d.status,
      created_at: d.created_at,
      updated_at: d.updated_at,
      question_count: d.question_count,
      time_limit_minutes: d.time_limit_minutes,
      settings_hash: d.settings_hash,
      industry_category: d.industry_category,
      org_size_category: d.org_size_category,
      data_quality_score: data.metadata.dataQuality
    };
  }
  
  /**
   * Transform anonymized data to assessment response format
   */
  private transformToAssessmentResponse(data: AnonymizedData): any {
    const d = data.anonymizedData;
    return {
      id: d.response_hash,
      assessment_hash: d.assessment_hash,
      respondent_hash: d.respondent_hash,
      subject_hash: d.subject_hash,
      status: d.status,
      submitted_at: d.submitted_at,
      created_at: d.created_at,
      time_spent_seconds: d.time_spent_seconds,
      completion_percentage: d.completion_percentage,
      device_type: d.device_type,
      browser_family: d.browser_family,
      geographic_region: d.geographic_region,
      timezone: d.timezone,
      data_quality_score: data.metadata.dataQuality
    };
  }
  
  /**
   * Quarantine failed data for manual review
   */
  private async quarantineFailedData(failedRequest: any): Promise<void> {
    // Store failed data in quarantine table for manual review
    // This would be implemented based on specific requirements
  }
  
  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updatePerformanceMetrics();
      this.checkAlertThresholds();
      
      this.emit('metrics_updated', {
        timestamp: new Date().toISOString(),
        metrics: this.metrics
      });
      
    }, this.config.monitoring.metricsInterval);
  }
  
  /**
   * Update processing time metrics
   */
  private updateProcessingTime(processingTime: number): void {
    const count = this.metrics.processed;
    this.metrics.avgProcessingTime = 
      ((this.metrics.avgProcessingTime * (count - 1)) + processingTime) / count;
  }
  
  /**
   * Update quality metrics
   */
  private updateQualityMetrics(data: AnonymizedData): void {
    const quality = data.metadata.dataQuality;
    const risk = data.metadata.riskScore;
    const count = this.metrics.processed;
    
    this.metrics.avgQualityScore = 
      ((this.metrics.avgQualityScore * (count - 1)) + quality) / count;
    
    this.metrics.avgRiskScore = 
      ((this.metrics.avgRiskScore * (count - 1)) + risk) / count;
    
    // Check quality thresholds
    if (quality < this.config.quality.qualityThreshold) {
      this.emit('quality_alert', {
        type: 'low_quality',
        timestamp: new Date().toISOString(),
        data: { dataId: data.id, quality, threshold: this.config.quality.qualityThreshold }
      });
    }
    
    if (risk > this.config.quality.riskThreshold) {
      this.emit('quality_alert', {
        type: 'high_risk',
        timestamp: new Date().toISOString(),
        data: { dataId: data.id, risk, threshold: this.config.quality.riskThreshold }
      });
    }
  }
  
  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const total = this.metrics.processed + this.metrics.failed;
    this.metrics.errorRate = total > 0 ? (this.metrics.failed / total) * 100 : 0;
    
    // Calculate throughput (simplified)
    this.metrics.throughputPerSecond = this.metrics.processed / 
      ((Date.now() - new Date(this.metrics.lastProcessedAt).getTime()) / 1000);
    
    // Update memory usage
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
    
    this.metrics.lastProcessedAt = new Date().toISOString();
  }
  
  /**
   * Check alert thresholds
   */
  private checkAlertThresholds(): void {
    const thresholds = this.config.monitoring.alertThresholds;
    
    if (this.metrics.avgProcessingTime > thresholds.processingLatency) {
      this.emit('performance_alert', {
        type: 'high_latency',
        timestamp: new Date().toISOString(),
        data: { 
          current: this.metrics.avgProcessingTime, 
          threshold: thresholds.processingLatency 
        }
      });
    }
    
    if (this.metrics.errorRate > thresholds.errorRate) {
      this.emit('performance_alert', {
        type: 'high_error_rate',
        timestamp: new Date().toISOString(),
        data: { 
          current: this.metrics.errorRate, 
          threshold: thresholds.errorRate 
        }
      });
    }
    
    if (this.metrics.memoryUsage > thresholds.memoryUsage) {
      this.emit('performance_alert', {
        type: 'high_memory_usage',
        timestamp: new Date().toISOString(),
        data: { 
          current: this.metrics.memoryUsage, 
          threshold: thresholds.memoryUsage 
        }
      });
    }
    
    if (this.metrics.queueDepth > thresholds.queueDepth) {
      this.emit('performance_alert', {
        type: 'high_queue_depth',
        timestamp: new Date().toISOString(),
        data: { 
          current: this.metrics.queueDepth, 
          threshold: thresholds.queueDepth 
        }
      });
    }
  }
  
  /**
   * Get current pipeline metrics
   */
  public getMetrics(): ProcessingMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Get pipeline status
   */
  public getStatus(): {
    isRunning: boolean;
    workerCount: number;
    queueDepth: number;
    metrics: ProcessingMetrics;
  } {
    return {
      isRunning: this.isRunning,
      workerCount: this.workers.length,
      queueDepth: this.inputQueue.length,
      metrics: this.getMetrics()
    };
  }
}

/**
 * Create default pipeline configuration
 */
export function createDefaultPipelineConfig(): PipelineConfig {
  return {
    stream: {
      inputBufferSize: 10000,
      outputBufferSize: 5000,
      batchSize: 100,
      flushInterval: 1000,
      maxConcurrent: 50,
      retryAttempts: 3,
      retryDelay: 1000
    },
    workers: {
      count: Math.max(2, Math.floor(require('os').cpus().length / 2)),
      maxMemoryMB: 512,
      timeoutMs: 30000,
      restartOnError: true
    },
    quality: {
      enableValidation: true,
      sampleRate: 10,
      qualityThreshold: 85,
      riskThreshold: 30,
      auditSampleRate: 5
    },
    monitoring: {
      enableMetrics: true,
      metricsInterval: 10000,
      alertThresholds: {
        processingLatency: 5000,
        errorRate: 5,
        memoryUsage: 400,
        queueDepth: 5000
      }
    },
    errorHandling: {
      maxRetries: 3,
      deadLetterQueue: true,
      quarantineFailures: true,
      notificationWebhook: process.env.PIPELINE_ALERT_WEBHOOK
    }
  };
}