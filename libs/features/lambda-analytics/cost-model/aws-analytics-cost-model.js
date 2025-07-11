/**
 * IOC AWS Analytics Cost Model
 * Comprehensive cost projections for AWS-based meta BI system
 */

// AWS Pricing Constants (US East 1 - as of Jan 2024)
const AWS_PRICING = {
  // Pinpoint Analytics
  pinpoint: {
    events: 0.0000012, // Per event
    monthlyActiveUsers: 0.0012, // Per MAU
    pushNotifications: 0.00001, // Per notification
  },
  
  // S3 Storage
  s3: {
    standardStorage: 0.023, // Per GB/month
    intelligentTiering: 0.0125, // Per GB/month after 128KB
    glacierInstantRetrieval: 0.004, // Per GB/month
    dataTransferOut: 0.09, // Per GB (first 10TB/month)
    putRequests: 0.005, // Per 1,000 requests
    getRequests: 0.0004, // Per 1,000 requests
  },
  
  // Lambda
  lambda: {
    requests: 0.20, // Per 1M requests
    gbSeconds: 0.0000166667, // Per GB-second
    freeRequests: 1000000, // Monthly free tier
    freeGbSeconds: 400000, // Monthly free tier
  },
  
  // QuickSight
  quicksight: {
    author: 24, // Per user/month
    reader: 5, // Per user/month (session-based)
    capacityPricing: {
      reader: 0.30, // Per session (up to 30 min)
      maxSessionsPerMonth: 200, // Cap per reader
    },
  },
  
  // Athena
  athena: {
    queryPerTB: 5.00, // Per TB scanned
    minimumCharge: 0.00001, // 10MB minimum per query
  },
  
  // CloudWatch
  cloudwatch: {
    logs: {
      ingestion: 0.50, // Per GB
      storage: 0.03, // Per GB/month
    },
    metrics: {
      first10K: 0.30, // Per metric/month
      next240K: 0.10, // Per metric/month
      next750K: 0.05, // Per metric/month
      over1M: 0.02, // Per metric/month
    },
    dashboards: 3.00, // Per dashboard/month
  },
};

// User Activity Patterns
const USER_PATTERNS = {
  assessmentsPerUser: {
    average: 2.5, // Per month
    power: 10, // Power users
    casual: 0.5, // Casual users
  },
  eventMultiplier: 50, // Events per assessment
  dataPerAssessment: 0.002, // GB
  queriesPerUser: {
    author: 100, // Per month
    reader: 20, // Per month
  },
};

// Growth Scenarios
const GROWTH_SCENARIOS = {
  conservative: {
    name: 'Conservative',
    monthlyGrowth: 100,
    authorRatio: 0.1, // 10% authors
    churnRate: 0.05, // 5% monthly
  },
  moderate: {
    name: 'Moderate',
    monthlyGrowth: 500,
    authorRatio: 0.15, // 15% authors
    churnRate: 0.03, // 3% monthly
  },
  aggressive: {
    name: 'Aggressive',
    monthlyGrowth: 1000,
    authorRatio: 0.2, // 20% authors
    churnRate: 0.02, // 2% monthly
  },
};

// MRR-based Budget Tiers
const BUDGET_TIERS = [
  { minMRR: 0, maxMRR: 1000, targetCost: 50, targetPercent: 0.05 },
  { minMRR: 1000, maxMRR: 5000, targetCost: 200, targetPercent: 0.04 },
  { minMRR: 5000, maxMRR: 20000, targetCost: 1000, targetPercent: 0.05 },
  { minMRR: 20000, maxMRR: Infinity, targetCost: null, targetPercent: 0.05 },
];

class AWSCostModel {
  constructor() {
    this.pricing = AWS_PRICING;
    this.patterns = USER_PATTERNS;
    this.scenarios = GROWTH_SCENARIOS;
    this.budgetTiers = BUDGET_TIERS;
  }

  // Calculate monthly costs for a given user count
  calculateMonthlyCost(totalUsers, scenario) {
    const authors = Math.floor(totalUsers * scenario.authorRatio);
    const readers = totalUsers - authors;
    
    // Calculate component costs
    const costs = {
      pinpoint: this.calculatePinpointCost(totalUsers),
      s3: this.calculateS3Cost(totalUsers),
      lambda: this.calculateLambdaCost(totalUsers),
      quicksight: this.calculateQuickSightCost(authors, readers),
      athena: this.calculateAthenaCost(totalUsers),
      cloudwatch: this.calculateCloudWatchCost(totalUsers),
    };
    
    // Calculate totals
    costs.subtotal = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
    costs.tax = costs.subtotal * 0.08; // Estimated tax
    costs.total = costs.subtotal + costs.tax;
    
    return costs;
  }

