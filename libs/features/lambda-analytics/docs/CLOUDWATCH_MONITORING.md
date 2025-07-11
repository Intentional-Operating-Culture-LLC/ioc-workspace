# CloudWatch Monitoring for IOC Analytics

## Overview

This lean monitoring system is designed to maximize AWS Free Tier benefits while providing essential business insights. The system automatically scales monitoring capabilities as Monthly Recurring Revenue (MRR) grows.

## Free Tier Monitoring (Current State)

### Included Resources
- **10 Custom Metrics** (all essential KPIs)
- **3 Dashboards** (Business, System Health, Cost Tracking)
- **10 Alarms** (critical alerts only)
- **5GB Log Ingestion** per month
- **7 Days Log Retention**

### Essential Metrics Tracked

#### Business Metrics (5)
1. **AssessmentCompleted** - Total assessment completions
2. **DualAIValidationSuccess** - Dual AI validation success rate
3. **DailyActiveUsers** - Unique daily active users
4. **RevenueTracked** - Daily revenue tracking
5. **TrialConversion** - Trial to paid conversion rate

#### System Metrics (5)
1. **LambdaErrors** - Total Lambda function errors
2. **APILatency** - Average API response time
3. **S3ProcessingTime** - S3 data processing duration
4. **CostPerAssessment** - Calculated cost per assessment
5. **ErrorRate** - Overall system error percentage

## Dashboard Configurations

### 1. Business KPIs Dashboard
- Assessment completion trends
- Revenue tracking (daily/weekly)
- Active user metrics
- OCEAN score distribution
- Conversion funnel analysis

### 2. System Health Dashboard
- Error rate monitoring
- API performance metrics
- Lambda function health
- Service availability

### 3. Cost Tracking Dashboard
- Cost per assessment
- Service cost breakdown
- Daily cost targets
- Budget alerts

## Cost Optimization Strategies

### Log Management
```typescript
// Only log essential events
const essentialEvents = [
  'ASSESSMENT_COMPLETED',
  'ERROR',
  'REVENUE_TRACKED',
  'USER_REGISTERED',
  'TRIAL_CONVERTED',
  'OCEAN_CALCULATED'
];

// Exclude verbose logs
const excludePatterns = [
  'DEBUG',
  'TRACE',
  'HealthCheck'
];
```

### Metric Batching
- Batch custom metrics in groups of 20
- Aggregate metrics before publishing
- Use 60-second resolution (free tier)

### Smart Alerting
- Critical alerts only (< 5% of metrics)
- Email alerts instead of SMS
- Weekly digest reports vs real-time

## Growth-Based Scaling

### Tier 1: $500 MRR
**Add 5 custom metrics:**
- User retention (30-day)
- Assessment completion time
- Industry breakdown
- Feature adoption rates
- Cohort analysis

**Enhancements:**
- 14-day log retention
- 5 dashboards total
- Industry-specific insights

### Tier 2: $2,000 MRR
**Add 10 custom metrics:**
- Detailed API metrics (by endpoint)
- Database performance
- Cache hit rates
- Queue depths
- User session analytics

**Enhancements:**
- Detailed monitoring enabled
- 30-day log retention
- Performance dashboard
- Anomaly detection prep

### Tier 3: $5,000 MRR
**Add 25 custom metrics:**
- ML-based anomaly detection
- Predictive scaling metrics
- User behavior patterns
- Revenue forecasting
- Advanced funnel analysis

**Enhancements:**
- 60-day log retention
- 15 dashboards
- Real-time alerting
- Custom metric APIs

### Tier 4: $10,000+ MRR
**Full Observability:**
- Unlimited custom metrics
- Distributed tracing
- Real-time analytics
- Advanced dashboards
- Full APM integration

## Implementation Guide

### 1. Initial Setup
```bash
# Deploy monitoring infrastructure
npm run deploy:monitoring

# Create dashboards
npm run monitoring:create-dashboards

# Set up alarms
npm run monitoring:create-alarms
```

