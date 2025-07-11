/**
 * Query Optimization Strategies for Athena
 * Reduces costs and improves performance
 */

import { AthenaClient, GetQueryExecutionCommand } from '@aws-sdk/client-athena';

export interface QueryOptimizationTips {
  partitioning: string[];
  columnarFormat: string[];
  queryPatterns: string[];
  costSaving: string[];
}

export class AthenaQueryOptimizer {
  private readonly tips: QueryOptimizationTips = {
    partitioning: [
      'Always filter by partition columns (date, assessment_type) in WHERE clause',
      'Use partition projection to avoid MSCK REPAIR TABLE',
      'Partition by date (YYYY/MM/DD) for time-series queries',
      'Add assessment_type partition for type-specific analytics'
    ],
    columnarFormat: [
      'Use Parquet format - reduces scan size by 90%',
      'Enable SNAPPY compression for balance of speed and size',
      'Store nested data as structs/maps in single columns',
      'Avoid storing large text fields unless necessary'
    ],
    queryPatterns: [
      'Use LIMIT for exploratory queries',
      'Filter early with WHERE clauses on partitioned columns',
      'Use approximate functions (approx_distinct, approx_percentile)',
      'Avoid SELECT * - specify only needed columns',
      'Use WITH clauses for complex queries'
    ],
    costSaving: [
      'Enable query result caching (24 hours)',
      'Create smaller aggregate tables for dashboards',
      'Use workgroup query limits (1GB default)',
      'Schedule heavy queries during off-peak',
      'Monitor CloudWatch for expensive queries'
    ]
  };

