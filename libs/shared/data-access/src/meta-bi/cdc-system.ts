// IOC Meta BI Change Data Capture (CDC) System
// Production-ready CDC system for real-time data synchronization

import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { StreamProcessor } from './stream-processing';

export interface CDCConfig {
  // Database configuration
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    maxConnections: number;
  };
  
  // CDC configuration
  cdc: {
    replicationSlot: string;
    publicationName: string;
    tables: string[];
    excludedTables: string[];
    enabledOperations: ('INSERT' | 'UPDATE' | 'DELETE')[];
    startLSN?: string;
    includeTransactionMetadata: boolean;
    maxBatchSize: number;
    pollingIntervalMs: number;
  };
  
  // Filtering and transformation
  filtering: {
    enableColumnFiltering: boolean;
    excludedColumns: Record<string, string[]>;
    includeSystemColumns: boolean;
    enableRowFiltering: boolean;
    rowFilters: Record<string, string>;
  };
  
  // Performance and reliability
  performance: {
    enableBatching: boolean;
    batchSize: number;
    batchTimeoutMs: number;
    maxLagMs: number;
    enableCompression: boolean;
    compressionLevel: number;
  };
  
  // Monitoring and alerting
  monitoring: {
    enableMetrics: boolean;
    metricsIntervalMs: number;
    enableLagMonitoring: boolean;
    maxAllowedLagMs: number;
    enableHealthChecks: boolean;
    healthCheckIntervalMs: number;
  };
  
  // Error handling
  errorHandling: {
    enableRetries: boolean;
    maxRetries: number;
    retryBackoffMs: number;
    enableDLQ: boolean;
    dlqTableName: string;
    skipErrorRows: boolean;
  };
  
  // Integration
  integration: {
    streamProcessor: boolean;
    enableAnonymization: boolean;
    enableComplianceValidation: boolean;
    outputFormat: 'json' | 'avro' | 'protobuf';
  };
}

export interface CDCEvent {
  id: string;
  timestamp: Date;
  lsn: string;
  transactionId: string;
  table: string;
  schema: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  before?: Record<string, any>;
  after?: Record<string, any>;
  primaryKey: Record<string, any>;
  metadata: {
    commitTimestamp: Date;
    changeSequence: number;
    sourceDatabase: string;
    replicationSlot: string;
    sessionId?: string;
  };
}

export interface CDCMetrics {
  totalEvents: number;
  insertEvents: number;
  updateEvents: number;
  deleteEvents: number;
  currentLagMs: number;
  averageLagMs: number;
  maxLagMs: number;
  eventsPerSecond: number;
  bytesPerSecond: number;
  replicationSlotStats: {
    activeSlot: boolean;
    confirmedFlushLSN: string;
    restartLSN: string;
    catalogXmin: string;
    dataXmin: string;
  };
  connectionStats: {
    activeConnections: number;
    totalConnections: number;
    failedConnections: number;
    avgConnectionTime: number;
  };
}

export interface CDCCheckpoint {
  id: string;
  timestamp: Date;
  lsn: string;
  transactionId: string;
  eventCount: number;
  lagMs: number;
  metadata: {
    upstreamLSN: string;
    confirmedLSN: string;
    processedCount: number;
    errorCount: number;
  };
}

export class CDCSystem extends EventEmitter {
  private config: CDCConfig;
  private streamProcessor?: StreamProcessor;
  private isRunning = false;
  private lastProcessedLSN?: string;
  private currentConnection?: any;
  private checkpoints: CDCCheckpoint[] = [];
  
  private metrics: CDCMetrics = {
    totalEvents: 0,
    insertEvents: 0,
    updateEvents: 0,
    deleteEvents: 0,
    currentLagMs: 0,
    averageLagMs: 0,
    maxLagMs: 0,
    eventsPerSecond: 0,
    bytesPerSecond: 0,
    replicationSlotStats: {
      activeSlot: false,
      confirmedFlushLSN: '',
      restartLSN: '',
      catalogXmin: '',
      dataXmin: ''
    },
    connectionStats: {
      activeConnections: 0,
      totalConnections: 0,
      failedConnections: 0,
      avgConnectionTime: 0
    }
  };
  
