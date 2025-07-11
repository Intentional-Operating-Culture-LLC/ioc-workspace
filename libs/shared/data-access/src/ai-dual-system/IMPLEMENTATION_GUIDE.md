# IOC Dual-AI Assessment System - Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing and using the dual-AI workflow system for IOC's assessment quality assurance. The system leverages A1 (Generator) and B1 (Validator) AI components to ensure high-quality assessment outputs through iterative improvement.

## Prerequisites

### Environment Variables
```bash
# Required environment variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
OPENAI_API_KEY=your_openai_api_key

# Optional (for Claude API direct integration)
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Dependencies
```bash
# Install required packages
npm install @supabase/supabase-js openai
```

## Quick Start

### 1. Database Setup

Run the migration to set up the dual-AI workflow tables:

```bash
# Apply the migration
supabase migration up --file 20250710_dual_ai_assessment_workflow.sql
```

### 2. Basic Usage

```typescript
import AssessmentDualAIService from '@ioc/lib/src/ai-dual-system/services/assessment-dual-ai-service';

// Initialize the service
const dualAIService = new AssessmentDualAIService(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  process.env.OPENAI_API_KEY!
);

// Process an assessment
const result = await dualAIService.processAssessment({
  responseId: 'uuid-of-assessment-response',
  assessmentType: 'executive',
  contextData: {
    industry: 'technology',
    role: 'CEO',
    targetAudience: 'executives'
  },
  options: {
    confidenceThreshold: 85,
    maxIterations: 3,
    reportStyle: 'executive'
  }
});

console.log('Final confidence:', result.qualityMetrics.overallConfidence);
console.log('Enhanced report:', result.enhancedReport);
```

### 3. Frontend Integration

```typescript
import DualAIWorkflowMonitor from '@ioc/ui/src/components/assessment/DualAIWorkflowMonitor';

function AssessmentPage({ responseId }: { responseId: string }) {
  const handleComplete = (results: any) => {
    console.log('Processing completed:', results);
    // Handle completion (e.g., show results, navigate to report)
  };

  const handleError = (error: string) => {
    console.error('Processing failed:', error);
    // Handle error (e.g., show error message, retry option)
  };

  return (
    <DualAIWorkflowMonitor
      responseId={responseId}
      onComplete={handleComplete}
      onError={handleError}
      autoStart={true}
      options={{
        confidenceThreshold: 85,
        maxIterations: 3,
        reportStyle: 'executive'
      }}
    />
  );
}
```

## Detailed Implementation

### Workflow Configuration

```typescript
interface WorkflowConfig {
  // Quality thresholds
  confidenceThreshold: number; // 85% default
  maxIterations: number;       // 3 default
  
  // Content style
  reportStyle: 'standard' | 'executive' | 'coaching';
  
  // Context settings
  industry?: string;
  culturalContext?: string;
  targetAudience: string;
  
  // Performance settings
  timeout?: number;            // 30000ms default
  retryAttempts?: number;      // 2 default
}
```

### Custom Validation Rules

You can extend the B1 validator with custom rules:

```typescript
import { B1Validator } from '@ioc/lib/src/ai-dual-system/core/b1-validator';

// Custom validation rule
const customRule = {
  id: 'industry_relevance',
  name: 'Industry Relevance Check',
  description: 'Ensure content is relevant to specified industry',
  type: 'quality' as const,
  condition: (content: any, context: any) => {
    // Custom validation logic
    return content.includes(context.industry);
  },
  severity: 'medium' as const,
  active: true
};

// Add to validator
const validator = new B1Validator(config);
await validator.updateRules([customRule, ...existingRules]);
```

### Monitoring and Analytics

```typescript
// Get workflow performance metrics
async function getPerformanceMetrics() {
  const { data, error } = await supabase
    .rpc('get_workflow_performance_metrics', {
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end_date: new Date()
    });
    
  return data;
}

