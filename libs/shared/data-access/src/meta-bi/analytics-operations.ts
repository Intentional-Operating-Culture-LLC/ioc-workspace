// Analytics Operations Service
// Data ingestion, aggregation, and statistical analysis operations

import { Pool, PoolClient } from 'pg';
import { 
  AnalyticsDatabase, 
  AnalyticsDBConfig,
  createDefaultAnalyticsDBConfig
} from './analytics-db';
import {
  AnonymizedAssessment,
  AnonymizedAssessmentResponse,
  AnonymizedQuestionResponse,
  AnonymizedAssessmentScore,
  ProcessingJob,
  DataQualityMetrics,
  SystemHealthMetrics
} from './types';

export interface AnalyticsOperationsConfig {
  batchSize: number;
  parallelProcessing: number;
  retryAttempts: number;
  retryDelay: number;
  enableCaching: boolean;
  cacheTimeout: number;
  enableMetrics: boolean;
  debugMode: boolean;
}

export interface BatchProcessingResult {
  success: boolean;
  recordsProcessed: number;
  recordsTotal: number;
  processingTime: number;
  errors: string[];
  jobId: string;
}

export interface StatisticalAnalysisResult {
  metric: string;
  value: number;
  confidence: number;
  sampleSize: number;
  period: {
    start: Date;
    end: Date;
  };
  metadata: Record<string, any>;
}

export interface TrendAnalysisResult {
  trend: 'increasing' | 'decreasing' | 'stable';
  slope: number;
  correlation: number;
  significance: number;
  dataPoints: Array<{
    date: Date;
    value: number;
  }>;
}

export interface BenchmarkComparison {
  category: string;
  subcategory?: string;
  metric: string;
  currentValue: number;
  benchmarkValue: number;
  percentileRank: number;
  improvement: number;
  recommendation: string;
}

export class AnalyticsOperations {
  private db: AnalyticsDatabase;
  private config: AnalyticsOperationsConfig;
  private cache: Map<string, { data: any; timestamp: number }>;
  private processingQueue: Array<() => Promise<void>>;
  private isProcessing: boolean;

  constructor(
    dbConfig: AnalyticsDBConfig,
    operationsConfig: Partial<AnalyticsOperationsConfig> = {}
  ) {
    this.db = new AnalyticsDatabase(dbConfig);
    this.config = {
      batchSize: 1000,
      parallelProcessing: 4,
      retryAttempts: 3,
      retryDelay: 1000,
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      enableMetrics: true,
      debugMode: false,
      ...operationsConfig
    };
    this.cache = new Map();
    this.processingQueue = [];
    this.isProcessing = false;
  }

  /**
   * Initialize analytics operations
   */
  public async initialize(): Promise<void> {
    await this.db.initializeSchema();
    
    // Start background processing
    this.startBackgroundProcessing();
    
    // Initialize materialized views
    await this.refreshMaterializedViews();
  }

  /**
   * Start background processing queue
   */
  private startBackgroundProcessing(): void {
    setInterval(async () => {
      if (!this.isProcessing && this.processingQueue.length > 0) {
        await this.processQueue();
      }
    }, 5000); // Process every 5 seconds
  }

  /**
   * Process queued operations
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    const operations = this.processingQueue.splice(0, this.config.parallelProcessing);
    
    try {
      await Promise.all(operations.map(op => op()));
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Batch process anonymized data
   */
  public async processBatch(data: {
    assessments?: AnonymizedAssessment[];
    responses?: AnonymizedAssessmentResponse[];
    questionResponses?: AnonymizedQuestionResponse[];
    scores?: AnonymizedAssessmentScore[];
  }): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    const jobId = await this.db.createProcessingJob({
      type: 'anonymization',
      status: 'running',
      started_at: new Date(),
      records_total: this.getTotalRecords(data),
      records_processed: 0,
      progress_percentage: 0
    });