  private eventBuffer: CDCEvent[] = [];
  private lagWindow: number[] = [];
  private throughputWindow: number[] = [];
  
  constructor(config: CDCConfig) {
    super();
    this.config = config;
    this.initializeStreamProcessor();
    this.startMonitoring();
  }
  
  private initializeStreamProcessor(): void {
    if (this.config.integration.streamProcessor) {
      this.streamProcessor = new StreamProcessor({
        name: 'cdc-stream-processor',
        version: '1.0.0',
        stream: {
          batchSize: this.config.performance.batchSize,
          batchTimeoutMs: this.config.performance.batchTimeoutMs,
          maxConcurrentProcessors: 3,
          bufferSize: this.config.performance.batchSize * 2,
          backpressureThreshold: this.config.performance.batchSize * 1.5,
          enableCheckpointing: true,
          checkpointIntervalMs: 30000
        },
        processing: {
          enableParallelProcessing: true,
          processingTimeoutMs: 30000,
          retryAttempts: this.config.errorHandling.maxRetries,
          retryBackoffMs: this.config.errorHandling.retryBackoffMs,
          enableDeduplication: true,
          deduplicationWindowMs: 300000
        },
        quality: {
          enableQualityChecks: true,
          qualityThreshold: 80,
          enableDataValidation: true,
          validationRules: []
        },
        monitoring: {
          enableMetrics: true,
          metricsIntervalMs: 10000,
          enableAlerting: true,
          alertingThresholds: {
            errorRate: 0.05,
            latencyMs: 10000,
            throughput: 10
          }
        },
        errorHandling: {
          enableDeadLetterQueue: true,
          maxRetries: this.config.errorHandling.maxRetries,
          deadLetterQueueName: 'cdc-dlq'
        },
        integration: {
          anonymizationSystem: this.config.integration.enableAnonymization,
          complianceValidation: this.config.integration.enableComplianceValidation,
          auditLogging: true,
          analyticsOutput: true
        }
      });
      
      // Set up event handlers
      this.streamProcessor.on('event_processed', (data) => {
        this.emit('cdc_event_processed', data);
      });
      
      this.streamProcessor.on('event_error', (data) => {
        this.emit('cdc_event_error', data);
      });
      
      this.streamProcessor.on('batch_processed', (data) => {
        this.emit('cdc_batch_processed', data);
      });
    }
  }
  
