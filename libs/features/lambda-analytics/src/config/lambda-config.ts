/**
 * Lambda function configurations with MRR-based scaling
 */

export interface LambdaConfig {
  functionName: string;
  handler: string;
  runtime: 'nodejs18.x' | 'nodejs20.x';
  memorySize: number;
  timeout: number;
  environment: Record<string, string>;
  reservedConcurrentExecutions?: number;
  deadLetterConfig?: {
    targetArn: string;
  };
  tracingConfig?: {
    mode: 'Active' | 'PassThrough';
  };
}

export const getLambdaConfigs = (mrr: number): Record<string, LambdaConfig> => {
  const baseConfig = {
    runtime: 'nodejs20.x' as const,
    environment: {
      NODE_ENV: 'production',
      AWS_REGION: process.env.AWS_REGION || 'us-east-1',
      CURRENT_MRR: mrr.toString()
    }
  };
  
  return {
    assessmentAnonymizer: {
      ...baseConfig,
      functionName: 'ioc-assessment-anonymizer',
      handler: 'dist/functions/assessment-anonymizer.handler',
      memorySize: mrr >= 1000 ? 256 : 128,
      timeout: 30,
      environment: {
        ...baseConfig.environment,
        ANONYMIZATION_SALT: process.env.ANONYMIZATION_SALT || '',
        METRICS_BUCKET: process.env.METRICS_BUCKET || ''
      },
      reservedConcurrentExecutions: mrr >= 10000 ? 10 : undefined,
      tracingConfig: mrr >= 5000 ? { mode: 'Active' } : undefined
    },
    
    oceanCalculator: {
      ...baseConfig,
      functionName: 'ioc-ocean-calculator',
      handler: 'dist/functions/ocean-calculator.handler',
      memorySize: mrr >= 1000 ? 256 : 128,
      timeout: 60,
      environment: {
        ...baseConfig.environment,
        AGGREGATION_QUEUE_URL: process.env.AGGREGATION_QUEUE_URL || ''
      },
      reservedConcurrentExecutions: mrr >= 10000 ? 20 : undefined,
      tracingConfig: mrr >= 5000 ? { mode: 'Active' } : undefined
    },
    
    dualAIProcessor: {
      ...baseConfig,
      functionName: 'ioc-dual-ai-processor',
      handler: 'dist/functions/dual-ai-processor.handler',
      memorySize: mrr >= 5000 ? 256 : 128,
      timeout: 45,
      environment: {
        ...baseConfig.environment,
        METRICS_BUCKET: process.env.METRICS_BUCKET || '',
        ERROR_QUEUE_URL: process.env.ERROR_QUEUE_URL || ''
      },
      deadLetterConfig: {
        targetArn: process.env.DLQ_ARN || ''
      },
      tracingConfig: mrr >= 5000 ? { mode: 'Active' } : undefined
    },
    
    pinpointTransformer: {
      ...baseConfig,
      functionName: 'ioc-pinpoint-transformer',
      handler: 'dist/functions/pinpoint-transformer.handler',
      memorySize: 128, // Always minimal for simple transformations
      timeout: 15,
      environment: {
        ...baseConfig.environment,
        PINPOINT_APP_ID: process.env.PINPOINT_APP_ID || ''
      },
      reservedConcurrentExecutions: mrr >= 10000 ? 5 : undefined
    },
    
    s3DataProcessor: {
      ...baseConfig,
      functionName: 'ioc-s3-data-processor',
      handler: 'dist/functions/s3-data-processor.handler',
      memorySize: mrr >= 1000 ? 256 : 128,
      timeout: 300, // 5 minutes for large files
      environment: {
        ...baseConfig.environment,
        ANALYTICS_QUEUE_URL: process.env.ANALYTICS_QUEUE_URL || '',
        IMPORT_QUEUE_URL: process.env.IMPORT_QUEUE_URL || ''
      },
      deadLetterConfig: {
        targetArn: process.env.DLQ_ARN || ''
      },
      tracingConfig: mrr >= 5000 ? { mode: 'Active' } : undefined
    }
  };
};

// Trigger configurations
export const getTriggerConfigs = (mrr: number) => ({
  s3Triggers: [
    {
      bucket: process.env.ASSESSMENT_BUCKET || '',
      events: ['s3:ObjectCreated:*'],
      prefix: 'raw/assessments/',
      functionName: 'ioc-assessment-anonymizer'
    },
    {
      bucket: process.env.ASSESSMENT_BUCKET || '',
      events: ['s3:ObjectCreated:*'],
      prefix: 'anonymized/',
      functionName: 'ioc-ocean-calculator'
    },
    {
      bucket: process.env.DATA_BUCKET || '',
      events: ['s3:ObjectCreated:*'],
      functionName: 'ioc-s3-data-processor'
    }
  ],
  
  sqsTriggers: [
    {
      queueName: 'ioc-dual-ai-validation',
      functionName: 'ioc-dual-ai-processor',
      batchSize: mrr >= 5000 ? 10 : 5,
      maximumBatchingWindowInSeconds: mrr >= 10000 ? 5 : 20
    }
  ],
  
  eventBridgeTriggers: [
    {
      ruleName: 'ioc-assessment-events',
      functionName: 'ioc-pinpoint-transformer',
      pattern: {
        source: ['ioc.assessments'],
        'detail-type': ['AssessmentCompleted', 'AssessmentStarted']
      }
    }
  ],
  
  scheduledTriggers: mrr >= 1000 ? [
    {
      ruleName: 'ioc-daily-aggregation',
      functionName: 'ioc-ocean-calculator',
      schedule: 'rate(1 day)'
    }
  ] : []
});

// Cost optimization settings
export const getCostOptimizationSettings = (mrr: number) => ({
  enableXRay: mrr >= 5000,
  enableEnhancedMonitoring: mrr >= 1000,
  enableProvisionedConcurrency: mrr >= 10000,
  enableContainerReuse: true,
  enableConnectionPooling: mrr >= 1000,
  
  // Batch processing settings
  defaultBatchSize: mrr >= 5000 ? 100 : 50,
  maxConcurrency: mrr >= 10000 ? 50 : 10,
  
  // Caching settings
  enableCaching: true,
  cacheTTL: mrr >= 5000 ? 300 : 600, // seconds
  
  // Compression settings
  enableCompression: true,
  compressionThreshold: 1024, // bytes
  
  // Retry settings
  maxRetries: 3,
  retryDelay: mrr >= 5000 ? 1000 : 2000 // ms
});