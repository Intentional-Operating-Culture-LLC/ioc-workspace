// Real-time and Batch Processing Pipeline
// Stream and batch processing for Meta BI system

import { EventEmitter } from 'events';
import { 
  AnonymizedAssessment, 
  AnonymizedAssessmentResponse, 
  AnonymizedQuestionResponse, 
  AnonymizedAssessmentScore,
  ProcessingJob,
  MetaBIConfig
} from './types';
import { DataAnonymizer, AnonymizationPipeline } from './anonymization';
import { AnalyticsDatabase } from './analytics-db';

export interface StreamProcessorConfig {
  batchSize: number;
  maxWaitTimeMs: number;
  maxRetries: number;
  errorThreshold: number;
  checkpointInterval: number;
  watermarkDelayMs: number;
  parallelism: number;
}

export interface BatchProcessorConfig {
  chunkSize: number;
  maxConcurrency: number;
  retryConfig: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  };
  timeoutMs: number;
}

export class StreamProcessor extends EventEmitter {
  private config: StreamProcessorConfig;
  private anonymizationPipeline: AnonymizationPipeline;
  private analyticsDB: AnalyticsDatabase;
  private running: boolean = false;
  private processingQueue: any[] = [];
  private lastCheckpoint: Date = new Date();
  private processingStats: ProcessingStats = {
    recordsProcessed: 0,
    recordsErrored: 0,
    averageLatency: 0,
    lastProcessedTime: new Date(),
    throughputPerSecond: 0
  };
  
  constructor(
    config: StreamProcessorConfig,
    anonymizationPipeline: AnonymizationPipeline,
    analyticsDB: AnalyticsDatabase
  ) {
    super();
    this.config = config;
    this.anonymizationPipeline = anonymizationPipeline;
    this.analyticsDB = analyticsDB;
  }
  
  /**
   * Start stream processing
   */
  public async start(): Promise<void> {
    if (this.running) {
      throw new Error('Stream processor is already running');
    }
    
    this.running = true;
    this.emit('started');
    
    // Start processing loop
    this.processLoop();
    
    // Start checkpoint timer
    this.startCheckpointTimer();
    
    // Start metrics collection
    this.startMetricsCollection();
  }
  
  /**
   * Stop stream processing
   */
  public async stop(): Promise<void> {
    this.running = false;
    
    // Process remaining items in queue
    await this.processQueue();
    
    this.emit('stopped');
  }
  
  /**
   * Add record to processing queue
   */
  public addRecord(record: any): void {
    if (!this.running) {
      throw new Error('Stream processor is not running');
    }
    
    record.timestamp = new Date();
    this.processingQueue.push(record);
    
    // Process batch if queue is full
    if (this.processingQueue.length >= this.config.batchSize) {
      this.processBatch();
    }
  }
  
  /**
   * Add multiple records to processing queue
   */
  public addRecords(records: any[]): void {
    for (const record of records) {
      this.addRecord(record);
    }
  }
  
  /**
   * Main processing loop
   */
  private async processLoop(): Promise<void> {
    while (this.running) {
      try {
        // Check if we have waiting records and max wait time has elapsed
        if (this.processingQueue.length > 0) {
          const oldestRecord = this.processingQueue[0];
          const waitTime = Date.now() - oldestRecord.timestamp.getTime();
          
          if (waitTime >= this.config.maxWaitTimeMs) {
            await this.processBatch();
          }
        }
        
        // Small delay to prevent busy waiting
        await this.sleep(100);
        
      } catch (error) {
        this.emit('error', error);
        await this.sleep(1000); // Back off on error
      }
    }
  }
  
