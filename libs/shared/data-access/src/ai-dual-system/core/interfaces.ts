/**
 * Core interfaces for the IOC Dual-AI System
 * Defines the contracts for A1 Generator and B1 Validator components
 */

// Base types
export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'local';
export type ContentType = 'assessment' | 'report' | 'coaching' | 'insight' | 'recommendation';
export type ValidationStatus = 'approved' | 'rejected' | 'modified' | 'escalated' | 'needs_improvement';
export type DisagreementSeverity = 'low' | 'medium' | 'high' | 'critical';

// Model configurations
export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// Generation request
export interface GenerationRequest {
  id: string;
  userId: string;
  organizationId: string;
  type: ContentType;
  context: Record<string, any>;
  options?: GenerationOptions;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: Date;
}

export interface GenerationOptions {
  style?: 'formal' | 'casual' | 'technical' | 'executive';
  length?: 'brief' | 'standard' | 'detailed';
  language?: string;
  culturalContext?: string;
  industryContext?: string;
}

// Generation response
export interface GenerationResponse {
  requestId: string;
  content: any;
  model: ModelConfig;
  metadata: GenerationMetadata;
  processingTime: number;
  tokenUsage: TokenUsage;
}

export interface GenerationMetadata {
  confidence: number;
  reasoning: string[];
  sources?: string[];
  assumptions?: string[];
  limitations?: string[];
  generatedAt?: Date;
  revised?: boolean;
  revisionCount?: number;
  lastRevision?: Date;
  temperature?: number;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
  input?: number;
  output?: number;
  cost?: number;
}

// Validation request
export interface ValidationRequest {
  id: string;
  generationId: string;
  content: any;
  contentType: ContentType;
  context: Record<string, any>;
  urgency: boolean;
}

// Validation response
export interface ValidationResponse {
  requestId: string;
  generationId?: string;
  status: ValidationStatus;
  issues: ValidationIssue[];
  suggestions: string[];
  scores: ValidationScores;
  metadata: ValidationMetadata;
  processingTime: number;
  nodeValidations?: Record<string, any>;
}

export interface ValidationIssue {
  type: 'ethical' | 'bias' | 'factual' | 'quality' | 'compliance';
  severity: DisagreementSeverity;
  description: string;
  location?: string;
  evidence?: string[];
  suggestedFix?: string;
}

export interface ValidationScores {
  ethical: number;      // 0-1 score
  bias: number;        // 0-1 score (0 = no bias)
  quality: number;     // 0-1 score
  compliance: number;  // 0-1 score
  accuracy: number;    // 0-1 score
  clarity: number;     // 0-1 score
  overall: number;     // 0-1 weighted average
}

export interface ValidationMetadata {
  validatorModel: ModelConfig;
  confidence: number;
  rulesApplied: string[];
  checklistResults: Record<string, boolean>;
  incrementalValidation?: boolean;
  validatedNodes?: string[];
  validatedAt?: Date;
  lastValidation?: Date;
  model?: string;
}

