/**
 * B1 Validation System - Complete Example
 * Demonstrates the full B1 validation workflow with real scenarios
 */

import B1ValidationSystem, { createB1SystemConfig } from '../b1-validation-system';

// Example assessment output from A1 system
const mockAssessmentOutput = {
  assessmentId: 'exec_assessment_001',
  scores: {
    ocean: {
      raw: {
        openness: 75,
        conscientiousness: 88,
        extraversion: 62,
        agreeableness: 71,
        neuroticism: 34
      },
      percentile: {
        openness: 73,
        conscientiousness: 91,
        extraversion: 58,
        agreeableness: 69,
        neuroticism: 28
      },
      interpretation: {
        openness: 'High openness to experience, values creativity and novel ideas',
        conscientiousness: 'Very high conscientiousness, excellent attention to detail and planning',
        extraversion: 'Moderate extraversion, comfortable in both social and solo work',
        agreeableness: 'Good level of agreeableness, collaborative but can make tough decisions',
        neuroticism: 'Low neuroticism, emotionally stable under pressure'
      }
    },
    pillars: {
      sustainable: 85,
      performance: 78,
      potential: 82
    }
  },
  insights: [
    'This executive demonstrates exceptional organizational skills and strategic thinking capabilities',
    'Strong leadership potential with balanced approach to team management',
    'Natural innovator who can drive change while maintaining operational excellence',
    'Well-suited for roles requiring both analytical thinking and creative problem-solving'
  ],
  recommendations: [
    'Consider leadership development programs focusing on vision communication',
    'Leverage high conscientiousness for complex project management roles',
    'Develop network and influence skills to maximize collaborative potential',
    'Focus on innovation leadership to capitalize on creative strengths'
  ],
  executiveSummary: 'A well-rounded executive candidate with exceptional organizational capabilities and strong innovation potential. Demonstrates emotional stability and balanced leadership style suitable for senior management positions.',
  contextualFactors: {
    industry: 'technology',
    role: 'senior_management',
    culturalContext: 'global',
    teamSize: 'large'
  }
};

/**
 * Example 1: Complete B1 Validation Workflow
 */
export async function completeValidationExample(): Promise<void> {
  console.log('🚀 Starting Complete B1 Validation Example\n');

  // Create B1 system configuration
  const config = createB1SystemConfig({
    openai: {
      apiKey: process.env.OPENAI_API_KEY || 'demo-key',
      model: 'gpt-4',
      maxRetries: 2
    },
    validation: {
      confidenceThreshold: 85,
      maxIterations: 3,
      strictMode: false
    },
    monitoring: {
      enableLogging: true,
      logLevel: 'info'
    }
  });

  // Initialize B1 validation system
  const b1System = new B1ValidationSystem(config);

  try {
    // Execute validation workflow
    const workflow = await b1System.validateAssessment(mockAssessmentOutput, {
      assessmentId: 'exec_assessment_001',
      assessmentType: 'executive',
      urgency: 'medium',
      targetAudience: 'senior_leadership',
      industry: 'technology',
      culturalContext: 'global'
    });

    console.log('✅ Validation workflow completed successfully!\n');
    console.log('📊 Workflow Results:');
    console.log(`   Status: ${workflow.status}`);
    console.log(`   Workflow ID: ${workflow.workflowId}`);
    console.log(`   Processing Time: ${workflow.metrics.totalProcessingTime}ms`);
    console.log(`   Nodes Processed: ${workflow.metrics.nodesProcessed}`);
    console.log(`   Confidence Improvement: +${workflow.metrics.confidenceImprovement}%`);
    console.log(`   API Calls Used: ${workflow.metrics.apiCallsUsed}`);
    console.log(`   Total Cost: $${workflow.metrics.totalCost.toFixed(3)}\n`);

    // Display phase results
    console.log('📋 Phase Details:');
    Object.entries(workflow.phases).forEach(([phase, details]) => {
      console.log(`   ${phase}: ${details.status} (${details.duration || 0}ms)`);
      if (details.errors?.length) {
        console.log(`     Errors: ${details.errors.join(', ')}`);
      }
    });

    // Display validation results
    if (workflow.results.validationResult) {
      const result = workflow.results.validationResult;
      console.log('\n🔍 Validation Results:');
      console.log(`   Overall Confidence: ${result.overallConfidence}%`);
      console.log(`   Status: ${result.validationStatus}`);
      console.log(`   Nodes Validated: ${result.validatedNodes.length}`);
      console.log(`   Critical Issues: ${result.criticalIssues.length}`);
      
      console.log('\n📈 Quality Metrics:');
      console.log(`   Accuracy: ${result.qualityMetrics.accuracyScore}%`);
      console.log(`   Bias Score: ${result.qualityMetrics.biasScore}%`);
      console.log(`   Clarity: ${result.qualityMetrics.clarityScore}%`);
      console.log(`   Consistency: ${result.qualityMetrics.consistencyScore}%`);
      console.log(`   Compliance: ${result.qualityMetrics.complianceScore}%`);
    }

    // Display feedback plan if generated
    if (workflow.results.feedbackPlan) {
      const plan = workflow.results.feedbackPlan;
      console.log('\n💡 Feedback Plan:');
      console.log(`   Total Feedback Items: ${plan.totalFeedbackItems}`);
      console.log(`   Estimated Effort: ${plan.estimatedTotalEffort}`);
      console.log(`   Expected Impact: +${plan.estimatedTotalImpact}% confidence`);
      console.log(`   Immediate Actions: ${plan.timeline.immediate.length}`);
      console.log(`   Short-term Actions: ${plan.timeline.shortTerm.length}`);
    }

    // Display revalidation results if performed
    if (workflow.results.revalidationResult) {
      const revalidation = workflow.results.revalidationResult;
      console.log('\n🔄 Revalidation Results:');
      console.log(`   Status: ${revalidation.revalidationStatus}`);
      console.log(`   Confidence Improvement: +${revalidation.overallConfidenceImprovement}%`);
      console.log(`   Nodes Revalidated: ${revalidation.nodeResults.revalidatedNodes.length}`);
      console.log(`   Issues Resolved: ${revalidation.nodeResults.resolvedIssues.length}`);
      console.log(`   New Issues: ${revalidation.nodeResults.newIssuesDetected.length}`);
    }

  } catch (error) {
    console.error('❌ Validation workflow failed:', error.message);
  }
}

