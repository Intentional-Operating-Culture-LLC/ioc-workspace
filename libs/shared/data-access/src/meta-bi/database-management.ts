// Database Management System
// Schema migration, backup procedures, monitoring, and scaling

import { Pool, PoolClient } from 'pg';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import { AnalyticsDBConfig } from './analytics-db';

export interface Migration {
  id: string;
  version: string;
  name: string;
  description: string;
  upScript: string;
  downScript: string;
  checksum: string;
  appliedAt?: Date;
  status: 'pending' | 'applied' | 'failed' | 'rolled_back';
}

export interface BackupConfiguration {
  schedule: string; // cron expression
  retentionDays: number;
  compression: boolean;
  encryptionKey?: string;
  destination: 'local' | 's3' | 'azure' | 'gcp';
  destinationConfig: {
    path: string;
    credentials?: any;
  };
  includeAnalytics: boolean;
  includeMaterializedViews: boolean;
  parallelJobs: number;
}

export interface BackupResult {
  id: string;
  startTime: Date;
  endTime: Date;
  success: boolean;
  size: number;
  location: string;
  checksum: string;
  error?: string;
  metadata: {
    version: string;
    tables: string[];
    rowCounts: Record<string, number>;
  };
}

export interface MonitoringAlert {
  id: string;
  type: 'performance' | 'storage' | 'connection' | 'data_quality' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata: Record<string, any>;
}

export interface PerformanceMetrics {
  timestamp: Date;
  connections: {
    active: number;
    idle: number;
    total: number;
    maxConnections: number;
  };
  queries: {
    totalQueries: number;
    slowQueries: number;
    avgQueryTime: number;
    medianQueryTime: number;
    p95QueryTime: number;
  };
  storage: {
    totalSize: number;
    indexSize: number;
    tableSize: number;
    availableSpace: number;
  };
  cache: {
    hitRate: number;
    memoryUsage: number;
    evictions: number;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkIO: number;
  };
}

export interface ScalingRecommendation {
  type: 'vertical' | 'horizontal' | 'partitioning' | 'indexing' | 'caching';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  estimatedImpact: string;
  implementationSteps: string[];
  estimatedCost: number;
  timeline: string;
}

export class DatabaseManager {
  private pool: Pool;
  private config: AnalyticsDBConfig;
  private migrationHistory: Migration[];
  private monitoringInterval: NodeJS.Timeout | null;
  private alertHandlers: Array<(alert: MonitoringAlert) => void>;