  /**
   * Optimize a query for cost and performance
   */
  optimizeQuery(originalQuery: string): OptimizedQuery {
    const optimizations: string[] = [];
    let optimizedQuery = originalQuery;

    // Check for SELECT *
    if (originalQuery.match(/SELECT\s+\*/i)) {
      optimizations.push('Replace SELECT * with specific columns');
    }

    // Check for missing partition filters
    if (!originalQuery.match(/WHERE.*date/i) && originalQuery.match(/FROM.*assessment_events/i)) {
      optimizations.push('Add date partition filter to reduce scan');
    }

    // Check for missing LIMIT in exploratory queries
    if (!originalQuery.match(/LIMIT/i) && !originalQuery.match(/COUNT|SUM|AVG/i)) {
      optimizations.push('Add LIMIT clause for exploration');
      optimizedQuery += '\nLIMIT 1000';
    }

    // Suggest approximate functions
    if (originalQuery.match(/COUNT\s*\(\s*DISTINCT/i)) {
      optimizations.push('Consider approx_distinct() for faster results');
    }

    return {
      original: originalQuery,
      optimized: optimizedQuery,
      suggestions: optimizations,
      estimatedCostReduction: this.estimateCostReduction(optimizations)
    };
  }

  /**
   * Estimate cost reduction from optimizations
   */
  private estimateCostReduction(optimizations: string[]): number {
    let reduction = 0;
    
    if (optimizations.some(o => o.includes('SELECT *'))) reduction += 0.3;
    if (optimizations.some(o => o.includes('partition filter'))) reduction += 0.5;
    if (optimizations.some(o => o.includes('approx_'))) reduction += 0.2;
    
    return Math.min(reduction, 0.9);
  }

  /**
   * Generate cost-optimized query examples
   */
  getCostOptimizedExamples(): QueryExample[] {
    return [
      {
        name: 'Daily Active Users',
        description: 'Count unique users per day with partitioning',
        query: `
-- Cost-optimized: Uses date partition and approx_distinct
SELECT 
  date,
  approx_distinct(anonymous_user_id) as unique_users,
  COUNT(*) as total_sessions
FROM ioc_analytics.assessment_events
WHERE date >= date_format(current_date - interval '30' day, '%Y/%m/%d')
  AND date < date_format(current_date, '%Y/%m/%d')
GROUP BY date
ORDER BY date DESC;`,
        estimatedCost: 0.01,
        scanSize: '~100MB'
      },
      {
        name: 'OCEAN Score Distribution',
        description: 'Industry benchmarking with columnar optimization',
        query: `
-- Cost-optimized: Specific columns, partition filter, percentiles
WITH score_data AS (
  SELECT 
    industry,
    openness,
    conscientiousness,
    extraversion,
    agreeableness,
    neuroticism
  FROM ioc_analytics.ocean_scores
  WHERE year = date_format(current_date, '%Y')
    AND month = date_format(current_date, '%m')
    AND industry IN ('Technology', 'Healthcare', 'Finance')
)
SELECT 
  industry,
  approx_percentile(openness, 0.25) as openness_p25,
  approx_percentile(openness, 0.50) as openness_p50,
  approx_percentile(openness, 0.75) as openness_p75,
  approx_percentile(conscientiousness, 0.25) as conscientiousness_p25,
  approx_percentile(conscientiousness, 0.50) as conscientiousness_p50,
  approx_percentile(conscientiousness, 0.75) as conscientiousness_p75
FROM score_data
GROUP BY industry;`,
        estimatedCost: 0.02,
        scanSize: '~200MB'
      },
      {
        name: 'Completion Rate Analysis',
        description: 'Assessment completion rates by device type',
        query: `
-- Cost-optimized: Aggregated view with filters
SELECT 
  device,
  assessment_type,
  COUNT(*) as total_assessments,
  AVG(completion_time) as avg_completion_seconds,
  ROUND(AVG(CASE WHEN completion_time > 0 THEN 1 ELSE 0 END) * 100, 2) as completion_rate
FROM ioc_analytics.assessment_events
WHERE date >= date_format(current_date - interval '7' day, '%Y/%m/%d')
  AND assessment_type IN ('personality', 'cognitive')
GROUP BY device, assessment_type
HAVING total_assessments > 10
ORDER BY completion_rate DESC;`,
        estimatedCost: 0.005,
        scanSize: '~50MB'
      }
    ];
  }

  /**
   * Partition projection configuration
   */
  getPartitionProjectionConfig(): PartitionProjectionConfig {
    return {
      assessmentEvents: {
        'projection.enabled': 'true',
        'projection.date.type': 'date',
        'projection.date.range': '2024/01/01,NOW',
        'projection.date.format': 'yyyy/MM/dd',
        'projection.date.interval': '1',
        'projection.date.interval.unit': 'DAYS',
        'projection.assessment_type.type': 'enum',
        'projection.assessment_type.values': 'personality,cognitive,technical,behavioral'
      },
      oceanScores: {
        'projection.enabled': 'true',
        'projection.year.type': 'integer',
        'projection.year.range': '2024,2030',
        'projection.year.digits': '4',
        'projection.month.type': 'integer',
        'projection.month.range': '01,12',
        'projection.month.digits': '2'
      }
    };
  }

  /**
   * Workgroup configuration for cost control
   */
  getWorkgroupConfig(): WorkgroupConfig {
    return {
      bytesScannedCutoffPerQuery: 1073741824, // 1GB
      enforceWorkGroupConfiguration: true,
      publishCloudWatchMetricsEnabled: true,
      requesterPaysEnabled: false,
      resultConfiguration: {
        outputLocation: 's3://ioc-athena-query-results/',
        encryptionOption: 'SSE_S3'
      },
      resultConfigurationUpdates: {
        removeOutputLocation: false,
        removeEncryptionConfiguration: false
      }
    };
  }

  /**
   * Query performance metrics
   */
  async getQueryMetrics(queryExecutionId: string, client: AthenaClient): Promise<QueryMetrics> {
    const command = new GetQueryExecutionCommand({
      QueryExecutionId: queryExecutionId
    });

    const response = await client.send(command);
    const stats = response.QueryExecution?.Statistics;

    return {
      executionTimeMillis: stats?.EngineExecutionTimeInMillis || 0,
      dataScannedBytes: stats?.DataScannedInBytes || 0,
      dataScannedMB: (stats?.DataScannedInBytes || 0) / 1048576,
      estimatedCostUSD: ((stats?.DataScannedInBytes || 0) / 1099511627776) * 5, // $5 per TB
      queryQueueTimeMillis: stats?.QueryQueueTimeInMillis || 0,
      serviceProcesTimeMillis: stats?.ServiceProcessingTimeInMillis || 0
    };
  }
}

// Type definitions
interface OptimizedQuery {
  original: string;
  optimized: string;
  suggestions: string[];
  estimatedCostReduction: number;
}

interface QueryExample {
  name: string;
  description: string;
  query: string;
  estimatedCost: number;
  scanSize: string;
}

interface PartitionProjectionConfig {
  [tableName: string]: {
    [key: string]: string;
  };
}

interface WorkgroupConfig {
  bytesScannedCutoffPerQuery: number;
  enforceWorkGroupConfiguration: boolean;
  publishCloudWatchMetricsEnabled: boolean;
  requesterPaysEnabled: boolean;
  resultConfiguration: {
    outputLocation: string;
    encryptionOption: string;
  };
  resultConfigurationUpdates: {
    removeOutputLocation: boolean;
    removeEncryptionConfiguration: boolean;
  };
}

interface QueryMetrics {
  executionTimeMillis: number;
  dataScannedBytes: number;
  dataScannedMB: number;
  estimatedCostUSD: number;
  queryQueueTimeMillis: number;
  serviceProcesTimeMillis: number;
}