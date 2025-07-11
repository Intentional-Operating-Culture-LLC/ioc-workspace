/**
 * Example usage of Lambda Analytics functions
 */

import { lambdaAnalytics, analyticsHelpers, eventBuilders } from '../src';

async function exampleUsage() {
  // 1. Process a completed assessment
  console.log('📝 Processing assessment...');
  
  const assessmentData = {
    userId: 'user-12345',
    email: 'user@example.com',
    assessmentId: 'assess-67890',
    assessmentType: 'ocean-120',
    version: '2.0',
    timestamp: new Date().toISOString(),
    completionTime: 720000, // 12 minutes
    
    scores: {
      openness: 72,
      conscientiousness: 68,
      extraversion: 55,
      agreeableness: 70,
      neuroticism: 45
    },
    
    responses: Array(120).fill(null).map((_, i) => ({
      questionId: `q${i + 1}`,
      answer: Math.floor(Math.random() * 100),
      responseTime: 2000 + Math.random() * 3000,
      confidence: 0.8 + Math.random() * 0.2
    })),
    
    demographics: {
      age: 32,
      gender: 'female',
      country: 'USA',
      industry: 'Technology',
      role: 'Senior Manager',
      yearsExperience: 8
    },
    
    metadata: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      platform: 'web',
      appVersion: '3.0.1'
    }
  };
  
  await lambdaAnalytics.processAssessment(assessmentData);
  console.log('✅ Assessment processed and anonymized');
  
  // 2. Submit for Dual AI validation
  console.log('\n🤖 Submitting for Dual AI validation...');
  
  const a1Response = {
    assessmentId: assessmentData.assessmentId,
    oceanScores: assessmentData.scores,
    confidence: 0.92,
    processingTime: 1500,
    tokensUsed: 2500,
    modelVersion: 'gpt-4-turbo'
  };
  
  const b1Validation = {
    assessmentId: assessmentData.assessmentId,
    oceanScores: {
      openness: 70, // Slight disagreement
      conscientiousness: 69,
      extraversion: 55,
      agreeableness: 68,
      neuroticism: 47
    },
    confidence: 0.89,
    processingTime: 1200,
    tokensUsed: 1800,
    modelVersion: 'claude-3',
    consistencyScore: 0.91
  };
  
  await lambdaAnalytics.submitDualAIValidation(
    assessmentData.assessmentId,
    a1Response,
    b1Validation
  );
  console.log('✅ Dual AI validation submitted');
  
  // 3. Track events in Pinpoint
  console.log('\n📊 Tracking analytics events...');
  
  // Track assessment start
  await lambdaAnalytics.trackEvent(
    eventBuilders.assessmentStarted(
      assessmentData.userId,
      assessmentData.assessmentId,
      assessmentData.assessmentType
    )
  );
  
  // Track assessment completion
  await lambdaAnalytics.trackEvent(
    eventBuilders.assessmentCompleted(
      assessmentData.userId,
      assessmentData.assessmentId,
      assessmentData.scores,
      assessmentData.completionTime
    )
  );
  
  // Track user engagement
  await lambdaAnalytics.trackEvent(
    eventBuilders.userEngagement(
      assessmentData.userId,
      'report_generated',
      { reportType: 'detailed', format: 'pdf' }
    )
  );
  
  console.log('✅ Events tracked in Pinpoint');
  
  // 4. Retrieve OCEAN scores
  console.log('\n🎯 Retrieving OCEAN scores...');
  
  const oceanScores = await lambdaAnalytics.getOCEANScores(assessmentData.userId);
  console.log('OCEAN Scores:', oceanScores);
  
  // 5. Get analytics insights
  console.log('\n📈 Getting analytics insights...');
  
  const insights = await lambdaAnalytics.getAnalyticsInsights({
    date: new Date().toISOString().split('T')[0],
    assessmentType: 'ocean-120'
  });
  
  console.log('Insights:', JSON.stringify(insights, null, 2));
  
  // 6. Batch process multiple assessments
  console.log('\n🔄 Batch processing assessments...');
  
  const batchAssessments = Array(10).fill(null).map((_, i) => ({
    ...assessmentData,
    userId: `user-batch-${i}`,
    assessmentId: `assess-batch-${i}`,
    timestamp: new Date(Date.now() - i * 60000).toISOString()
  }));
  
  await analyticsHelpers.batchProcessAssessments(batchAssessments);
  console.log('✅ Batch processing complete');
  
  // 7. Generate cost report
  console.log('\n💰 Generating cost report...');
  
  const costReport = await analyticsHelpers.generateCostReport(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    new Date()
  );
  
  console.log('Cost Report:', costReport);
  
  // 8. Get optimization recommendations
  console.log('\n🔧 Getting optimization recommendations...');
  
  const currentMRR = 5000; // $5K MRR
  const recommendations = await analyticsHelpers.optimizeConfigurations(currentMRR);
  
  console.log('Optimization Recommendations:', recommendations);
}

// Error handling example
async function errorHandlingExample() {
  console.log('\n⚠️ Error Handling Example...');
  
  try {
    // Simulate invalid assessment data
    await lambdaAnalytics.processAssessment({
      // Missing required fields
      assessmentId: 'invalid-assessment'
    });
  } catch (error) {
    console.error('Expected error:', error.message);
  }
  
  // The error will be:
  // - Logged to CloudWatch
  // - Sent to error queue
  // - Tracked in metrics
}

// Cost optimization example
async function costOptimizationExample() {
  console.log('\n💡 Cost Optimization Example...');
  
  const mrrLevels = [0, 1000, 5000, 10000];
  
  for (const mrr of mrrLevels) {
    console.log(`\nMRR: $${mrr}`);
    
    // Memory configuration
    const memory = mrr >= 1000 ? 256 : 128;
    console.log(`- Memory: ${memory}MB`);
    
    // Batch size
    const batchSize = mrr >= 5000 ? 100 : mrr >= 1000 ? 50 : 10;
    console.log(`- Batch size: ${batchSize}`);
    
    // Features
    console.log(`- X-Ray: ${mrr >= 5000 ? 'Enabled' : 'Disabled'}`);
    console.log(`- Enhanced monitoring: ${mrr >= 1000 ? 'Enabled' : 'Disabled'}`);
    console.log(`- Provisioned concurrency: ${mrr >= 10000 ? 'Enabled' : 'Disabled'}`);
    
    // Estimated monthly cost
    const baseCost = 5; // Base infrastructure
    const perUserCost = 0.01; // Per active user
    const activeUsers = mrr / 50; // Assuming $50 per user
    const totalCost = baseCost + (activeUsers * perUserCost);
    console.log(`- Estimated Lambda cost: $${totalCost.toFixed(2)}/month`);
  }
}

// Run examples
async function runExamples() {
  console.log('🚀 Lambda Analytics Examples\n');
  
  try {
    await exampleUsage();
    await errorHandlingExample();
    await costOptimizationExample();
    
    console.log('\n✨ All examples completed successfully!');
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Execute if running directly
if (require.main === module) {
  runExamples();
}

export { exampleUsage, errorHandlingExample, costOptimizationExample };