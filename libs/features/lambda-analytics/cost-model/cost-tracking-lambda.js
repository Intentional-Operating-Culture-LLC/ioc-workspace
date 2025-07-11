/**
 * Lambda function for real-time AWS cost tracking
 * Monitors analytics service costs and sends alerts
 */

const AWS = require('aws-sdk');
const AWSCostModel = require('./aws-analytics-cost-model');

const costExplorer = new AWS.CostExplorer({ region: 'us-east-1' });
const cloudwatch = new AWS.CloudWatch();
const sns = new AWS.SNS();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const COST_TABLE = process.env.COST_TRACKING_TABLE || 'ioc-cost-tracking';
const ALERT_TOPIC = process.env.COST_ALERT_TOPIC || 'ioc-cost-alerts';

// Initialize cost model
const costModel = new AWSCostModel();
const lambdaExports = costModel.exportToLambda();

exports.handler = async (event) => {
  try {
    const executionDate = new Date();
    const startDate = new Date(executionDate);
    startDate.setDate(1); // First day of current month
    
    // Get current costs from Cost Explorer
    const costData = await getCurrentCosts(startDate, executionDate);
    
    // Get current MRR from database (mock for now)
    const mrr = await getCurrentMRR();
    
    // Get user count for projections
    const userCount = await getUserCount();
    
    // Check budget status
    const budgetStatus = lambdaExports.checkBudgetAlert(costData.total, mrr);
    
    // Calculate daily average
    const daysInMonth = new Date(executionDate.getFullYear(), executionDate.getMonth() + 1, 0).getDate();
    const daysElapsed = executionDate.getDate();
    const dailyAverage = costData.total / daysElapsed;
    const projectedMonthly = dailyAverage * daysInMonth;
    
    // Store cost data
    await storeCostData({
      date: executionDate.toISOString(),
      actual: costData,
      mrr,
      userCount,
      budgetStatus,
      projectedMonthly,
      dailyAverage,
    });
    
    // Send CloudWatch metrics
    await sendMetrics({
      totalCost: costData.total,
      projectedCost: projectedMonthly,
      budgetUtilization: budgetStatus.percentUsed,
      costPerUser: costData.total / userCount,
    });
    
    // Send alerts if needed
    if (budgetStatus.alert) {
      await sendAlert({
        type: budgetStatus.critical ? 'CRITICAL' : 'WARNING',
        message: budgetStatus.message,
        currentCost: costData.total,
        targetCost: budgetStatus.targetCost,
        percentUsed: budgetStatus.percentUsed,
        projectedMonthly,
      });
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        date: executionDate.toISOString(),
        costs: costData,
        budget: budgetStatus,
        projection: projectedMonthly,
      }),
    };
  } catch (error) {
    console.error('Error in cost tracking:', error);
    throw error;
  }
};

async function getCurrentCosts(startDate, endDate) {
  const params = {
    TimePeriod: {
      Start: startDate.toISOString().split('T')[0],
      End: endDate.toISOString().split('T')[0],
    },
    Granularity: 'DAILY',
    Metrics: ['UnblendedCost'],
    GroupBy: [
      {
        Type: 'DIMENSION',
        Key: 'SERVICE',
      },
    ],
    Filter: {
      Dimensions: {
        Key: 'SERVICE',
        Values: [
          'Amazon Pinpoint',
          'Amazon Simple Storage Service',
          'AWS Lambda',
          'Amazon QuickSight',
          'Amazon Athena',
          'AmazonCloudWatch',
        ],
      },
    },
  };
  
  const response = await costExplorer.getCostAndUsage(params).promise();
  
  // Process and aggregate costs
  const serviceCosts = {};
  let total = 0;
  
  response.ResultsByTime.forEach(timeResult => {
    timeResult.Groups.forEach(group => {
      const service = mapServiceName(group.Keys[0]);
      const cost = parseFloat(group.Metrics.UnblendedCost.Amount);
      
      if (!serviceCosts[service]) {
        serviceCosts[service] = 0;
      }
      serviceCosts[service] += cost;
      total += cost;
    });
  });
  
  return {
    ...serviceCosts,
    total,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
  };
}

