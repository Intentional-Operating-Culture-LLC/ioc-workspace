/**
 * Example usage of IOC Analytics CloudWatch monitoring
 */

import { 
  MetricAggregator, 
  LogOptimizer, 
  WeeklyReporter,
  DashboardBuilder 
} from '../src/monitoring';

// Environment configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const LOG_GROUP_NAME = '/aws/lambda/ioc-analytics';
const S3_BUCKET = process.env.ANALYTICS_BUCKET || 'ioc-analytics-data';

/**
 * Example 1: Tracking business metrics
 */
async function trackBusinessMetrics() {
  const aggregator = new MetricAggregator(AWS_REGION);
  
  // Track assessment completion
  aggregator.trackAssessmentCompletion(
    'user-123',
    { O: 75.5, C: 82.3, E: 68.9, A: 79.1, N: 45.2 },
    true // dual AI validated
  );
  
  // Track revenue
  aggregator.trackRevenue(29.99, 'subscription');
  
  // Track system performance
  aggregator.trackSystemPerformance({
    type: 'lambda',
    duration: 234,
    cost: 0.0002
  });
  
  aggregator.trackSystemPerformance({
    type: 'api',
    duration: 156
  });
  
  // Publish aggregated metrics to CloudWatch
  await aggregator.publishAggregatedMetrics();
  
  // Generate daily summary
  const summary = await aggregator.generateDailySummary();
  console.log('Daily Summary:', summary);
}

/**
 * Example 2: Optimized logging
 */
function setupOptimizedLogging() {
  const logger = new LogOptimizer(
    LOG_GROUP_NAME,
    'production',
    AWS_REGION
  );
  
  // Log assessment completion (essential event)
  logger.logAssessmentCompleted({
    userId: 'user-123',
    assessmentId: 'assessment-456',
    oceanScores: { O: 75.5, C: 82.3, E: 68.9, A: 79.1, N: 45.2 },
    dualAIValidated: true,
    duration: 2340
  });
  
  // Log revenue event (essential)
  logger.logRevenueEvent({
    userId: 'user-123',
    amount: 29.99,
    type: 'subscription',
    plan: 'professional'
  });
  
  // Log error with context
  try {
    // Some operation that might fail
    throw new Error('API rate limit exceeded');
  } catch (error) {
    logger.logError(error as Error, {
      userId: 'user-123',
      operation: 'dual-ai-validation',
      retryCount: 3
    });
  }
  
  // Log custom business event
  logger.logBusinessEvent('TRIAL_STARTED', {
    userId: 'user-789',
    plan: 'professional',
    source: 'organic'
  });
  
  // Cleanup when done
  logger.destroy();
}

/**
 * Example 3: Create CloudWatch dashboards
 */
async function createDashboards() {
  const builder = new DashboardBuilder(AWS_REGION);
  
  // Create all free tier dashboards
  await builder.createFreeTierDashboards();
  
  // Create critical alarms
  await builder.createCriticalAlarms();
  
  // Estimate monthly costs
  const costEstimate = builder.estimateMonthlyCosts(
    10,      // custom metrics
    500000,  // dashboard requests
    3,       // GB logs ingestion
    4        // alarms
  );
  
  console.log('Estimated monthly costs:', costEstimate);
  
  // Generate dashboard JSON for manual creation
  const dashboardJSON = builder.generateDashboardJSON('businessMetrics');
  console.log('Dashboard JSON:', dashboardJSON);
}

/**
 * Example 4: Weekly reporting
 */
async function generateWeeklyReport() {
  const reporter = new WeeklyReporter(AWS_REGION);
  
  // Generate and send weekly report
  await reporter.generateWeeklyReport(
    LOG_GROUP_NAME,
    S3_BUCKET,
    ['analytics@iocframework.com', 'team@iocframework.com']
  );
}

/**
 * Example 5: Lambda function integration
 */