// Get individual workflow stats
async function getWorkflowStats(workflowId: string) {
  const { data, error } = await supabase
    .rpc('calculate_workflow_stats', {
      workflow_id_param: workflowId
    });
    
  return data;
}
```

## Advanced Configuration

### Custom A1 Generator Prompts

```typescript
// Custom prompt templates for different assessment types
const customPrompts = {
  executive_assessment: `
    You are an expert executive assessment analyst. Generate a comprehensive 
    leadership profile based on the following OCEAN scores and context.
    
    Focus on:
    - Strategic leadership capabilities
    - Decision-making patterns
    - Risk tolerance and management
    - Team leadership effectiveness
    - Communication and influence
    
    Context: {{context}}
    OCEAN Scores: {{ocean_scores}}
    
    Provide actionable insights for executive development.
  `,
  
  team_composition: `
    Analyze team composition and dynamics based on individual assessments.
    
    Team Members: {{team_data}}
    Organizational Context: {{org_context}}
    
    Identify:
    - Complementary strengths
    - Potential conflict areas
    - Collaboration opportunities
    - Leadership distribution
    - Communication patterns
  `
};
```

### Industry-Specific Customization

```typescript
// Industry-specific configuration
const industryConfigs = {
  healthcare: {
    validationRules: ['patient_safety', 'regulatory_compliance', 'ethical_standards'],
    reportSections: ['clinical_leadership', 'patient_outcomes', 'team_coordination'],
    biasChecks: ['medical_bias', 'demographic_bias', 'outcome_bias']
  },
  
  finance: {
    validationRules: ['risk_assessment', 'regulatory_compliance', 'fiduciary_responsibility'],
    reportSections: ['risk_management', 'decision_making', 'stakeholder_communication'],
    biasChecks: ['risk_bias', 'market_bias', 'demographic_bias']
  },
  
  technology: {
    validationRules: ['innovation_focus', 'technical_accuracy', 'scalability_thinking'],
    reportSections: ['technical_leadership', 'innovation_management', 'team_development'],
    biasChecks: ['technical_bias', 'innovation_bias', 'demographic_bias']
  }
};
```

## Error Handling and Fallbacks

### Graceful Degradation

```typescript
async function processAssessmentWithFallback(request: AssessmentAIRequest) {
  try {
    // Try dual-AI processing
    return await dualAIService.processAssessment(request);
  } catch (dualAIError) {
    console.warn('Dual-AI processing failed, falling back to standard scoring:', dualAIError);
    
    try {
      // Fallback to standard assessment scoring
      const standardResult = await scoreAssessmentResponse(request.responseId);
      
      return {
        assessmentId: standardResult.assessmentId,
        finalScores: standardResult,
        enhancedReport: generateBasicReport(standardResult),
        qualityMetrics: {
          overallConfidence: 75, // Lower confidence for fallback
          iterationCount: 0,
          processingTime: 5000,
          nodeConfidences: {}
        },
        workflowId: 'fallback_' + Date.now()
      };
    } catch (fallbackError) {
      console.error('Both dual-AI and fallback processing failed:', fallbackError);
      throw new Error('Assessment processing unavailable');
    }
  }
}
```

### Retry Logic

```typescript
async function processWithRetry(request: AssessmentAIRequest, maxRetries = 2) {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await dualAIService.processAssessment(request);
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms delay`);
      }
    }
  }
  
  throw lastError!;
}
```

## Performance Optimization

### Caching Strategy

```typescript
// Cache configuration
const cacheConfig = {
  // Cache validation results for similar content
  validationCache: {
    ttl: 3600, // 1 hour
    maxSize: 1000
  },
  
  // Cache model responses for identical prompts
  modelResponseCache: {
    ttl: 1800, // 30 minutes
    maxSize: 500
  },
  
  // Cache assessment templates
  templateCache: {
    ttl: 86400, // 24 hours
    maxSize: 100
  }
};
```

### Batch Processing

```typescript
// Process multiple assessments in parallel
async function processBatchAssessments(responseIds: string[]) {
  const concurrency = 5; // Process 5 at a time
  const results = [];
  
  for (let i = 0; i < responseIds.length; i += concurrency) {
    const batch = responseIds.slice(i, i + concurrency);
    const batchPromises = batch.map(responseId => 
      processAssessmentWithFallback({
        responseId,
        assessmentType: 'individual',
        contextData: { targetAudience: 'individual' },
        options: { confidenceThreshold: 85, maxIterations: 3, reportStyle: 'standard' }
      })
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}
```

## Testing and Validation

### Unit Tests

```typescript
// Example test for dual-AI service
describe('AssessmentDualAIService', () => {
  let service: AssessmentDualAIService;
  
  beforeEach(() => {
    service = new AssessmentDualAIService(
      'test_supabase_url',
      'test_supabase_key',
      'test_openai_key'
    );
  });
  
  test('should process assessment with high confidence', async () => {
    const mockRequest = {
      responseId: 'test-response-id',
      assessmentType: 'individual' as const,
      contextData: { targetAudience: 'individual' },
      options: { confidenceThreshold: 85, maxIterations: 3, reportStyle: 'standard' as const }
    };
    
    const result = await service.processAssessment(mockRequest);
    
    expect(result.qualityMetrics.overallConfidence).toBeGreaterThanOrEqual(85);
    expect(result.finalScores).toBeDefined();
    expect(result.enhancedReport).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// End-to-end workflow test
test('complete dual-AI workflow', async () => {
  // Create test assessment response
  const { data: testResponse } = await supabase
    .from('assessment_responses')
    .insert({
      assessment_id: 'test-assessment',
      user_id: 'test-user',
      responses: [/* test data */]
    })
    .select()
    .single();
  
  // Process with dual-AI
  const result = await dualAIService.processAssessment({
    responseId: testResponse.id,
    assessmentType: 'individual',
    contextData: { targetAudience: 'individual' },
    options: { confidenceThreshold: 85, maxIterations: 3, reportStyle: 'standard' }
  });
  
  // Verify workflow was recorded
  const { data: workflow } = await supabase
    .from('assessment_ai_workflows')
    .select('*')
    .eq('id', result.workflowId)
    .single();
  
  expect(workflow.status).toBe('completed');
  expect(workflow.final_confidence).toBeGreaterThanOrEqual(85);
});
```

## Deployment Considerations

### Production Configuration

```typescript
// Production environment configuration
const productionConfig = {
  // Higher quality thresholds for production
  confidenceThreshold: 90,
  maxIterations: 5,
  
  // Timeout and retry settings
  timeout: 60000, // 60 seconds
  retryAttempts: 3,
  
  // Monitoring and alerting
  enableMetrics: true,
  alertThresholds: {
    averageConfidence: 85,
    errorRate: 0.05,
    processingTime: 45000
  },
  
  // Cost management
  maxConcurrentWorkflows: 10,
  dailyCostLimit: 100.00
};
```

### Monitoring Setup

```typescript
// Set up monitoring and alerts
function setupMonitoring() {
  // Monitor workflow performance
  setInterval(async () => {
    const metrics = await getPerformanceMetrics();
    
    if (metrics.avg_confidence < 85) {
      sendAlert('Low average confidence detected', metrics);
    }
    
    if (metrics.critical_issues_rate > 0.1) {
      sendAlert('High critical issues rate', metrics);
    }
  }, 300000); // Check every 5 minutes
}
```

## Best Practices

### 1. Content Quality
- Always validate input data before processing
- Use specific, actionable prompts
- Include relevant context for better results
- Set appropriate confidence thresholds

### 2. Performance
- Implement proper caching strategies
- Use batch processing for multiple assessments
- Set reasonable timeout values
- Monitor resource usage

### 3. Error Handling
- Implement graceful fallbacks
- Use exponential backoff for retries
- Log errors comprehensively
- Provide meaningful error messages to users

### 4. Security
- Validate all inputs
- Use environment variables for API keys
- Implement proper access controls
- Audit workflow activities

### 5. Monitoring
- Track quality metrics continuously
- Set up alerts for anomalies
- Monitor cost and usage
- Analyze workflow performance regularly

## Troubleshooting

### Common Issues

1. **Low Confidence Scores**
   - Check input data quality
   - Verify context information is complete
   - Review validation rules for relevance
   - Consider adjusting confidence threshold

2. **Processing Timeouts**
   - Increase timeout values
   - Check API rate limits
   - Optimize prompt complexity
   - Consider parallel processing

3. **High Error Rates**
   - Validate API credentials
   - Check network connectivity
   - Review input data formats
   - Monitor service status

4. **Inconsistent Results**
   - Standardize prompt templates
   - Improve context data quality
   - Add more specific validation rules
   - Increase iteration limits

For additional support, refer to the full documentation in `/packages/lib/src/ai-dual-system/` or contact the development team.