function mapServiceName(awsServiceName) {
  const mapping = {
    'Amazon Pinpoint': 'pinpoint',
    'Amazon Simple Storage Service': 's3',
    'AWS Lambda': 'lambda',
    'Amazon QuickSight': 'quicksight',
    'Amazon Athena': 'athena',
    'AmazonCloudWatch': 'cloudwatch',
  };
  
  return mapping[awsServiceName] || awsServiceName.toLowerCase().replace(/\s+/g, '_');
}

async function getCurrentMRR() {
  // In production, this would query your subscription/billing system
  // For now, mock based on user count
  const userCount = await getUserCount();
  return userCount * 50; // $50 per user average
}

async function getUserCount() {
  // In production, query your user database
  // For now, use a mock calculation
  try {
    const params = {
      TableName: COST_TABLE,
      Key: {
        pk: 'STATS',
        sk: 'USER_COUNT',
      },
    };
    
    const result = await dynamodb.get(params).promise();
    return result.Item?.count || 100; // Default to 100 users
  } catch (error) {
    console.error('Error getting user count:', error);
    return 100; // Fallback
  }
}

async function storeCostData(data) {
  const params = {
    TableName: COST_TABLE,
    Item: {
      pk: `COST_${data.date.split('T')[0]}`,
      sk: data.date,
      ...data,
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90 days TTL
    },
  };
  
  await dynamodb.put(params).promise();
}

async function sendMetrics(metrics) {
  const namespace = 'IOC/Analytics/Costs';
  const timestamp = new Date();
  
  const metricData = Object.entries(metrics).map(([name, value]) => ({
    MetricName: name,
    Value: value,
    Unit: name.includes('Cost') ? 'None' : 'Percent',
    Timestamp: timestamp,
  }));
  
  const params = {
    Namespace: namespace,
    MetricData: metricData,
  };
  
  await cloudwatch.putMetricData(params).promise();
}

async function sendAlert(alert) {
  const message = {
    default: alert.message,
    email: formatEmailAlert(alert),
    sms: formatSMSAlert(alert),
  };
  
  const params = {
    TopicArn: ALERT_TOPIC,
    Subject: `IOC Cost Alert: ${alert.type}`,
    Message: JSON.stringify(message),
    MessageStructure: 'json',
    MessageAttributes: {
      alertType: {
        DataType: 'String',
        StringValue: alert.type,
      },
      percentUsed: {
        DataType: 'Number',
        StringValue: alert.percentUsed.toString(),
      },
    },
  };
  
  await sns.publish(params).promise();
}

function formatEmailAlert(alert) {
  return `
IOC Analytics Cost Alert - ${alert.type}

Current Month-to-Date Cost: $${alert.currentCost.toFixed(2)}
Budget Target: $${alert.targetCost.toFixed(2)}
Budget Utilization: ${alert.percentUsed.toFixed(1)}%
Projected Monthly Cost: $${alert.projectedMonthly.toFixed(2)}

${alert.message}

Action Required:
${alert.type === 'CRITICAL' ? 
  '- Review and optimize high-cost services immediately\n- Consider disabling non-essential features\n- Contact team lead for budget adjustment' :
  '- Monitor costs closely\n- Review optimization recommendations\n- Plan for cost reduction strategies'}

View detailed cost breakdown: https://console.aws.amazon.com/cost-management/
`;
}

function formatSMSAlert(alert) {
  return `IOC Cost ${alert.type}: ${alert.percentUsed.toFixed(0)}% of budget used. Current: $${alert.currentCost.toFixed(0)}, Target: $${alert.targetCost.toFixed(0)}`;
}