    try {
      // Process in batches
      const batches = this.createBatches(data, this.config.batchSize);
      let recordsProcessed = 0;
      const errors: string[] = [];

      for (const batch of batches) {
        try {
          await this.db.insertBatch(batch);
          recordsProcessed += this.getTotalRecords(batch);
          
          // Update progress
          const progress = (recordsProcessed / this.getTotalRecords(data)) * 100;
          await this.db.updateProcessingJob(jobId, {
            records_processed: recordsProcessed,
            progress_percentage: progress
          });
        } catch (error) {
          errors.push(`Batch processing error: ${error.message}`);
        }
      }

      const processingTime = Date.now() - startTime;
      await this.db.updateProcessingJob(jobId, {
        status: 'completed',
        completed_at: new Date(),
        records_processed: recordsProcessed,
        progress_percentage: 100
      });

      return {
        success: errors.length === 0,
        recordsProcessed,
        recordsTotal: this.getTotalRecords(data),
        processingTime,
        errors,
        jobId
      };
    } catch (error) {
      await this.db.updateProcessingJob(jobId, {
        status: 'failed',
        completed_at: new Date(),
        error_message: error.message
      });
      throw error;
    }
  }

  /**
   * Real-time data aggregation
   */
  public async performRealTimeAggregation(): Promise<void> {
    const cacheKey = 'realtime_aggregation';
    if (this.isInCache(cacheKey)) {
      return;
    }

    const aggregationPromise = this.performAggregation();
    this.processingQueue.push(async () => {
      await aggregationPromise;
      this.setCache(cacheKey, true);
    });
  }

  /**
   * Perform data aggregation
   */
  private async performAggregation(): Promise<void> {
    const pool = new Pool(); // Use connection from analytics database
    const client = await pool.connect();
    
    try {
      // Update daily assessment metrics
      await client.query(`
        INSERT INTO daily_assessment_metrics (
          date, total_assessments, total_responses, completion_rate,
          avg_time_spent_seconds, unique_organizations, unique_respondents,
          device_breakdown, browser_breakdown, geographic_breakdown, industry_breakdown
        )
        SELECT 
          DATE(a.created_at) as date,
          COUNT(DISTINCT a.id) as total_assessments,
          COUNT(r.id) as total_responses,
          AVG(r.completion_percentage) as completion_rate,
          AVG(r.time_spent_seconds) as avg_time_spent_seconds,
          COUNT(DISTINCT a.org_hash) as unique_organizations,
          COUNT(DISTINCT r.respondent_hash) as unique_respondents,
          json_object_agg(
            COALESCE(r.device_type, 'Unknown'), 
            COUNT(CASE WHEN r.device_type IS NOT NULL THEN 1 END)
          ) as device_breakdown,
          json_object_agg(
            COALESCE(r.browser_family, 'Unknown'), 
            COUNT(CASE WHEN r.browser_family IS NOT NULL THEN 1 END)
          ) as browser_breakdown,
          json_object_agg(
            COALESCE(r.geographic_region, 'Unknown'), 
            COUNT(CASE WHEN r.geographic_region IS NOT NULL THEN 1 END)
          ) as geographic_breakdown,
          json_object_agg(
            COALESCE(a.industry_category, 'Unknown'), 
            COUNT(CASE WHEN a.industry_category IS NOT NULL THEN 1 END)
          ) as industry_breakdown
        FROM anonymized_assessments a
        LEFT JOIN anonymized_assessment_responses r ON a.id = r.assessment_hash
        WHERE DATE(a.created_at) = CURRENT_DATE
        GROUP BY DATE(a.created_at)
        ON CONFLICT (date) DO UPDATE SET
          total_assessments = EXCLUDED.total_assessments,
          total_responses = EXCLUDED.total_responses,
          completion_rate = EXCLUDED.completion_rate,
          avg_time_spent_seconds = EXCLUDED.avg_time_spent_seconds,
          unique_organizations = EXCLUDED.unique_organizations,
          unique_respondents = EXCLUDED.unique_respondents,
          device_breakdown = EXCLUDED.device_breakdown,
          browser_breakdown = EXCLUDED.browser_breakdown,
          geographic_breakdown = EXCLUDED.geographic_breakdown,
          industry_breakdown = EXCLUDED.industry_breakdown,
          updated_at = NOW()
      `);

      // Update OCEAN trait distributions
      await client.query(`
        INSERT INTO ocean_trait_distributions (
          period_start, period_end, trait_name, industry_category, org_size_category,
          sample_size, mean_score, median_score, std_dev, percentile_25, percentile_75,
          percentile_90, percentile_95, percentile_99
        )
        SELECT 
          DATE_TRUNC('month', s.created_at) as period_start,
          DATE_TRUNC('month', s.created_at) + INTERVAL '1 month' - INTERVAL '1 day' as period_end,
          s.dimension as trait_name,
          a.industry_category,
          a.org_size_category,
          COUNT(*) as sample_size,
          AVG(s.score) as mean_score,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.score) as median_score,
          STDDEV_POP(s.score) as std_dev,
          PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY s.score) as percentile_25,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY s.score) as percentile_75,
          PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY s.score) as percentile_90,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY s.score) as percentile_95,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY s.score) as percentile_99
        FROM anonymized_assessment_scores s
        JOIN anonymized_assessments a ON s.assessment_hash = a.id
        WHERE s.dimension IN ('openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism')
          AND DATE_TRUNC('month', s.created_at) = DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY DATE_TRUNC('month', s.created_at), s.dimension, a.industry_category, a.org_size_category
        HAVING COUNT(*) >= 5
        ON CONFLICT (period_start, period_end, trait_name, COALESCE(industry_category, ''), COALESCE(org_size_category, '')) 
        DO UPDATE SET
          sample_size = EXCLUDED.sample_size,
          mean_score = EXCLUDED.mean_score,
          median_score = EXCLUDED.median_score,
          std_dev = EXCLUDED.std_dev,
          percentile_25 = EXCLUDED.percentile_25,
          percentile_75 = EXCLUDED.percentile_75,
          percentile_90 = EXCLUDED.percentile_90,
          percentile_95 = EXCLUDED.percentile_95,
          percentile_99 = EXCLUDED.percentile_99,
          updated_at = NOW()
      `);

    } finally {
      client.release();
      await pool.end();
    }
  }

  /**
   * Statistical analysis functions
   */
  public async performStatisticalAnalysis(
    metric: string,
    filters: Record<string, any> = {},
    timeRange: { start: Date; end: Date }
  ): Promise<StatisticalAnalysisResult> {
    const pool = new Pool();
    const client = await pool.connect();
    
    try {
      let query = '';
      let params: any[] = [];

      switch (metric) {
        case 'completion_rate':
          query = `
            SELECT 
              AVG(completion_percentage) as value,
              COUNT(*) as sample_size,
              STDDEV_POP(completion_percentage) as std_dev
            FROM anonymized_assessment_responses
            WHERE created_at BETWEEN $1 AND $2
          `;
          params = [timeRange.start, timeRange.end];
          break;

        case 'ocean_trait_average':
          query = `
            SELECT 
              AVG(score) as value,
              COUNT(*) as sample_size,
              STDDEV_POP(score) as std_dev
            FROM anonymized_assessment_scores s
            JOIN anonymized_assessments a ON s.assessment_hash = a.id
            WHERE s.created_at BETWEEN $1 AND $2
              AND s.dimension = $3
          `;
          params = [timeRange.start, timeRange.end, filters.trait];
          break;

        case 'response_time_average':
          query = `
            SELECT 
              AVG(time_spent_seconds) as value,
              COUNT(*) as sample_size,
              STDDEV_POP(time_spent_seconds) as std_dev
            FROM anonymized_assessment_responses
            WHERE created_at BETWEEN $1 AND $2
          `;
          params = [timeRange.start, timeRange.end];
          break;

        default:
          throw new Error(`Unknown metric: ${metric}`);
      }

      const result = await client.query(query, params);
      const row = result.rows[0];
      
      // Calculate confidence interval (95%)
      const standardError = row.std_dev / Math.sqrt(row.sample_size);
      const confidence = 1.96 * standardError; // 95% confidence interval

      return {
        metric,
        value: parseFloat(row.value),
        confidence,
        sampleSize: parseInt(row.sample_size),
        period: timeRange,
        metadata: {
          standardDeviation: row.std_dev,
          standardError,
          confidenceInterval95: {
            lower: row.value - confidence,
            upper: row.value + confidence
          }
        }
      };
    } finally {
      client.release();
      await pool.end();
    }
  }

  /**
   * Trend analysis
   */
  public async performTrendAnalysis(
    metric: string,
    timeRange: { start: Date; end: Date },
    interval: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<TrendAnalysisResult> {
    const pool = new Pool();
    const client = await pool.connect();
    
    try {
      let query = '';
      let params: any[] = [];

      switch (metric) {
        case 'completion_rate':
          query = `
            SELECT 
              DATE_TRUNC('${interval}', created_at) as date,
              AVG(completion_percentage) as value
            FROM anonymized_assessment_responses
            WHERE created_at BETWEEN $1 AND $2
            GROUP BY DATE_TRUNC('${interval}', created_at)
            ORDER BY date
          `;
          params = [timeRange.start, timeRange.end];
          break;

        case 'assessment_volume':
          query = `
            SELECT 
              DATE_TRUNC('${interval}', created_at) as date,
              COUNT(*) as value
            FROM anonymized_assessments
            WHERE created_at BETWEEN $1 AND $2
            GROUP BY DATE_TRUNC('${interval}', created_at)
            ORDER BY date
          `;
          params = [timeRange.start, timeRange.end];
          break;

        default:
          throw new Error(`Unknown metric for trend analysis: ${metric}`);
      }

      const result = await client.query(query, params);
      const dataPoints = result.rows.map(row => ({
        date: new Date(row.date),
        value: parseFloat(row.value)
      }));

      // Calculate linear regression
      const n = dataPoints.length;
      const sumX = dataPoints.reduce((sum, point, index) => sum + index, 0);
      const sumY = dataPoints.reduce((sum, point) => sum + point.value, 0);
      const sumXY = dataPoints.reduce((sum, point, index) => sum + index * point.value, 0);
      const sumXX = dataPoints.reduce((sum, point, index) => sum + index * index, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Calculate correlation coefficient
      const meanX = sumX / n;
      const meanY = sumY / n;
      const numerator = dataPoints.reduce((sum, point, index) => 
        sum + (index - meanX) * (point.value - meanY), 0);
      const denomX = Math.sqrt(dataPoints.reduce((sum, point, index) => 
        sum + (index - meanX) ** 2, 0));
      const denomY = Math.sqrt(dataPoints.reduce((sum, point) => 
        sum + (point.value - meanY) ** 2, 0));
      const correlation = numerator / (denomX * denomY);

      // Determine trend direction
      let trend: 'increasing' | 'decreasing' | 'stable';
      if (Math.abs(slope) < 0.1) {
        trend = 'stable';
      } else if (slope > 0) {
        trend = 'increasing';
      } else {
        trend = 'decreasing';
      }

      // Calculate statistical significance (t-test)
      const standardError = Math.sqrt(
        dataPoints.reduce((sum, point, index) => 
          sum + (point.value - (slope * index + intercept)) ** 2, 0) / (n - 2)
      ) / Math.sqrt(dataPoints.reduce((sum, point, index) => 
        sum + (index - meanX) ** 2, 0));
      
      const tStat = slope / standardError;
      const significance = Math.abs(tStat);

      return {
        trend,
        slope,
        correlation,
        significance,
        dataPoints
      };
    } finally {
      client.release();
      await pool.end();
    }
  }

  /**
   * Benchmark comparison
   */
  public async performBenchmarkComparison(
    organizationHash: string,
    industry?: string,
    orgSize?: string
  ): Promise<BenchmarkComparison[]> {
    const pool = new Pool();
    const client = await pool.connect();
    
    try {
      const query = `
        WITH org_scores AS (
          SELECT 
            s.dimension,
            AVG(s.score) as org_score
          FROM anonymized_assessment_scores s
          JOIN anonymized_assessments a ON s.assessment_hash = a.id
          WHERE a.org_hash = $1
            AND s.dimension IN ('openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism')
          GROUP BY s.dimension
        ),
        benchmark_scores AS (
          SELECT 
            s.dimension,
            AVG(s.score) as benchmark_score,
            STDDEV_POP(s.score) as std_dev,
            COUNT(*) as sample_size
          FROM anonymized_assessment_scores s
          JOIN anonymized_assessments a ON s.assessment_hash = a.id
          WHERE ($2 IS NULL OR a.industry_category = $2)
            AND ($3 IS NULL OR a.org_size_category = $3)
            AND s.dimension IN ('openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism')
          GROUP BY s.dimension
        )
        SELECT 
          os.dimension,
          os.org_score,
          bs.benchmark_score,
          bs.std_dev,
          bs.sample_size,
          -- Calculate percentile rank
          (SELECT COUNT(*) FROM anonymized_assessment_scores s2 
           JOIN anonymized_assessments a2 ON s2.assessment_hash = a2.id
           WHERE s2.dimension = os.dimension 
             AND s2.score <= os.org_score
             AND ($2 IS NULL OR a2.industry_category = $2)
             AND ($3 IS NULL OR a2.org_size_category = $3)
          ) * 100.0 / bs.sample_size as percentile_rank
        FROM org_scores os
        JOIN benchmark_scores bs ON os.dimension = bs.dimension
      `;

      const result = await client.query(query, [organizationHash, industry, orgSize]);
      
      return result.rows.map(row => {
        const improvement = ((row.org_score - row.benchmark_score) / row.benchmark_score) * 100;
        let recommendation = '';
        
        if (row.percentile_rank < 25) {
          recommendation = `Below average performance in ${row.dimension}. Consider targeted development programs.`;
        } else if (row.percentile_rank < 50) {
          recommendation = `Average performance in ${row.dimension}. Opportunities for improvement exist.`;
        } else if (row.percentile_rank < 75) {
          recommendation = `Good performance in ${row.dimension}. Continue current practices.`;
        } else {
          recommendation = `Excellent performance in ${row.dimension}. Consider sharing best practices.`;
        }

        return {
          category: 'OCEAN Traits',
          subcategory: row.dimension,
          metric: `${row.dimension}_score`,
          currentValue: parseFloat(row.org_score),
          benchmarkValue: parseFloat(row.benchmark_score),
          percentileRank: parseFloat(row.percentile_rank),
          improvement,
          recommendation
        };
      });
    } finally {
      client.release();
      await pool.end();
    }
  }

  /**
   * Refresh materialized views
   */
  public async refreshMaterializedViews(): Promise<void> {
    const pool = new Pool();
    const client = await pool.connect();
    
    try {
      await client.query('SELECT refresh_all_analytics_views()');
    } finally {
      client.release();
      await pool.end();
    }
  }

  /**
   * Historical trend calculations
   */
  public async calculateHistoricalTrends(
    metrics: string[],
    timeRange: { start: Date; end: Date }
  ): Promise<Record<string, TrendAnalysisResult>> {
    const results: Record<string, TrendAnalysisResult> = {};
    
    for (const metric of metrics) {
      try {
        results[metric] = await this.performTrendAnalysis(metric, timeRange);
      } catch (error) {
        console.error(`Error calculating trend for ${metric}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Data retention and archival
   */
  public async performDataRetention(retentionPeriod: number): Promise<void> {
    const pool = new Pool();
    const client = await pool.connect();
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionPeriod);
      
      // Archive old data before deletion
      await client.query(`
        INSERT INTO archived_data (
          table_name, archived_at, data_json, metadata
        )
        SELECT 
          'anonymized_assessments' as table_name,
          NOW() as archived_at,
          row_to_json(a.*) as data_json,
          '{"retention_policy": "standard", "archived_reason": "age"}'::jsonb as metadata
        FROM anonymized_assessments a
        WHERE a.created_at < $1
      `, [cutoffDate]);
      
      // Delete old data
      await client.query(`
        DELETE FROM anonymized_assessments 
        WHERE created_at < $1
      `, [cutoffDate]);
      
      // Clean up related data
      await client.query(`
        DELETE FROM anonymized_assessment_responses 
        WHERE created_at < $1
      `, [cutoffDate]);
      
      await client.query(`
        DELETE FROM anonymized_question_responses 
        WHERE created_at < $1
      `, [cutoffDate]);
      
      await client.query(`
        DELETE FROM anonymized_assessment_scores 
        WHERE created_at < $1
      `, [cutoffDate]);
      
    } finally {
      client.release();
      await pool.end();
    }
  }

  /**
   * Helper methods
   */
  private getTotalRecords(data: any): number {
    return (data.assessments?.length || 0) +
           (data.responses?.length || 0) +
           (data.questionResponses?.length || 0) +
           (data.scores?.length || 0);
  }

  private createBatches(data: any, batchSize: number): any[] {
    const batches: any[] = [];
    const totalRecords = this.getTotalRecords(data);
    
    for (let i = 0; i < totalRecords; i += batchSize) {
      const batch: any = {};
      
      if (data.assessments) {
        batch.assessments = data.assessments.slice(i, i + batchSize);
      }
      if (data.responses) {
        batch.responses = data.responses.slice(i, i + batchSize);
      }
      if (data.questionResponses) {
        batch.questionResponses = data.questionResponses.slice(i, i + batchSize);
      }
      if (data.scores) {
        batch.scores = data.scores.slice(i, i + batchSize);
      }
      
      batches.push(batch);
    }
    
    return batches;
  }

  private isInCache(key: string): boolean {
    if (!this.config.enableCaching) return false;
    
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    const isExpired = Date.now() - cached.timestamp > this.config.cacheTimeout;
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  private setCache(key: string, data: any): void {
    if (!this.config.enableCaching) return;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private getCache(key: string): any {
    if (!this.config.enableCaching) return null;
    
    const cached = this.cache.get(key);
    return cached ? cached.data : null;
  }

  /**
   * Close analytics operations
   */
  public async close(): Promise<void> {
    await this.db.close();
  }
}

/**
 * Create default analytics operations configuration
 */
export function createDefaultAnalyticsOperationsConfig(): AnalyticsOperationsConfig {
  return {
    batchSize: parseInt(process.env.ANALYTICS_BATCH_SIZE || '1000'),
    parallelProcessing: parseInt(process.env.ANALYTICS_PARALLEL_PROCESSING || '4'),
    retryAttempts: parseInt(process.env.ANALYTICS_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.ANALYTICS_RETRY_DELAY || '1000'),
    enableCaching: process.env.ANALYTICS_ENABLE_CACHING !== 'false',
    cacheTimeout: parseInt(process.env.ANALYTICS_CACHE_TIMEOUT || '300000'),
    enableMetrics: process.env.ANALYTICS_ENABLE_METRICS !== 'false',
    debugMode: process.env.ANALYTICS_DEBUG_MODE === 'true'
  };
}

/**
 * Factory function to create analytics operations instance
 */
export function createAnalyticsOperations(
  dbConfig?: Partial<AnalyticsDBConfig>,
  operationsConfig?: Partial<AnalyticsOperationsConfig>
): AnalyticsOperations {
  const defaultDbConfig = createDefaultAnalyticsDBConfig();
  const defaultOperationsConfig = createDefaultAnalyticsOperationsConfig();
  
  return new AnalyticsOperations(
    { ...defaultDbConfig, ...dbConfig },
    { ...defaultOperationsConfig, ...operationsConfig }
  );
}