  /**
   * Process a batch of records
   */
  private async processBatch(): Promise<void> {
    if (this.processingQueue.length === 0) {
      return;
    }
    
    const batch = this.processingQueue.splice(0, this.config.batchSize);
    const startTime = Date.now();
    
    try {
      // Group records by type for efficient processing
      const groupedRecords = this.groupRecordsByType(batch);
      
      // Process each group
      const results = await Promise.all([
        this.processAssessments(groupedRecords.assessments || []),
        this.processAssessmentResponses(groupedRecords.responses || []),
        this.processQuestionResponses(groupedRecords.questionResponses || []),
        this.processAssessmentScores(groupedRecords.scores || [])
      ]);
      
      // Flatten results
      const allAnonymizedData = results.flat();
      
      // Store in analytics database
      await this.storeAnonymizedData(allAnonymizedData);
      
      // Update statistics
      this.updateProcessingStats(batch.length, Date.now() - startTime, 0);
      
      // Emit progress event
      this.emit('batchProcessed', {
        recordsProcessed: batch.length,
        processingTimeMs: Date.now() - startTime,
        totalProcessed: this.processingStats.recordsProcessed
      });
      
    } catch (error) {
      // Update error statistics
      this.updateProcessingStats(0, Date.now() - startTime, batch.length);
      
      // Handle error
      await this.handleProcessingError(batch, error);
    }
  }
  
  /**
   * Process queue immediately
   */
  private async processQueue(): Promise<void> {
    while (this.processingQueue.length > 0) {
      await this.processBatch();
    }
  }
  
  /**
   * Group records by type
   */
  private groupRecordsByType(records: any[]): {
    assessments?: any[];
    responses?: any[];
    questionResponses?: any[];
    scores?: any[];
  } {
    const grouped: any = {
      assessments: [],
      responses: [],
      questionResponses: [],
      scores: []
    };
    
    for (const record of records) {
      if (record.title && record.type && record.organization_id) {
        grouped.assessments.push(record);
      } else if (record.assessment_id && record.respondent_id) {
        grouped.responses.push(record);
      } else if (record.response_id && record.question_id) {
        grouped.questionResponses.push(record);
      } else if (record.dimension && record.score !== undefined) {
        grouped.scores.push(record);
      }
    }
    
    return grouped;
  }
  
  /**
   * Process assessment records
   */
  private async processAssessments(assessments: any[]): Promise<AnonymizedAssessment[]> {
    if (assessments.length === 0) return [];
    
    const results = await this.anonymizationPipeline.processBatch(assessments);
    return results.anonymizedData.filter(data => data.id);
  }
  
  /**
   * Process assessment response records
   */
  private async processAssessmentResponses(responses: any[]): Promise<AnonymizedAssessmentResponse[]> {
    if (responses.length === 0) return [];
    
    const results = await this.anonymizationPipeline.processBatch(responses);
    return results.anonymizedData.filter(data => data.assessment_hash);
  }
  
  /**
   * Process question response records
   */
  private async processQuestionResponses(questionResponses: any[]): Promise<AnonymizedQuestionResponse[]> {
    if (questionResponses.length === 0) return [];
    
    const results = await this.anonymizationPipeline.processBatch(questionResponses);
    return results.anonymizedData.filter(data => data.response_hash);
  }
  
  /**
   * Process assessment score records
   */
  private async processAssessmentScores(scores: any[]): Promise<AnonymizedAssessmentScore[]> {
    if (scores.length === 0) return [];
    
    const results = await this.anonymizationPipeline.processBatch(scores);
    return results.anonymizedData.filter(data => data.assessment_hash);
  }
  
  /**
   * Store anonymized data in analytics database
   */
  private async storeAnonymizedData(data: any[]): Promise<void> {
    if (data.length === 0) return;
    
    // Group data by type for batch insertion
    const batchData: any = {
      assessments: [],
      responses: [],
      questionResponses: [],
      scores: []
    };
    
    for (const record of data) {
      if (record.org_hash && record.type) {
        batchData.assessments.push(record);
      } else if (record.assessment_hash && record.respondent_hash) {
        batchData.responses.push(record);
      } else if (record.response_hash && record.question_hash) {
        batchData.questionResponses.push(record);
      } else if (record.assessment_hash && record.dimension) {
        batchData.scores.push(record);
      }
    }
    
    await this.analyticsDB.insertBatch(batchData);
  }
  
