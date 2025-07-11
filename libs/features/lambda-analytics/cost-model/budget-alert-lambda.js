/**
 * Budget Alert Lambda
 * Monitors budget thresholds and sends proactive alerts
 */

const AWS = require('aws-sdk');
const AWSCostModel = require('./aws-analytics-cost-model');

const sns = new AWS.SNS();
const ses = new AWS.SES({ region: process.env.AWS_REGION });
const dynamodb = new AWS.DynamoDB.DocumentClient();
const costExplorer = new AWS.CostExplorer({ region: 'us-east-1' });

const COST_TABLE = process.env.COST_TRACKING_TABLE || 'ioc-cost-tracking';
const ALERT_TOPIC = process.env.COST_ALERT_TOPIC || 'ioc-cost-alerts';

// Alert thresholds
const ALERT_THRESHOLDS = {
  daily: {
    warning: 1.2, // 20% over daily average
    critical: 1.5, // 50% over daily average
  },
  weekly: {
    warning: 1.15, // 15% over weekly average
    critical: 1.3, // 30% over weekly average
  },
  monthly: {
    warning: 0.8, // 80% of monthly budget
    critical: 0.95, // 95% of monthly budget
  },
};

exports.handler = async (event) => {
  try {
    console.log('Running budget alert check...');
    
    // Get current cost data
    const costData = await getCurrentCostData();
    
    // Check all thresholds
    const alerts = await checkThresholds(costData);
    
    // Process alerts
    if (alerts.length > 0) {
      await processAlerts(alerts, costData);
    }
    
    // Update alert history
    await updateAlertHistory(alerts);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        alertsGenerated: alerts.length,
        alerts,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Error in budget alert handler:', error);
    throw error;
  }
};

async function getCurrentCostData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  
  // Get costs for different periods
  const [dailyCost, weeklyCost, monthlyCost] = await Promise.all([
    getCostForPeriod(now, now),
    getCostForPeriod(startOfWeek, now),
    getCostForPeriod(startOfMonth, now),
  ]);
  
  // Get historical averages
  const [dailyAvg, weeklyAvg] = await Promise.all([
    getDailyAverage(),
    getWeeklyAverage(),
  ]);
  
  // Get budget info
  const budget = await getMonthlyBudget();
  
  return {
    current: {
      daily: dailyCost,
      weekly: weeklyCost,
      monthly: monthlyCost,
    },
    averages: {
      daily: dailyAvg,
      weekly: weeklyAvg,
    },
    budget,
    timestamp: now,
  };
}

async function getCostForPeriod(startDate, endDate) {
  const params = {
    TimePeriod: {
      Start: startDate.toISOString().split('T')[0],
      End: endDate.toISOString().split('T')[0],
    },
    Granularity: 'DAILY',
    Metrics: ['UnblendedCost'],
  };
  
  const response = await costExplorer.getCostAndUsage(params).promise();
  
  return response.ResultsByTime.reduce((total, day) => {
    return total + parseFloat(day.Total.UnblendedCost.Amount);
  }, 0);
}

async function getDailyAverage() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const params = {
    TableName: COST_TABLE,
    IndexName: 'date-index',
    KeyConditionExpression: '#date BETWEEN :start AND :end',
    ExpressionAttributeNames: {
      '#date': 'date',
    },
    ExpressionAttributeValues: {
      ':start': startDate.toISOString(),
      ':end': endDate.toISOString(),
    },
  };
  
  const result = await dynamodb.query(params).promise();
  
  if (result.Items.length === 0) return 50; // Default
  
  const totalCost = result.Items.reduce((sum, item) => sum + (item.actual?.total || 0), 0);
  return totalCost / result.Items.length;
}

async function getWeeklyAverage() {
  // Calculate based on last 4 weeks
  return (await getDailyAverage()) * 7;
}

async function getMonthlyBudget() {
  const userCount = await getUserCount();
  const mrr = userCount * 50; // $50 per user average
  
  const model = new AWSCostModel();
  const tier = model.budgetTiers.find(t => mrr >= t.minMRR && mrr < t.maxMRR);
  
  return tier.targetCost || (mrr * tier.targetPercent);
}

async function getUserCount() {
  try {
    const params = {
      TableName: COST_TABLE,
      Key: {
        pk: 'STATS',
        sk: 'USER_COUNT',
      },
    };
    
    const result = await dynamodb.get(params).promise();
    return result.Item?.count || 500;
  } catch (error) {
    return 500; // Fallback
  }
}

