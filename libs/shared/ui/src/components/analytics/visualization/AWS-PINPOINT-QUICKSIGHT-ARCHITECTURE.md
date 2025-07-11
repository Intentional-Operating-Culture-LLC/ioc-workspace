# AWS Pinpoint + QuickSight Meta BI System Architecture

## Executive Summary

This document outlines a lean, cost-effective meta BI system for IOC's day 1 launch using AWS Pinpoint for event tracking and QuickSight for visualization. The system is designed to start at ~$15-30/month and scale progressively with revenue growth.

## 1. Pinpoint Event Architecture

### Core Assessment Events (Day 1 Minimal Set)

```typescript
// Essential events for MVP launch
enum CoreEvents {
  USER_REGISTERED = 'user.registered',
  ASSESSMENT_STARTED = 'assessment.started', 
  ASSESSMENT_COMPLETED = 'assessment.completed',
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_CANCELLED = 'subscription.cancelled',
  PAYMENT_FAILED = 'payment.failed'
}
```

### Event Schema Design with Built-in Anonymization

```typescript
interface BaseEvent {
  eventType: string;
  userId: string; // Hashed with SHA-256
  timestamp: ISO8601String;
  attributes: {
    app_version: string;
    platform: 'web' | 'mobile';
    [key: string]: string; // Additional sanitized attributes
  };
  metrics: {
    [key: string]: number; // Numeric metrics only
  };
}

// Assessment-specific schema
interface AssessmentEvent extends BaseEvent {
  attributes: {
    assessmentId: string;
    assessmentType: string;
    organizationId: string;
  };
  metrics: {
    durationSeconds: number;
    completionPercentage: number;
    oceanScores?: {
      O: number; // Openness (0-100)
      C: number; // Conscientiousness
      E: number; // Extraversion
      A: number; // Agreeableness
      N: number; // Neuroticism
    };
    aiConfidence?: number;
    dualAiAgreement?: number;
  };
}
```

### Event Filtering for Cost Control

```typescript
// Daily event limits by MRR tier
const eventLimitsByMRR = {
  tier1: { // $0-500 MRR
    [CoreEvents.USER_REGISTERED]: 100,
    [CoreEvents.ASSESSMENT_STARTED]: 500,
    [CoreEvents.ASSESSMENT_COMPLETED]: 500,
    [CoreEvents.SUBSCRIPTION_CREATED]: 50,
    default: 1000
  },
  tier2: { // $500-2K MRR
    [CoreEvents.USER_REGISTERED]: 500,
    [CoreEvents.ASSESSMENT_STARTED]: 2000,
    [CoreEvents.ASSESSMENT_COMPLETED]: 2000,
    default: 5000
  },
  tier3: { // $2K+ MRR
    // No limits, but implement sampling for high-volume events
    sampling: {
      'feature.used': 0.1, // Sample 10% of feature usage
      'api.called': 0.05   // Sample 5% of API calls
    }
  }
};
```

### Batch vs Real-time Processing Strategy

```typescript
// Event processing configuration
const processingStrategy = {
  realtime: [
    // Revenue-critical events
    CoreEvents.SUBSCRIPTION_CREATED,
    CoreEvents.SUBSCRIPTION_CANCELLED,
    CoreEvents.PAYMENT_FAILED
  ],
  batched: {
    // All other events
    batchSize: 100,
    flushInterval: 300000, // 5 minutes
    maxBatchAge: 900000    // 15 minutes
  }
};
```

## 2. Data Flow Pipeline

### Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Web App   │────▶│   Pinpoint   │────▶│  Kinesis    │────▶│     S3       │
│  (Events)   │     │  (Ingestion) │     │ (Streaming) │     │  (Storage)   │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
                                                                      │
                                                                      ▼
                                                              ┌──────────────┐
                                                              │  QuickSight  │
                                                              │ (Dashboards) │
                                                              └──────────────┘
