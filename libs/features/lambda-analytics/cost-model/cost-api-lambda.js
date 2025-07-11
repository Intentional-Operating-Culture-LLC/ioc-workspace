/**
 * API Lambda for cost dashboard data
 * Provides endpoints for the financial dashboard
 */

const AWS = require('aws-sdk');
const AWSCostModel = require('./aws-analytics-cost-model');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const costExplorer = new AWS.CostExplorer({ region: 'us-east-1' });

const COST_TABLE = process.env.COST_TRACKING_TABLE || 'ioc-cost-tracking';
const CACHE_TTL = 300; // 5 minutes

// Initialize cost model
const costModel = new AWSCostModel();

exports.handler = async (event) => {
  const path = event.path;
  const queryParams = event.queryStringParameters || {};
  
  try {
    let response;
    
    if (path.includes('/costs')) {
      if (path.includes('/costs/')) {
        // Get specific service costs
        const service = path.split('/').pop();
        response = await getServiceCosts(service, queryParams);
      } else {
        // Get overall costs
        response = await getCosts(queryParams);
      }
    } else if (path.includes('/projections')) {
      response = await getProjections(queryParams);
    } else if (path.includes('/recommendations')) {
      response = await getRecommendations(queryParams);
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Not found' }),
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `max-age=${CACHE_TTL}`,
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

async function getCosts(params) {
  const range = params.range || 'current';
  const now = new Date();
  
  // Get cached data first
  const cacheKey = `costs_${range}_${now.toISOString().split('T')[0]}`;
  const cached = await getCachedData(cacheKey);
  if (cached) return cached;
  
  let startDate, endDate;
  
  switch (range) {
    case 'current':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = now;
      break;
    case 'previous':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = now;
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = now;
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = now;
  }
  
  // Get current costs from Cost Explorer
  const currentCosts = await getActualCosts(startDate, endDate);
  
  // Get historical data
  const history = await getHistoricalData(startDate, endDate);
  
  // Get budget information
  const budget = await getBudgetStatus(currentCosts.total);
  
  // Calculate unit economics
  const userCount = await getUserCount();
  const assessmentCount = userCount * 2.5; // Average assessments per user
  
  const unitEconomics = {
    costPerUser: currentCosts.total / userCount,
    costPerAssessment: currentCosts.total / assessmentCount,
    revenuePerUser: 50, // $50 average
    marginPerUser: 50 - (currentCosts.total / userCount),
    breakEvenUsers: Math.ceil(currentCosts.total / 50),
  };
  
  // Get recommendations
  const recommendations = await getOptimizationRecommendations(currentCosts, userCount);
  
  const result = {
    current: currentCosts,
    history,
    budget,
    unitEconomics,
    recommendations: recommendations.slice(0, 3), // Top 3
    lastUpdated: new Date().toISOString(),
  };
  
  // Cache the result
  await setCachedData(cacheKey, result, CACHE_TTL);
  
  return result;
}

async function getActualCosts(startDate, endDate) {
  const params = {
    TimePeriod: {
      Start: startDate.toISOString().split('T')[0],
      End: endDate.toISOString().split('T')[0],
    },
    Granularity: 'MONTHLY',
    Metrics: ['UnblendedCost'],
    GroupBy: [
      {
        Type: 'DIMENSION',
        Key: 'SERVICE',
      },
    ],
  };
  
  const response = await costExplorer.getCostAndUsage(params).promise();
  
  // Process costs
  const services = [];
  let total = 0;
  
  if (response.ResultsByTime.length > 0) {
    const latestPeriod = response.ResultsByTime[response.ResultsByTime.length - 1];
    
    latestPeriod.Groups.forEach(group => {
      const serviceName = mapServiceToShortName(group.Keys[0]);
      const cost = parseFloat(group.Metrics.UnblendedCost.Amount);
      
      if (isAnalyticsService(serviceName)) {
        services.push({
          name: serviceName,
          cost,
          dailyAverage: cost / getDaysInPeriod(startDate, endDate),
          trend: calculateTrend(serviceName, cost),
        });
        total += cost;
      }
    });
  }
  
  // Calculate projected monthly cost
  const daysElapsed = getDaysInPeriod(startDate, endDate);
  const daysInMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
  const projected = (total / daysElapsed) * daysInMonth;
  
  return {
    services,
    total,
    projected,
    changePercent: await calculateChangePercent(total),
    trend: total > projected ? 'decreasing' : 'increasing',
  };
}

async function getHistoricalData(startDate, endDate) {
  // Get daily costs for the period
  const dailyParams = {
    TimePeriod: {
      Start: startDate.toISOString().split('T')[0],
      End: endDate.toISOString().split('T')[0],
    },
    Granularity: 'DAILY',
    Metrics: ['UnblendedCost'],
  };
  
  const dailyResponse = await costExplorer.getCostAndUsage(dailyParams).promise();
  
  const daily = dailyResponse.ResultsByTime.map(day => ({
    date: day.TimePeriod.Start,
    cost: parseFloat(day.Total.UnblendedCost.Amount),
  }));
  
  // Calculate running average
  let sum = 0;
  daily.forEach((day, index) => {
    sum += day.cost;
    day.average = sum / (index + 1);
  });
  
  // Get service-level trends
  const serviceParams = {
    TimePeriod: {
      Start: new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
  };
  
  const serviceResponse = await costExplorer.getCostAndUsage(serviceParams).promise();
  
  // Process service data
  const byService = {};
  serviceResponse.ResultsByTime.forEach(day => {
    const date = day.TimePeriod.Start;
    if (!byService[date]) {
      byService[date] = { date };
    }
    
    day.Groups.forEach(group => {
      const serviceName = mapServiceToShortName(group.Keys[0]);
      if (isAnalyticsService(serviceName)) {
        byService[date][serviceName] = parseFloat(group.Metrics.UnblendedCost.Amount);
      }
    });
  });
  
  return {
    daily,
    byService: Object.values(byService),
    summary: {
      totalDays: daily.length,
      averageDailyCost: sum / daily.length,
      highestDayCost: Math.max(...daily.map(d => d.cost)),
      lowestDayCost: Math.min(...daily.map(d => d.cost)),
    },
  };
}

async function getBudgetStatus(currentCost) {
  const mrr = await getMRR();
  const model = new AWSCostModel();
  const lambdaExports = model.exportToLambda();
  
  const budgetCheck = lambdaExports.checkBudgetAlert(currentCost, mrr);
  
  return {
    target: budgetCheck.targetCost,
    percentUsed: budgetCheck.percentUsed,
    alert: budgetCheck.alert,
    critical: budgetCheck.critical,
    message: budgetCheck.message,
    status: budgetCheck.critical ? 'critical' : budgetCheck.alert ? 'warning' : 'good',
  };
}

async function getProjections(params) {
  const scenario = params.scenario || 'moderate';
  const months = parseInt(params.months) || 12;
  
  const model = new AWSCostModel();
  const scenarios = model.scenarios;
  
  // Generate projections for requested scenario
  const projectionData = model.generateProjections(scenarios[scenario], months);
  
  // Generate comparison data for all scenarios
  const allScenarios = {};
  Object.entries(scenarios).forEach(([key, scenarioConfig]) => {
    const data = model.generateProjections(scenarioConfig, months);
    allScenarios[key] = data.map(month => ({
      month: month.month,
      cost: month.costs.total,
      users: month.users,
      mrr: month.mrr,
    }));
  });
  
  // Format for chart
  const chartData = [];
  for (let i = 0; i < months; i++) {
    const point = {
      month: i + 1,
      conservative: allScenarios.conservative[i].cost,
      moderate: allScenarios.moderate[i].cost,
      aggressive: allScenarios.aggressive[i].cost,
      budget: allScenarios.moderate[i].mrr * 0.05, // 5% of MRR target
    };
    chartData.push(point);
  }
  
  // Calculate break-even points
  const breakeven = Object.entries(scenarios).map(([key, scenarioConfig]) => {
    const data = model.generateProjections(scenarioConfig, 24);
    const breakEvenMonth = data.find(month => month.costs.total <= month.mrr * 0.05);
    
    return {
      name: scenarioConfig.name,
      scenario: key,
      month: breakEvenMonth?.month || '>24',
      users: breakEvenMonth?.users || 'N/A',
    };
  });
  
  return {
    current: projectionData[0],
    projections: projectionData,
    scenarios: chartData,
    breakeven,
    assumptions: {
      avgRevenuePerUser: 50,
      targetCostPercent: 5,
      ...scenarios[scenario],
    },
  };
}

async function getRecommendations(params) {
  const userCount = await getUserCount();
  const currentCosts = await getActualCosts(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    new Date()
  );
  
  return getOptimizationRecommendations(currentCosts, userCount);
}

async function getOptimizationRecommendations(costs, userCount) {
  const mrr = userCount * 50;
  const model = new AWSCostModel();
  
  const monthlyData = {
    users: userCount,
    mrr,
    costs: {
      ...costs.services.reduce((acc, service) => {
        acc[service.name] = service.cost;
        return acc;
      }, {}),
      total: costs.total,
    },
  };
  
  const recommendations = model.getOptimizationRecommendations(monthlyData);
  
  // Add implementation status and timeline
  return recommendations.map(rec => ({
    ...rec,
    status: 'pending',
    estimatedEffort: getEffortEstimate(rec),
    timeline: getImplementationTimeline(rec),
    impact: calculateImpact(rec, costs.total),
  }));
}

// Helper functions
function mapServiceToShortName(awsServiceName) {
  const mapping = {
    'Amazon Pinpoint': 'pinpoint',
    'Amazon Simple Storage Service': 's3',
    'AWS Lambda': 'lambda',
    'Amazon QuickSight': 'quicksight',
    'Amazon Athena': 'athena',
    'AmazonCloudWatch': 'cloudwatch',
  };
  
  return mapping[awsServiceName] || awsServiceName;
}

function isAnalyticsService(serviceName) {
  const analyticsServices = ['pinpoint', 's3', 'lambda', 'quicksight', 'athena', 'cloudwatch'];
  return analyticsServices.includes(serviceName);
}

function getDaysInPeriod(start, end) {
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

async function calculateChangePercent(currentCost) {
  // Get previous period cost
  const previousMonth = new Date();
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  
  try {
    const previousCosts = await getActualCosts(
      new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1),
      new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0)
    );
    
    if (previousCosts.total === 0) return 0;
    return ((currentCost - previousCosts.total) / previousCosts.total) * 100;
  } catch (error) {
    console.error('Error calculating change percent:', error);
    return 0;
  }
}

function calculateTrend(serviceName, currentCost) {
  // Mock trend calculation - in production, compare with historical data
  return Math.random() > 0.5 ? Math.random() * 10 : -Math.random() * 10;
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
    return result.Item?.count || 500; // Default
  } catch (error) {
    return 500; // Fallback
  }
}

async function getMRR() {
  const userCount = await getUserCount();
  return userCount * 50; // $50 per user average
}

async function getCachedData(key) {
  try {
    const params = {
      TableName: COST_TABLE,
      Key: {
        pk: 'CACHE',
        sk: key,
      },
    };
    
    const result = await dynamodb.get(params).promise();
    
    if (result.Item && result.Item.expires > Date.now()) {
      return result.Item.data;
    }
  } catch (error) {
    console.error('Cache read error:', error);
  }
  
  return null;
}

async function setCachedData(key, data, ttlSeconds) {
  try {
    const params = {
      TableName: COST_TABLE,
      Item: {
        pk: 'CACHE',
        sk: key,
        data,
        expires: Date.now() + (ttlSeconds * 1000),
        ttl: Math.floor(Date.now() / 1000) + ttlSeconds,
      },
    };
    
    await dynamodb.put(params).promise();
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

function getEffortEstimate(recommendation) {
  if (recommendation.category === 'Service Enablement') return 'Low';
  if (recommendation.category === 'Reserved Capacity') return 'Medium';
  if (recommendation.category === 'Query Optimization') return 'High';
  return 'Medium';
}

function getImplementationTimeline(recommendation) {
  const effort = getEffortEstimate(recommendation);
  if (effort === 'Low') return '1-2 days';
  if (effort === 'Medium') return '1 week';
  if (effort === 'High') return '2-3 weeks';
  return '1 week';
}

function calculateImpact(recommendation, totalCost) {
  const savingsPercent = (recommendation.savings / totalCost) * 100;
  if (savingsPercent > 10) return 'High';
  if (savingsPercent > 5) return 'Medium';
  return 'Low';
}

async function getServiceCosts(service, queryParams) {
  const range = queryParams.range || '30d';
  const endDate = new Date();
  let startDate;
  
  switch (range) {
    case '7d':
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  
  const serviceMapping = {
    pinpoint: 'Amazon Pinpoint',
    s3: 'Amazon Simple Storage Service',
    lambda: 'AWS Lambda',
    quicksight: 'Amazon QuickSight',
    athena: 'Amazon Athena',
    cloudwatch: 'AmazonCloudWatch',
  };
  
  const awsServiceName = serviceMapping[service];
  if (!awsServiceName) {
    throw new Error(`Unknown service: ${service}`);
  }
  
  const params = {
    TimePeriod: {
      Start: startDate.toISOString().split('T')[0],
      End: endDate.toISOString().split('T')[0],
    },
    Granularity: 'DAILY',
    Metrics: ['UnblendedCost', 'UsageQuantity'],
    Filter: {
      Dimensions: {
        Key: 'SERVICE',
        Values: [awsServiceName],
      },
    },
  };
  
  const response = await costExplorer.getCostAndUsage(params).promise();
  
  const dailyCosts = response.ResultsByTime.map(day => ({
    date: day.TimePeriod.Start,
    cost: parseFloat(day.Total.UnblendedCost.Amount),
    usage: parseFloat(day.Total.UsageQuantity?.Amount || 0),
  }));
  
  const totalCost = dailyCosts.reduce((sum, day) => sum + day.cost, 0);
  const avgDailyCost = totalCost / dailyCosts.length;
  
  return {
    service,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
    totalCost,
    avgDailyCost,
    dailyCosts,
    trend: calculateServiceTrend(dailyCosts),
    forecast: forecastServiceCost(dailyCosts),
  };
}

function calculateServiceTrend(dailyCosts) {
  if (dailyCosts.length < 7) return { direction: 'stable', percent: 0 };
  
  const recentWeek = dailyCosts.slice(-7);
  const previousWeek = dailyCosts.slice(-14, -7);
  
  const recentAvg = recentWeek.reduce((sum, day) => sum + day.cost, 0) / 7;
  const previousAvg = previousWeek.reduce((sum, day) => sum + day.cost, 0) / 7;
  
  const changePercent = ((recentAvg - previousAvg) / previousAvg) * 100;
  
  return {
    direction: changePercent > 5 ? 'increasing' : changePercent < -5 ? 'decreasing' : 'stable',
    percent: changePercent,
  };
}

function forecastServiceCost(dailyCosts) {
  // Simple linear regression forecast
  const n = dailyCosts.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  dailyCosts.forEach((day, index) => {
    sumX += index;
    sumY += day.cost;
    sumXY += index * day.cost;
    sumX2 += index * index;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Forecast next 7 days
  const forecast = [];
  for (let i = 0; i < 7; i++) {
    const dayIndex = n + i;
    const predictedCost = slope * dayIndex + intercept;
    
    const forecastDate = new Date(dailyCosts[n - 1].date);
    forecastDate.setDate(forecastDate.getDate() + i + 1);
    
    forecast.push({
      date: forecastDate.toISOString().split('T')[0],
      cost: Math.max(0, predictedCost), // Ensure non-negative
      type: 'forecast',
    });
  }
  
  return forecast;
}