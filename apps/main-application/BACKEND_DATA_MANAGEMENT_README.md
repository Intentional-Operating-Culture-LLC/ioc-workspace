# Backend Data Management System

## Overview

This document describes the comprehensive backend data management system for the IOC Assessment Platform's interactive dashboard with weekly reporting capabilities. The system provides real-time analytics, automated report generation, performance monitoring, and extensive caching for optimal user experience.

## Architecture Overview

### Core Components

1. **Database Schema** - Comprehensive tables for metrics, reports, and analytics
2. **API Layer** - RESTful endpoints for dashboard data and real-time metrics
3. **WebSocket Service** - Real-time dashboard updates
4. **Scheduled Jobs** - Automated data collection and processing
5. **Report Generation Engine** - Template-based report automation
6. **Caching Layer** - Multi-tier caching for performance
7. **Performance Optimization** - Database tuning and monitoring

## Database Schema

### Primary Tables

#### Dashboard Metrics (`dashboard_metrics`)
Stores flexible metrics with dimensions and metadata:
```sql
- id (UUID, Primary Key)
- organization_id (UUID, Foreign Key)
- metric_type (VARCHAR) - 'user_engagement', 'assessment_completion', etc.
- metric_name (VARCHAR) - Specific metric identifier
- metric_value (DECIMAL) - Numeric value
- metric_unit (VARCHAR) - 'percentage', 'count', 'score', etc.
- dimension_1/2/3 (VARCHAR) - Flexible dimensions
- metadata (JSONB) - Additional context
- recorded_at (TIMESTAMP) - When metric was recorded
```

#### Weekly Reports (`weekly_reports`)
Main reports table with status tracking:
```sql
- id (UUID, Primary Key)
- organization_id (UUID, Foreign Key)
- report_period_start/end (DATE) - Report time range
- title (VARCHAR) - Report title
- status (VARCHAR) - 'draft', 'generated', 'published', etc.
- executive_summary (TEXT) - Summary content
- template_id (UUID) - Report template reference
```

#### Report Sections (`report_sections`)
Flexible report content structure:
```sql
- id (UUID, Primary Key)
- report_id (UUID, Foreign Key)
- section_type (VARCHAR) - 'metrics_summary', 'ocean_insights', etc.
- section_title (VARCHAR) - Display title
- content (TEXT) - Section content
- charts_data (JSONB) - Chart configurations
- tables_data (JSONB) - Table data
- insights (JSONB) - Key insights
```

