# IOC AWS Analytics Cost Model

A comprehensive cost projection and monitoring system for IOC's AWS-based meta BI analytics infrastructure.

## Overview

This cost model provides:
- Real-time cost tracking across all AWS analytics services
- Growth scenario projections (Conservative, Moderate, Aggressive)
- MRR-based budget targets and alerts
- Automated optimization recommendations
- Financial dashboard with detailed analytics

## Components

### 1. Cost Model (`aws-analytics-cost-model.js`)
Core pricing engine that calculates costs based on:
- User activity patterns
- Service pricing (Pinpoint, S3, Lambda, QuickSight, Athena, CloudWatch)
- Growth scenarios and projections
- Unit economics calculations

### 2. Cost Tracking Lambda (`cost-tracking-lambda.js`)
- Hourly cost monitoring via AWS Cost Explorer
- Daily aggregation and reporting
- Budget threshold checking
- CloudWatch metric publishing

### 3. Budget Alert Lambda (`budget-alert-lambda.js`)
- Proactive threshold monitoring
- Multi-level alerts (daily, weekly, monthly)
- Anomaly detection for unusual spikes
- Email and SNS notifications

### 4. Cost API Lambda (`cost-api-lambda.js`)
RESTful API endpoints:
- `/analytics/costs` - Current and historical costs
- `/analytics/costs/{service}` - Service-specific costs
- `/analytics/projections` - Growth projections
- `/analytics/recommendations` - Optimization suggestions

### 5. Financial Dashboard (`financial-dashboard.js`)
React component featuring:
- Real-time cost visualization
- Service breakdown charts
- Trend analysis and projections
- Budget tracking with alerts
- Optimization recommendations

## Budget Tiers

| MRR Range | Target Cost | Target % |
|-----------|-------------|----------|
| $0-1K | < $50/month | 5% |
| $1K-5K | < $200/month | 4% |
| $5K-20K | < $1000/month | 5% |
| $20K+ | < 5% of MRR | 5% |

## Growth Scenarios

### Conservative (100 users/month)
- 10% authors, 90% readers
- 5% monthly churn
- Gradual service enablement

### Moderate (500 users/month)
- 15% authors, 85% readers
- 3% monthly churn
- Standard service rollout

### Aggressive (1000 users/month)
- 20% authors, 80% readers
- 2% monthly churn
- Full service availability

## Deployment

```bash
# Deploy to AWS
cd cost-model
npm install
serverless deploy --stage production

# Environment variables required:
# - COST_TRACKING_TABLE: DynamoDB table name
# - COST_ALERT_TOPIC: SNS topic ARN
# - ALERT_EMAIL: Email for critical alerts
# - MONTHLY_BUDGET: Initial budget limit
```

## Usage

### 1. View Cost Model Projections
```javascript
const AWSCostModel = require('./aws-analytics-cost-model');
const model = new AWSCostModel();

// Generate 12-month projection
const projections = model.generateProjections(
  model.scenarios.moderate, 
  12
);

// Get optimization recommendations
const recommendations = model.getOptimizationRecommendations({
  users: 500,
  mrr: 25000,
  costs: { total: 800 }
});
```

### 2. Access Cost API
```bash
# Get current month costs
curl https://api.iocframework.com/analytics/costs

# Get service-specific costs
curl https://api.iocframework.com/analytics/costs/lambda?range=30d

# Get growth projections
curl https://api.iocframework.com/analytics/projections?scenario=moderate&months=12
```

### 3. Dashboard Integration
```javascript
import FinancialDashboard from './financial-dashboard';

// Include in admin panel
<FinancialDashboard />
```

## Alert Configuration

### Daily Alerts
- Warning: 20% over daily average
- Critical: 50% over daily average

### Weekly Alerts
- Warning: 15% over projected weekly
- Critical: 30% over projected weekly

### Monthly Alerts
- Warning: 80% of budget consumed
- Critical: 95% of budget consumed

## Optimization Strategies

### Early Stage (< $1K MRR)
1. Delay QuickSight implementation
2. Use CloudWatch dashboards
3. Minimize Athena queries
4. Leverage free tiers

### Growth Stage ($1K-$5K MRR)
1. Enable S3 lifecycle policies
2. Implement query caching
3. Optimize Lambda memory
4. Use spot instances where possible

### Scale Stage ($5K-$20K MRR)
1. Purchase Savings Plans
2. Reserved capacity for QuickSight
3. Implement data partitioning
4. Advanced query optimization

### Enterprise Stage ($20K+ MRR)
1. Enterprise agreements
2. Custom pricing negotiations
3. Multi-region optimization
4. Advanced cost allocation

## Monitoring

The system provides:
- CloudWatch Dashboard: Real-time metrics
- Daily email reports: Cost summaries
- Slack integration: Critical alerts
- Monthly reviews: Optimization opportunities

## Cost Tracking Best Practices

1. **Tag Everything**: Use consistent tagging for cost allocation
2. **Set Budgets**: Configure AWS Budgets for additional safety
3. **Review Weekly**: Check dashboard for trends
4. **Act on Alerts**: Respond quickly to threshold warnings
5. **Optimize Continuously**: Implement recommendations monthly

## Support

For questions or issues:
- Check CloudWatch logs for Lambda errors
- Review DynamoDB for cost history
- Contact: devops@iocframework.com