// Disagreement handling
export interface Disagreement {
  id: string;
  requestId: string;
  generationId: string;
  validationId: string;
  type: DisagreementType;
  severity: DisagreementSeverity;
  generatorPosition: DisagreementPosition;
  validatorPosition: DisagreementPosition;
  status: 'open' | 'resolved' | 'escalated' | 'dismissed';
  resolution?: DisagreementResolution;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface DisagreementType {
  category: 'content' | 'style' | 'ethics' | 'accuracy' | 'bias';
  subCategory?: string;
}

export interface DisagreementPosition {
  stance: string;
  reasoning: string[];
  evidence?: any[];
  confidence: number;
}

export interface DisagreementResolution {
  method: 'automated' | 'human' | 'policy' | 'consensus';
  finalContent?: any;
  explanation: string;
  approver?: string;
  learningNotes?: string[];
}

// Learning system
export interface LearningEvent {
  id: string;
  type: 'disagreement' | 'feedback' | 'correction' | 'success' | 'failure';
  sourceId: string;
  sourceType: string;
  data: LearningData;
  impact: LearningImpact;
  timestamp: Date;
}

export interface LearningData {
  input: any;
  output: any;
  expected?: any;
  feedback?: string;
  metadata: Record<string, any>;
}

export interface LearningImpact {
  score: number;        // -1 to 1 (negative = harmful, positive = beneficial)
  confidence: number;   // 0-1
  affectedModels: string[];
  suggestedActions: string[];
}

// Performance metrics
export interface PerformanceMetrics {
  concordanceRate: number;
  averageProcessingTime: number;
  throughput: number;
  errorRate: number;
  disagreementRate: number;
  userSatisfaction?: number;
  costPerRequest: number;
  timestamp: Date;
}

// AI Component interfaces
export interface IA1Generator {
  generate(request: GenerationRequest): Promise<GenerationResponse>;
  generateBatch(requests: GenerationRequest[]): Promise<GenerationResponse[]>;
  getCapabilities(): GeneratorCapabilities;
  getHealth(): Promise<ComponentHealth>;
}

export interface IB1Validator {
  validate(request: ValidationRequest): Promise<ValidationResponse>;
  validateBatch(requests: ValidationRequest[]): Promise<ValidationResponse[]>;
  getValidationRules(): ValidationRule[];
  updateRules(rules: ValidationRule[]): Promise<void>;
  getHealth(): Promise<ComponentHealth>;
}

export interface IDisagreementHandler {
  handleDisagreement(
    generation: GenerationResponse,
    validation: ValidationResponse
  ): Promise<Disagreement>;
  resolveDisagreement(
    disagreementId: string,
    resolution: DisagreementResolution
  ): Promise<void>;
  getDisagreements(filters?: DisagreementFilters): Promise<Disagreement[]>;
  escalateDisagreement(disagreementId: string, reason: string): Promise<void>;
}

export interface IContinuousLearningEngine {
  recordEvent(event: LearningEvent): Promise<void>;
  processLearningBatch(): Promise<LearningBatchResult>;
  getInsights(): Promise<LearningInsight[]>;
  triggerRetraining(targetModel: string, options?: RetrainingOptions): Promise<void>;
  getMetrics(): Promise<LearningMetrics>;
}

// Supporting types
export interface GeneratorCapabilities {
  supportedTypes: ContentType[];
  maxTokens: number;
  languages: string[];
  specializations: string[];
  rateLimit: RateLimit;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  type: 'ethical' | 'bias' | 'quality' | 'compliance';
  condition: string;  // Expression or function
  severity: DisagreementSeverity;
  active: boolean;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  errorRate: number;
  queueDepth?: number;
  lastCheck: Date;
  issues?: string[];
}

export interface DisagreementFilters {
  status?: string[];
  severity?: DisagreementSeverity[];
  type?: string[];
  dateRange?: { start: Date; end: Date };
  limit?: number;
}

export interface LearningBatchResult {
  processed: number;
  insights: number;
  errors: number;
  duration: number;
  nextBatch?: Date;
}

export interface LearningInsight {
  id: string;
  type: string;
  description: string;
  evidence: any[];
  impact: 'low' | 'medium' | 'high';
  recommendations: string[];
  confidence: number;
}

export interface RetrainingOptions {
  dataSource?: string;
  validationSplit?: number;
  epochs?: number;
  priority?: 'low' | 'normal' | 'high';
}

export interface LearningMetrics {
  totalEvents: number;
  processedEvents: number;
  pendingEvents: number;
  averageImpactScore: number;
  modelImprovements: Record<string, number>;
  lastRetraining: Record<string, Date>;
}

export interface RateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  tokensPerMinute: number;
  concurrentRequests: number;
}

// Cache interfaces
export interface ICacheStrategy {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): Promise<CacheStats>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
  hitRate: number;
}

// Queue interfaces
export interface IQueueManager {
  enqueue<T>(queue: string, message: T, options?: QueueOptions): Promise<string>;
  dequeue<T>(queue: string, count?: number): Promise<T[]>;
  getQueueStats(queue: string): Promise<QueueStats>;
  purgeQueue(queue: string): Promise<void>;
}

export interface QueueOptions {
  priority?: number;
  delay?: number;
  retries?: number;
  ttl?: number;
}

export interface QueueStats {
  length: number;
  processing: number;
  failed: number;
  completed: number;
  averageWaitTime: number;
}

// Error types
export class DualAIError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DualAIError';
  }
}

export class GenerationError extends DualAIError {
  constructor(message: string, details?: any) {
    super(message, 'GENERATION_ERROR', details);
    this.name = 'GenerationError';
  }
}

export class ValidationError extends DualAIError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class DisagreementError extends DualAIError {
  constructor(message: string, details?: any) {
    super(message, 'DISAGREEMENT_ERROR', details);
    this.name = 'DisagreementError';
  }
}

export class LearningError extends DualAIError {
  constructor(message: string, details?: any) {
    super(message, 'LEARNING_ERROR', details);
    this.name = 'LearningError';
  }
}

// Re-export feedback loop interfaces (avoid circular imports)
export type {
  FeedbackLoopRequest,
  FeedbackLoopResult,
  FeedbackLoopConfiguration,
  FeedbackLoopState,
  FeedbackLoopIteration,
  FeedbackMessage,
  NodeRevisionRequest,
  ConvergenceMetrics,
  IterationSummary,
} from './feedback-loop-interfaces';

export { FeedbackLoopError } from './feedback-loop-interfaces';