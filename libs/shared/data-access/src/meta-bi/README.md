# IOC Analytics Database System

A comprehensive, independent analytics database system for IOC's meta BI platform. This system provides anonymized assessment data storage, real-time analytics, and performance insights completely separate from operational data.

## 🏗️ Architecture Overview

The analytics system consists of six main components:

1. **Analytics Database** (`analytics-db.ts`) - Core database schema and operations
2. **Analytics Operations** (`analytics-operations.ts`) - Data ingestion and processing
3. **Query Interface** (`analytics-query-interface.ts`) - High-performance querying and analysis
4. **Database Management** (`database-management.ts`) - Migration, backup, and monitoring
5. **Performance Optimization** (`analytics-views.sql`) - Materialized views and indexing
6. **Main System** (`analytics-main.ts`) - Unified interface and orchestration

## 🚀 Quick Start

```typescript
import { createAnalyticsSystem } from '@ioc/lib/meta-bi';

// Initialize the analytics system
const analytics = createAnalyticsSystem({
  database: {
    host: 'analytics-db.company.com',
    port: 5432,
    database: 'ioc_analytics',
    username: 'analytics_user',
    password: 'secure_password',
    ssl: true
  },
  enableMonitoring: true,
  enableBackups: true,
  retentionDays: 90
});

await analytics.initialize();

// System is ready for analytics operations
const status = await analytics.getSystemStatus();
console.log('Analytics system ready:', status);
```

## 📊 Core Features

### Data Ingestion & Processing

```typescript
// Process anonymized assessment data
const result = await analytics.ingestData({
  assessments: anonymizedAssessments,
  responses: anonymizedResponses,
  questionResponses: anonymizedQuestionResponses,
  scores: anonymizedScores
});

console.log(`Processed ${result.recordsProcessed} records`);
```

### OCEAN Trait Analysis

```typescript
// Comprehensive OCEAN trait analysis
const analysis = await analytics.getOceanAnalysis(
  [{ field: 'industry_category', operator: 'eq', value: 'Technology' }],
  { start: new Date('2024-01-01'), end: new Date('2024-12-31') }
);

// Access trait distributions, correlations, and statistics
console.log('Trait means:', analysis.traits.map(t => ({ 
  trait: t.name, 
  average: t.average,
  percentiles: t.percentiles
})));

console.log('Trait correlations:', analysis.correlations);
```

### Performance Benchmarking

```typescript
// Get industry benchmarks and recommendations
const benchmarks = await analytics.getBenchmarks(
  'organization-hash-123',
  'Technology',
  'Medium'
);

console.log('Performance Index:', benchmarks.performanceIndex);
console.log('Industry Position:', benchmarks.benchmarks);
console.log('Recommendations:', benchmarks.recommendations);
```

### Custom Analytics Queries

```typescript
// Execute high-performance custom queries
const result = await analytics.query(`
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    dimension,
    AVG(score) as avg_score,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY score) as median_score,
    COUNT(*) as sample_size
  FROM anonymized_assessment_scores 
  WHERE created_at >= $1 
    AND dimension IN ('openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism')
  GROUP BY month, dimension
  ORDER BY month DESC, dimension
`, [new Date('2024-01-01')]);

console.log('Monthly trends:', result.data);
```

### Statistical Analysis

```typescript
// Perform statistical analysis on metrics
const completionAnalysis = await analytics.analyzeMetric(
  'completion_rate',
  { industry: 'Technology' },
  { start: new Date('2024-01-01'), end: new Date('2024-12-31') }
);

console.log('Completion Rate Statistics:', {
  mean: completionAnalysis.value,
  confidence: completionAnalysis.confidence,
  sampleSize: completionAnalysis.sampleSize
});

// Analyze trends over time
const trends = await analytics.analyzeTrends(
  'assessment_volume',
  { start: new Date('2024-01-01'), end: new Date('2024-12-31') },
  'monthly'
);

console.log('Trend Analysis:', {
  direction: trends.trend,
  correlation: trends.correlation,
  significance: trends.significance
});
```

### Data Export & Reporting