  /**
   * Handle processing errors
   */
  private async handleProcessingError(batch: any[], error: any): Promise<void> {
    // Log error
    console.error('Stream processing error:', error);
    
    // Emit error event
    this.emit('error', {
      error,
      batchSize: batch.length,
      timestamp: new Date()
    });
    
    // Check error threshold
    const errorRate = this.processingStats.recordsErrored / 
      (this.processingStats.recordsProcessed + this.processingStats.recordsErrored);
    
    if (errorRate > this.config.errorThreshold) {
      this.emit('criticalError', {
        errorRate,
        threshold: this.config.errorThreshold,
        message: 'Error rate exceeded threshold'
      });
    }
  }
  
  /**
   * Update processing statistics
   */
  private updateProcessingStats(processed: number, latency: number, errored: number): void {
    this.processingStats.recordsProcessed += processed;
    this.processingStats.recordsErrored += errored;
    this.processingStats.lastProcessedTime = new Date();
    
    // Update average latency (exponential moving average)
    if (this.processingStats.averageLatency === 0) {
      this.processingStats.averageLatency = latency;
    } else {
      this.processingStats.averageLatency = 
        (this.processingStats.averageLatency * 0.9) + (latency * 0.1);
    }
    
    // Calculate throughput
    const now = Date.now();
    const timeDiff = now - (this.lastCheckpoint?.getTime() || now);
    if (timeDiff > 0) {
      this.processingStats.throughputPerSecond = 
        (processed * 1000) / timeDiff;
    }
  }
  
  /**
   * Start checkpoint timer
   */
  private startCheckpointTimer(): void {
    setInterval(() => {
      if (this.running) {
        this.createCheckpoint();
      }
    }, this.config.checkpointInterval);
  }
  
