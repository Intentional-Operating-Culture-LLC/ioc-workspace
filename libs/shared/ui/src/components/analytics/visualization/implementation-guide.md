# AWS Pinpoint + QuickSight Implementation Guide for IOC

## Quick Start (Day 1 Launch)

### 1. AWS Setup (15 minutes)

```bash
# Install AWS CLI if not already installed
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure
# Enter your AWS Access Key ID, Secret Access Key, region (us-east-1), and output format (json)

# Create S3 bucket for analytics data
aws s3 mb s3://ioc-analytics-data-prod

# Create Pinpoint application
aws pinpoint create-app --name "IOC-Analytics-Prod" --region us-east-1
```

### 2. Environment Variables Setup

Add to your `.env` file:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Pinpoint Configuration
PINPOINT_APPLICATION_ID=your_pinpoint_app_id
PINPOINT_ANALYTICS_ENABLED=true

# S3 Configuration
S3_ANALYTICS_BUCKET=ioc-analytics-data-prod

# Cost Control Settings
ANALYTICS_DAILY_EVENT_LIMIT=1000
ANALYTICS_BATCH_SIZE=100
ANALYTICS_FLUSH_INTERVAL=300000
```

### 3. Initialize Analytics in Your App

```typescript
// In your app initialization (e.g., app/layout.js or _app.js)
import { initializePinpointTracker } from '@ioc/ui/components/analytics/visualization/PinpointEventTracker';
import { initializeCostMonitor } from '@ioc/ui/components/analytics/visualization/cost-monitoring';

// Initialize on app start
if (process.env.PINPOINT_ANALYTICS_ENABLED === 'true') {
  initializePinpointTracker(process.env.PINPOINT_APPLICATION_ID!);
  
  // Initialize cost monitoring with current MRR (start with 0)
  initializeCostMonitor(0);
}
```

### 4. Track Your First Events

```typescript
// In your assessment completion handler
import { AssessmentEventTracker } from '@ioc/ui/components/analytics/visualization/assessment-events';

// When assessment starts
await AssessmentEventTracker.trackAssessmentStarted(
  userId,
  assessmentId,
  'full_ocean',
  organizationId
);

// When assessment completes
await AssessmentEventTracker.trackAssessmentCompleted(
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
  },
  organizationId
);
```

### 5. Set Up Cost Monitoring

```typescript
// Create a scheduled job (e.g., using node-cron or AWS Lambda)
import { getCostMonitor } from '@ioc/ui/components/analytics/visualization/cost-monitoring';

// Daily cost check
async function checkAnalyticsCosts() {
  const monitor = getCostMonitor();
  const report = await monitor.generateCostReport();
  
  console.log('Daily Analytics Cost Report:', {
    total: `$${report.summary.total.toFixed(2)}`,
    projection: `$${report.projection.projected.toFixed(2)}/month`,
    percentOfMRR: `${(report.projection.percentOfMRR * 100).toFixed(1)}%`,
    recommendations: report.recommendations
  });
  
  // Send alert if costs are too high
  if (!report.projection.withinTarget) {
    // Send email/Slack notification
  }
}
```

## Week 1-2: Optimization

### 1. Monitor Actual Usage

```bash
# Check Pinpoint metrics
aws pinpoint get-application-metrics \
  --application-id $PINPOINT_APPLICATION_ID \
  --region us-east-1

# Check S3 storage usage
aws s3 ls s3://ioc-analytics-data-prod --recursive --summarize
```

### 2. Create CloudWatch Dashboard

```bash
# Create a basic dashboard for monitoring
aws cloudwatch put-dashboard \
  --dashboard-name IOC-Analytics-Costs \
  --dashboard-body file://cloudwatch-dashboard.json
```

### 3. Set Up Data Lifecycle

```bash
# Create S3 lifecycle policy to manage costs
aws s3api put-bucket-lifecycle-configuration \
  --bucket ioc-analytics-data-prod \
  --lifecycle-configuration file://s3-lifecycle.json
```

## Month 1: Adding QuickSight ($500+ MRR)

### 1. Enable QuickSight

```bash
# Subscribe to QuickSight Standard Edition
aws quicksight create-account-subscription \
  --aws-account-id $(aws sts get-caller-identity --query Account --output text) \
  --edition STANDARD \
  --notification-email admin@iocframework.com