```typescript
// Export data in various formats
const exportResult = await analytics.exportData(
  'SELECT * FROM mv_monthly_ocean_distributions WHERE period_start >= $1',
  [new Date('2024-01-01')],
  'csv',
  { 
    filename: 'monthly_ocean_report.csv',
    includeHeaders: true,
    compression: 'gzip'
  }
);

console.log('Export completed:', exportResult.filename);
```

## 🗄️ Database Schema

The analytics database includes:

### Core Data Tables
- `anonymized_assessments` - Anonymized assessment metadata
- `anonymized_assessment_responses` - Anonymized response data
- `anonymized_question_responses` - Individual question responses
- `anonymized_assessment_scores` - OCEAN trait scores and percentiles

### Analytics Tables
- `daily_assessment_metrics` - Daily aggregated metrics
- `ocean_trait_distributions` - OCEAN trait statistical distributions
- `benchmarking_data` - Industry and organizational benchmarks
- `dual_ai_validation_metrics` - AI validation performance metrics
- `predictive_analytics_results` - ML model results and accuracy

### Monitoring Tables
- `processing_jobs` - Data processing job status
- `data_quality_metrics` - Data quality monitoring
- `system_health_metrics` - System performance metrics
- `audit_log` - Comprehensive audit trail

### Materialized Views
- `mv_daily_assessment_overview` - Daily assessment summary
- `mv_weekly_response_metrics` - Weekly response patterns
- `mv_monthly_ocean_distributions` - Monthly OCEAN statistics
- `mv_industry_benchmarks` - Industry performance benchmarks
- `mv_system_performance_dashboard` - Real-time system metrics

## ⚡ Performance Optimization

### Indexing Strategy
```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_assessment_org_industry_size 
ON anonymized_assessments (org_hash, industry_category, org_size_category, created_at);

-- Partial indexes for recent active data
CREATE INDEX idx_recent_assessments_published 
ON anonymized_assessments (created_at, org_hash) 
WHERE status = 'published' AND created_at >= NOW() - INTERVAL '6 months';

-- GIN indexes for JSONB columns
CREATE INDEX idx_daily_metrics_device_breakdown_gin 
ON daily_assessment_metrics USING gin(device_breakdown);
```

### Query Optimization
- **Materialized Views**: Pre-computed aggregations for common queries
- **Partitioning**: Time-based partitioning for large tables
- **Connection Pooling**: Optimized connection management
- **Query Caching**: Intelligent caching with TTL
- **Statistics**: Automatic table statistics updates

### Performance Monitoring
```typescript
// Get real-time system metrics
const metrics = await analytics.queryInterface.getSystemMetrics();

console.log('Performance Metrics:', {
  avgResponseTime: metrics.performance.avgResponseTime,
  cacheHitRate: metrics.performance.cacheHitRate,
  errorRate: metrics.performance.errorRate,
  cpuUsage: metrics.resources.cpuUsage,
  memoryUsage: metrics.resources.memoryUsage,
  dataQualityScore: metrics.dataQuality.overallScore
});
```

## 🔧 Database Management

### Schema Migrations
```typescript
// Run database migrations
await analytics.databaseManager.runMigrations('/path/to/migrations');

// Check migration status
const migrationHistory = await analytics.databaseManager.getMigrationHistory();
```

### Backup & Recovery
```typescript
// Create system backup
const backup = await analytics.createBackup();

console.log('Backup created:', {
  id: backup.id,
  size: backup.size,
  location: backup.location,
  checksum: backup.checksum
});

// Scheduled backups are automatic when enableBackups: true
```

### Monitoring & Alerts
```typescript
// Get scaling recommendations
const recommendations = await analytics.getScalingRecommendations();

recommendations.forEach(rec => {
  console.log(`${rec.priority.toUpperCase()}: ${rec.description}`);
  console.log(`Impact: ${rec.estimatedImpact}`);
  console.log(`Timeline: ${rec.timeline}`);
});

// System health check
const health = await analytics.healthCheck();
console.log('System Health:', health.status);
```

