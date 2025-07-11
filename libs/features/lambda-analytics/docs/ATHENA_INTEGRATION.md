# Athena Integration Guide for IOC Analytics

## Overview

AWS Athena provides serverless SQL analytics on IOC's S3 data lake, enabling powerful business intelligence without managing infrastructure. This integration is designed to activate when IOC reaches $5K MRR, providing cost-effective analytics at scale.

## When to Enable Athena

### Activation Criteria
- **MRR Threshold**: $5,000+ monthly recurring revenue
- **Data Volume**: 10,000+ assessments per month
- **Query Frequency**: 100+ analytics queries per month
- **Team Size**: Analytics team or dedicated BI resource

### Pre-Athena Alternatives (< $5K MRR)
1. **CloudWatch Insights**: For operational metrics
2. **S3 Select**: For simple queries on specific files
3. **Lambda Analytics**: For pre-computed metrics
4. **QuickSight Direct**: Direct S3 visualization

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Lambda    │────▶│  S3 Data     │────▶│    Glue      │
│ Processors  │     │    Lake      │     │   Catalog    │
└─────────────┘     └──────────────┘     └──────────────┘
                           │                      │
                           ▼                      ▼
                    ┌──────────────┐     ┌──────────────┐
                    │   Athena     │────▶│  QuickSight  │
                    │   Queries    │     │  Dashboards  │
                    └──────────────┘     └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    APIs      │
                    │  & Exports   │
                    └──────────────┘
```

## Table Schemas

### 1. Assessment Events Table
```sql
CREATE EXTERNAL TABLE assessment_events (
  anonymous_user_id string,
  session_id string,
  assessment_id string,
  timestamp timestamp,
  assessment_type string,
  version string,
  completion_time int,
  device string,
  platform string,
  age_range string,
  industry string,
  role string,
  experience string,
  region string
)
PARTITIONED BY (
  date string,
  assessment_type string
)
STORED AS PARQUET
LOCATION 's3://ioc-analytics-data-lake/assessments/'
```

### 2. OCEAN Scores Table
```sql
CREATE EXTERNAL TABLE ocean_scores (
  anonymous_user_id string,
  assessment_id string,
  timestamp timestamp,
  openness double,
  conscientiousness double,
  extraversion double,
  agreeableness double,
  neuroticism double,
  consistency double,
  completeness double,
  facets map<string,struct<score:double,responses:int,std_dev:double>>,
  dark_side_indicators map<string,double>,
  industry string,
  role string,
  experience string
)
PARTITIONED BY (
  year string,
  month string
)
STORED AS PARQUET
LOCATION 's3://ioc-analytics-data-lake/ocean_scores/'
```

## Cost Optimization Strategies

### 1. Partitioning Strategy
```sql
-- Always filter by partition columns
WHERE date >= '2024/01/01' 
  AND assessment_type = 'personality'
```

### 2. Columnar Format Benefits
- **Parquet**: 90% reduction in scan size
- **Compression**: SNAPPY for speed/size balance
- **Column Pruning**: Only scan needed columns

### 3. Query Optimization
```sql
-- ❌ Bad: Scans entire table
SELECT * FROM assessment_events

-- ✅ Good: Filtered and limited
SELECT anonymous_user_id, timestamp, assessment_type
FROM assessment_events
WHERE date = '2024/01/15'
  AND assessment_type = 'personality'
LIMIT 1000
```

### 4. Approximate Functions
```sql
-- Use approx_distinct instead of COUNT(DISTINCT)
SELECT approx_distinct(anonymous_user_id) as unique_users
FROM assessment_events
WHERE date >= '2024/01/01'
```

## Essential Queries Library

### 1. Daily Active Users (Cost: ~$0.01)
```sql
SELECT 
  date,
  approx_distinct(anonymous_user_id) as unique_users,
  COUNT(*) as total_sessions
FROM assessment_events
WHERE date >= date_format(current_date - interval '30' day, '%Y/%m/%d')
GROUP BY date
ORDER BY date DESC
```

### 2. OCEAN Score Percentiles (Cost: ~$0.02)
```sql
SELECT 
  industry,
  approx_percentile(openness, 0.25) as openness_p25,
  approx_percentile(openness, 0.50) as openness_p50,
  approx_percentile(openness, 0.75) as openness_p75
FROM ocean_scores
WHERE year = '2024' AND month = '01'
GROUP BY industry
```

### 3. Completion Rate Analysis (Cost: ~$0.005)
```sql
SELECT 
  device,
  assessment_type,
  COUNT(*) as total,
  AVG(CASE WHEN completion_time > 0 THEN 1 ELSE 0 END) as completion_rate