#### User Activity Logs (`user_activity_logs`)
Detailed user engagement tracking:
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- organization_id (UUID, Foreign Key)
- activity_type (VARCHAR) - 'login', 'assessment_start', etc.
- session_id (VARCHAR) - Session tracking
- duration_seconds (INTEGER) - Activity duration
- metadata (JSONB) - Additional context
```

### Performance Tables

#### Assessment Aggregations (`assessment_aggregations`)
Pre-calculated aggregations for faster queries:
```sql
- organization_id (UUID)
- aggregation_type (VARCHAR) - 'ocean_department', 'ocean_role'
- aggregation_key (VARCHAR) - Department/role name
- ocean_scores (JSONB) - Pre-calculated averages
- facet_scores (JSONB) - Facet breakdowns
```

#### System Performance Metrics (`system_performance_metrics`)
System health and performance tracking:
```sql
- metric_type (VARCHAR) - 'response_time', 'error_rate', etc.
- service_name (VARCHAR) - 'api', 'database', 'cache'
- metric_value (DECIMAL) - Performance value
- endpoint (VARCHAR) - Specific endpoint if applicable
```

## API Endpoints

### Dashboard APIs

#### GET `/api/dashboard/summary`
Returns comprehensive dashboard summary:
```json
{
  "organization_id": "uuid",
  "period_start": "2024-01-01",
  "period_end": "2024-01-07",
  "user_stats": {
    "total_users": 150,
    "active_users": 120,
    "engagement_rate": 80.0
  },
  "assessment_stats": {
    "total_assessments": 45,
    "completed_assessments": 38,
    "completion_rate": 84.4
  }
}
```

#### GET `/api/dashboard/metrics`
Get filtered dashboard metrics:
- Query Parameters: `metric_type`, `metric_name`, `period_start`, `period_end`, `limit`

#### GET `/api/dashboard/realtime`
Real-time dashboard data:
```json
{
  "active_users_15min": 12,
  "active_users_today": 45,
  "activities_last_hour": 234,
  "system_status": "healthy"
}
```

#### GET `/api/dashboard/trends`
Metric trend analysis:
```json
{
  "metric_type": "user_engagement",
  "trend_data": [
    {
      "week_start": "2024-01-01",
      "value": 85.2,
      "change_percentage": 3.4
    }
  ],
  "overall_trend": "positive"
}
```

### Reports APIs

#### GET `/api/reports`
List organization reports with filtering

#### POST `/api/reports`
Create new report:
```json
{
  "title": "Weekly Performance Report",
  "report_period_start": "2024-01-01",
  "report_period_end": "2024-01-07",
  "template_id": "uuid"
}
```

#### POST `/api/reports/{id}/generate`
Generate report content with automatic data population

#### GET `/api/reports/{id}/export`
Export report in various formats:
- Query Parameters: `format` (pdf, excel, csv, html), `include_charts`, `include_raw_data`

### System APIs

#### GET `/api/system/performance`
System performance metrics and monitoring

#### GET `/api/system/jobs`
Scheduled job status and logs

#### POST `/api/system/jobs`
Execute job manually

## Scheduled Jobs

### Automated Data Collection Jobs

#### `calculate_all_metrics` (Every 6 hours)
- Calculates dashboard metrics for all organizations
- Updates user engagement, assessment completion rates
- Computes OCEAN score averages and trends

#### `generate_all_aggregations` (Daily at 2 AM)
- Creates pre-calculated aggregations by department/role
- Speeds up dashboard queries significantly
- Maintains rolling 90-day aggregation history

#### `generate_weekly_reports` (Monday at 8 AM)
- Automatically creates weekly reports for all organizations
- Populates standard sections with data
- Sets status to 'generated' for review

#### `monitor_system_performance` (Every 5 minutes)
- Records database performance metrics
- Monitors response times and error rates
- Tracks resource usage and connection counts

#### `cleanup_old_data` (Sunday at 3 AM)
- Archives old dashboard metrics to history tables
- Cleans up activity logs older than 90 days
- Removes old job logs and temporary data

### Job Configuration
Jobs are configured in `scheduled_job_config` table:
```sql
- job_name (VARCHAR) - Unique job identifier
- schedule_expression (VARCHAR) - Cron expression
- is_active (BOOLEAN) - Enable/disable job
- failure_count (INTEGER) - Track failures
- max_failures (INTEGER) - Auto-disable threshold
```

## Report Generation Engine

### Template System
Reports use flexible templates stored in `report_templates`:
```json
{
  "sections_config": {
    "sections": [
      {
        "type": "metrics_summary",
        "title": "Key Metrics",
        "include_charts": true
      },
      {
        "type": "ocean_insights",
        "title": "Personality Insights",
        "include_aggregations": true
      }
    ]
  }
}
```

### Content Generation
The `ReportGenerator` service:
1. Fetches organization data for report period
2. Calculates metrics and trends
3. Generates charts and visualizations
4. Applies template structure
5. Creates executive summary
6. Stores sections in database

### Export Formats
Supports multiple export formats:
- **PDF**: Full-featured reports with charts
- **Excel**: Spreadsheet format with multiple worksheets
- **CSV**: Tabular data export
- **HTML**: Web-friendly format
- **JSON**: Structured data for integrations

## Caching Strategy

### Multi-Tier Caching
The system implements multiple cache layers:

#### 1. Dashboard Cache (60-second TTL)
```typescript
const dashboardCache = new CacheService({
  defaultTTL: 60,
  maxKeys: 500
});
```

#### 2. Metrics Cache (5-minute TTL)
```typescript
const metricsCache = new CacheService({
  defaultTTL: 300,
  maxKeys: 1000
});
```

#### 3. Reports Cache (30-minute TTL)
```typescript
const reportsCache = new CacheService({
  defaultTTL: 1800,
  maxKeys: 200
});
```

### Cache Keys
Standardized cache key patterns:
- Dashboard: `dashboard:{org_id}:{type}`
- Metrics: `metrics:{org_id}:{metric_type}:{period}`
- Reports: `report:{report_id}`

### Cache Invalidation
Automatic invalidation on data changes:
```typescript
CacheHelper.invalidateOrganizationCache(organizationId);
```

## Performance Optimizations

### Database Optimizations

#### Materialized Views
Pre-computed views for frequent queries:
- `mv_organization_summary`: Organization-level metrics
- `mv_ocean_metrics_summary`: OCEAN assessment aggregations

#### Optimized Indexes
Strategic indexes for dashboard queries:
```sql
-- Composite index for dashboard metrics
CREATE INDEX idx_dashboard_metrics_composite 
ON dashboard_metrics(organization_id, metric_type, recorded_at DESC);

-- Covering index for assessments
CREATE INDEX idx_assessments_covering
ON assessments(organization_id, status, created_at DESC)
INCLUDE (id, user_id, updated_at);
```

#### Table Partitioning
Automatic partitioning for large tables:
- `user_activity_logs` partitioned by month
- Automatic creation of future partitions
- Cleanup of old partitions

### Performance Monitoring

#### Automated Monitoring
Functions for performance tracking:
- `get_cache_hit_ratio()`: Database cache performance
- `get_slow_queries()`: Identify performance bottlenecks
- `check_performance_alerts()`: Automated alerting

#### Performance Snapshots
Regular performance data collection:
```sql
CREATE TABLE performance_monitoring (
  check_time TIMESTAMP,
  cache_hit_ratio NUMERIC,
  active_connections INTEGER,
  slow_query_count INTEGER,
  alerts JSONB
);
```

## WebSocket Real-Time Updates

### Connection Management
The `WebSocketService` manages real-time connections:
```typescript
// Initialize connection
const connection = await webSocketService.initializeConnection({
  organizationId,
  userId,
  request
});