### Maintenance Operations
```typescript
// Perform system maintenance
await analytics.performMaintenance();

// This includes:
// - Table statistics updates
// - Vacuum and analyze operations
// - Materialized view refresh
// - Old data cleanup
// - Index optimization
```

## 🔒 Security & Privacy

### Data Anonymization
All operational data is anonymized before ingestion:
- **Hash-based IDs**: All identifiers use cryptographic hashes
- **No PII**: Personal information is stripped or categorized
- **Industry Categories**: Specific companies mapped to industry groups
- **Geographic Regions**: Precise locations mapped to regions
- **Organizational Sizes**: Exact counts mapped to size categories

### Access Control
- **Database-level Security**: Role-based access control
- **Connection Security**: SSL/TLS encryption
- **Audit Logging**: Comprehensive access and query logging
- **Data Retention**: Configurable retention and archival policies

## 📈 Analytics Capabilities

### OCEAN Trait Analysis
- Statistical distributions and percentiles
- Correlation analysis between traits
- Industry and organizational comparisons
- Longitudinal trend analysis
- Anomaly detection and outlier identification

### Performance Benchmarking
- Industry-specific benchmarks
- Organizational size comparisons
- Percentile rankings and positioning
- Performance improvement recommendations
- Competitive analysis insights

### Predictive Analytics
- Assessment completion prediction
- Quality score forecasting
- Trend projection and modeling
- Risk assessment and early warning
- Resource planning optimization

### Real-time Insights
- Live dashboard metrics
- Real-time aggregations
- Performance monitoring
- Data quality tracking
- System health monitoring

## 🛠️ Configuration

### Environment Variables
```bash
# Database Configuration
ANALYTICS_DB_HOST=localhost
ANALYTICS_DB_PORT=5432
ANALYTICS_DB_NAME=ioc_analytics
ANALYTICS_DB_USER=analytics_user
ANALYTICS_DB_PASSWORD=secure_password
ANALYTICS_DB_SSL=true

# Operations Configuration
ANALYTICS_BATCH_SIZE=1000
ANALYTICS_PARALLEL_PROCESSING=4
ANALYTICS_RETRY_ATTEMPTS=3
ANALYTICS_ENABLE_CACHING=true
ANALYTICS_CACHE_TIMEOUT=300000

# System Configuration
ANALYTICS_ENABLE_MONITORING=true
ANALYTICS_ENABLE_BACKUPS=true
ANALYTICS_BACKUP_SCHEDULE="0 2 * * *"
ANALYTICS_RETENTION_DAYS=90
ANALYTICS_DEBUG_MODE=false
```

### Database Configuration
```typescript
const config: AnalyticsSystemConfig = {
  database: {
    host: 'analytics-db.company.com',
    port: 5432,
    database: 'ioc_analytics',
    username: 'analytics_user',
    password: 'secure_password',
    ssl: true,
    pool: {
      min: 2,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    },
    partitioning: {
      enabled: true,
      strategy: 'time',
      interval: 'monthly'
    },
    compression: {
      enabled: true,
      algorithm: 'lz4'
    }
  },
  operations: {
    batchSize: 1000,
    parallelProcessing: 4,
    enableCaching: true,
    cacheTimeout: 300000
  },
  enableMonitoring: true,
  enableBackups: true,
  retentionDays: 90
};
```

## 📚 API Reference

### Main System Methods
- `initialize()` - Initialize the analytics system
- `getSystemStatus()` - Get comprehensive system status
- `ingestData(data)` - Process new anonymized data
- `query(sql, params, options)` - Execute custom queries
- `getOceanAnalysis(filters, timeRange)` - OCEAN trait analysis
- `getBenchmarks(orgHash, industry, size)` - Performance benchmarks
- `analyzeMetric(metric, filters, timeRange)` - Statistical analysis
- `analyzeTrends(metric, timeRange, interval)` - Trend analysis
- `exportData(query, params, format, options)` - Data export
- `createBackup()` - Create system backup
- `performMaintenance()` - System maintenance
- `healthCheck()` - Health status check
- `close()` - Shutdown system

