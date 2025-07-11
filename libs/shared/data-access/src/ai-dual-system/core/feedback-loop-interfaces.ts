/**
 * Feedback Loop Interface Definitions
 * Structured communication protocol between A1 and B1 systems
 */

import type {
  GenerationResponse,
  ValidationResponse,
  ValidationIssue
} from './interfaces';

export interface FeedbackLoopRequest {
  requestId: string;
  userId?: string;
  contentType: 'assessment' | 'report' | 'coaching' | 'insight' | 'recommendation';
  initialContent?: any;
  confidenceThreshold: number;
  maxIterations: number;
  timeoutMs?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  context: {
    industry?: string;
    role?: string;
    culturalContext?: string;
    targetAudience: string;
    previousFeedback?: string[];
  };
  options: {
    enableIncrementalValidation?: boolean;
    enableOscillationDetection?: boolean;
    enableCaching?: boolean;
    parallelProcessing?: boolean;
    customThresholds?: Record<string, number>;
  };
}

export interface FeedbackLoopResult {
  loopId: string;
  requestId: string;
  status: 'converged' | 'max_iterations_reached' | 'timeout' | 'cancelled' | 'error';
  finalGeneration: GenerationResponse;
  finalValidation: ValidationResponse;
  iterationCount: number;
  converged: boolean;
  processingTime: number;
  qualityMetrics: {
    initialConfidence: number;
    finalConfidence: number;
    confidenceImprovement: number;
    averageIterationTime: number;
    totalFeedbackMessages: number;
  };
  iterations: IterationSummary[];
  metadata: {
    completedAt: Date;
    version: string;
    convergenceReason: 'threshold_met' | 'max_iterations' | 'timeout' | 'oscillation' | 'minimal_improvement';
  };
}

export interface FeedbackLoopState {
  loopId: string;
  requestId: string;
  status: 'active' | 'completed' | 'cancelled' | 'error';
  startTime: Date;
  completedAt?: Date;
  currentIteration: number;
  finalIteration: number;
  converged: boolean;
  finalConfidence: number;
  config: {
    maxIterations: number;
    confidenceThreshold: number;
    timeoutMs: number;
  };
  metadata: {
    createdAt: Date;
    createdBy: string;
    version: string;
  };
}

export interface FeedbackLoopIteration {
  iteration: number;
  timestamp: Date;
  generation: GenerationResponse;
  validation: ValidationResponse;
  feedback: FeedbackMessage[];
  improvementApplied: boolean;
  confidenceImprovement: number;
  processingTime: number;
}

export interface IterationSummary {
  iteration: number;
  confidence: number;
  feedbackCount: number;
  processingTime: number;
  timestamp: Date;
}

export interface FeedbackMessage {
  nodeId: string;
  currentContent: any;
  currentConfidence: number;
  targetConfidence: number;
  issues: ValidationIssue[];
  suggestedImprovements: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

// ValidationIssue is now imported from interfaces.ts

export interface NodeRevisionRequest {
  nodeId: string;
  currentContent: any;
  issues: ValidationIssue[];
  suggestedImprovements: string[];
  targetConfidence: number;
  context: {
    previousAttempts: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
}

// GenerationResponse and ValidationResponse are now imported from interfaces.ts

export interface NodeValidation {
  nodeId: string;
  confidence: number;
  scores: {
    accuracy: number;
    clarity: number;
    bias: number;
    ethics: number;
    compliance: number;
  };
  issues: ValidationIssue[];
  suggestions: string[];
  status: 'approved' | 'needs_improvement' | 'rejected';
  metadata: {
    validatedAt: Date;
    processingTime: number;
  };
}

export interface ConvergenceMetrics {
  loopId: string;
  targetConfidence: number;
  currentConfidence: number;
  confidenceHistory: number[];
  improvementRate: number;
  stabilityScore: number;
  oscillationDetected: boolean;
  predictedConvergence: {
    willConverge: boolean;
    estimatedIterations: number;
    confidence: number;
  };
}

export interface FeedbackLoopConfiguration {
  execution: {
    defaultTimeoutMs: number;
    maxConcurrentLoops: number;
    enableCaching: boolean;
    cacheTimeout: number;
  };
  convergence: {
    minImprovementRate: number;
    confidenceStabilityThreshold: number;
    maxIterationsWithoutImprovement: number;
  };
  oscillation: {
    minIterationsToDetect: number;
    windowSize: number;
    patternRepetitionThreshold: number;
  };
  feedback: {
    maxFeedbackMessagesPerIteration: number;
    priorityWeights: Record<string, number>;
  };
  performance: {
    enableIncrementalValidation: boolean;
    batchSize: number;
    parallelProcessing: boolean;
    maxParallelOperations: number;
  };
}

export interface FeedbackLoopMetrics {
  totalLoops: number;
  activeLoops: number;
  completedLoops: number;
  cancelledLoops: number;
  errorLoops: number;
  averageIterations: number;
  averageProcessingTime: number;
  convergenceRate: number;
  averageConfidenceImprovement: number;
  oscillationRate: number;
  timeoutRate: number;
  performanceMetrics: {
    avgIterationTime: number;
    avgValidationTime: number;
    avgRevisionTime: number;
    cacheHitRate: number;
    parallelEfficiency: number;
  };
}

export interface FeedbackLoopHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  activeLoops: number;
  queueDepth: number;
  avgResponseTime: number;
  errorRate: number;
  convergenceRate: number;
  lastUpdated: Date;
  issues: string[];
  recommendations: string[];
}

export interface FeedbackLoopEvent {
  type: 'loop_started' | 'iteration_completed' | 'loop_completed' | 'loop_cancelled' | 'convergence_achieved' | 'oscillation_detected' | 'timeout_occurred' | 'error_occurred';
  loopId: string;
  requestId: string;
  timestamp: Date;
  data: any;
  metadata: {
    version: string;
    source: string;
  };
}

export interface FeedbackLoopWebhookPayload {
  event: FeedbackLoopEvent;
  loop: {
    loopId: string;
    requestId: string;
    status: string;
    currentIteration: number;
    confidence: number;
  };
  metadata: {
    timestamp: Date;
    version: string;
    signature: string;
  };
}

export interface FeedbackLoopCache {
  key: string;
  data: any;
  timestamp: Date;
  expiresAt: Date;
  metadata: {
    loopId: string;
    type: 'generation' | 'validation' | 'feedback' | 'result';
    version: string;
  };
}

export interface FeedbackLoopQueueItem {
  id: string;
  loopId: string;
  type: 'generation' | 'validation' | 'feedback' | 'revision';
  priority: number;
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  metadata: {
    requestId: string;
    nodeId?: string;
    urgency: string;
  };
}

export interface FeedbackLoopAuditLog {
  id: string;
  loopId: string;
  requestId: string;
  action: string;
  timestamp: Date;
  userId?: string;
  details: any;
  metadata: {
    version: string;
    source: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

export class FeedbackLoopError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'FeedbackLoopError';
  }
}

// Utility types for type safety
export type FeedbackLoopStatus = 'active' | 'completed' | 'cancelled' | 'error';
export type ConvergenceReason = 'threshold_met' | 'max_iterations' | 'timeout' | 'oscillation' | 'minimal_improvement';
export type ValidationStatus = 'approved' | 'needs_improvement' | 'rejected' | 'requires_human_review';
export type IssueCategory = 'accuracy' | 'clarity' | 'bias' | 'ethics' | 'compliance' | 'consistency';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type ContentType = 'assessment' | 'report' | 'coaching' | 'insight' | 'recommendation';

// Export all interfaces for easy importing
export * from './interfaces';