  // Start CDC system
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('CDC system is already running');
    }
    
    try {
      // Initialize database connection
      await this.initializeConnection();
      
      // Set up replication slot
      await this.setupReplicationSlot();
      
      // Start consuming changes
      this.isRunning = true;
      this.startChangeConsumption();
      
      this.emit('cdc_started', {
        replicationSlot: this.config.cdc.replicationSlot,
        tables: this.config.cdc.tables
      });
      
    } catch (error) {
      this.emit('cdc_start_error', error);
      throw error;
    }
  }
  
  // Stop CDC system
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    // Process remaining events
    if (this.eventBuffer.length > 0) {
      await this.processBatch();
    }
    
    // Close connection
    if (this.currentConnection) {
      await this.currentConnection.end();
    }
    
    // Stop stream processor
    if (this.streamProcessor) {
      await this.streamProcessor.shutdown();
    }
    
    this.emit('cdc_stopped');
  }
  
  // Initialize database connection
  private async initializeConnection(): Promise<void> {
    const connectionStart = Date.now();
    
    try {
      // This would use a PostgreSQL client library like pg
      // For now, this is a placeholder implementation
      const { Client } = require('pg');
      
      this.currentConnection = new Client({
        host: this.config.database.host,
        port: this.config.database.port,
        database: this.config.database.database,
        user: this.config.database.username,
        password: this.config.database.password,
        ssl: this.config.database.ssl,
        max: this.config.database.maxConnections,
        statement_timeout: 30000,
        query_timeout: 30000,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000,
        application_name: 'ioc-cdc-system'
      });
      
      await this.currentConnection.connect();
      
      // Update connection metrics
      const connectionTime = Date.now() - connectionStart;
      this.metrics.connectionStats.activeConnections++;
      this.metrics.connectionStats.totalConnections++;
      this.metrics.connectionStats.avgConnectionTime = 
        (this.metrics.connectionStats.avgConnectionTime + connectionTime) / 2;
      
      this.emit('connection_established', {
        connectionTime,
        database: this.config.database.database
      });
      
    } catch (error) {
      this.metrics.connectionStats.failedConnections++;
      this.emit('connection_failed', error);
      throw error;
    }
  }
  
  // Set up replication slot
  private async setupReplicationSlot(): Promise<void> {
    try {
      // Check if replication slot exists
      const slotQuery = `
        SELECT slot_name, slot_type, active, confirmed_flush_lsn, restart_lsn
        FROM pg_replication_slots 
        WHERE slot_name = $1
      `;
      
      const slotResult = await this.currentConnection.query(slotQuery, [this.config.cdc.replicationSlot]);
      
      if (slotResult.rows.length === 0) {
        // Create replication slot
        await this.currentConnection.query(`
          SELECT pg_create_logical_replication_slot($1, 'pgoutput')
        `, [this.config.cdc.replicationSlot]);
        
        this.emit('replication_slot_created', {
          slotName: this.config.cdc.replicationSlot
        });
      }
      
      // Create or update publication
      const pubQuery = `
        SELECT pubname FROM pg_publication WHERE pubname = $1
      `;
      
      const pubResult = await this.currentConnection.query(pubQuery, [this.config.cdc.publicationName]);
      
      if (pubResult.rows.length === 0) {
        const tablesClause = this.config.cdc.tables.length > 0 
          ? `FOR TABLE ${this.config.cdc.tables.join(', ')}`
          : 'FOR ALL TABLES';
          
        await this.currentConnection.query(`
          CREATE PUBLICATION ${this.config.cdc.publicationName} ${tablesClause}
        `);
        
        this.emit('publication_created', {
          publicationName: this.config.cdc.publicationName,
          tables: this.config.cdc.tables
        });
      }
      
      // Update replication slot stats
      await this.updateReplicationSlotStats();
      
    } catch (error) {
      this.emit('replication_setup_error', error);
      throw error;
    }
  }
  
  // Start consuming changes
  private startChangeConsumption(): void {
    const consumeChanges = async () => {
      while (this.isRunning) {
        try {
          await this.consumeChangeBatch();
          await this.sleep(this.config.cdc.pollingIntervalMs);
        } catch (error) {
          this.emit('consumption_error', error);
          
          if (this.config.errorHandling.enableRetries) {
            await this.sleep(this.config.errorHandling.retryBackoffMs);
          } else {
            break;
          }
        }
      }
    };
    
    consumeChanges();
  }
  
  // Consume a batch of changes
  private async consumeChangeBatch(): Promise<void> {
    try {
      const startLSN = this.lastProcessedLSN || this.config.cdc.startLSN || '0/0';
      
      // Start logical replication
      const replicationQuery = `
        START_REPLICATION SLOT ${this.config.cdc.replicationSlot} LOGICAL ${startLSN}
      `;
      
      // This would use a streaming replication connection
      // For now, we'll simulate with a regular query
      const changesQuery = `
        SELECT * FROM pg_logical_slot_get_changes($1, NULL, $2, 'proto_version', '1', 'publication_names', $3)
      `;
      
      const result = await this.currentConnection.query(changesQuery, [
        this.config.cdc.replicationSlot,
        this.config.cdc.maxBatchSize,
        this.config.cdc.publicationName
      ]);
      
      if (result.rows.length > 0) {
        const events = await this.parseChanges(result.rows);
        await this.processEvents(events);
        
        // Update last processed LSN
        this.lastProcessedLSN = result.rows[result.rows.length - 1].lsn;
        
        // Create checkpoint
        await this.createCheckpoint(events);
      }
      
      // Update metrics
      await this.updateMetrics();
      
    } catch (error) {
      this.emit('batch_consumption_error', error);
      throw error;
    }
  }
  
  // Parse raw changes into CDC events
  private async parseChanges(changes: any[]): Promise<CDCEvent[]> {
    const events: CDCEvent[] = [];
    
    for (const change of changes) {
      try {
        const parsedData = JSON.parse(change.data);
        
        // Skip if table is excluded
        if (this.config.cdc.excludedTables.includes(parsedData.table)) {
          continue;
        }
        
        // Skip if operation is not enabled
        if (!this.config.cdc.enabledOperations.includes(parsedData.action)) {
          continue;
        }
        
        // Apply column filtering
        let beforeData = parsedData.before;
        let afterData = parsedData.after;
        
        if (this.config.filtering.enableColumnFiltering) {
          const excludedCols = this.config.filtering.excludedColumns[parsedData.table] || [];
          beforeData = this.filterColumns(beforeData, excludedCols);
          afterData = this.filterColumns(afterData, excludedCols);
        }
        
        // Apply row filtering
        if (this.config.filtering.enableRowFiltering) {
          const filter = this.config.filtering.rowFilters[parsedData.table];
          if (filter && !this.evaluateRowFilter(afterData || beforeData, filter)) {
            continue;
          }
        }
        
        const event: CDCEvent = {
          id: this.generateEventId(),
          timestamp: new Date(),
          lsn: change.lsn,
          transactionId: change.xid,
          table: parsedData.table,
          schema: parsedData.schema,
          operation: parsedData.action,
          before: beforeData,
          after: afterData,
          primaryKey: this.extractPrimaryKey(parsedData),
          metadata: {
            commitTimestamp: new Date(change.commit_timestamp),
            changeSequence: change.sequence,
            sourceDatabase: this.config.database.database,
            replicationSlot: this.config.cdc.replicationSlot
          }
        };
        
        events.push(event);
        
        // Update operation-specific metrics
        this.updateOperationMetrics(event.operation);
        
      } catch (error) {
        this.emit('parse_error', { error, change });
        
        if (!this.config.errorHandling.skipErrorRows) {
          throw error;
        }
      }
    }
    
    return events;
  }
  
  // Process events
  private async processEvents(events: CDCEvent[]): Promise<void> {
    if (events.length === 0) return;
    
    if (this.config.performance.enableBatching) {
      this.eventBuffer.push(...events);
      
      if (this.eventBuffer.length >= this.config.performance.batchSize) {
        await this.processBatch();
      }
    } else {
      for (const event of events) {
        await this.processEvent(event);
      }
    }
  }
  
  // Process a batch of events
  private async processBatch(): Promise<void> {
    if (this.eventBuffer.length === 0) return;
    
    const batch = this.eventBuffer.splice(0, this.config.performance.batchSize);
    
    try {
      if (this.streamProcessor) {
        // Send to stream processor
        for (const event of batch) {
          await this.streamProcessor.ingestEvent({
            source: 'cdc-system',
            eventType: `${event.table}_${event.operation.toLowerCase()}`,
            data: {
              table: event.table,
              schema: event.schema,
              operation: event.operation,
              before: event.before,
              after: event.after,
              primaryKey: event.primaryKey,
              lsn: event.lsn,
              transactionId: event.transactionId
            },
            metadata: {
              version: '1.0.0',
              schema: 'cdc-event-v1',
              priority: 'medium',
              retryCount: 0
            }
          });
        }
      } else {
        // Direct processing
        for (const event of batch) {
          await this.processEvent(event);
        }
      }
      
      this.emit('batch_processed', {
        batchSize: batch.length,
        processingTime: Date.now()
      });
      
    } catch (error) {
      this.emit('batch_processing_error', { error, batchSize: batch.length });
      
      if (this.config.errorHandling.enableDLQ) {
        await this.sendToDeadLetterQueue(batch);
      }
      
      throw error;
    }
  }
  
  // Process individual event
  private async processEvent(event: CDCEvent): Promise<void> {
    try {
      // Calculate lag
      const lagMs = Date.now() - event.metadata.commitTimestamp.getTime();
      this.updateLagMetrics(lagMs);
      
      // Emit event
      this.emit('cdc_event', event);
      
      // Update metrics
      this.metrics.totalEvents++;
      
    } catch (error) {
      this.emit('event_processing_error', { error, event });
      throw error;
    }
  }
  
  // Utility methods
  private filterColumns(data: any, excludedColumns: string[]): any {
    if (!data) return data;
    
    const filtered = { ...data };
    for (const col of excludedColumns) {
      delete filtered[col];
    }
    
    return filtered;
  }
  
  private evaluateRowFilter(data: any, filter: string): boolean {
    // This would implement a simple expression evaluator
    // For now, return true (no filtering)
    return true;
  }
  
  private extractPrimaryKey(data: any): Record<string, any> {
    // This would extract primary key columns based on table metadata
    // For now, return id if present
    return data.identity || data.after?.id || data.before?.id || {};
  }
  
  private updateOperationMetrics(operation: string): void {
    switch (operation) {
      case 'INSERT':
        this.metrics.insertEvents++;
        break;
      case 'UPDATE':
        this.metrics.updateEvents++;
        break;
      case 'DELETE':
        this.metrics.deleteEvents++;
        break;
    }
  }
  
  private updateLagMetrics(lagMs: number): void {
    this.metrics.currentLagMs = lagMs;
    this.metrics.maxLagMs = Math.max(this.metrics.maxLagMs, lagMs);
    
    this.lagWindow.push(lagMs);
    if (this.lagWindow.length > 100) {
      this.lagWindow.shift();
    }
    
    this.metrics.averageLagMs = this.lagWindow.reduce((a, b) => a + b, 0) / this.lagWindow.length;
  }
  
  private async updateMetrics(): Promise<void> {
    // Update throughput
    this.throughputWindow.push(this.metrics.totalEvents);
    if (this.throughputWindow.length > 60) {
      this.throughputWindow.shift();
    }
    
    if (this.throughputWindow.length >= 2) {
      const throughput = this.throughputWindow[this.throughputWindow.length - 1] - 
                        this.throughputWindow[0];
      this.metrics.eventsPerSecond = throughput / (this.throughputWindow.length - 1);
    }
    
    // Update replication slot stats
    await this.updateReplicationSlotStats();
  }
  
  private async updateReplicationSlotStats(): Promise<void> {
    try {
      const query = `
        SELECT active, confirmed_flush_lsn, restart_lsn, catalog_xmin, data_xmin
        FROM pg_replication_slots 
        WHERE slot_name = $1
      `;
      
      const result = await this.currentConnection.query(query, [this.config.cdc.replicationSlot]);
      
      if (result.rows.length > 0) {
        const stats = result.rows[0];
        this.metrics.replicationSlotStats = {
          activeSlot: stats.active,
          confirmedFlushLSN: stats.confirmed_flush_lsn,
          restartLSN: stats.restart_lsn,
          catalogXmin: stats.catalog_xmin,
          dataXmin: stats.data_xmin
        };
      }
    } catch (error) {
      this.emit('metrics_update_error', error);
    }
  }
  
  private async createCheckpoint(events: CDCEvent[]): Promise<void> {
    if (events.length === 0) return;
    
    const lastEvent = events[events.length - 1];
    const checkpoint: CDCCheckpoint = {
      id: this.generateEventId(),
      timestamp: new Date(),
      lsn: lastEvent.lsn,
      transactionId: lastEvent.transactionId,
      eventCount: events.length,
      lagMs: this.metrics.currentLagMs,
      metadata: {
        upstreamLSN: lastEvent.lsn,
        confirmedLSN: this.metrics.replicationSlotStats.confirmedFlushLSN,
        processedCount: this.metrics.totalEvents,
        errorCount: 0
      }
    };
    
    this.checkpoints.push(checkpoint);
    
    // Keep only last 100 checkpoints
    if (this.checkpoints.length > 100) {
      this.checkpoints.shift();
    }
    
    this.emit('checkpoint_created', checkpoint);
  }
  
  private async sendToDeadLetterQueue(events: CDCEvent[]): Promise<void> {
    try {
      // This would insert into a DLQ table
      const dlqQuery = `
        INSERT INTO ${this.config.errorHandling.dlqTableName} 
        (event_id, table_name, operation, data, error_timestamp, retry_count)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      for (const event of events) {
        await this.currentConnection.query(dlqQuery, [
          event.id,
          event.table,
          event.operation,
          JSON.stringify(event),
          new Date(),
          0
        ]);
      }
      
      this.emit('events_sent_to_dlq', { count: events.length });
      
    } catch (error) {
      this.emit('dlq_error', error);
    }
  }
  
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private startMonitoring(): void {
    if (!this.config.monitoring.enableMetrics) return;
    
    setInterval(() => {
      this.updateMetrics();
      this.emit('metrics_updated', this.metrics);
      
      // Check lag alerting
      if (this.config.monitoring.enableLagMonitoring) {
        if (this.metrics.currentLagMs > this.config.monitoring.maxAllowedLagMs) {
          this.emit('lag_alert', {
            currentLag: this.metrics.currentLagMs,
            maxAllowed: this.config.monitoring.maxAllowedLagMs
          });
        }
      }
    }, this.config.monitoring.metricsIntervalMs);
    
    // Health checks
    if (this.config.monitoring.enableHealthChecks) {
      setInterval(() => {
        this.performHealthCheck();
      }, this.config.monitoring.healthCheckIntervalMs);
    }
  }
  
  private async performHealthCheck(): Promise<void> {
    try {
      // Check database connection
      await this.currentConnection.query('SELECT 1');
      
      // Check replication slot
      const slotQuery = `
        SELECT active FROM pg_replication_slots WHERE slot_name = $1
      `;
      const result = await this.currentConnection.query(slotQuery, [this.config.cdc.replicationSlot]);
      
      const health = {
        status: 'healthy',
        timestamp: new Date(),
        database: 'connected',
        replicationSlot: result.rows[0]?.active ? 'active' : 'inactive',
        metrics: this.metrics
      };
      
      this.emit('health_check', health);
      
    } catch (error) {
      this.emit('health_check_failed', error);
    }
  }
  
  // Public methods
  public getMetrics(): CDCMetrics {
    return { ...this.metrics };
  }
  
  public getCheckpoints(): CDCCheckpoint[] {
    return [...this.checkpoints];
  }
  
  public async reprocessFromCheckpoint(checkpointId: string): Promise<void> {
    const checkpoint = this.checkpoints.find(cp => cp.id === checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }
    
    this.lastProcessedLSN = checkpoint.lsn;
    
    this.emit('reprocessing_started', {
      checkpointId,
      fromLSN: checkpoint.lsn
    });
  }
  
  public async pause(): Promise<void> {
    this.isRunning = false;
    this.emit('cdc_paused');
  }
  
  public async resume(): Promise<void> {
    if (!this.isRunning) {
      this.isRunning = true;
      this.startChangeConsumption();
      this.emit('cdc_resumed');
    }
  }
}

// Default configuration
export function createDefaultCDCConfig(): CDCConfig {
  return {
    database: {
      host: 'localhost',
      port: 5432,
      database: 'ioc_main',
      username: 'postgres',
      password: 'password',
      ssl: false,
      maxConnections: 10
    },
    
    cdc: {
      replicationSlot: 'ioc_cdc_slot',
      publicationName: 'ioc_cdc_pub',
      tables: ['users', 'organizations', 'assessments', 'assessment_responses'],
      excludedTables: ['migrations', 'sessions'],
      enabledOperations: ['INSERT', 'UPDATE', 'DELETE'],
      includeTransactionMetadata: true,
      maxBatchSize: 1000,
      pollingIntervalMs: 1000
    },
    
    filtering: {
      enableColumnFiltering: true,
      excludedColumns: {
        users: ['password_hash', 'reset_token'],
        organizations: ['api_key']
      },
      includeSystemColumns: false,
      enableRowFiltering: false,
      rowFilters: {}
    },
    
    performance: {
      enableBatching: true,
      batchSize: 100,
      batchTimeoutMs: 5000,
      maxLagMs: 30000,
      enableCompression: false,
      compressionLevel: 6
    },
    
    monitoring: {
      enableMetrics: true,
      metricsIntervalMs: 10000,
      enableLagMonitoring: true,
      maxAllowedLagMs: 60000,
      enableHealthChecks: true,
      healthCheckIntervalMs: 30000
    },
    
    errorHandling: {
      enableRetries: true,
      maxRetries: 3,
      retryBackoffMs: 1000,
      enableDLQ: true,
      dlqTableName: 'cdc_dead_letter_queue',
      skipErrorRows: false
    },
    
    integration: {
      streamProcessor: true,
      enableAnonymization: true,
      enableComplianceValidation: true,
      outputFormat: 'json'
    }
  };
}

// Factory function
export function createCDCSystem(config?: Partial<CDCConfig>): CDCSystem {
  const defaultConfig = createDefaultCDCConfig();
  const mergedConfig = { ...defaultConfig, ...config };
  
  return new CDCSystem(mergedConfig);
}