### Query Interface Methods
- `executeQuery(query, params, options)` - High-performance queries
- `executeAggregationQuery(table, aggregation, options)` - Aggregations
- `getOceanTraitAnalysis(filters, timeRange)` - OCEAN analysis
- `getPerformanceBenchmarks(orgHash, industry, size)` - Benchmarking
- `exportData(query, params, options)` - Data export
- `generateReport(config)` - Automated reporting
- `getSystemMetrics()` - Real-time metrics

### Database Management Methods
- `runMigrations(path)` - Schema migrations
- `createBackup(config)` - Backup operations
- `getPerformanceMetrics()` - Performance monitoring
- `checkForAlerts()` - Alert monitoring
- `getScalingRecommendations()` - Scaling advice
- `performMaintenance()` - Database maintenance

## 🤝 Integration Examples

### With Anonymization Pipeline
```typescript
import { AnonymizationPipeline } from '@ioc/lib/meta-bi/anonymization';
import { createAnalyticsSystem } from '@ioc/lib/meta-bi';

const pipeline = new AnonymizationPipeline(/* config */);
const analytics = createAnalyticsSystem(/* config */);

// Process operational data through anonymization pipeline
const operationalData = await getOperationalData();
const anonymizedData = await pipeline.processData(operationalData);

// Ingest into analytics system
const result = await analytics.ingestData(anonymizedData);
```

### With Reporting Dashboard
```typescript
// Generate dashboard data
const dashboardData = {
  oceanTrends: await analytics.getOceanAnalysis(),
  performanceMetrics: await analytics.getSystemStatus(),
  industryBenchmarks: await analytics.getBenchmarks(),
  qualityMetrics: await analytics.query(`
    SELECT * FROM mv_system_performance_dashboard 
    WHERE hour >= NOW() - INTERVAL '24 hours'
    ORDER BY hour DESC
  `)
};

// Real-time updates via WebSocket
websocket.send(JSON.stringify(dashboardData));
```

### With ML Pipeline
```typescript
// Export training data for ML models
const trainingData = await analytics.exportData(`
  SELECT 
    dimension,
    score,
    industry_category,
    org_size_category,
    time_spent_seconds,
    completion_percentage
  FROM anonymized_assessment_scores s
  JOIN anonymized_assessment_responses r ON s.response_hash = r.id
  JOIN anonymized_assessments a ON s.assessment_hash = a.id
  WHERE s.created_at >= $1
`, [new Date('2024-01-01')], 'json');

// Train model and store results
const modelResults = await trainModel(trainingData);
await analytics.query(`
  INSERT INTO predictive_analytics_results (
    model_name, model_version, prediction_target, accuracy_metrics
  ) VALUES ($1, $2, $3, $4)
`, [modelResults.name, modelResults.version, modelResults.target, modelResults.metrics]);
```

## 🚨 Troubleshooting

### Common Issues

1. **Connection Issues**
   ```typescript
   // Check database connectivity
   const health = await analytics.healthCheck();
   if (!health.checks.database) {
     console.error('Database connection failed');
     // Check connection parameters and network
   }
   ```

2. **Performance Issues**
   ```typescript
   // Get scaling recommendations
   const recommendations = await analytics.getScalingRecommendations();
   recommendations.forEach(rec => {
     if (rec.priority === 'urgent') {
       console.error('Urgent scaling needed:', rec.description);
     }
   });
   ```

3. **Data Quality Issues**
   ```typescript
   // Monitor data quality
   const status = await analytics.getSystemStatus();
   if (status.database.dataQualityScore < 80) {
     console.warn('Data quality below threshold');
     // Check data ingestion pipeline
   }
   ```

### Debug Mode
Enable debug mode for detailed logging:
```typescript
const analytics = createAnalyticsSystem({
  debugMode: true
});
```

### Monitoring & Alerts
The system automatically monitors:
- Connection usage and performance
- Query execution times
- Data quality metrics
- System resource usage
- Cache hit rates
- Error rates

Critical alerts are automatically logged and can trigger notifications.

## 📝 License

This analytics database system is part of the IOC framework and follows the same licensing terms.

---

For more detailed information about specific components, refer to the individual module documentation and inline code comments.