  /**
   * Create processing checkpoint
   */
  private createCheckpoint(): void {
    this.lastCheckpoint = new Date();
    
    this.emit('checkpoint', {
      timestamp: this.lastCheckpoint,
      stats: { ...this.processingStats },
      queueSize: this.processingQueue.length
    });
  }
  
  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      if (this.running) {
        this.emit('metrics', {
          timestamp: new Date(),
          stats: { ...this.processingStats },
          queueSize: this.processingQueue.length,
          memoryUsage: process.memoryUsage()
        });
      }
    }, 10000); // Every 10 seconds
  }
  
  /**
   * Get processing statistics
   */
  public getStats(): ProcessingStats {
    return { ...this.processingStats };
  }
  
  /**
   * Get queue size
   */
  public getQueueSize(): number {
    return this.processingQueue.length;
  }
  
  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class BatchProcessor extends EventEmitter {
  private config: BatchProcessorConfig;
  private anonymizationPipeline: AnonymizationPipeline;
  private analyticsDB: AnalyticsDatabase;
  private activeJobs: Map<string, ProcessingJob> = new Map();
  
  constructor(
    config: BatchProcessorConfig,
    anonymizationPipeline: AnonymizationPipeline,
    analyticsDB: AnalyticsDatabase
  ) {
    super();
    this.config = config;
    this.anonymizationPipeline = anonymizationPipeline;
    this.analyticsDB = analyticsDB;
  }
  
  /**
   * Process large dataset in batches
   */
  public async processDataset(
    data: any[],
    jobType: 'anonymization' | 'aggregation' | 'ml_training' | 'export',
    options: {
      jobId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    
    const jobId = options.jobId || this.generateJobId();
    
    // Create processing job record
    const job: ProcessingJob = {
      id: jobId,
      type: jobType,
      status: 'pending',
      created_at: new Date().toISOString(),
      records_processed: 0,
      records_total: data.length,
      progress_percentage: 0,
      metadata: options.metadata || {}
    };
    
    // Store job in database
    await this.analyticsDB.createProcessingJob(job);
    this.activeJobs.set(jobId, job);
    
    try {
      // Update job status to running
      job.status = 'running';
      job.started_at = new Date().toISOString();
      await this.analyticsDB.updateProcessingJob(jobId, {
        status: job.status,
        started_at: job.started_at
      });
      
      // Process data in chunks
      const chunks = this.chunkArray(data, this.config.chunkSize);
      const semaphore = new Semaphore(this.config.maxConcurrency);
      
      let processedCount = 0;
      const results: any[] = [];
      
      const chunkPromises = chunks.map(async (chunk, index) => {
        return semaphore.acquire(async () => {
          try {
            const chunkResults = await this.processChunk(chunk, jobType, index);
            results.push(...chunkResults);
            
            // Update progress
            processedCount += chunk.length;
            job.records_processed = processedCount;
            job.progress_percentage = Math.round((processedCount / data.length) * 100);
            
            await this.analyticsDB.updateProcessingJob(jobId, {
              records_processed: job.records_processed,
              progress_percentage: job.progress_percentage
            });
            
            // Emit progress event
            this.emit('progress', {
              jobId,
              processed: processedCount,
              total: data.length,
              percentage: job.progress_percentage,
              chunkIndex: index,
              totalChunks: chunks.length
            });
            
            return chunkResults;
            
          } catch (error) {
            // Handle chunk error
            this.emit('chunkError', {
              jobId,
              chunkIndex: index,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            // Retry chunk if configured
            if (this.config.retryConfig.maxRetries > 0) {
              return this.retryChunk(chunk, jobType, index, 1);
            }
            
            throw error;
          }
        });
      });
      
      // Wait for all chunks to complete
      await Promise.all(chunkPromises);
      
      // Update job status to completed
      job.status = 'completed';
      job.completed_at = new Date().toISOString();
      job.records_processed = data.length;
      job.progress_percentage = 100;
      
      await this.analyticsDB.updateProcessingJob(jobId, {
        status: job.status,
        completed_at: job.completed_at,
        records_processed: job.records_processed,
        progress_percentage: job.progress_percentage
      });
      
      // Emit completion event
      this.emit('completed', {
        jobId,
        totalRecords: data.length,
        processingTime: Date.now() - new Date(job.started_at!).getTime(),
        results: results.length
      });
      
      // Clean up
      this.activeJobs.delete(jobId);
      
      return jobId;
      
    } catch (error) {
      // Update job status to failed
      job.status = 'failed';
      job.completed_at = new Date().toISOString();
      job.error_message = error instanceof Error ? error.message : 'Unknown error';
      
      await this.analyticsDB.updateProcessingJob(jobId, {
        status: job.status,
        completed_at: job.completed_at,
        error_message: job.error_message
      });
      
      // Emit error event
      this.emit('failed', {
        jobId,
        error: job.error_message,
        processedRecords: job.records_processed,
        totalRecords: job.records_total
      });
      
      // Clean up
      this.activeJobs.delete(jobId);
      
      throw error;
    }
  }
  
  /**
   * Process a single chunk of data
   */
  private async processChunk(
    chunk: any[],
    jobType: string,
    chunkIndex: number
  ): Promise<any[]> {
    
    switch (jobType) {
      case 'anonymization':
        const anonymizationResults = await this.anonymizationPipeline.processBatch(chunk);
        
        // Store anonymized data
        if (anonymizationResults.anonymizedData.length > 0) {
          await this.storeAnonymizedChunk(anonymizationResults.anonymizedData);
        }
        
        return anonymizationResults.anonymizedData;
        
      case 'aggregation':
        return this.processAggregationChunk(chunk);
        
      case 'ml_training':
        return this.processMLTrainingChunk(chunk);
        
      case 'export':
        return this.processExportChunk(chunk);
        
      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
  }
  
  /**
   * Retry chunk processing
   */
  private async retryChunk(
    chunk: any[],
    jobType: string,
    chunkIndex: number,
    attemptNumber: number
  ): Promise<any[]> {
    
    if (attemptNumber > this.config.retryConfig.maxRetries) {
      throw new Error(`Max retries exceeded for chunk ${chunkIndex}`);
    }
    
    // Calculate delay
    const delay = Math.min(
      this.config.retryConfig.initialDelayMs * 
      Math.pow(this.config.retryConfig.backoffMultiplier, attemptNumber - 1),
      this.config.retryConfig.maxDelayMs
    );
    
    // Wait before retry
    await this.sleep(delay);
    
    try {
      return await this.processChunk(chunk, jobType, chunkIndex);
    } catch (error) {
      // Emit retry event
      this.emit('retry', {
        chunkIndex,
        attemptNumber,
        maxRetries: this.config.retryConfig.maxRetries,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return this.retryChunk(chunk, jobType, chunkIndex, attemptNumber + 1);
    }
  }
  
  /**
   * Store anonymized chunk
   */
  private async storeAnonymizedChunk(data: any[]): Promise<void> {
    // Group data by type
    const batchData: any = {
      assessments: [],
      responses: [],
      questionResponses: [],
      scores: []
    };
    
    for (const record of data) {
      if (record.org_hash && record.type) {
        batchData.assessments.push(record);
      } else if (record.assessment_hash && record.respondent_hash) {
        batchData.responses.push(record);
      } else if (record.response_hash && record.question_hash) {
        batchData.questionResponses.push(record);
      } else if (record.assessment_hash && record.dimension) {
        batchData.scores.push(record);
      }
    }
    
    await this.analyticsDB.insertBatch(batchData);
  }
  
  /**
   * Process aggregation chunk
   */
  private async processAggregationChunk(chunk: any[]): Promise<any[]> {
    // Implement aggregation logic
    // This would calculate various metrics and aggregations
    return chunk.map(record => ({
      ...record,
      processed: true,
      aggregatedAt: new Date().toISOString()
    }));
  }
  
  /**
   * Process ML training chunk
   */
  private async processMLTrainingChunk(chunk: any[]): Promise<any[]> {
    // Implement ML training data preparation
    // This would prepare features and labels for model training
    return chunk.map(record => ({
      features: this.extractFeatures(record),
      labels: this.extractLabels(record),
      processedAt: new Date().toISOString()
    }));
  }
  
  /**
   * Process export chunk
   */
  private async processExportChunk(chunk: any[]): Promise<any[]> {
    // Implement export formatting
    // This would format data for export in various formats
    return chunk.map(record => ({
      ...record,
      exportedAt: new Date().toISOString()
    }));
  }
  
  /**
   * Extract features for ML training
   */
  private extractFeatures(record: any): any {
    // Implement feature extraction logic
    return {
      assessmentType: record.type,
      organizationSize: record.org_size_category,
      industry: record.industry_category,
      completionTime: record.time_spent_seconds,
      deviceType: record.device_type,
      // Add more features as needed
    };
  }
  
  /**
   * Extract labels for ML training
   */
  private extractLabels(record: any): any {
    // Implement label extraction logic
    return {
      completionRate: record.completion_percentage,
      score: record.score,
      // Add more labels as needed
    };
  }
  
  /**
   * Get active jobs
   */
  public getActiveJobs(): ProcessingJob[] {
    return Array.from(this.activeJobs.values());
  }
  
  /**
   * Cancel job
   */
  public async cancelJob(jobId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    job.status = 'cancelled';
    job.completed_at = new Date().toISOString();
    
    await this.analyticsDB.updateProcessingJob(jobId, {
      status: job.status,
      completed_at: job.completed_at
    });
    
    this.activeJobs.delete(jobId);
    
    this.emit('cancelled', { jobId });
  }
  
  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
  
  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Semaphore for controlling concurrency
 */
class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];
  
  constructor(permits: number) {
    this.permits = permits;
  }
  
  async acquire<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          const result = await fn();
          this.release();
          resolve(result);
        } catch (error) {
          this.release();
          reject(error);
        }
      };
      
      if (this.permits > 0) {
        this.permits--;
        task();
      } else {
        this.queue.push(task);
      }
    });
  }
  
  private release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.permits++;
    }
  }
}

