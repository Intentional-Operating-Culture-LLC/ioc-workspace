// Main Analytics Database Entry Point
// Unified interface for IOC's independent analytics database system

import { 
  AnalyticsDatabase,
  AnalyticsDBConfig,
  createDefaultAnalyticsDBConfig
} from './analytics-db';
import {
  AnalyticsOperations,
  AnalyticsOperationsConfig,
  createDefaultAnalyticsOperationsConfig,
  createAnalyticsOperations
} from './analytics-operations';
import {
  AnalyticsQueryInterface,
  createAnalyticsQueryInterface
} from './analytics-query-interface';
import {
  DatabaseManager,
  createDatabaseManager
} from './database-management';

export interface AnalyticsSystemConfig {
  database: Partial<AnalyticsDBConfig>;
  operations: Partial<AnalyticsOperationsConfig>;
  enableMonitoring: boolean;
  enableBackups: boolean;
  backupSchedule?: string;
  retentionDays?: number;
  debugMode: boolean;
}

export interface AnalyticsSystemStatus {
  database: {
    connected: boolean;
    version: string;
    totalRecords: number;
    dataQualityScore: number;
    lastBackup?: Date;
  };
  performance: {
    avgResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
    systemHealthScore: number;
  };
  monitoring: {
    activeAlerts: number;
    lastCheck: Date;
    uptime: number;
  };
}

/**
 * Main Analytics System Class
 * Provides unified interface to all analytics database components
 */
export class AnalyticsSystem {
  private database: AnalyticsDatabase;
  private operations: AnalyticsOperations;
  private queryInterface: AnalyticsQueryInterface;
  private databaseManager: DatabaseManager;
  private config: AnalyticsSystemConfig;
  private startTime: Date;

  constructor(config: Partial<AnalyticsSystemConfig> = {}) {
    this.config = {
      database: {},
      operations: {},
      enableMonitoring: true,
      enableBackups: true,
      retentionDays: 30,
      debugMode: false,
      ...config
    };

    this.startTime = new Date();

    // Create database configuration
    const dbConfig = {
      ...createDefaultAnalyticsDBConfig(),
      ...this.config.database
    };

    // Initialize components
    this.database = new AnalyticsDatabase(dbConfig);
    this.operations = createAnalyticsOperations(
      this.config.database,
      this.config.operations
    );
    this.queryInterface = createAnalyticsQueryInterface(dbConfig);
    this.databaseManager = createDatabaseManager(dbConfig);
  }

  /**
   * Initialize the entire analytics system
   */
  public async initialize(): Promise<void> {
    try {
      console.log('Initializing IOC Analytics System...');

      // Initialize database schema
      await this.database.initializeSchema();
      console.log('✓ Database schema initialized');

      // Initialize operations
      await this.operations.initialize();
      console.log('✓ Analytics operations initialized');

      // Initialize database management
      await this.databaseManager.initialize();
      console.log('✓ Database management initialized');

      // Setup monitoring if enabled
      if (this.config.enableMonitoring) {
        this.setupMonitoring();
        console.log('✓ Monitoring enabled');
      }

      // Setup backup scheduling if enabled
      if (this.config.enableBackups) {
        this.setupBackupScheduling();
        console.log('✓ Backup scheduling enabled');
      }

      console.log('🚀 IOC Analytics System fully initialized');
    } catch (error) {
      console.error('Failed to initialize analytics system:', error);
      throw error;
    }
  }

  /**
   * Get system status
   */
  public async getSystemStatus(): Promise<AnalyticsSystemStatus> {
    try {
      // Get database statistics
      const dbStats = await this.database.getDatabaseStatistics();
      
      // Get system metrics
      const systemMetrics = await this.queryInterface.getSystemMetrics();
      
      // Get performance metrics
      const perfMetrics = await this.databaseManager.getPerformanceMetrics();
      
      // Get alerts
      const alerts = await this.databaseManager.checkForAlerts();
      const activeAlerts = alerts.filter(alert => !alert.resolved).length;

      return {
        database: {
          connected: true,
          version: '1.0.0', // Would get from database
          totalRecords: dbStats.totalAssessments + dbStats.totalResponses + dbStats.totalQuestionResponses + dbStats.totalScores,
          dataQualityScore: dbStats.dataQualityScore,
          lastBackup: undefined // Would get from backup history
        },
        performance: {
          avgResponseTime: systemMetrics.performance.avgResponseTime,
          cacheHitRate: systemMetrics.performance.cacheHitRate,
          errorRate: systemMetrics.performance.errorRate,
          systemHealthScore: dbStats.systemHealthScore
        },
        monitoring: {
          activeAlerts,
          lastCheck: new Date(),
          uptime: Date.now() - this.startTime.getTime()
        }
      };
    } catch (error) {
      console.error('Failed to get system status:', error);
      throw error;
    }
  }

