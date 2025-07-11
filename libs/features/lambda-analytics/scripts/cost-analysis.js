#!/usr/bin/env node

/**
 * Lambda Cost Analysis Tool
 * Calculates and projects Lambda costs based on usage patterns
 */

const LAMBDA_PRICING = {
  requestPrice: 0.0000002, // per request
  gbSecondPrice: 0.0000166667, // per GB-second
  freeRequests: 1000000, // monthly free tier
  freeGbSeconds: 400000 // monthly free tier
};

const FUNCTIONS = {
  'assessment-anonymizer': {
    memory: 128,
    avgDuration: 500,
    dailyInvocations: 1000
  },
  'ocean-calculator': {
    memory: 128,
    avgDuration: 1000,
    dailyInvocations: 1000
  },
  'dual-ai-processor': {
    memory: 128,
    avgDuration: 2000,
    dailyInvocations: 500
  },
  'pinpoint-transformer': {
    memory: 128,
    avgDuration: 200,
    dailyInvocations: 2000
  },
  's3-data-processor': {
    memory: 128,
    avgDuration: 5000,
    dailyInvocations: 100
  }
};

function calculateFunctionCost(config, mrr = 0) {
  // Adjust memory based on MRR
  let memory = config.memory;
  if (mrr >= 1000 && memory === 128) {
    memory = 256;
  }
  if (mrr >= 5000 && config.avgDuration > 1500) {
    memory = 512;
  }
  
  const monthlyInvocations = config.dailyInvocations * 30;
  const gbSeconds = (memory / 1024) * (config.avgDuration / 1000) * monthlyInvocations;
  
  // Calculate costs (considering free tier)
  const requestCost = Math.max(0, (monthlyInvocations - LAMBDA_PRICING.freeRequests / 5)) * LAMBDA_PRICING.requestPrice;
  const computeCost = Math.max(0, (gbSeconds - LAMBDA_PRICING.freeGbSeconds / 5)) * LAMBDA_PRICING.gbSecondPrice;
  
  return {
    memory,
    monthlyInvocations,
    gbSeconds,
    requestCost,
    computeCost,
    totalCost: requestCost + computeCost
  };
}

function generateCostReport(mrr = 0) {
  console.log('🧮 Lambda Cost Analysis Report');
  console.log('================================');
  console.log(`Current MRR: $${mrr}`);
  console.log(`Analysis Date: ${new Date().toISOString()}\n`);
  
  let totalMonthlyCost = 0;
  const functionCosts = {};
  
  Object.entries(FUNCTIONS).forEach(([name, config]) => {
    const cost = calculateFunctionCost(config, mrr);
    functionCosts[name] = cost;
    totalMonthlyCost += cost.totalCost;
    
    console.log(`📦 ${name}:`);
    console.log(`   Memory: ${cost.memory}MB`);
    console.log(`   Monthly invocations: ${cost.monthlyInvocations.toLocaleString()}`);
    console.log(`   GB-seconds: ${cost.gbSeconds.toFixed(2)}`);
    console.log(`   Request cost: $${cost.requestCost.toFixed(4)}`);
    console.log(`   Compute cost: $${cost.computeCost.toFixed(4)}`);
    console.log(`   Total cost: $${cost.totalCost.toFixed(4)}`);
    console.log('');
  });
  
  console.log('💰 Cost Summary:');
  console.log('--------------------------------');
  console.log(`Total monthly cost: $${totalMonthlyCost.toFixed(2)}`);
  console.log(`Cost per 1000 assessments: $${(totalMonthlyCost / 30).toFixed(2)}`);
  console.log(`Annual projection: $${(totalMonthlyCost * 12).toFixed(2)}`);
  
  // MRR-based recommendations
  console.log('\n📊 Optimization Recommendations:');
  console.log('--------------------------------');
  
  if (mrr < 1000) {
    console.log('✓ Functions configured for minimal cost');
    console.log('✓ Using 128MB memory for all functions');
    console.log('→ Consider upgrading to 256MB at $1K MRR');
  } else if (mrr < 5000) {
    console.log('✓ Balanced memory configuration (256MB)');
    console.log('→ Enable X-Ray tracing at $5K MRR');
    console.log('→ Consider batch processing optimizations');
  } else if (mrr < 10000) {
    console.log('✓ Enhanced monitoring enabled');
    console.log('✓ X-Ray tracing active');
    console.log('→ Consider provisioned concurrency at $10K MRR');
  } else {
    console.log('✓ Full performance optimization enabled');
    console.log('→ Monitor for cost anomalies');
    console.log('→ Consider reserved capacity pricing');
  }
  
  // Scaling scenarios
  console.log('\n📈 Scaling Scenarios:');
  console.log('--------------------------------');
  
  const scalingFactors = [1, 2, 5, 10];
  scalingFactors.forEach(factor => {
    const scaledCost = totalMonthlyCost * factor;
    console.log(`${factor}x volume: $${scaledCost.toFixed(2)}/month`);
  });
  
  // Cost breakdown by category
  console.log('\n📊 Cost Breakdown:');
  console.log('--------------------------------');
  
  const categories = {
    'Data Processing': ['assessment-anonymizer', 'ocean-calculator', 's3-data-processor'],
    'AI/ML': ['dual-ai-processor'],
    'Analytics': ['pinpoint-transformer']
  };
  
  Object.entries(categories).forEach(([category, functions]) => {
    const categoryCost = functions.reduce((sum, func) => 
      sum + (functionCosts[func]?.totalCost || 0), 0
    );
    const percentage = (categoryCost / totalMonthlyCost * 100).toFixed(1);
    console.log(`${category}: $${categoryCost.toFixed(2)} (${percentage}%)`);
  });
  
  // Additional services cost estimates
  console.log('\n💵 Additional AWS Services (Estimated):');
  console.log('--------------------------------');
  console.log(`S3 Storage (100GB): $2.30/month`);
  console.log(`S3 Requests: $0.50/month`);
  console.log(`SQS (1M messages): $0.40/month`);
  console.log(`EventBridge: $1.00/month`);
  console.log(`CloudWatch Logs: $5.00/month`);
  console.log(`Pinpoint (10K endpoints): $0.00/month`);
  console.log('--------------------------------');
  console.log(`Total infrastructure: ~$${(totalMonthlyCost + 9.20).toFixed(2)}/month`);
}

// Command line interface
const args = process.argv.slice(2);
const mrr = parseInt(args[0]) || 0;

if (args.includes('--help')) {
  console.log('Usage: node cost-analysis.js [MRR]');
  console.log('Example: node cost-analysis.js 5000');
  process.exit(0);
}

generateCostReport(mrr);