export async function lambdaHandler(event: any) {
  const aggregator = new MetricAggregator();
  const logger = new LogOptimizer(LOG_GROUP_NAME, 'lambda-function');
  
  try {
    // Process assessment
    const result = await processAssessment(event);
    
    // Track metrics
    aggregator.trackAssessmentCompletion(
      result.userId,
      result.oceanScores,
      result.dualAIValidated
    );
    
    // Log completion
    logger.logAssessmentCompleted({
      userId: result.userId,
      assessmentId: result.assessmentId,
      oceanScores: result.oceanScores,
      dualAIValidated: result.dualAIValidated,
      duration: result.processingTime
    });
    
    // Track Lambda performance
    aggregator.trackSystemPerformance({
      type: 'lambda',
      duration: result.processingTime,
      cost: calculateLambdaCost(result.processingTime)
    });
    
    // Publish metrics
    await aggregator.publishAggregatedMetrics();
    
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    // Log error
    logger.logError(error as Error, {
      event: JSON.stringify(event),
      function: 'lambdaHandler'
    });
    
    // Track error metric
    aggregator.trackSystemPerformance({
      type: 'lambda',
      duration: 0,
      error: true
    });
    
    throw error;
  } finally {
    // Ensure logs are flushed
    await logger.flush();
  }
}

/**
 * Example 6: Cost tracking
 */
async function trackCosts() {
  const aggregator = new MetricAggregator();
  
  // Track Lambda costs
  const lambdaInvocations = 1000;
  const avgDuration = 200; // ms
  const lambdaCost = calculateLambdaCost(avgDuration) * lambdaInvocations;
  
  // Track S3 costs
  const s3Requests = 500;
  const s3Cost = s3Requests * 0.0004 / 1000; // $0.0004 per 1000 requests
  
  // Track total cost per assessment
  const assessments = 100;
  const costPerAssessment = (lambdaCost + s3Cost) / assessments;
  
  // Publish cost metrics
  const metrics = [
    {
      MetricName: 'CostPerAssessment',
      Value: costPerAssessment,
      Unit: 'None',
      Timestamp: new Date()
    }
  ];
  
  const builder = new DashboardBuilder();
  await builder.publishMetrics(metrics);
  
  console.log(`Cost per assessment: $${costPerAssessment.toFixed(4)}`);
}

/**
 * Example 7: Growth-based monitoring scaling
 */
async function scaleMonitoring(currentMRR: number) {
  console.log(`Current MRR: $${currentMRR}`);
  
  if (currentMRR >= 10000) {
    console.log('Tier 4: Full observability enabled');
    // Enable distributed tracing, APM, unlimited metrics
  } else if (currentMRR >= 5000) {
    console.log('Tier 3: Adding anomaly detection');
    // Enable ML-based anomaly detection, predictive analytics
  } else if (currentMRR >= 2000) {
    console.log('Tier 2: Enabling detailed monitoring');
    // Add performance metrics, cache monitoring
  } else if (currentMRR >= 500) {
    console.log('Tier 1: Adding user analytics');
    // Add retention metrics, industry analytics
  } else {
    console.log('Free Tier: Essential metrics only');
  }
}

// Helper functions
async function processAssessment(event: any): Promise<any> {
  // Simulate assessment processing
  return {
    userId: event.userId,
    assessmentId: `assessment-${Date.now()}`,
    oceanScores: { O: 75, C: 82, E: 69, A: 79, N: 45 },
    dualAIValidated: true,
    processingTime: 234
  };
}

function calculateLambdaCost(duration: number): number {
  // Lambda pricing: $0.20 per 1M requests + $0.00001667 per GB-second
  const requestCost = 0.20 / 1000000;
  const computeCost = (duration / 1000) * (512 / 1024) * 0.00001667;
  return requestCost + computeCost;
}

// Run examples
if (require.main === module) {
  (async () => {
    console.log('Running monitoring examples...\n');
    
    // Example 1: Track metrics
    console.log('1. Tracking business metrics...');
    await trackBusinessMetrics();
    
    // Example 2: Setup logging
    console.log('\n2. Setting up optimized logging...');
    setupOptimizedLogging();
    
    // Example 3: Create dashboards
    console.log('\n3. Creating dashboards...');
    await createDashboards();
    
    // Example 6: Track costs
    console.log('\n4. Tracking costs...');
    await trackCosts();
    
    // Example 7: Scale monitoring
    console.log('\n5. Checking monitoring scale...');
    await scaleMonitoring(250); // Current MRR
    
    console.log('\n✅ Examples completed!');
  })();
}