  constructor(config: AnalyticsDBConfig) {
    this.config = config;
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
      min: config.pool.min,
      max: config.pool.max,
      idleTimeoutMillis: config.pool.idleTimeoutMillis,
      connectionTimeoutMillis: config.pool.connectionTimeoutMillis,
    });
    this.migrationHistory = [];
    this.monitoringInterval = null;
    this.alertHandlers = [];
  }

  /**
   * Initialize database management
   */
  public async initialize(): Promise<void> {
    await this.createManagementTables();
    await this.loadMigrationHistory();
    this.startMonitoring();
  }

  /**
   * Create management tables
   */
  private async createManagementTables(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Schema migrations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id VARCHAR(255) PRIMARY KEY,
          version VARCHAR(50) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          checksum VARCHAR(64) NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          execution_time_ms INTEGER,
          status VARCHAR(20) DEFAULT 'applied',
          rollback_script TEXT,
          CONSTRAINT chk_migration_status CHECK (status IN ('applied', 'failed', 'rolled_back'))
        );
      `);
      
      // Backup history table
      await client.query(`
        CREATE TABLE IF NOT EXISTS backup_history (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          start_time TIMESTAMP WITH TIME ZONE NOT NULL,
          end_time TIMESTAMP WITH TIME ZONE,
          success BOOLEAN DEFAULT FALSE,
          backup_size BIGINT DEFAULT 0,
          location TEXT NOT NULL,
          checksum VARCHAR(64),
          error_message TEXT,
          metadata JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      // Monitoring alerts table
      await client.query(`
        CREATE TABLE IF NOT EXISTS monitoring_alerts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          alert_type VARCHAR(50) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          resolved BOOLEAN DEFAULT FALSE,
          resolved_at TIMESTAMP WITH TIME ZONE,
          metadata JSONB,
          CONSTRAINT chk_alert_type CHECK (alert_type IN ('performance', 'storage', 'connection', 'data_quality', 'system')),
          CONSTRAINT chk_severity CHECK (severity IN ('low', 'medium', 'high', 'critical'))
        );
      `);
      
      // Database statistics table
      await client.query(`
        CREATE TABLE IF NOT EXISTS database_statistics (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          total_size BIGINT,
          table_count INTEGER,
          index_count INTEGER,
          active_connections INTEGER,
          total_queries BIGINT,
          slow_queries INTEGER,
          cache_hit_rate DECIMAL(5,2),
          metadata JSONB
        );
      `);
      
      // Performance baselines table
      await client.query(`
        CREATE TABLE IF NOT EXISTS performance_baselines (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          metric_name VARCHAR(100) NOT NULL,
          baseline_value DECIMAL(12,4) NOT NULL,
          threshold_warning DECIMAL(12,4),
          threshold_critical DECIMAL(12,4),
          measurement_unit VARCHAR(20),
          category VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(metric_name, category)
        );
      `);
      
      // Generated reports table for query interface
      await client.query(`
        CREATE TABLE IF NOT EXISTS generated_reports (
          report_id VARCHAR(100) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expires_at TIMESTAMP WITH TIME ZONE
        );
      `);
      
      // Archived data table for retention
      await client.query(`
        CREATE TABLE IF NOT EXISTS archived_data (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          table_name VARCHAR(100) NOT NULL,
          archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          data_json JSONB NOT NULL,
          metadata JSONB,
          original_created_at TIMESTAMP WITH TIME ZONE
        );
      `);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Schema migration management
   */
  public async runMigrations(migrationPath: string): Promise<void> {
    const migrationFiles = await fs.readdir(migrationPath);
    const sqlFiles = migrationFiles.filter(file => file.endsWith('.sql')).sort();
    
    for (const file of sqlFiles) {
      const filePath = `${migrationPath}/${file}`;
      const migrationId = file.replace('.sql', '');
      
      // Check if migration already applied
      if (this.migrationHistory.find(m => m.id === migrationId)) {
        console.log(`Migration ${migrationId} already applied, skipping`);
        continue;
      }
      
      await this.applyMigration(filePath, migrationId);
    }
  }

  private async applyMigration(filePath: string, migrationId: string): Promise<void> {
    const client = await this.pool.connect();
    const startTime = Date.now();
    
    try {
      const migrationSQL = await fs.readFile(filePath, 'utf-8');
      const checksum = this.calculateChecksum(migrationSQL);
      
      await client.query('BEGIN');
      
      // Execute migration
      await client.query(migrationSQL);
      
      // Record migration
      await client.query(`
        INSERT INTO schema_migrations (
          id, version, name, description, checksum, execution_time_ms, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        migrationId,
        this.extractVersion(migrationId),
        this.extractName(migrationId),
        `Migration applied from ${filePath}`,
        checksum,
        Date.now() - startTime,
        'applied'
      ]);
      
      await client.query('COMMIT');
      
      console.log(`Migration ${migrationId} applied successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Record failed migration
      await client.query(`
        INSERT INTO schema_migrations (
          id, version, name, description, checksum, execution_time_ms, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        migrationId,
        this.extractVersion(migrationId),
        this.extractName(migrationId),
        `Migration failed: ${error.message}`,
        this.calculateChecksum(''),
        Date.now() - startTime,
        'failed'
      ]);
      
      throw new Error(`Migration ${migrationId} failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Backup operations
   */
  public async createBackup(config: BackupConfiguration): Promise<BackupResult> {
    const backupId = `backup_${Date.now()}`;
    const startTime = new Date();
    const location = `${config.destinationConfig.path}/${backupId}.sql`;
    
    try {
      // Get database statistics before backup
      const stats = await this.getDatabaseStatistics();
      
      // Create backup using pg_dump
      const backupFile = await this.executePgDump(location, config);
      const fileStats = await fs.stat(backupFile);
      const checksum = await this.calculateFileChecksum(backupFile);
      
      const result: BackupResult = {
        id: backupId,
        startTime,
        endTime: new Date(),
        success: true,
        size: fileStats.size,
        location: backupFile,
        checksum,
        metadata: {
          version: await this.getDatabaseVersion(),
          tables: await this.getTableList(),
          rowCounts: stats.rowCounts
        }
      };
      
      // Record backup in history
      await this.recordBackup(result);
      
      // Cleanup old backups
      await this.cleanupOldBackups(config.retentionDays);
      
      return result;
    } catch (error) {
      const result: BackupResult = {
        id: backupId,
        startTime,
        endTime: new Date(),
        success: false,
        size: 0,
        location,
        checksum: '',
        error: error.message,
        metadata: {
          version: '',
          tables: [],
          rowCounts: {}
        }
      };
      
      await this.recordBackup(result);
      throw error;
    }
  }

  private async executePgDump(location: string, config: BackupConfiguration): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        '-h', this.config.host,
        '-p', this.config.port.toString(),
        '-U', this.config.username,
        '-d', this.config.database,
        '--verbose',
        '--no-password'
      ];
      
      if (config.compression) {
        args.push('--compress=9');
      }
      
      if (!config.includeAnalytics) {
        // Exclude analytics tables
        args.push('--exclude-table=anonymized_*');
      }
      
      if (!config.includeMaterializedViews) {
        args.push('--exclude-table=mv_*');
      }
      
      args.push('-f', location);
      
      const pgDump = spawn('pg_dump', args, {
        env: { ...process.env, PGPASSWORD: this.config.password }
      });
      
      let stderr = '';
      
      pgDump.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pgDump.on('close', (code) => {
        if (code === 0) {
          resolve(location);
        } else {
          reject(new Error(`pg_dump failed with code ${code}: ${stderr}`));
        }
      });
      
      pgDump.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Monitoring and alerting
   */
  public async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const client = await this.pool.connect();
    
    try {
      // Get connection statistics
      const connResult = await client.query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);
      
      // Get query statistics
      const queryResult = await client.query(`
        SELECT 
          sum(calls) as total_queries,
          avg(mean_exec_time) as avg_query_time,
          count(*) FILTER (WHERE mean_exec_time > 1000) as slow_queries
        FROM pg_stat_statements
        WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      `);
      
      // Get database size
      const sizeResult = await client.query(`
        SELECT 
          pg_database_size(current_database()) as total_size,
          sum(pg_total_relation_size(oid)) as table_size,
          sum(pg_indexes_size(oid)) as index_size
        FROM pg_class
        WHERE relkind IN ('r', 'i')
      `);
      
      // Get cache statistics
      const cacheResult = await client.query(`
        SELECT 
          sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0) * 100 as cache_hit_rate
        FROM pg_statio_user_tables
      `);
      
      // Get system metrics from system_health_metrics table
      const systemResult = await client.query(`
        SELECT 
          AVG(cpu_usage) as cpu_usage,
          AVG(memory_usage) as memory_usage,
          AVG(disk_usage) as disk_usage,
          AVG(network_io) as network_io
        FROM system_health_metrics
        WHERE timestamp >= NOW() - INTERVAL '5 minutes'
      `);
      
      const conn = connResult.rows[0];
      const query = queryResult.rows[0];
      const size = sizeResult.rows[0];
      const cache = cacheResult.rows[0];
      const system = systemResult.rows[0];
      
      return {
        timestamp: new Date(),
        connections: {
          active: parseInt(conn.active_connections) || 0,
          idle: parseInt(conn.idle_connections) || 0,
          total: parseInt(conn.total_connections) || 0,
          maxConnections: this.config.pool.max
        },
        queries: {
          totalQueries: parseInt(query.total_queries) || 0,
          slowQueries: parseInt(query.slow_queries) || 0,
          avgQueryTime: parseFloat(query.avg_query_time) || 0,
          medianQueryTime: 0, // Would need more complex query
          p95QueryTime: 0 // Would need more complex query
        },
        storage: {
          totalSize: parseInt(size.total_size) || 0,
          indexSize: parseInt(size.index_size) || 0,
          tableSize: parseInt(size.table_size) || 0,
          availableSpace: 0 // Would need system-level query
        },
        cache: {
          hitRate: parseFloat(cache.cache_hit_rate) || 0,
          memoryUsage: 0, // Would need system-level query
          evictions: 0 // Would need system-level query
        },
        system: {
          cpuUsage: parseFloat(system.cpu_usage) || 0,
          memoryUsage: parseFloat(system.memory_usage) || 0,
          diskUsage: parseFloat(system.disk_usage) || 0,
          networkIO: parseFloat(system.network_io) || 0
        }
      };
    } finally {
      client.release();
    }
  }

  public async checkForAlerts(): Promise<MonitoringAlert[]> {
    const metrics = await this.getPerformanceMetrics();
    const alerts: MonitoringAlert[] = [];
    
    // Check connection usage
    const connectionUsage = (metrics.connections.active / metrics.connections.maxConnections) * 100;
    if (connectionUsage > 90) {
      alerts.push({
        id: `conn_${Date.now()}`,
        type: 'connection',
        severity: 'critical',
        message: `Connection usage is ${connectionUsage.toFixed(1)}% (${metrics.connections.active}/${metrics.connections.maxConnections})`,
        timestamp: new Date(),
        resolved: false,
        metadata: { connectionUsage, activeConnections: metrics.connections.active }
      });
    } else if (connectionUsage > 75) {
      alerts.push({
        id: `conn_${Date.now()}`,
        type: 'connection',
        severity: 'high',
        message: `Connection usage is high: ${connectionUsage.toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false,
        metadata: { connectionUsage }
      });
    }
    
    // Check slow queries
    if (metrics.queries.slowQueries > 10) {
      alerts.push({
        id: `query_${Date.now()}`,
        type: 'performance',
        severity: 'medium',
        message: `${metrics.queries.slowQueries} slow queries detected`,
        timestamp: new Date(),
        resolved: false,
        metadata: { slowQueries: metrics.queries.slowQueries }
      });
    }
    
    // Check cache hit rate
    if (metrics.cache.hitRate < 95) {
      alerts.push({
        id: `cache_${Date.now()}`,
        type: 'performance',
        severity: 'medium',
        message: `Cache hit rate is low: ${metrics.cache.hitRate.toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false,
        metadata: { cacheHitRate: metrics.cache.hitRate }
      });
    }
    
    // Check system resources
    if (metrics.system.cpuUsage > 90) {
      alerts.push({
        id: `cpu_${Date.now()}`,
        type: 'system',
        severity: 'critical',
        message: `CPU usage is critical: ${metrics.system.cpuUsage.toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false,
        metadata: { cpuUsage: metrics.system.cpuUsage }
      });
    }
    
    if (metrics.system.memoryUsage > 85) {
      alerts.push({
        id: `memory_${Date.now()}`,
        type: 'system',
        severity: 'high',
        message: `Memory usage is high: ${metrics.system.memoryUsage.toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false,
        metadata: { memoryUsage: metrics.system.memoryUsage }
      });
    }
    
    // Store alerts in database
    for (const alert of alerts) {
      await this.storeAlert(alert);
    }
    
    // Notify alert handlers
    for (const alert of alerts) {
      this.alertHandlers.forEach(handler => handler(alert));
    }
    
    return alerts;
  }

  /**
   * Scaling recommendations
   */
  public async getScalingRecommendations(): Promise<ScalingRecommendation[]> {
    const metrics = await this.getPerformanceMetrics();
    const recommendations: ScalingRecommendation[] = [];
    
    // Connection pool scaling
    const connectionUsage = (metrics.connections.active / metrics.connections.maxConnections) * 100;
    if (connectionUsage > 80) {
      recommendations.push({
        type: 'vertical',
        priority: 'high',
        description: 'Increase connection pool size or scale database server',
        estimatedImpact: 'Reduce connection wait times and improve throughput',
        implementationSteps: [
          'Increase max_connections in PostgreSQL configuration',
          'Scale database server if needed',
          'Update application connection pool settings'
        ],
        estimatedCost: 500,
        timeline: '1-2 weeks'
      });
    }
    
    // Query performance optimization
    if (metrics.queries.slowQueries > 5) {
      recommendations.push({
        type: 'indexing',
        priority: 'medium',
        description: 'Optimize slow queries with better indexing',
        estimatedImpact: 'Reduce query execution time by 50-80%',
        implementationSteps: [
          'Analyze slow query patterns',
          'Create composite indexes for frequent queries',
          'Consider materialized views for complex aggregations'
        ],
        estimatedCost: 100,
        timeline: '1 week'
      });
    }
    
    // Cache optimization
    if (metrics.cache.hitRate < 95) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        description: 'Improve caching strategy and configuration',
        estimatedImpact: 'Reduce database load and improve response times',
        implementationSteps: [
          'Increase shared_buffers configuration',
          'Implement application-level caching',
          'Optimize frequently accessed queries'
        ],
        estimatedCost: 200,
        timeline: '2 weeks'
      });
    }
    
    // Storage scaling
    const storageUsage = (metrics.storage.totalSize / (metrics.storage.totalSize + 1e9)) * 100; // Simplified
    if (storageUsage > 80) {
      recommendations.push({
        type: 'vertical',
        priority: 'high',
        description: 'Scale storage capacity',
        estimatedImpact: 'Prevent storage exhaustion and maintain performance',
        implementationSteps: [
          'Increase disk capacity',
          'Implement data archival policies',
          'Consider storage optimization techniques'
        ],
        estimatedCost: 1000,
        timeline: '3-4 weeks'
      });
    }
    
    // Partitioning recommendations
    const tableStats = await this.getTableStatistics();
    const largeTable = tableStats.find(table => table.rowCount > 10000000);
    if (largeTable) {
      recommendations.push({
        type: 'partitioning',
        priority: 'medium',
        description: `Consider partitioning large table: ${largeTable.tableName}`,
        estimatedImpact: 'Improve query performance and maintenance operations',
        implementationSteps: [
          'Analyze query patterns for partitioning strategy',
          'Implement time-based or hash partitioning',
          'Update application queries if needed'
        ],
        estimatedCost: 300,
        timeline: '2-3 weeks'
      });
    }
    
    return recommendations;
  }

  /**
   * Maintenance operations
   */
  public async performMaintenance(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      console.log('Starting database maintenance...');
      
      // Update table statistics
      await client.query('ANALYZE');
      
      // Vacuum tables
      await client.query('VACUUM ANALYZE');
      
      // Refresh materialized views
      await client.query('SELECT refresh_analytics_views_scheduled()');
      
      // Clean up old audit logs (keep 90 days)
      await client.query(`
        DELETE FROM audit_log 
        WHERE timestamp < NOW() - INTERVAL '90 days'
      `);
      
      // Clean up old system health metrics (keep 30 days)
      await client.query(`
        DELETE FROM system_health_metrics 
        WHERE timestamp < NOW() - INTERVAL '30 days'
      `);
      
      // Clean up old data quality metrics (keep 60 days)
      await client.query(`
        DELETE FROM data_quality_metrics 
        WHERE timestamp < NOW() - INTERVAL '60 days'
      `);
      
      // Update database statistics
      await this.updateDatabaseStatistics();
      
      console.log('Database maintenance completed');
    } finally {
      client.release();
    }
  }

  /**
   * Helper methods
   */
  private async loadMigrationHistory(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT * FROM schema_migrations 
        ORDER BY applied_at ASC
      `);
      
      this.migrationHistory = result.rows.map(row => ({
        id: row.id,
        version: row.version,
        name: row.name,
        description: row.description,
        upScript: '',
        downScript: row.rollback_script || '',
        checksum: row.checksum,
        appliedAt: row.applied_at,
        status: row.status
      }));
    } catch (error) {
      // Table might not exist yet
      this.migrationHistory = [];
    } finally {
      client.release();
    }
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkForAlerts();
        await this.updateDatabaseStatistics();
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, 60000); // Check every minute
  }

  private async storeAlert(alert: MonitoringAlert): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO monitoring_alerts (
          id, alert_type, severity, message, timestamp, resolved, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        alert.id,
        alert.type,
        alert.severity,
        alert.message,
        alert.timestamp,
        alert.resolved,
        JSON.stringify(alert.metadata)
      ]);
    } finally {
      client.release();
    }
  }

  private async updateDatabaseStatistics(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const stats = await this.getDatabaseStatistics();
      
      await client.query(`
        INSERT INTO database_statistics (
          total_size, table_count, index_count, active_connections,
          total_queries, slow_queries, cache_hit_rate, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        stats.totalSize,
        stats.tableCount,
        stats.indexCount,
        stats.activeConnections,
        stats.totalQueries,
        stats.slowQueries,
        stats.cacheHitRate,
        JSON.stringify(stats.rowCounts)
      ]);
    } finally {
      client.release();
    }
  }

  private async getDatabaseStatistics(): Promise<any> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          pg_database_size(current_database()) as total_size,
          (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count,
          (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public') as index_count,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT COALESCE(sum(calls), 0) FROM pg_stat_statements) as total_queries,
          (SELECT count(*) FROM pg_stat_statements WHERE mean_exec_time > 1000) as slow_queries,
          (SELECT COALESCE(sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0) * 100, 0) FROM pg_statio_user_tables) as cache_hit_rate
      `);
      
      const row = result.rows[0];
      
      return {
        totalSize: parseInt(row.total_size),
        tableCount: parseInt(row.table_count),
        indexCount: parseInt(row.index_count),
        activeConnections: parseInt(row.active_connections),
        totalQueries: parseInt(row.total_queries),
        slowQueries: parseInt(row.slow_queries),
        cacheHitRate: parseFloat(row.cache_hit_rate),
        rowCounts: await this.getRowCounts()
      };
    } finally {
      client.release();
    }
  }

  private async getRowCounts(): Promise<Record<string, number>> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins - n_tup_del as row_count
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
      `);
      
      return result.rows.reduce((acc, row) => {
        acc[row.tablename] = parseInt(row.row_count);
        return acc;
      }, {});
    } finally {
      client.release();
    }
  }

  private async getTableStatistics(): Promise<Array<{ tableName: string; rowCount: number; size: number }>> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          tablename,
          n_tup_ins - n_tup_del as row_count,
          pg_total_relation_size(schemaname||'.'||tablename) as size
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY row_count DESC
      `);
      
      return result.rows.map(row => ({
        tableName: row.tablename,
        rowCount: parseInt(row.row_count),
        size: parseInt(row.size)
      }));
    } finally {
      client.release();
    }
  }

  private async getTableList(): Promise<string[]> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);
      
      return result.rows.map(row => row.tablename);
    } finally {
      client.release();
    }
  }

  private async getDatabaseVersion(): Promise<string> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query('SELECT version()');
      return result.rows[0].version;
    } finally {
      client.release();
    }
  }

  private async recordBackup(backup: BackupResult): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO backup_history (
          id, start_time, end_time, success, backup_size, location, 
          checksum, error_message, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        backup.id,
        backup.startTime,
        backup.endTime,
        backup.success,
        backup.size,
        backup.location,
        backup.checksum,
        backup.error,
        JSON.stringify(backup.metadata)
      ]);
    } finally {
      client.release();
    }
  }

  private async cleanupOldBackups(retentionDays: number): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        DELETE FROM backup_history 
        WHERE start_time < NOW() - INTERVAL '${retentionDays} days'
      `);
    } finally {
      client.release();
    }
  }

  private calculateChecksum(content: string): string {
    // Simple checksum calculation - in production, use crypto.createHash
    return Buffer.from(content).toString('base64').substring(0, 32);
  }

  private async calculateFileChecksum(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return Buffer.from(content).toString('base64').substring(0, 32);
  }

  private extractVersion(migrationId: string): string {
    const match = migrationId.match(/^(\d+)/);
    return match ? match[1] : '1';
  }

  private extractName(migrationId: string): string {
    return migrationId.replace(/^\d+[-_]/, '').replace(/[-_]/g, ' ');
  }

  public addAlertHandler(handler: (alert: MonitoringAlert) => void): void {
    this.alertHandlers.push(handler);
  }

  public removeAlertHandler(handler: (alert: MonitoringAlert) => void): void {
    const index = this.alertHandlers.indexOf(handler);
    if (index > -1) {
      this.alertHandlers.splice(index, 1);
    }
  }

  /**
   * Close database manager
   */
  public async close(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    await this.pool.end();
  }
}

/**
 * Factory function to create database manager
 */
export function createDatabaseManager(config: AnalyticsDBConfig): DatabaseManager {
  return new DatabaseManager(config);
}