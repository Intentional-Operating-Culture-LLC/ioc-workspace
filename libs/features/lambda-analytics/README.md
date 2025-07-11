# IOC Lambda Analytics

Serverless, pay-per-use analytics processing for IOC's lean meta BI system. Designed to start at near-zero cost and scale with usage.

## 📊 Overview

This package provides Lambda-based analytics processing functions optimized for cost and performance. All functions start with minimal resources (128MB memory) and scale based on MRR milestones.

## 🚀 Lambda Functions

### 1. Assessment Anonymizer
- **Purpose**: Anonymize assessment data to ensure privacy compliance
- **Trigger**: S3 PUT events on raw assessment bucket
- **Memory**: 128MB (256MB at $1K MRR)
- **Cost**: ~$0.0001 per assessment

### 2. OCEAN Calculator
- **Purpose**: Calculate OCEAN personality scores and facets
- **Trigger**: S3 PUT events on anonymized assessment bucket
- **Memory**: 128MB (256MB at $1K MRR)
- **Cost**: ~$0.0002 per calculation

### 3. Dual-AI Processor
- **Purpose**: Process dual AI validation metrics
- **Trigger**: SQS Queue messages
- **Memory**: 128MB (256MB at $5K MRR)
- **Cost**: ~$0.0003 per validation

### 4. Pinpoint Transformer
- **Purpose**: Transform events for AWS Pinpoint analytics
- **Trigger**: EventBridge rules, Direct invocation
- **Memory**: 128MB (always minimal)
- **Cost**: ~$0.00005 per event

### 5. S3 Data Processor
- **Purpose**: Process data files in S3 buckets
- **Trigger**: S3 PUT/POST events
- **Memory**: 128MB (256MB at $1K MRR)
- **Cost**: ~$0.0005 per file

## 💰 Cost Optimization Strategy

### MRR-Based Scaling

```typescript
// $0 - $1K MRR: Minimal resources
{
  memory: 128MB,
  xRay: false,
  provisionedConcurrency: false,
  enhancedMonitoring: false
}

// $1K - $5K MRR: Balanced performance
{
  memory: 256MB,
  xRay: false,
  provisionedConcurrency: false,
  enhancedMonitoring: true
}

// $5K - $10K MRR: Enhanced features
{
  memory: 256MB,
  xRay: true,
  provisionedConcurrency: false,
  enhancedMonitoring: true
}

// $10K+ MRR: Full optimization
{
  memory: 512MB+,
  xRay: true,
  provisionedConcurrency: true,
  enhancedMonitoring: true
}
```

### Estimated Monthly Costs

| MRR Level | Functions/Day | Est. Monthly Cost |
|-----------|---------------|-------------------|
| $0-1K     | 1,000         | $3-5             |
| $1K-5K    | 5,000         | $15-25           |
| $5K-10K   | 10,000        | $40-60           |
| $10K+     | 20,000+       | $100+            |

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Build Lambda functions
npm run build

# Deploy to AWS
npm run deploy
```

## 🔧 Configuration

### Environment Variables

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# S3 Buckets
ASSESSMENT_BUCKET=ioc-assessments
METRICS_BUCKET=ioc-metrics
DATA_BUCKET=ioc-data
DEPLOYMENT_BUCKET=ioc-lambda-deployments

# SQS Queues
DUAL_AI_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/dual-ai-validation
ERROR_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/errors
ANALYTICS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/analytics

# Pinpoint
PINPOINT_APP_ID=your-pinpoint-app-id

# Security
ANONYMIZATION_SALT=your-secret-salt

# Scaling
CURRENT_MRR=1000
```

## 📝 Usage Examples

### Process Assessment

```typescript
import { lambdaAnalytics } from '@ioc/lambda-analytics';

// Process a completed assessment
await lambdaAnalytics.processAssessment({
  userId: 'user123',
  assessmentId: 'assessment456',
  assessmentType: 'ocean-120',
  scores: { /* ... */ },
  responses: [ /* ... */ ]
});
```