```

### Event Processing Flow

1. **Assessment Completion Events**
   ```javascript
   // Client-side tracking
   AssessmentEventTracker.trackAssessmentCompleted(
     userId,
     assessmentId,
     'full_ocean',
     {
       openness: 75.5,
       conscientiousness: 82.3,
       extraversion: 68.7,
       agreeableness: 79.1,
       neuroticism: 45.2
     },
     {
       confidence: 0.92,
       dualAiAgreement: 0.88
     }
   );
   ```

2. **OCEAN Score Calculations**
   - Store raw scores in Pinpoint metrics
   - Calculate composite scores in QuickSight
   - Track score distributions for benchmarking

3. **Dual-AI Validation Metrics**
   - AI confidence scores (0-1)
   - Agreement between AI models (0-1)
   - Flag assessments with low confidence/agreement

4. **User Engagement Tracking**
   - Session duration
   - Feature usage patterns
   - Conversion funnel metrics

5. **Event Routing to S3**
   ```javascript
   // Pinpoint → Kinesis Data Firehose → S3
   const firehoseConfig = {
     deliveryStreamName: 'ioc-analytics-stream',
     s3Configuration: {
       bucketName: 'ioc-analytics-data',
       prefix: 'events/year=${year}/month=${month}/day=${day}/',
       compressionFormat: 'GZIP',
       bufferingHints: {
         intervalInSeconds: 300, // 5 minutes
         sizeInMBs: 5
       }
     }
   };
   ```

## 3. Cost Optimization Strategy

### Start with Essential Events Only

**Day 1 Event Tracking (Estimated: $15-20/month)**
- User registrations: 100/day max
- Assessment starts: 500/day max  
- Assessment completions: 500/day max
- Subscription events: 50/day max
- Total: ~1,200 events/day = 36,000/month

**Pinpoint Pricing:**
- First 100M events/month: $0.0012 per event
- 36,000 × $0.0012 = $0.43/month
- Plus endpoint management: ~$10/month
- Plus data transfer: ~$5/month

### Daily/Weekly Batch Processing

```javascript
// Cost-optimized batch configuration
const batchConfig = {
  development: {
    batchSize: 1000,
    flushInterval: 3600000, // 1 hour
    enableCompression: true
  },
  production: {
    batchSize: 100,
    flushInterval: 300000, // 5 minutes
    enableCompression: true,
    enableEncryption: true
  }
};
```

### CloudWatch Billing Alerts

```javascript
// Terraform configuration for billing alerts
resource "aws_cloudwatch_metric_alarm" "pinpoint_cost_alarm" {
  alarm_name          = "pinpoint-monthly-cost"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = "86400"
  statistic           = "Maximum"
  threshold           = "30.00"
  alarm_description   = "Triggers when Pinpoint costs exceed $30/month"
  
  dimensions = {
    ServiceName = "AmazonPinpoint"
    Currency    = "USD"
  }
}
```

### Progressive Event Expansion

```javascript
// Revenue-based event expansion
function getEnabledEvents(monthlyRevenue: number): string[] {
  const baseEvents = [
    'user.registered',
    'assessment.completed',
    'subscription.created'
  ];
  
  if (monthlyRevenue >= 500) {
    baseEvents.push(
      'assessment.started',
      'feature.report.generated',
      'user.login'
    );
  }
  
  if (monthlyRevenue >= 2000) {
    baseEvents.push(
      'feature.*.used', // All feature usage
      'api.*.called',   // API usage tracking
      'error.occurred'  // Error tracking
    );
  }
  
  return baseEvents;
}
```

## 4. QuickSight Integration

### When to Add QuickSight (Revenue Threshold)

**$500+ MRR Threshold**
- QuickSight Author: $24/month
- SPICE capacity: 1GB included
- Reader access: $0.30/session (max $5/month per reader)

### Initial Dashboard Designs

1. **Executive Dashboard**
   ```sql
   -- Key metrics query
   SELECT 
     DATE_TRUNC('day', timestamp) as date,
     COUNT(DISTINCT user_id) as daily_active_users,
     COUNT(CASE WHEN event_type = 'assessment.completed' THEN 1 END) as assessments_completed,
     AVG(CASE WHEN event_type = 'assessment.completed' THEN metrics.duration_seconds END) as avg_duration,
     COUNT(CASE WHEN event_type = 'subscription.created' THEN 1 END) as new_subscriptions
   FROM events
   WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
   GROUP BY 1
   ORDER BY 1 DESC;
   ```

2. **Assessment Analytics Dashboard**
   - OCEAN score distributions
   - Completion rates by assessment type
   - Average completion times
   - AI validation metrics

3. **Revenue Analytics Dashboard**
   - MRR growth
   - Churn analysis
   - Customer lifetime value
   - Conversion funnel

### S3 Data Source Configuration

```json
{
  "dataSourceName": "IOC-Analytics-S3",
  "type": "S3",
  "dataSourceParameters": {
    "s3Parameters": {
      "manifestFileLocation": {
        "bucket": "ioc-analytics-data",
        "key": "quicksight/manifest.json"
      }
    }
  },
  "permissions": [
    {
      "principal": "arn:aws:quicksight:us-east-1:123456789:user/default/admin",
      "actions": ["quicksight:*"]
    }
  ]
}
```

### SPICE Dataset Optimization

```sql
-- Optimized dataset for SPICE ingestion
CREATE VIEW assessment_summary AS
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  organization_id,
  assessment_type,
  COUNT(*) as count,
  AVG(metrics.ocean_openness) as avg_openness,
  AVG(metrics.ocean_conscientiousness) as avg_conscientiousness,
  AVG(metrics.ocean_extraversion) as avg_extraversion,
  AVG(metrics.ocean_agreeableness) as avg_agreeableness,
  AVG(metrics.ocean_neuroticism) as avg_neuroticism,
  AVG(metrics.duration_seconds) as avg_duration,
  AVG(metrics.ai_confidence) as avg_ai_confidence
FROM events
WHERE event_type = 'assessment.completed'
  AND timestamp >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY 1, 2, 3;