  // Individual service cost calculations
  calculatePinpointCost(users) {
    const monthlyEvents = users * this.patterns.assessmentsPerUser.average * this.patterns.eventMultiplier;
    const eventCost = monthlyEvents * this.pricing.pinpoint.events;
    const mauCost = users * this.pricing.pinpoint.monthlyActiveUsers;
    return eventCost + mauCost;
  }

  calculateS3Cost(users) {
    const monthlyDataGB = users * this.patterns.assessmentsPerUser.average * this.patterns.dataPerAssessment;
    const storageCost = monthlyDataGB * this.pricing.s3.intelligentTiering;
    const requestCost = (users * 100 * this.pricing.s3.putRequests) / 1000; // Estimated requests
    return storageCost + requestCost;
  }

  calculateLambdaCost(users) {
    const monthlyRequests = users * this.patterns.assessmentsPerUser.average * 10; // 10 Lambda calls per assessment
    const billableRequests = Math.max(0, monthlyRequests - this.pricing.lambda.freeRequests / 1000000);
    const requestCost = (billableRequests / 1000000) * this.pricing.lambda.requests;
    
    const monthlyGbSeconds = monthlyRequests * 0.5; // 0.5 GB-seconds per request
    const billableGbSeconds = Math.max(0, monthlyGbSeconds - this.pricing.lambda.freeGbSeconds);
    const computeCost = billableGbSeconds * this.pricing.lambda.gbSeconds;
    
    return requestCost + computeCost;
  }

  calculateQuickSightCost(authors, readers) {
    const authorCost = authors * this.pricing.quicksight.author;
    const readerCost = readers * this.pricing.quicksight.reader;
    return authorCost + readerCost;
  }

  calculateAthenaCost(users) {
    const monthlyQueries = users * 10; // Average queries per user
    const dataScannedTB = monthlyQueries * 0.0001; // 100MB per query average
    return dataScannedTB * this.pricing.athena.queryPerTB;
  }

  calculateCloudWatchCost(users) {
    const logsGB = users * 0.01; // 10MB logs per user/month
    const logsCost = logsGB * this.pricing.cloudwatch.logs.ingestion + 
                     logsGB * this.pricing.cloudwatch.logs.storage;
    
    const metricsCost = Math.min(users * 5, 10) * this.pricing.cloudwatch.metrics.first10K; // 5 metrics per user, max 10
    const dashboardCost = Math.min(Math.ceil(users / 100), 5) * this.pricing.cloudwatch.dashboards; // 1 dashboard per 100 users
    
    return logsCost + metricsCost + dashboardCost;
  }

  // Generate projections for a scenario
  generateProjections(scenario, months = 24) {
    const projections = [];
    let currentUsers = 0;
    
    for (let month = 1; month <= months; month++) {
      // Apply growth and churn
      const newUsers = scenario.monthlyGrowth;
      const churnedUsers = Math.floor(currentUsers * scenario.churnRate);
      currentUsers = currentUsers + newUsers - churnedUsers;
      
      // Calculate costs
      const costs = this.calculateMonthlyCost(currentUsers, scenario);
      
      // Calculate MRR (assuming $50/user average)
      const mrr = currentUsers * 50;
      
      // Find budget tier
      const tier = this.budgetTiers.find(t => mrr >= t.minMRR && mrr < t.maxMRR);
      const targetCost = tier.targetCost || (mrr * tier.targetPercent);
      const costPercentage = mrr > 0 ? (costs.total / mrr) * 100 : 0;
      
      projections.push({
        month,
        users: currentUsers,
        newUsers,
        churnedUsers,
        mrr,
        costs,
        targetCost,
        costPercentage,
        withinBudget: costs.total <= targetCost,
      });
    }
    
    return projections;
  }

  // Cost optimization recommendations
  getOptimizationRecommendations(monthlyData) {
    const recommendations = [];
    const { users, mrr, costs } = monthlyData;
    
    // Service enablement recommendations
    if (mrr < 1000) {
      recommendations.push({
        category: 'Service Enablement',
        priority: 'High',
        recommendation: 'Delay QuickSight implementation',
        savings: costs.quicksight,
        implementation: 'Use CloudWatch dashboards initially',
      });
    }
    
    if (mrr < 5000 && costs.pinpoint > 50) {
      recommendations.push({
        category: 'Analytics',
        priority: 'Medium',
        recommendation: 'Use custom event tracking instead of Pinpoint',
        savings: costs.pinpoint * 0.7,
        implementation: 'Implement lightweight Lambda-based tracking',
      });
    }
    
    // Storage optimization
    if (costs.s3 > 20) {
      recommendations.push({
        category: 'Storage',
        priority: 'Medium',
        recommendation: 'Enable S3 lifecycle policies',
        savings: costs.s3 * 0.3,
        implementation: 'Move data > 30 days to Glacier',
      });
    }
    
    // Query optimization
    if (costs.athena > 50) {
      recommendations.push({
        category: 'Query Optimization',
        priority: 'High',
        recommendation: 'Implement query result caching',
        savings: costs.athena * 0.4,
        implementation: 'Cache common queries in DynamoDB',
      });
    }
    
    // Reserved capacity
    if (mrr > 20000) {
      recommendations.push({
        category: 'Reserved Capacity',
        priority: 'High',
        recommendation: 'Purchase Compute Savings Plans',
        savings: (costs.lambda + costs.athena) * 0.2,
        implementation: '1-year commitment for 20% savings',
      });
    }
    
    return recommendations;
  }