### Get OCEAN Scores

```typescript
// Retrieve calculated OCEAN scores
const scores = await lambdaAnalytics.getOCEANScores('user123');
console.log(scores);
// {
//   openness: 72,
//   conscientiousness: 68,
//   extraversion: 55,
//   agreeableness: 70,
//   neuroticism: 45
// }
```

### Track Events

```typescript
import { eventBuilders } from '@ioc/lambda-analytics';

// Track assessment completion
await lambdaAnalytics.trackEvent(
  eventBuilders.assessmentCompleted(
    'user123',
    'assessment456',
    scores,
    720000 // 12 minutes
  )
);
```

### Batch Processing

```typescript
import { analyticsHelpers } from '@ioc/lambda-analytics';

// Batch process multiple assessments
await analyticsHelpers.batchProcessAssessments(assessments);
```

## 🔍 Monitoring & Debugging

### CloudWatch Logs

All Lambda functions log to CloudWatch. Log groups:
- `/aws/lambda/ioc-assessment-anonymizer`
- `/aws/lambda/ioc-ocean-calculator`
- `/aws/lambda/ioc-dual-ai-processor`
- `/aws/lambda/ioc-pinpoint-transformer`
- `/aws/lambda/ioc-s3-data-processor`

### Cost Tracking

```typescript
// Generate cost report
const report = await analyticsHelpers.generateCostReport(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
```

### Performance Metrics

Functions automatically log performance metrics:
```json
{
  "type": "COST_METRICS",
  "function": "ioc-ocean-calculator",
  "invocations": 1000,
  "avgDuration": 450,
  "avgMemoryMB": 95,
  "estimatedCost": "0.0234",
  "costPerInvocation": "0.000023"
}
```

## 🚦 Error Handling

### Dead Letter Queues

Critical errors are sent to DLQ for investigation:
- Assessment processing failures
- Dual AI validation errors
- S3 processing errors

### Retry Strategy

- Default: 3 retries with exponential backoff
- Configurable based on MRR level
- Lower retry delays at higher MRR for better UX

## 🔐 Security

### Data Privacy

- All PII is anonymized before processing
- Deterministic hashing for user tracking
- Session-specific IDs for granular analysis

### IAM Permissions

Minimal permissions per function:
- S3: Read/Write to specific buckets
- SQS: Send/Receive on specific queues
- CloudWatch: Logs and basic metrics

## 📈 Scaling Guide

### When to Scale

1. **128MB → 256MB**: When average duration > 3 seconds
2. **Enable X-Ray**: When debugging complex issues
3. **Provisioned Concurrency**: When cold starts impact UX
4. **Reserved Concurrency**: When protecting downstream services

### Cost vs Performance

| Memory | Avg Duration | Cost/1K Invocations |
|--------|--------------|---------------------|
| 128MB  | 1000ms       | $0.21              |
| 256MB  | 500ms        | $0.21              |
| 512MB  | 300ms        | $0.25              |
| 1024MB | 200ms        | $0.33              |

## 🛡️ Best Practices

1. **Start Small**: Begin with 128MB and scale based on metrics
2. **Monitor Costs**: Review cost reports weekly
3. **Optimize Code**: Minimize dependencies and bundle size
4. **Use Caching**: Cache frequently accessed data
5. **Batch Operations**: Process multiple items per invocation

## 📚 Additional Resources

- [AWS Lambda Pricing](https://aws.amazon.com/lambda/pricing/)
- [Lambda Performance Optimization](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [Serverless Cost Optimization](https://www.serverless.com/blog/aws-lambda-cost-optimization)

## 🤝 Contributing

1. Follow the existing code structure
2. Add tests for new functions
3. Update cost estimates in documentation
4. Consider MRR-based scaling in all features

## 📄 License

Proprietary - IOC Framework