async function checkThresholds(costData) {
  const alerts = [];
  
  // Check daily threshold
  if (costData.current.daily > costData.averages.daily * ALERT_THRESHOLDS.daily.critical) {
    alerts.push({
      type: 'daily',
      severity: 'critical',
      threshold: ALERT_THRESHOLDS.daily.critical,
      current: costData.current.daily,
      expected: costData.averages.daily,
      percentOver: ((costData.current.daily / costData.averages.daily) - 1) * 100,
    });
  } else if (costData.current.daily > costData.averages.daily * ALERT_THRESHOLDS.daily.warning) {
    alerts.push({
      type: 'daily',
      severity: 'warning',
      threshold: ALERT_THRESHOLDS.daily.warning,
      current: costData.current.daily,
      expected: costData.averages.daily,
      percentOver: ((costData.current.daily / costData.averages.daily) - 1) * 100,
    });
  }
  
  // Check weekly threshold
  const weeklyProjected = (costData.current.weekly / new Date().getDay()) * 7;
  if (weeklyProjected > costData.averages.weekly * ALERT_THRESHOLDS.weekly.critical) {
    alerts.push({
      type: 'weekly',
      severity: 'critical',
      threshold: ALERT_THRESHOLDS.weekly.critical,
      current: costData.current.weekly,
      projected: weeklyProjected,
      expected: costData.averages.weekly,
      percentOver: ((weeklyProjected / costData.averages.weekly) - 1) * 100,
    });
  }
  
  // Check monthly budget threshold
  const monthlyPercent = costData.current.monthly / costData.budget;
  if (monthlyPercent > ALERT_THRESHOLDS.monthly.critical) {
    alerts.push({
      type: 'monthly',
      severity: 'critical',
      threshold: ALERT_THRESHOLDS.monthly.critical,
      current: costData.current.monthly,
      budget: costData.budget,
      percentUsed: monthlyPercent * 100,
    });
  } else if (monthlyPercent > ALERT_THRESHOLDS.monthly.warning) {
    alerts.push({
      type: 'monthly',
      severity: 'warning',
      threshold: ALERT_THRESHOLDS.monthly.warning,
      current: costData.current.monthly,
      budget: costData.budget,
      percentUsed: monthlyPercent * 100,
    });
  }
  
  // Check for anomalies
  const anomalies = await detectAnomalies(costData);
  alerts.push(...anomalies);
  
  return alerts;
}

async function detectAnomalies(costData) {
  const anomalies = [];
  
  // Get service-level costs for today
  const serviceParams = {
    TimePeriod: {
      Start: new Date().toISOString().split('T')[0],
      End: new Date().toISOString().split('T')[0],
    },
    Granularity: 'DAILY',
    Metrics: ['UnblendedCost'],
    GroupBy: [
      {
        Type: 'DIMENSION',
        Key: 'SERVICE',
      },
    ],
  };
  
  const response = await costExplorer.getCostAndUsage(serviceParams).promise();
  
  if (response.ResultsByTime.length > 0) {
    const todayServices = response.ResultsByTime[0].Groups;
    
    // Check for unusual service costs
    for (const service of todayServices) {
      const serviceName = service.Keys[0];
      const cost = parseFloat(service.Metrics.UnblendedCost.Amount);
      
      // Get historical average for this service
      const historicalAvg = await getServiceHistoricalAverage(serviceName);
      
      if (cost > historicalAvg * 2) {
        anomalies.push({
          type: 'service_anomaly',
          severity: cost > historicalAvg * 3 ? 'critical' : 'warning',
          service: serviceName,
          current: cost,
          expected: historicalAvg,
          percentOver: ((cost / historicalAvg) - 1) * 100,
        });
      }
    }
  }
  
  return anomalies;
}

async function getServiceHistoricalAverage(serviceName) {
  // Get last 30 days average for the service
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const params = {
    TimePeriod: {
      Start: startDate.toISOString().split('T')[0],
      End: endDate.toISOString().split('T')[0],
    },
    Granularity: 'MONTHLY',
    Metrics: ['UnblendedCost'],
    Filter: {
      Dimensions: {
        Key: 'SERVICE',
        Values: [serviceName],
      },
    },
  };
  
  try {
    const response = await costExplorer.getCostAndUsage(params).promise();
    const totalCost = response.ResultsByTime.reduce((sum, period) => {
      return sum + parseFloat(period.Total.UnblendedCost.Amount);
    }, 0);
    
    return totalCost / 30; // Daily average
  } catch (error) {
    console.error(`Error getting historical average for ${serviceName}:`, error);
    return 10; // Default fallback
  }
}