  // Generate cost per assessment metrics
  calculateUnitEconomics(monthlyData) {
    const totalAssessments = monthlyData.users * this.patterns.assessmentsPerUser.average;
    
    return {
      costPerUser: monthlyData.costs.total / monthlyData.users,
      costPerAssessment: monthlyData.costs.total / totalAssessments,
      revenuePerUser: monthlyData.mrr / monthlyData.users,
      marginPerUser: (monthlyData.mrr - monthlyData.costs.total) / monthlyData.users,
      breakEvenUsers: Math.ceil(monthlyData.costs.total / (monthlyData.mrr / monthlyData.users)),
    };
  }

  // Export functions for use in Lambda
  exportToLambda() {
    return {
      calculateDailyCost: (users, scenario) => {
        const monthlyCost = this.calculateMonthlyCost(users, scenario);
        return {
          daily: monthlyCost.total / 30,
          monthly: monthlyCost,
          services: Object.entries(monthlyCost)
            .filter(([key]) => !['subtotal', 'tax', 'total'].includes(key))
            .map(([service, cost]) => ({ service, cost, dailyCost: cost / 30 })),
        };
      },
      
      checkBudgetAlert: (currentCost, mrr) => {
        const tier = this.budgetTiers.find(t => mrr >= t.minMRR && mrr < t.maxMRR);
        const targetCost = tier.targetCost || (mrr * tier.targetPercent);
        const percentUsed = (currentCost / targetCost) * 100;
        
        return {
          targetCost,
          currentCost,
          percentUsed,
          alert: percentUsed > 80,
          critical: percentUsed > 95,
          message: percentUsed > 95 ? 'Critical: Budget exceeded' : 
                   percentUsed > 80 ? 'Warning: Approaching budget limit' : 
                   'Budget on track',
        };
      },
    };
  }
}

// Export for use in other modules
module.exports = AWSCostModel;

// Example usage and testing
if (require.main === module) {
  const model = new AWSCostModel();
  
  console.log('=== IOC AWS Analytics Cost Model ===\n');
  
  // Generate projections for all scenarios
  Object.values(GROWTH_SCENARIOS).forEach(scenario => {
    console.log(`\n${scenario.name} Growth Scenario (${scenario.monthlyGrowth} users/month):`);
    console.log('=' . repeat(60));
    
    const projections = model.generateProjections(scenario, 12);
    
    // Show first 6 months and month 12
    [1, 2, 3, 6, 12].forEach(month => {
      const data = projections[month - 1];
      console.log(`\nMonth ${month}:`);
      console.log(`  Users: ${data.users}`);
      console.log(`  MRR: $${data.mrr.toFixed(2)}`);
      console.log(`  Total Cost: $${data.costs.total.toFixed(2)}`);
      console.log(`  Cost %: ${data.costPercentage.toFixed(1)}%`);
      console.log(`  Within Budget: ${data.withinBudget ? 'YES' : 'NO'}`);
      
      if (month === 12) {
        // Show cost breakdown
        console.log('\n  Cost Breakdown:');
        Object.entries(data.costs)
          .filter(([key]) => !['subtotal', 'tax', 'total'].includes(key))
          .forEach(([service, cost]) => {
            console.log(`    ${service}: $${cost.toFixed(2)}`);
          });
        
        // Show unit economics
        const unitEcon = model.calculateUnitEconomics(data);
        console.log('\n  Unit Economics:');
        console.log(`    Cost per User: $${unitEcon.costPerUser.toFixed(2)}`);
        console.log(`    Cost per Assessment: $${unitEcon.costPerAssessment.toFixed(2)}`);
        console.log(`    Margin per User: $${unitEcon.marginPerUser.toFixed(2)}`);
        
        // Show recommendations
        const recommendations = model.getOptimizationRecommendations(data);
        if (recommendations.length > 0) {
          console.log('\n  Optimization Recommendations:');
          recommendations.forEach(rec => {
            console.log(`    - ${rec.recommendation} (Save: $${rec.savings.toFixed(2)}/mo)`);
          });
        }
      }
    });
  });
}