### 2. Metric Publishing
```typescript
import { MetricAggregator } from './monitoring';

const aggregator = new MetricAggregator();

// Track business event
aggregator.trackAssessmentCompletion(
  userId,
  oceanScores,
  dualAIValidated
);

// Publish aggregated metrics
await aggregator.publishAggregatedMetrics();
```

### 3. Log Optimization
```typescript
import { LogOptimizer } from './monitoring';

const logger = new LogOptimizer(
  '/aws/lambda/ioc-analytics',
  'production'
);

// Log essential events only
logger.logAssessmentCompleted({
  userId,
  assessmentId,
  oceanScores,
  dualAIValidated,
  duration
});
```

### 4. Weekly Reporting
```typescript
import { WeeklyReporter } from './monitoring';

const reporter = new WeeklyReporter();

// Generate and send weekly report
await reporter.generateWeeklyReport(
  logGroupName,
  s3Bucket,
  ['team@iocframework.com']
);
```

## Monitoring Costs

### Free Tier Usage
| Service | Free Tier | Usage | Cost |
|---------|-----------|-------|------|
| Custom Metrics | 10 | 10 | $0 |
| Dashboards | 3 | 3 | $0 |
| Log Ingestion | 5GB | ~3GB | $0 |
| Alarms | 10 | 4 | $0 |
| **Total** | - | - | **$0/month** |

### Growth Projections
| MRR | Metrics | Dashboards | Logs | Est. Cost |
|-----|---------|------------|------|-----------|
| $0-500 | 10 | 3 | 5GB | $0 |
| $500-2K | 15 | 5 | 10GB | ~$5/mo |
| $2K-5K | 25 | 8 | 25GB | ~$20/mo |
| $5K-10K | 50 | 15 | 50GB | ~$75/mo |
| $10K+ | 100+ | 20+ | 100GB+ | ~$200/mo |

## Alert Configuration

### Critical Alerts (Free Tier)
1. **High Error Rate** - > 5% for 10 minutes
2. **High Cost Per Assessment** - > $0.10
3. **Low Dual AI Success** - < 80% success rate
4. **High API Latency** - > 1 second

### Email Alert Template
```
Subject: IOC Analytics Alert - {AlarmName}

Alert: {AlarmDescription}
Metric: {MetricName}
Threshold: {Threshold}
Current Value: {StateValue}
Time: {StateChangeTime}

Action Required: Review CloudWatch dashboard
```

## Best Practices

### 1. Metric Naming
- Use consistent namespaces: `IOC/Business`, `IOC/System`
- Clear, descriptive metric names
- Include units in metric configuration

### 2. Dashboard Design
- Group related metrics
- Use appropriate visualizations
- Include context and thresholds
- Keep layouts clean and focused

### 3. Cost Management
- Monitor metric usage weekly
- Archive old logs to S3
- Use metric math vs custom metrics
- Implement sampling for non-critical logs

### 4. Scaling Strategy
- Plan metric additions with MRR milestones
- Automate dashboard updates
- Review and optimize quarterly
- Document all custom metrics

## Troubleshooting

### Common Issues

1. **Missing Metrics**
   - Check metric namespace
   - Verify IAM permissions
   - Confirm metric publishing

2. **High Costs**
   - Review custom metric count
   - Check log ingestion volume
   - Optimize dashboard refresh rates

3. **Alert Fatigue**
   - Adjust thresholds
   - Implement alert suppression
   - Use composite alarms

## Maintenance Schedule

### Daily
- Monitor error rates
- Check cost trends
- Review critical alerts

### Weekly
- Generate business report
- Review metric usage
- Optimize log patterns

### Monthly
- Audit custom metrics
- Update dashboards
- Review scaling needs
- Archive old logs

## Support

For monitoring issues or questions:
1. Check CloudWatch Logs for errors
2. Review metric publishing logs
3. Verify IAM permissions
4. Contact: monitoring@iocframework.com