  /**
   * Process new anonymized data
   */
  public async ingestData(data: {
    assessments?: any[];
    responses?: any[];
    questionResponses?: any[];
    scores?: any[];
  }): Promise<{ success: boolean; recordsProcessed: number; errors: string[] }> {
    try {
      const result = await this.operations.processBatch(data);
      
      if (result.success) {
        // Trigger real-time aggregation
        await this.operations.performRealTimeAggregation();
      }
      
      return {
        success: result.success,
        recordsProcessed: result.recordsProcessed,
        errors: result.errors
      };
    } catch (error) {
      console.error('Data ingestion failed:', error);
      return {
        success: false,
        recordsProcessed: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * Execute analytics query
   */
  public async query(
    query: string,
    parameters: any[] = [],
    options: any = {}
  ): Promise<any> {
    return this.queryInterface.executeQuery(query, parameters, options);
  }

  /**
   * Get OCEAN trait analysis
   */
  public async getOceanAnalysis(
    filters: any[] = [],
    timeRange?: { start: Date; end: Date }
  ): Promise<any> {
    return this.queryInterface.getOceanTraitAnalysis(filters, timeRange);
  }

  /**
   * Get performance benchmarks
   */
  public async getBenchmarks(
    organizationHash?: string,
    industry?: string,
    orgSize?: string
  ): Promise<any> {
    return this.queryInterface.getPerformanceBenchmarks(
      organizationHash,
      industry,
      orgSize
    );
  }

  /**
   * Generate statistical analysis
   */
  public async analyzeMetric(
    metric: string,
    filters: any = {},
    timeRange: { start: Date; end: Date }
  ): Promise<any> {
    return this.operations.performStatisticalAnalysis(metric, filters, timeRange);
  }

  /**
   * Analyze trends
   */
  public async analyzeTrends(
    metric: string,
    timeRange: { start: Date; end: Date },
    interval: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<any> {
    return this.operations.performTrendAnalysis(metric, timeRange, interval);
  }

  /**
   * Export data
   */
  public async exportData(
    query: string,
    parameters: any[] = [],
    format: 'csv' | 'json' | 'xlsx' | 'parquet' = 'json',
    options: any = {}
  ): Promise<any> {
    return this.queryInterface.exportData(query, parameters, {
      format,
      includeHeaders: true,
      ...options
    });
  }

  /**
   * Create backup
   */
  public async createBackup(): Promise<any> {
    const backupConfig = {
      schedule: this.config.backupSchedule || '0 2 * * *', // Daily at 2 AM
      retentionDays: this.config.retentionDays || 30,
      compression: true,
      destination: 'local' as const,
      destinationConfig: {
        path: process.env.ANALYTICS_BACKUP_PATH || '/tmp/analytics-backups'
      },
      includeAnalytics: true,
      includeMaterializedViews: true,
      parallelJobs: 2
    };

    return this.databaseManager.createBackup(backupConfig);
  }

  /**
   * Get scaling recommendations
   */
  public async getScalingRecommendations(): Promise<any> {
    return this.databaseManager.getScalingRecommendations();
  }

  /**
   * Perform system maintenance
   */
  public async performMaintenance(): Promise<void> {
    console.log('Starting analytics system maintenance...');
    
    try {
      // Database maintenance
      await this.databaseManager.performMaintenance();
      
      // Refresh materialized views
      await this.operations.refreshMaterializedViews();
      
      // Data retention cleanup
      if (this.config.retentionDays) {
        await this.operations.performDataRetention(this.config.retentionDays);
      }
      
      console.log('Analytics system maintenance completed');
    } catch (error) {
      console.error('Maintenance failed:', error);
      throw error;
    }
  }

  /**
   * Setup monitoring
   */
  private setupMonitoring(): void {
    // Add alert handler for critical issues
    this.databaseManager.addAlertHandler((alert) => {
      if (alert.severity === 'critical') {
        console.error(`CRITICAL ALERT: ${alert.message}`, alert.metadata);
        // In production, send to monitoring service or notification system
      } else if (this.config.debugMode) {
        console.warn(`ALERT [${alert.severity}]: ${alert.message}`);
      }
    });
  }

  /**
   * Setup backup scheduling
   */
  private setupBackupScheduling(): void {
    if (this.config.backupSchedule) {
      // In production, use a proper cron scheduler
      console.log(`Backup scheduling enabled: ${this.config.backupSchedule}`);
      
      // Simple daily backup for demonstration
      setInterval(async () => {
        try {
          await this.createBackup();
          console.log('Scheduled backup completed');
        } catch (error) {
          console.error('Scheduled backup failed:', error);
        }
      }, 24 * 60 * 60 * 1000); // Daily
    }
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    uptime: number;
    version: string;
  }> {
    const checks: Record<string, boolean> = {};
    
    try {
      // Check database connection
      const dbStats = await this.database.getDatabaseStatistics();
      checks.database = true;
    } catch {
      checks.database = false;
    }
    
    try {
      // Check system metrics
      const metrics = await this.queryInterface.getSystemMetrics();
      checks.metrics = true;
    } catch {
      checks.metrics = false;
    }
    
    try {
      // Check performance
      const perfMetrics = await this.databaseManager.getPerformanceMetrics();
      checks.performance = perfMetrics.connections.active < perfMetrics.connections.maxConnections;
    } catch {
      checks.performance = false;
    }
    
    const healthyCount = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalChecks) {
      status = 'healthy';
    } else if (healthyCount >= totalChecks / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    
    return {
      status,
      checks,
      uptime: Date.now() - this.startTime.getTime(),
      version: '1.0.0'
    };
  }

  /**
   * Close analytics system
   */
  public async close(): Promise<void> {
    console.log('Shutting down analytics system...');
    
    await Promise.all([
      this.database.close(),
      this.operations.close(),
      this.queryInterface.close(),
      this.databaseManager.close()
    ]);
    
    console.log('Analytics system shutdown complete');
  }
}

/**
 * Create default analytics system configuration
 */
export function createDefaultAnalyticsSystemConfig(): AnalyticsSystemConfig {
  return {
    database: createDefaultAnalyticsDBConfig(),
    operations: createDefaultAnalyticsOperationsConfig(),
    enableMonitoring: process.env.ANALYTICS_ENABLE_MONITORING !== 'false',
    enableBackups: process.env.ANALYTICS_ENABLE_BACKUPS !== 'false',
    backupSchedule: process.env.ANALYTICS_BACKUP_SCHEDULE || '0 2 * * *',
    retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS || '30'),
    debugMode: process.env.ANALYTICS_DEBUG_MODE === 'true'
  };
}

/**
 * Factory function to create analytics system
 */
export function createAnalyticsSystem(config?: Partial<AnalyticsSystemConfig>): AnalyticsSystem {
  const defaultConfig = createDefaultAnalyticsSystemConfig();
  return new AnalyticsSystem({ ...defaultConfig, ...config });
}

// Re-export all types and interfaces
export * from './analytics-db';
export * from './analytics-operations';
export * from './analytics-query-interface';
export * from './database-management';
export * from './types';

// Example usage documentation
export const USAGE_EXAMPLES = {
  initialization: `
    // Initialize analytics system
    import { createAnalyticsSystem } from '@ioc/shared/data-access/meta-bi';
    
    const analytics = createAnalyticsSystem({
      database: {
        host: 'analytics-db.company.com',
        database: 'ioc_analytics',
        // ... other config
      },
      enableMonitoring: true,
      enableBackups: true
    });
    
    await analytics.initialize();
  `,
  
  dataIngestion: `
    // Ingest anonymized data
    const result = await analytics.ingestData({
      assessments: [/* anonymized assessments */],
      responses: [/* anonymized responses */],
      scores: [/* anonymized scores */]
    });
    
    console.log(\`Processed \${result.recordsProcessed} records\`);
  `,
  
  oceanAnalysis: `
    // Get OCEAN trait analysis
    const analysis = await analytics.getOceanAnalysis(
      [{ field: 'industry_category', operator: 'eq', value: 'Technology' }],
      { start: new Date('2024-01-01'), end: new Date('2024-12-31') }
    );
    
    console.log('Trait distributions:', analysis.traits);
    console.log('Correlations:', analysis.correlations);
  `,
  
  benchmarking: `
    // Get performance benchmarks
    const benchmarks = await analytics.getBenchmarks(
      'org-hash-123',
      'Technology',
      'Medium'
    );
    
    console.log('Performance index:', benchmarks.performanceIndex);
    console.log('Recommendations:', benchmarks.recommendations);
  `,
  
  customQueries: `
    // Execute custom analytics queries
    const result = await analytics.query(\`
      SELECT 
        dimension,
        AVG(score) as avg_score,
        COUNT(*) as sample_size
      FROM anonymized_assessment_scores 
      WHERE created_at >= $1
      GROUP BY dimension
    \`, [new Date('2024-01-01')]);
    
    console.log('Query results:', result.data);
  `,
  
  dataExport: `
    // Export analytics data
    const exportResult = await analytics.exportData(
      'SELECT * FROM mv_monthly_ocean_distributions WHERE period_start >= $1',
      [new Date('2024-01-01')],
      'csv',
      { filename: 'monthly_ocean_report.csv' }
    );
  `,
  
  systemStatus: `
    // Check system status
    const status = await analytics.getSystemStatus();
    console.log('Database records:', status.database.totalRecords);
    console.log('Data quality score:', status.database.dataQualityScore);
    console.log('System health score:', status.performance.systemHealthScore);
  `
};

export default AnalyticsSystem;