```

## 5. Scaling Roadmap

### $0-500 MRR: Basic Pinpoint Analytics
**Cost: ~$15-20/month**
- Core event tracking only
- S3 data lake setup
- Basic CloudWatch dashboards
- Manual data exports for analysis

**Implementation:**
```javascript
// Minimal tracking configuration
const minimalConfig = {
  events: ['user.registered', 'assessment.completed', 'subscription.created'],
  batching: { size: 1000, interval: 3600000 }, // 1 hour batches
  storage: 's3-only',
  analysis: 'manual-export'
};
```

### $500-2K MRR: Add QuickSight Dashboards
**Cost: ~$40-60/month**
- QuickSight Author license
- 3 core dashboards
- Weekly SPICE refresh
- Automated reporting

**Implementation:**
```javascript
// Enhanced tracking configuration
const enhancedConfig = {
  events: [...minimalConfig.events, 
    'assessment.started', 
    'feature.*.used',
    'user.login'
  ],
  batching: { size: 100, interval: 300000 }, // 5 minute batches
  storage: 's3-with-glue-catalog',
  analysis: 'quicksight-dashboards',
  reporting: 'weekly-automated'
};
```

### $2K-10K MRR: Enhanced Event Tracking
**Cost: ~$100-200/month**
- All events tracked
- Real-time dashboards
- Predictive analytics
- A/B testing metrics

**Implementation:**
```javascript
// Full tracking configuration
const fullConfig = {
  events: '*', // All events
  sampling: {
    'high-volume': 0.1, // Sample 10% of high-volume events
  },
  batching: { 
    realtime: ['revenue.*', 'error.*'],
    batch: { size: 100, interval: 60000 } // 1 minute batches
  },
  storage: 's3-with-athena',
  analysis: 'quicksight-ml-insights',
  reporting: 'real-time'
};
```

### $10K+ MRR: Real-time Analytics
**Cost: ~$300-500/month**
- Kinesis Data Analytics
- Real-time anomaly detection
- Custom ML models
- Multi-region deployment

**Implementation:**
```javascript
// Enterprise configuration
const enterpriseConfig = {
  events: '*',
  streaming: 'kinesis-analytics',
  ml: {
    anomalyDetection: true,
    predictiveChurn: true,
    personalizedInsights: true
  },
  deployment: 'multi-region',
  compliance: ['GDPR', 'CCPA', 'SOC2']
};
```

## Implementation Checklist

### Day 1 Launch Checklist
- [ ] Create AWS Pinpoint application
- [ ] Implement event tracking SDK
- [ ] Set up S3 bucket for data storage
- [ ] Configure Kinesis Data Firehose
- [ ] Create CloudWatch billing alarms
- [ ] Implement event anonymization
- [ ] Test with 100 events/day
- [ ] Document event schemas

### Week 1-4 Optimization
- [ ] Monitor actual costs vs estimates
- [ ] Tune batch sizes based on volume
- [ ] Implement event filtering
- [ ] Create basic CloudWatch dashboards
- [ ] Set up data retention policies
- [ ] Export sample data for analysis
- [ ] Plan QuickSight implementation

### Month 2+ Growth
- [ ] Evaluate QuickSight ROI at $500 MRR
- [ ] Design initial dashboards
- [ ] Implement SPICE datasets
- [ ] Add user-facing analytics
- [ ] Expand event tracking
- [ ] Implement A/B testing framework
- [ ] Plan for compliance requirements

## Cost Monitoring Dashboard

```javascript
// Simple cost monitoring implementation
class CostMonitor {
  async getDailyCosts(): Promise<CostBreakdown> {
    const metrics = await cloudWatch.getMetricStatistics({
      Namespace: 'AWS/Billing',
      MetricName: 'EstimatedCharges',
      Dimensions: [
        { Name: 'ServiceName', Value: 'AmazonPinpoint' },
        { Name: 'Currency', Value: 'USD' }
      ],
      StartTime: new Date(Date.now() - 86400000),
      EndTime: new Date(),
      Period: 3600,
      Statistics: ['Maximum']
    }).promise();
    
    return {
      pinpoint: metrics.Datapoints[0]?.Maximum || 0,
      s3: await this.getS3Costs(),
      kinesis: await this.getKinesisCosts(),
      quicksight: await this.getQuickSightCosts(),
      total: await this.getTotalCosts()
    };
  }
  
  async shouldExpandTracking(monthlyRevenue: number): Promise<boolean> {
    const currentCosts = await this.getMonthlyCosts();
    const costRatio = currentCosts.total / monthlyRevenue;
    
    // Keep analytics costs under 2% of revenue
    return costRatio < 0.02;
  }
}
```

## Conclusion

This architecture provides a cost-effective path from day 1 launch through enterprise scale. Starting at ~$15-30/month, the system can scale progressively with revenue while maintaining costs under 2% of MRR. The built-in anonymization, event filtering, and batch processing ensure GDPR compliance and cost control from the beginning.