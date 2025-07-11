/**
 * IOC Lambda Analytics Package
 * Serverless analytics processing for lean meta BI system
 */

// Export Lambda handlers
export { handler as assessmentAnonymizer } from './functions/assessment-anonymizer';
export { handler as oceanCalculator } from './functions/ocean-calculator';
export { handler as dualAIProcessor } from './functions/dual-ai-processor';
export { handler as pinpointTransformer } from './functions/pinpoint-transformer';
export { handler as s3DataProcessor } from './functions/s3-data-processor';

// Export integration services
export { lambdaAnalytics, analyticsHelpers } from './services/integration';

// Export types
export * from './types';

// Export utilities
export * from './utils';

// Export configurations
export { getLambdaConfigs, getTriggerConfigs, getCostOptimizationSettings } from './config/lambda-config';

// Export event builders for Pinpoint
export { eventBuilders } from './functions/pinpoint-transformer';

// Export Athena analytics
export * from './athena';