FROM assessment_events
WHERE date >= date_format(current_date - interval '7' day, '%Y/%m/%d')
GROUP BY device, assessment_type
```

## Cost Control Implementation

### 1. Workgroup Configuration
```typescript
{
  bytesScannedCutoffPerQuery: 1073741824, // 1GB limit
  enforceWorkGroupConfiguration: true,
  publishCloudWatchMetricsEnabled: true,
  resultConfiguration: {
    outputLocation: 's3://ioc-athena-query-results/',
    encryptionOption: 'SSE_S3'
  }
}
```

### 2. S3 Lifecycle Rules
```typescript
{
  Rules: [{
    ID: 'delete-old-query-results',
    Status: 'Enabled',
    Expiration: { Days: 30 },
    Transitions: [
      { Days: 7, StorageClass: 'STANDARD_IA' },
      { Days: 14, StorageClass: 'GLACIER_IR' }
    ]
  }]
}
```

### 3. CloudWatch Alarms
- **Monthly Budget**: Alert at 80% of $50 budget
- **Query Cost**: Alert if single query > $0.50
- **Failed Queries**: Alert if failure rate > 10%

## Integration Points

### 1. QuickSight Integration
```typescript
// Create data source
await createQuickSightDataSource('ioc-analytics');

// Create datasets
await createQuickSightDataSet('assessment_events');
await createQuickSightDataSet('ocean_scores');
```

### 2. Lambda Scheduled Queries
```typescript
// Hourly metrics refresh
exports.handler = async (event) => {
  const queries = [
    'user_growth_hourly',
    'platform_performance',
    'assessment_quality'
  ];
  
  for (const queryId of queries) {
    await executeScheduledQuery(queryId);
  }
};
```

### 3. API Endpoints
```typescript
POST /api/analytics/query
{
  "query": "SELECT * FROM ocean_scores WHERE industry = {{industry}}",
  "parameters": { "industry": "Technology" },
  "format": "json"
}
```

### 4. Export Capabilities
- **CSV**: For spreadsheet analysis
- **Excel**: For business reports
- **JSON**: For API integration
- **Parquet**: For data science workflows

## Cost Projections

### Monthly Cost Breakdown (at scale)
- **Query Execution**: ~$30-50/month
- **S3 Storage**: ~$5-10/month (Parquet)
- **Data Transfer**: ~$5-10/month
- **Total**: ~$40-70/month

### Cost per Query Type
- **Simple aggregations**: $0.001-0.01
- **Complex joins**: $0.02-0.05
- **Full table scans**: $0.10-0.50
- **Cached queries**: $0.00

## Implementation Checklist

### Phase 1: Setup (Week 1)
- [ ] Run setup script when MRR >= $5K
- [ ] Verify table creation
- [ ] Test partition projection
- [ ] Configure workgroup limits

### Phase 2: Integration (Week 2)
- [ ] Connect QuickSight
- [ ] Create initial dashboards
- [ ] Setup scheduled queries
- [ ] Implement API endpoints

### Phase 3: Optimization (Week 3-4)
- [ ] Monitor query costs
- [ ] Optimize expensive queries
- [ ] Create aggregate tables
- [ ] Train team on best practices

## Monitoring & Maintenance

### Daily Tasks
- Check CloudWatch cost alarms
- Review failed queries
- Monitor data freshness

### Weekly Tasks
- Analyze query patterns
- Optimize top 10 queries
- Update documentation
- Review cost trends

### Monthly Tasks
- Cost analysis report
- Performance optimization
- Capacity planning
- ROI assessment

## Troubleshooting

### Common Issues

1. **High Query Costs**
   - Check for missing partition filters
   - Look for SELECT * queries
   - Verify columnar format usage

2. **Slow Queries**
   - Check data skew
   - Verify partition projection
   - Consider aggregate tables

3. **Failed Queries**
   - Check permissions
   - Verify schema changes
   - Review query syntax

## Best Practices

1. **Always use partition filters**
2. **Specify exact columns needed**
3. **Use LIMIT for exploration**
4. **Cache frequently used results**
5. **Monitor costs daily**
6. **Document all queries**
7. **Version control SQL**
8. **Test in dev first**

## ROI Metrics

### Business Value
- **Faster decisions**: Real-time analytics
- **Better insights**: SQL flexibility
- **Cost savings**: vs. dedicated analytics DB
- **Scalability**: Grows with business
- **Integration**: Works with existing tools

### Success Metrics
- Query response time < 5 seconds
- Cost per query < $0.05
- Dashboard refresh < 1 minute
- User satisfaction > 90%
- ROI > 10x cost

## Next Steps

1. **Enable at $5K MRR**: Run `npm run setup:athena`
2. **Configure dashboards**: Work with BI team
3. **Train users**: SQL best practices
4. **Monitor costs**: Daily for first month
5. **Optimize**: Based on usage patterns