/**
 * Example 2: Node-Level Validation Details
 */
export async function nodeValidationExample(): Promise<void> {
  console.log('\n🔎 Node-Level Validation Example\n');

  const config = createB1SystemConfig({
    validation: { confidenceThreshold: 90, strictMode: true },
    monitoring: { logLevel: 'debug' }
  });

  const b1System = new B1ValidationSystem(config);

  try {
    const workflow = await b1System.validateAssessment(mockAssessmentOutput, {
      assessmentId: 'detailed_validation_001',
      assessmentType: 'executive',
      urgency: 'high',
      targetAudience: 'board_of_directors',
      industry: 'technology'
    });

    if (workflow.results.validationResult) {
      console.log('🔍 Detailed Node Analysis:');
      
      workflow.results.validationResult.validatedNodes.forEach((node, index) => {
        console.log(`\n   Node ${index + 1}: ${node.nodeId}`);
        console.log(`     Type: ${node.nodeType}`);
        console.log(`     Confidence: ${node.confidence}%`);
        console.log(`     Issues: ${node.issues.length}`);
        
        if (node.issues.length > 0) {
          console.log('     Issue Details:');
          node.issues.forEach((issue, i) => {
            console.log(`       ${i + 1}. [${issue.severity.toUpperCase()}] ${issue.description}`);
            console.log(`          Category: ${issue.category}`);
            console.log(`          Priority: ${issue.priority}/10`);
          });
        }
        
        if (node.suggestions.length > 0) {
          console.log('     Suggestions:');
          node.suggestions.forEach((suggestion, i) => {
            console.log(`       ${i + 1}. ${suggestion.specificAction}`);
            console.log(`          Expected gain: +${suggestion.estimatedConfidenceGain}%`);
          });
        }
      });
    }

  } catch (error) {
    console.error('❌ Node validation example failed:', error.message);
  }
}

/**
 * Example 3: Performance and Cost Analysis
 */