// Subscribe to updates
await webSocketService.subscribe(connectionId, {
  type: 'dashboard',
  filters: { organizationId }
});
```

### Message Types
Real-time message types:
- `dashboard_update`: Dashboard data changes
- `metric_update`: New metrics calculated
- `system_alert`: System health alerts
- `user_activity`: User engagement updates
- `report_ready`: Report generation complete

### Broadcasting
Efficient message broadcasting:
```typescript
// Broadcast to organization subscribers
await webSocketService.broadcastMessage({
  type: 'dashboard_update',
  payload: dashboardData,
  organizationId
});
```

## Monitoring and Alerting

### Health Checks
Automated system health monitoring:
```typescript
const health = await systemService.getSystemHealth();
// Returns: 'healthy', 'warning', or 'critical'
```

### Alert Conditions
- Cache hit ratio < 90%
- Connection usage > 80%
- Slow queries > 5 seconds
- Job failures > threshold
- Error rate > 5%

### Performance Reports
Comprehensive performance reporting:
```typescript
const report = await systemService.getPerformanceReport({
  periodStart: '2024-01-01',
  periodEnd: '2024-01-07'
});
```

## Security Considerations

### Row Level Security (RLS)
All tables implement RLS policies:
```sql
CREATE POLICY "dashboard_metrics_org_access" ON dashboard_metrics
USING (organization_id IN (
  SELECT organization_id FROM user_organizations 
  WHERE user_id = auth.uid() AND is_active = true
));
```

### API Authentication
All APIs require authentication and organization access validation.

### Data Privacy
- Personal data anonymization in aggregations
- Secure handling of sensitive metrics
- Audit trails for data access

## Usage Examples

### Fetching Dashboard Data
```typescript
import { DashboardService } from '@ioc/lib';

const dashboardService = new DashboardService(supabase);

// Get organization summary
const summary = await dashboardService.getSummary({
  organizationId: 'org-uuid',
  periodDays: 7
});

// Get real-time data
const realtimeData = await dashboardService.getRealtimeData({
  organizationId: 'org-uuid'
});
```

### Generating Reports
```typescript
import { ReportGenerator } from '@ioc/lib';

const reportGenerator = new ReportGenerator(supabase);

// Generate weekly report
const result = await reportGenerator.generateReport({
  reportId: 'report-uuid',
  organizationId: 'org-uuid',
  exportFormat: 'pdf'
});
```

### Caching Data
```typescript
import { CacheHelper, dashboardCache } from '@ioc/lib';

// Cache dashboard summary
const summary = await CacheHelper.getCachedDashboardSummary(
  organizationId,
  () => dashboardService.getSummary({ organizationId })
);
```

## Deployment Considerations

### Database Migrations
Apply migrations in order:
1. `20250110_dashboard_metrics_schema.sql`
2. `20250110_dashboard_functions.sql`
3. `20250110_scheduled_jobs.sql`
4. `20250110_performance_optimizations.sql`

### Environment Configuration
Required environment variables:
- `DATABASE_URL`: PostgreSQL connection
- `REDIS_URL`: Redis cache (if using external cache)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key

### Monitoring Setup
1. Enable pg_stat_statements extension
2. Configure automated backups
3. Set up log aggregation
4. Configure alerting thresholds

## Maintenance Tasks

### Daily Maintenance
- Refresh materialized views
- Update table statistics
- Monitor performance alerts
- Review job execution logs

### Weekly Maintenance
- Analyze slow queries
- Review cache hit ratios
- Clean up old data
- Update aggregations

### Monthly Maintenance
- Review and optimize indexes
- Analyze storage usage
- Update performance baselines
- Security audit

## Troubleshooting

### Common Issues

#### Slow Dashboard Loading
1. Check cache hit ratios
2. Review materialized view freshness
3. Analyze slow queries
4. Monitor connection usage

#### Failed Report Generation
1. Check job logs in `scheduled_job_logs`
2. Verify template configuration
3. Review data availability
4. Check storage space

#### High Memory Usage
1. Monitor connection counts
2. Review query complexity
3. Check for memory leaks
4. Analyze cache usage

### Performance Tuning
1. Use `EXPLAIN ANALYZE` for slow queries
2. Monitor `pg_stat_statements` for bottlenecks
3. Review index usage with `pg_stat_user_indexes`
4. Check buffer cache efficiency

## Future Enhancements

### Planned Features
- Machine learning-based trend prediction
- Advanced visualization options
- Custom metric definitions
- Multi-tenant data isolation
- Advanced export formats
- Mobile dashboard optimization

### Scalability Improvements
- Read replicas for reporting
- Horizontal partitioning
- Distributed caching
- Event-driven architecture
- Microservices decomposition

This backend data management system provides a robust foundation for the IOC Assessment Platform's analytics and reporting needs, with emphasis on performance, scalability, and maintainability.