export interface ProcessingStats {
  recordsProcessed: number;
  recordsErrored: number;
  averageLatency: number;
  lastProcessedTime: Date;
  throughputPerSecond: number;
}

/**
 * Processing pipeline coordinator
 */
export class ProcessingPipelineCoordinator {
  private streamProcessor: StreamProcessor;
  private batchProcessor: BatchProcessor;
  private metaBIConfig: MetaBIConfig;
  
  constructor(
    streamProcessor: StreamProcessor,
    batchProcessor: BatchProcessor,
    metaBIConfig: MetaBIConfig
  ) {
    this.streamProcessor = streamProcessor;
    this.batchProcessor = batchProcessor;
    this.metaBIConfig = metaBIConfig;
  }
  
  /**
   * Start all processing pipelines
   */
  public async start(): Promise<void> {
    await this.streamProcessor.start();
    
    // Set up pipeline coordination events
    this.setupEventHandlers();
  }
  
  /**
   * Stop all processing pipelines
   */
  public async stop(): Promise<void> {
    await this.streamProcessor.stop();
  }
  
  /**
   * Process real-time data
   */
  public processRealTimeData(data: any): void {
    this.streamProcessor.addRecord(data);
  }
  
  /**
   * Process batch data
   */
  public async processBatchData(
    data: any[],
    jobType: 'anonymization' | 'aggregation' | 'ml_training' | 'export'
  ): Promise<string> {
    return this.batchProcessor.processDataset(data, jobType);
  }
  