// Daily cost aggregation handler
exports.dailyAggregation = async (event) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Get yesterday's costs
    const costData = await getCurrentCosts(yesterday, yesterday);
    
    // Store daily snapshot
    await storeCostData({
      date: yesterday.toISOString(),
      type: 'DAILY_SNAPSHOT',
      actual: costData,
      mrr: await getCurrentMRR(),
      userCount: await getUserCount(),
    });
    
    // Generate daily report
    const report = await generateDailyReport(yesterday);
    
    // Send daily summary
    await sendDailySummary(report);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        date: yesterday.toISOString(),
        report,
      }),
    };
  } catch (error) {
    console.error('Error in daily aggregation:', error);
    throw error;
  }
};

async function generateDailyReport(date) {
  // Query historical data
  const params = {
    TableName: COST_TABLE,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: {
      ':pk': `COST_${date.toISOString().split('T')[0]}`,
    },
  };
  
  const result = await dynamodb.query(params).promise();
  const costData = result.Items[0] || {};
  
  // Calculate trends
  const previousDay = new Date(date);
  previousDay.setDate(previousDay.getDate() - 1);
  
  const previousParams = {
    TableName: COST_TABLE,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: {
      ':pk': `COST_${previousDay.toISOString().split('T')[0]}`,
    },
  };
  
  const previousResult = await dynamodb.query(previousParams).promise();
  const previousData = previousResult.Items[0] || {};
  
  return {
    date: date.toISOString(),
    costs: costData.actual || {},
    dailyChange: calculateChange(costData.actual?.total, previousData.actual?.total),
    weeklyAverage: await calculateWeeklyAverage(date),
    topServices: getTopServices(costData.actual),
    recommendations: await getRecommendations(costData),
  };
}

function calculateChange(current, previous) {
  if (!previous || previous === 0) return { amount: current, percent: 0 };
  
  const amount = current - previous;
  const percent = (amount / previous) * 100;
  
  return { amount, percent };
}

async function calculateWeeklyAverage(date) {
  const weekAgo = new Date(date);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const costs = await getCurrentCosts(weekAgo, date);
  return costs.total / 7;
}

function getTopServices(costs) {
  if (!costs) return [];
  
  return Object.entries(costs)
    .filter(([key]) => key !== 'total' && key !== 'period')
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([service, cost]) => ({ service, cost }));
}

async function getRecommendations(costData) {
  const userCount = costData.userCount || 100;
  const scenario = { authorRatio: 0.15, churnRate: 0.03 }; // Moderate scenario
  
  const monthlyData = {
    users: userCount,
    mrr: costData.mrr || userCount * 50,
    costs: costData.actual || {},
  };
  
  return costModel.getOptimizationRecommendations(monthlyData)
    .slice(0, 3) // Top 3 recommendations
    .map(rec => ({
      recommendation: rec.recommendation,
      savings: rec.savings,
      priority: rec.priority,
    }));
}

async function sendDailySummary(report) {
  // Format and send daily summary via SNS
  const message = formatDailySummary(report);
  
  const params = {
    TopicArn: ALERT_TOPIC,
    Subject: 'IOC Daily Cost Summary',
    Message: message,
  };
  
  await sns.publish(params).promise();
}

function formatDailySummary(report) {
  return `
IOC Analytics Daily Cost Summary - ${report.date.split('T')[0]}

Total Cost: $${report.costs.total?.toFixed(2) || '0.00'}
Daily Change: ${report.dailyChange.percent >= 0 ? '+' : ''}${report.dailyChange.percent.toFixed(1)}% ($${report.dailyChange.amount.toFixed(2)})
Weekly Average: $${report.weeklyAverage.toFixed(2)}

Top Services:
${report.topServices.map(s => `- ${s.service}: $${s.cost.toFixed(2)}`).join('\n')}

Cost Optimization Recommendations:
${report.recommendations.map(r => `- ${r.recommendation} (Save ~$${r.savings.toFixed(2)}/mo)`).join('\n')}

Full dashboard: https://app.iocframework.com/admin/costs
`;
}