async function processAlerts(alerts, costData) {
  // Group alerts by severity
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  
  // Send notifications based on severity
  if (criticalAlerts.length > 0) {
    await sendCriticalAlert(criticalAlerts, costData);
  }
  
  if (warningAlerts.length > 0) {
    await sendWarningAlert(warningAlerts, costData);
  }
  
  // Update dashboard metrics
  await updateDashboardMetrics(alerts, costData);
}

async function sendCriticalAlert(alerts, costData) {
  const message = formatCriticalAlertMessage(alerts, costData);
  
  // Send SNS notification
  const snsParams = {
    TopicArn: ALERT_TOPIC,
    Subject: '🚨 CRITICAL: AWS Cost Alert',
    Message: message,
    MessageAttributes: {
      severity: {
        DataType: 'String',
        StringValue: 'critical',
      },
      alertCount: {
        DataType: 'Number',
        StringValue: alerts.length.toString(),
      },
    },
  };
  
  await sns.publish(snsParams).promise();
  
  // Also send email for critical alerts
  const emailParams = {
    Source: 'alerts@iocframework.com',
    Destination: {
      ToAddresses: ['team@iocframework.com'],
    },
    Message: {
      Subject: {
        Data: '🚨 CRITICAL AWS Cost Alert - Immediate Action Required',
      },
      Body: {
        Html: {
          Data: formatHtmlAlert(alerts, costData, 'critical'),
        },
        Text: {
          Data: message,
        },
      },
    },
  };
  
  try {
    await ses.sendEmail(emailParams).promise();
  } catch (error) {
    console.error('Error sending email alert:', error);
  }
}

async function sendWarningAlert(alerts, costData) {
  const message = formatWarningAlertMessage(alerts, costData);
  
  const params = {
    TopicArn: ALERT_TOPIC,
    Subject: '⚠️ WARNING: AWS Cost Alert',
    Message: message,
    MessageAttributes: {
      severity: {
        DataType: 'String',
        StringValue: 'warning',
      },
      alertCount: {
        DataType: 'Number',
        StringValue: alerts.length.toString(),
      },
    },
  };
  
  await sns.publish(params).promise();
}

function formatCriticalAlertMessage(alerts, costData) {
  let message = `CRITICAL AWS COST ALERTS\n`;
  message += `========================\n\n`;
  message += `Time: ${new Date().toISOString()}\n\n`;
  
  alerts.forEach(alert => {
    message += formatAlertDetails(alert) + '\n';
  });
  
  message += `\nCURRENT COSTS:\n`;
  message += `- Daily: $${costData.current.daily.toFixed(2)}\n`;
  message += `- Weekly: $${costData.current.weekly.toFixed(2)}\n`;
  message += `- Monthly: $${costData.current.monthly.toFixed(2)}\n`;
  message += `- Budget: $${costData.budget.toFixed(2)}\n`;
  
  message += `\nIMMEDIATE ACTIONS REQUIRED:\n`;
  message += `1. Review service usage in AWS Console\n`;
  message += `2. Identify and stop any runaway processes\n`;
  message += `3. Consider disabling non-essential services\n`;
  message += `4. Contact team lead for budget adjustment if needed\n`;
  
  message += `\nDashboard: https://app.iocframework.com/admin/costs\n`;
  message += `AWS Console: https://console.aws.amazon.com/cost-management/\n`;
  
  return message;
}

function formatWarningAlertMessage(alerts, costData) {
  let message = `AWS Cost Warning Alerts\n`;
  message += `======================\n\n`;
  message += `Time: ${new Date().toISOString()}\n\n`;
  
  alerts.forEach(alert => {
    message += formatAlertDetails(alert) + '\n';
  });
  
  message += `\nRECOMMENDED ACTIONS:\n`;
  message += `- Monitor costs closely\n`;
  message += `- Review optimization recommendations\n`;
  message += `- Plan for cost reduction if trend continues\n`;
  
  message += `\nDashboard: https://app.iocframework.com/admin/costs\n`;
  
  return message;
}