```

### 2. Create Data Source

```typescript
// Create S3 manifest file for QuickSight
const manifest = {
  fileLocations: [
    {
      URIs: [`s3://${S3_BUCKET}/events/`]
    }
  ],
  globalUploadSettings: {
    format: "JSON",
    delimiter: "\n",
    containsHeader: "FALSE"
  }
};

// Upload manifest to S3
await s3.putObject({
  Bucket: S3_BUCKET,
  Key: 'quicksight/manifest.json',
  Body: JSON.stringify(manifest),
  ContentType: 'application/json'
}).promise();
```

### 3. Create First Dashboard

```bash
# Use the AWS Console for initial dashboard creation
# Then export and version control the dashboard definition

# Export dashboard
aws quicksight describe-dashboard \
  --aws-account-id $(aws sts get-caller-identity --query Account --output text) \
  --dashboard-id executive-overview \
  > dashboards/executive-overview.json
```

## Scaling Checklist

### $0-500 MRR Phase
- [x] Basic Pinpoint setup
- [x] Event anonymization
- [x] S3 data storage
- [x] Cost monitoring
- [x] Daily event limits
- [x] CloudWatch alerts
- [ ] Manual data exports

### $500-2K MRR Phase
- [ ] QuickSight Standard subscription
- [ ] Executive dashboard
- [ ] Assessment analytics dashboard
- [ ] Automated weekly reports
- [ ] Glue Data Catalog
- [ ] Athena queries
- [ ] Increase event limits

### $2K-10K MRR Phase
- [ ] QuickSight Enterprise
- [ ] ML Insights
- [ ] Real-time dashboards
- [ ] A/B testing framework
- [ ] Predictive analytics
- [ ] Custom alerts
- [ ] API analytics

### $10K+ MRR Phase
- [ ] Kinesis Data Analytics
- [ ] Real-time anomaly detection
- [ ] Multi-region deployment
- [ ] Advanced ML models
- [ ] Custom data pipelines
- [ ] Compliance reporting
- [ ] White-label analytics

## Troubleshooting

### Common Issues

1. **Events not appearing in Pinpoint**
   ```bash
   # Check Pinpoint application status
   aws pinpoint get-app --application-id $PINPOINT_APPLICATION_ID
   
   # Check CloudWatch logs
   aws logs tail /aws/pinpoint/$PINPOINT_APPLICATION_ID
   ```

2. **High costs**
   ```typescript
   // Reduce event volume
   const monitor = getCostMonitor();
   await monitor.updateMRR(currentMRR);
   
   // Check what's driving costs
   const report = await monitor.generateCostReport();
   console.log(report.recommendations);
   ```

3. **QuickSight data not updating**
   ```bash
   # Refresh SPICE dataset
   aws quicksight create-ingestion \
     --aws-account-id $(aws sts get-caller-identity --query Account --output text) \
     --data-set-id assessment-data \
     --ingestion-id $(date +%s)
   ```

## Security Best Practices

1. **Use IAM roles, not access keys in production**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "mobiletargeting:PutEvents",
           "mobiletargeting:UpdateEndpoint"
         ],
         "Resource": "arn:aws:mobiletargeting:*:*:apps/${PINPOINT_APP_ID}*"
       }
     ]
   }
   ```

2. **Enable encryption**
   ```bash
   # Enable S3 encryption
   aws s3api put-bucket-encryption \
     --bucket ioc-analytics-data-prod \
     --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
   ```

3. **Implement data retention**
   ```bash
   # Delete data older than 90 days
   aws s3api put-bucket-lifecycle-configuration \
     --bucket ioc-analytics-data-prod \
     --lifecycle-configuration '{
       "Rules": [{
         "ID": "Delete old analytics data",
         "Status": "Enabled",
         "Expiration": {
           "Days": 90
         }
       }]
     }'
   ```

## Next Steps

1. **Set up monitoring** - Implement the cost monitoring dashboard
2. **Test with small volume** - Start with 10-20 events per day
3. **Validate data flow** - Ensure events reach S3 correctly
4. **Plan for growth** - Review scaling roadmap monthly
5. **Document learnings** - Keep notes on what works

Remember: Start small, measure everything, scale gradually!