export async function performanceAnalysisExample(): Promise<void> {
  console.log('\n⚡ Performance and Cost Analysis Example\n');

  const config = createB1SystemConfig({
    performance: {
      enableProfiling: true,
      cacheSize: 500
    },
    validation: {
      enableCaching: true,
      enableParallelProcessing: true
    }
  });

  const b1System = new B1ValidationSystem(config);

  // Run multiple assessments to gather metrics
  const assessmentIds = ['perf_001', 'perf_002', 'perf_003'];
  const results = [];

  for (const assessmentId of assessmentIds) {
    try {
      const workflow = await b1System.validateAssessment(mockAssessmentOutput, {
        assessmentId,
        assessmentType: 'individual',
        urgency: 'low',
        targetAudience: 'professional'
      });
      results.push(workflow);
    } catch (error) {
      console.error(`Failed to process ${assessmentId}:`, error.message);
    }
  }

  // Get system metrics
  const systemMetrics = await b1System.getSystemMetrics();

  console.log('📊 System Performance Metrics:');
  console.log(`   Total Workflows: ${systemMetrics.totalWorkflows}`);
  console.log(`   Average Processing Time: ${systemMetrics.averageProcessingTime}ms`);
  console.log(`   Average Confidence Gain: +${systemMetrics.averageConfidenceGain}%`);
  console.log(`   Success Rate: ${systemMetrics.qualityMetrics.successRate}%`);
  console.log(`   Cache Hit Rate: ${systemMetrics.performanceMetrics.cacheHitRate}%`);
  console.log(`   Error Rate: ${systemMetrics.performanceMetrics.errorRate}%\n`);

  console.log('💰 Cost Analysis:');
  console.log(`   Total API Calls: ${systemMetrics.apiUsage.totalCalls}`);
  console.log(`   Total Cost: $${systemMetrics.apiUsage.totalCost.toFixed(3)}`);
  console.log(`   Average Cost per Workflow: $${systemMetrics.apiUsage.averageCostPerWorkflow.toFixed(3)}`);
  console.log(`   Estimated Monthly Cost (100 assessments): $${(systemMetrics.apiUsage.averageCostPerWorkflow * 100).toFixed(2)}\n`);

  console.log('🎯 Quality Metrics:');
  console.log(`   Average Final Confidence: ${systemMetrics.qualityMetrics.averageFinalConfidence}%`);
  console.log(`   Regression Rate: ${systemMetrics.qualityMetrics.regressionRate}%`);
}

/**
 * Example 4: Error Handling and Fallback Scenarios
 */
export async function errorHandlingExample(): Promise<void> {
  console.log('\n🛡️ Error Handling and Fallback Example\n');

  const config = createB1SystemConfig({
    openai: {
      apiKey: 'invalid-key', // Intentionally invalid to test error handling
      maxRetries: 1,
      timeout: 5000
    },
    monitoring: {
      enableLogging: true,
      logLevel: 'debug'
    }
  });

  const b1System = new B1ValidationSystem(config);

  try {
    const workflow = await b1System.validateAssessment(mockAssessmentOutput, {
      assessmentId: 'error_test_001',
      assessmentType: 'executive',
      urgency: 'critical',
      targetAudience: 'senior_leadership'
    });

    console.log('✅ Workflow completed despite API issues (fallback mechanisms worked)');
    console.log(`   Status: ${workflow.status}`);
    console.log(`   Processing Time: ${workflow.metrics.totalProcessingTime}ms`);

  } catch (error) {
    console.log('❌ Expected error occurred (demonstrating error handling):');
    console.log(`   Error: ${error.message}`);
    console.log('   Fallback mechanisms:');
    console.log('   - Conservative confidence scores applied');
    console.log('   - Manual review recommendations generated');
    console.log('   - Partial validation results preserved');
  }
}

/**
 * Example 5: Custom Configuration and Industry-Specific Validation
 */