function formatAlertDetails(alert) {
  let details = `[${alert.severity.toUpperCase()}] ${alert.type.toUpperCase()} Alert\n`;
  
  switch (alert.type) {
    case 'daily':
      details += `Current: $${alert.current.toFixed(2)} (${alert.percentOver.toFixed(1)}% over average)\n`;
      details += `Expected: $${alert.expected.toFixed(2)}\n`;
      break;
    
    case 'weekly':
      details += `Current: $${alert.current.toFixed(2)}\n`;
      details += `Projected: $${alert.projected.toFixed(2)} (${alert.percentOver.toFixed(1)}% over average)\n`;
      details += `Expected: $${alert.expected.toFixed(2)}\n`;
      break;
    
    case 'monthly':
      details += `Used: $${alert.current.toFixed(2)} (${alert.percentUsed.toFixed(1)}% of budget)\n`;
      details += `Budget: $${alert.budget.toFixed(2)}\n`;
      break;
    
    case 'service_anomaly':
      details += `Service: ${alert.service}\n`;
      details += `Current: $${alert.current.toFixed(2)} (${alert.percentOver.toFixed(1)}% over average)\n`;
      details += `Expected: $${alert.expected.toFixed(2)}\n`;
      break;
  }
  
  return details;
}

function formatHtmlAlert(alerts, costData, severity) {
  const color = severity === 'critical' ? '#e53e3e' : '#dd6b20';
  
  let html = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: ${color};">${severity === 'critical' ? '🚨 CRITICAL' : '⚠️ WARNING'} AWS Cost Alert</h2>
          
          <div style="background-color: #f7fafc; border-left: 4px solid ${color}; padding: 15px; margin: 20px 0;">
            <p><strong>Alert Summary:</strong></p>
            <ul>
  `;
  
  alerts.forEach(alert => {
    html += `<li>${formatAlertSummary(alert)}</li>`;
  });
  
  html += `
            </ul>
          </div>
          
          <div style="background-color: #edf2f7; padding: 15px; border-radius: 5px;">
            <h3>Current Cost Status</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e0;">Daily Cost:</td>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e0; text-align: right;"><strong>$${costData.current.daily.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e0;">Weekly Cost:</td>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e0; text-align: right;"><strong>$${costData.current.weekly.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e0;">Monthly Cost:</td>
                <td style="padding: 8px; border-bottom: 1px solid #cbd5e0; text-align: right;"><strong>$${costData.current.monthly.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px;">Monthly Budget:</td>
                <td style="padding: 8px; text-align: right;"><strong>$${costData.budget.toFixed(2)}</strong></td>
              </tr>
            </table>
          </div>
          
          <div style="margin-top: 30px;">
            <a href="https://app.iocframework.com/admin/costs" style="display: inline-block; background-color: #3182ce; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a>
            <a href="https://console.aws.amazon.com/cost-management/" style="display: inline-block; background-color: #48bb78; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-left: 10px;">AWS Console</a>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return html;
}

function formatAlertSummary(alert) {
  switch (alert.type) {
    case 'daily':
      return `Daily costs ${alert.percentOver.toFixed(0)}% over average`;
    case 'weekly':
      return `Weekly costs projected ${alert.percentOver.toFixed(0)}% over average`;
    case 'monthly':
      return `Monthly budget ${alert.percentUsed.toFixed(0)}% consumed`;
    case 'service_anomaly':
      return `${alert.service} costs ${alert.percentOver.toFixed(0)}% above normal`;
    default:
      return 'Cost anomaly detected';
  }
}

async function updateDashboardMetrics(alerts, costData) {
  const metrics = [
    {
      MetricName: 'AlertCount',
      Value: alerts.length,
      Unit: 'Count',
    },
    {
      MetricName: 'CriticalAlerts',
      Value: alerts.filter(a => a.severity === 'critical').length,
      Unit: 'Count',
    },
    {
      MetricName: 'BudgetUtilization',
      Value: (costData.current.monthly / costData.budget) * 100,
      Unit: 'Percent',
    },
  ];
  
  const params = {
    Namespace: 'IOC/Analytics/Alerts',
    MetricData: metrics.map(m => ({
      ...m,
      Timestamp: new Date(),
    })),
  };
  
  const cloudwatch = new AWS.CloudWatch();
  await cloudwatch.putMetricData(params).promise();
}

async function updateAlertHistory(alerts) {
  if (alerts.length === 0) return;
  
  const timestamp = new Date().toISOString();
  
  const params = {
    TableName: COST_TABLE,
    Item: {
      pk: 'ALERT_HISTORY',
      sk: timestamp,
      alerts,
      timestamp,
      ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days TTL
    },
  };
  
  await dynamodb.put(params).promise();
}