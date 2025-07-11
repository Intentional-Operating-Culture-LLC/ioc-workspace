/**
 * A1 Generator System Exports
 * Main exports for the A1 Generator component of IOC's dual-AI system
 */

// Core A1 Generator Service
export { A1GeneratorService } from './a1-generator.js';
export type {
  AssessmentContext,
  GeneratedPrompts,
  AssessmentPrompt,
  PersonalizedInterpretation,
  PillarScores,
  PillarScore,
  GeneratedReport,
  ValidationNode
} from './a1-generator.js';

// A1 Feedback Processor
export { A1FeedbackProcessor } from './a1-feedback-processor.js';
export type {
  FeedbackContext,
  RevisionPlan,
  NodeRevision,
  ConsistencyCheck,
  LearningPoint,
  RevisedContent,
  FeedbackPattern
} from './a1-feedback-processor.js';

// A1 Prompt Library Enhancement
export { A1PromptLibrary } from './a1-prompt-library.js';
export type {
  BasePrompt,
  ContextModifier,
  PromptModification,
  CulturalModifier,
  IndustryModifier,
  GeneratedPromptSet,
  EnhancedPrompt,
  PromptEvolutionMetrics,
  PromptOptimizationResult,
  ABTestResult
} from './a1-prompt-library.js';

// A1 Integration Service
export { A1IntegrationService } from './a1-integration-service.js';
export type {
  A1Configuration,
  A1ServiceContext,
  EnhancedAssessmentRequest,
  EnhancedAssessmentResponse,
  EnhancedReportRequest,
  EnhancedReportResponse,
  A1PerformanceMetrics
} from './a1-integration-service.js';

// Convenience factory function
export function createA1System(config: {
  anthropicApiKey: string;
  openaiApiKey: string;
  assessmentService: any;
  configuration?: Partial<any>;
}) {
  const anthropicClient = createAnthropicClient(config.anthropicApiKey);
  const openaiClient = createOpenAIClient(config.openaiApiKey);
  
  const defaultConfig = {
    anthropicApiKey: config.anthropicApiKey,
    openaiApiKey: config.openaiApiKey,
    primaryModel: 'claude-3-opus',
    fallbackModel: 'gpt-4-turbo',
    temperature: 0.7,
    maxTokens: 4096,
    enableLearning: true,
    enablePersonalization: true,
    confidenceThreshold: 0.7,
    ...config.configuration
  };

  return new A1IntegrationService(
    anthropicClient,
    openaiClient,
    config.assessmentService,
    defaultConfig
  );
}

// Helper functions for creating AI clients
function createAnthropicClient(apiKey: string) {
  // This would use the actual Anthropic SDK
  // For now, return a mock client structure
  return {
    messages: {
      create: async (params: any) => {
        // Mock implementation - replace with actual Anthropic SDK
        throw new Error('Anthropic client not implemented - replace with actual SDK');
      }
    }
  };
}

function createOpenAIClient(apiKey: string) {
  // This would use the actual OpenAI SDK
  // For now, return a mock client structure
  return {
    chat: {
      completions: {
        create: async (params: any) => {
          // Mock implementation - replace with actual OpenAI SDK
          throw new Error('OpenAI client not implemented - replace with actual SDK');
        }
      }
    }
  };
}

// Export utility functions
export { createAnthropicClient, createOpenAIClient };

// Re-export core interfaces from the dual-AI system
export type {
  GenerationRequest,
  GenerationResponse,
  ValidationRequest,
  ValidationResponse,
  ValidationIssue,
  IA1Generator,
  IB1Validator
} from '../core/interfaces.js';