export async function customConfigExample(): Promise<void> {
  console.log('\n🎛️ Custom Configuration Example\n');

  // Healthcare industry configuration with strict compliance
  const healthcareConfig = createB1SystemConfig({
    validation: {
      confidenceThreshold: 95, // Higher threshold for healthcare
      strictMode: true,
      maxIterations: 5
    },
    monitoring: {
      enableLogging: true,
      logLevel: 'debug'
    }
  });

  // Financial services configuration with bias focus
  const financialConfig = createB1SystemConfig({
    validation: {
      confidenceThreshold: 90,
      strictMode: true,
      maxIterations: 3
    },
    performance: {
      enableProfiling: true
    }
  });

  const b1Healthcare = new B1ValidationSystem(healthcareConfig);
  const b1Financial = new B1ValidationSystem(financialConfig);

  // Healthcare assessment validation
  console.log('🏥 Healthcare Industry Validation:');
  try {
    const healthcareWorkflow = await b1Healthcare.validateAssessment(mockAssessmentOutput, {
      assessmentId: 'healthcare_001',
      assessmentType: 'executive',
      urgency: 'high',
      targetAudience: 'medical_board',
      industry: 'healthcare',
      culturalContext: 'regulatory_compliance'
    });

    console.log(`   Status: ${healthcareWorkflow.status}`);
    console.log(`   Confidence: ${healthcareWorkflow.results.validationResult?.overallConfidence}%`);
    console.log(`   Compliance Score: ${healthcareWorkflow.results.validationResult?.qualityMetrics.complianceScore}%`);

  } catch (error) {
    console.log(`   Healthcare validation result: ${error.message}`);
  }

  // Financial services assessment validation
  console.log('\n🏦 Financial Services Validation:');
  try {
    const financialWorkflow = await b1Financial.validateAssessment(mockAssessmentOutput, {
      assessmentId: 'financial_001',
      assessmentType: 'executive',
      urgency: 'medium',
      targetAudience: 'investment_committee',
      industry: 'financial_services',
      culturalContext: 'risk_management'
    });

    console.log(`   Status: ${financialWorkflow.status}`);
    console.log(`   Confidence: ${financialWorkflow.results.validationResult?.overallConfidence}%`);
    console.log(`   Bias Score: ${financialWorkflow.results.validationResult?.qualityMetrics.biasScore}%`);

  } catch (error) {
    console.log(`   Financial validation result: ${error.message}`);
  }
}

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
  console.log('🎯 B1 Validation System - Complete Examples Suite\n');
  console.log('=' .repeat(60));

  try {
    await completeValidationExample();
    console.log('\n' + '=' .repeat(60));
    
    await nodeValidationExample();
    console.log('\n' + '=' .repeat(60));
    
    await performanceAnalysisExample();
    console.log('\n' + '=' .repeat(60));
    
    await errorHandlingExample();
    console.log('\n' + '=' .repeat(60));
    
    await customConfigExample();
    console.log('\n' + '=' .repeat(60));

    console.log('\n✅ All B1 validation examples completed successfully!');
    console.log('\n📚 Key Takeaways:');
    console.log('   • B1 validation provides comprehensive quality assurance');
    console.log('   • Node-level validation enables precise feedback');
    console.log('   • Multi-factor confidence scoring catches diverse issues');
    console.log('   • Re-evaluation process optimizes performance');
    console.log('   • System is configurable for different industries');
    console.log('   • Error handling ensures reliable operation');
    console.log('   • Cost and performance metrics enable optimization');

  } catch (error) {
    console.error('❌ Examples suite failed:', error.message);
  }
}

// Usage instructions
export const USAGE_INSTRUCTIONS = `
🚀 B1 Validation System Usage Guide

## Basic Usage:

\`\`\`typescript
import B1ValidationSystem, { createB1SystemConfig } from './b1-validation-system';

// 1. Create configuration
const config = createB1SystemConfig({
  openai: { apiKey: 'your-openai-key' },
  supabase: { url: 'your-supabase-url', key: 'your-supabase-key' }
});

// 2. Initialize system
const b1System = new B1ValidationSystem(config);

// 3. Run validation
const workflow = await b1System.validateAssessment(assessmentOutput, {
  assessmentId: 'unique-id',
  assessmentType: 'executive',
  urgency: 'medium',
  targetAudience: 'senior_leadership'
});
\`\`\`

## Key Features:

✅ **85% Confidence Threshold**: Automatic quality gate
✅ **Node-Level Validation**: Granular quality assessment  
✅ **Bias Detection**: Multi-dimensional bias analysis
✅ **Actionable Feedback**: Specific improvement suggestions
✅ **Performance Optimization**: Caching and parallel processing
✅ **Cost Management**: API usage optimization
✅ **Industry Customization**: Configurable for different domains

## Configuration Options:

- **confidenceThreshold**: Minimum confidence required (default: 85%)
- **strictMode**: Enhanced validation rigor
- **enableCaching**: Performance optimization
- **enableParallelProcessing**: Faster processing
- **logLevel**: Monitoring verbosity
- **maxIterations**: Improvement cycle limit

## Workflow Phases:

1. **Extraction**: Break assessment into validatable nodes
2. **Validation**: Apply multi-factor confidence scoring
3. **Feedback**: Generate actionable improvement suggestions
4. **Re-evaluation**: Validate improvements and check consistency

## Success Criteria:

- Overall confidence ≥ 85%
- No critical issues present
- Cross-node consistency maintained
- Bias indicators below threshold
- Professional quality standards met
`;

// Export for easy testing
if (require.main === module) {
  runAllExamples().catch(console.error);
}