  /**
   * Get overall processing statistics
   */
  public getProcessingStatistics(): {
    stream: ProcessingStats;
    batch: ProcessingJob[];
    overall: {
      totalRecordsProcessed: number;
      activeJobs: number;
      queueSize: number;
    };
  } {
    const streamStats = this.streamProcessor.getStats();
    const activeJobs = this.batchProcessor.getActiveJobs();
    
    return {
      stream: streamStats,
      batch: activeJobs,
      overall: {
        totalRecordsProcessed: streamStats.recordsProcessed + 
          activeJobs.reduce((sum, job) => sum + job.records_processed, 0),
        activeJobs: activeJobs.length,
        queueSize: this.streamProcessor.getQueueSize()
      }
    };
  }
  
  /**
   * Set up event handlers for pipeline coordination
   */
  private setupEventHandlers(): void {
    // Handle stream processor events
    this.streamProcessor.on('error', (error) => {
      console.error('Stream processor error:', error);
    });
    
    this.streamProcessor.on('criticalError', (error) => {
      console.error('Stream processor critical error:', error);
      // Could trigger failover or scaling
    });
    
    // Handle batch processor events
    this.batchProcessor.on('failed', (event) => {
      console.error('Batch processor job failed:', event);
    });
    
    this.batchProcessor.on('completed', (event) => {
      console.log('Batch processor job completed:', event);
    });
  }
}

/**
 * Create default stream processor configuration
 */
export function createDefaultStreamConfig(): StreamProcessorConfig {
  return {
    batchSize: 100,
    maxWaitTimeMs: 5000,
    maxRetries: 3,
    errorThreshold: 0.05,
    checkpointInterval: 30000,
    watermarkDelayMs: 1000,
    parallelism: 4
  };
}

/**
 * Create default batch processor configuration
 */
export function createDefaultBatchConfig(): BatchProcessorConfig {
  return {
    chunkSize: 1000,
    maxConcurrency: 4,
    retryConfig: {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2
    },
    timeoutMs: 300000 // 5 minutes
  };
}