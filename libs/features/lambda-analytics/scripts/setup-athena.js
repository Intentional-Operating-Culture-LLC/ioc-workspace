#!/usr/bin/env node

/**
 * Setup script for Athena Analytics
 * Run when IOC reaches $5K MRR threshold
 */

const { AthenaAnalytics } = require('../dist/athena');

async function setupAthena() {
  console.log('=== IOC Athena Analytics Setup ===\n');

  // Check current MRR (in practice, fetch from billing API)
  const currentMRR = process.env.IOC_CURRENT_MRR || 5000;
  
  console.log(`Current MRR: $${currentMRR}`);
  
  if (currentMRR < 5000) {
    console.log('\n❌ Athena setup requires $5,000 MRR threshold');
    console.log('📊 Benefits of waiting:');
    console.log('  - Avoid unnecessary infrastructure costs');
    console.log('  - CloudWatch Insights sufficient for current scale');
    console.log('  - QuickSight direct S3 queries work well');
    console.log('\n💡 Focus on growing to 10,000+ monthly assessments first\n');
    return;
  }

  console.log('\n✅ MRR threshold met! Proceeding with setup...\n');

  const athena = new AthenaAnalytics();

  try {
    // Initialize Athena
    await athena.initialize(currentMRR);

    // Get cost projections
    const costReport = await athena.getCostReport();
    
    console.log('\n📊 Cost Projections:');
    console.log(`  - Estimated monthly Athena cost: $${costReport.estimatedMonthlyCost.toFixed(2)}`);
    console.log(`  - Cost per 1000 queries: $${(costReport.estimatedMonthlyCost / 30000 * 1000).toFixed(2)}`);
    console.log(`  - ROI: Enhanced analytics for better decision making`);

    console.log('\n🚀 Setup Complete! Next steps:');
    console.log('  1. Configure QuickSight dashboards');
    console.log('  2. Set up scheduled refresh for key metrics');
    console.log('  3. Train team on SQL query best practices');
    console.log('  4. Monitor costs daily for first week');

    // Show example queries
    console.log('\n📝 Example Queries Available:');
    const examples = athena.getOptimizationTips();
    examples.slice(0, 3).forEach(example => {
      console.log(`\n  ${example.name}:`);
      console.log(`  - Cost: ~$${example.estimatedCost}`);
      console.log(`  - Scan: ${example.scanSize}`);
    });

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('  1. Verify AWS credentials and permissions');
    console.log('  2. Check S3 bucket exists: ioc-analytics-data-lake');
    console.log('  3. Ensure Glue catalog permissions are set');
    console.log('  4. Review CloudFormation stack for errors');
  }
}

// Run setup
setupAthena().catch(console.error);