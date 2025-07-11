/**
 * Dual-AI Service - Main orchestrator for the A1/B1 workflow
 * Coordinates generation, validation, disagreement handling, and learning
 */

import { A1Generator } from '../core/a1-generator';
import { B1Validator } from '../core/b1-validator';
import { DisagreementHandler } from '../core/disagreement-handler';
import { ContinuousLearningEngine } from '../core/continuous-learning-engine';
import { DualAICacheStrategy } from '../infrastructure/cache-strategy';
import { DualAIQueueManager } from '../infrastructure/queue-manager';

import {
  GenerationRequest,
  GenerationResponse,
  ValidationRequest,
  ValidationResponse,
  Disagreement,
  LearningEvent,
  DualAIError,
  ContentType
} from '../core/interfaces';

import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export class DualAIService {
  private a1Generator: A1Generator;
  private b1Validator: B1Validator;
  private disagreementHandler: DisagreementHandler;
  private learningEngine: ContinuousLearningEngine;
  private cacheStrategy: DualAICacheStrategy;
  private queueManager: DualAIQueueManager;
  private config: DualAIServiceConfig;

  constructor(config?: Partial<DualAIServiceConfig>) {
    this.config = {
      ...this.getDefaultConfig(),
      ...config
    };

    this.initializeComponents();
  }

  /**
   * Main workflow: Generate content with A1, validate with B1, handle disagreements
   */
  async generateAndValidate(request: GenerationRequest): Promise<DualAIWorkflowResult> {
    const traceId = this.generateTraceId();
    const startTime = Date.now();

    try {
      logger.info('Starting dual-AI workflow', {
        traceId,
        requestId: request.id,
        type: request.type,
        userId: request.userId
      });

      // Check cache first
      const cacheKey = this.buildCacheKey(request);
      const cachedResult = await this.cacheStrategy.get<DualAIWorkflowResult>(cacheKey);
      
      if (cachedResult && this.config.enableCaching) {
        logger.info('Cache hit for dual-AI request', {
          traceId,
          requestId: request.id,
          cacheKey
        });
        
        metrics.increment('dual_ai_cache_hit', { type: request.type });
        return cachedResult;
      }

      metrics.increment('dual_ai_cache_miss', { type: request.type });

      // Step 1: Generate content with A1
      const generation = await this.generateContent(request, traceId);

      // Step 2: Validate content with B1
      const validation = await this.validateContent(generation, request, traceId);

      // Step 3: Handle disagreements if any
      const disagreement = await this.handlePotentialDisagreement(generation, validation, traceId);

      // Step 4: Determine final result
      const result = await this.buildWorkflowResult(generation, validation, disagreement, traceId);

      // Step 5: Record learning events
      await this.recordWorkflowLearning(request, generation, validation, disagreement, traceId);

      // Step 6: Cache result if successful
      if (result.status === 'approved' || result.status === 'modified') {
        await this.cacheStrategy.set(cacheKey, result, this.config.cacheTtl);
      }

      const duration = Date.now() - startTime;

      logger.info('Dual-AI workflow completed', {
        traceId,
        requestId: request.id,
        status: result.status,
        hasDisagreement: !!disagreement,
        duration
      });

      metrics.record('dual_ai_workflow_completed', {
        type: request.type,
        status: result.status,
        duration,
        hasDisagreement: !!disagreement
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Dual-AI workflow failed', {
        traceId,
        requestId: request.id,
        error: error.message,
        duration
      });

      metrics.record('dual_ai_workflow_error', {
        type: request.type,
        error: error.constructor.name,
        duration
      });

      throw new DualAIError(
        `Dual-AI workflow failed: ${error.message}`,
        'WORKFLOW_ERROR',
        { traceId, request, originalError: error }
      );
    }
  }

  /**
   * Generate content using A1 Generator
   */
  async generateContent(request: GenerationRequest, traceId?: string): Promise<GenerationResponse> {
    try {
      logger.info('Generating content with A1', {
        traceId,
        requestId: request.id,
        type: request.type
      });

      const response = await this.a1Generator.generate(request);

      logger.info('Content generation completed', {
        traceId,
        requestId: request.id,
        confidence: response.metadata.confidence,
        tokens: response.tokenUsage.total
      });

      return response;

    } catch (error) {
      logger.error('Content generation failed', {
        traceId,
        requestId: request.id,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Validate content using B1 Validator
   */
  async validateContent(
    generation: GenerationResponse,
    originalRequest: GenerationRequest,
    traceId?: string
  ): Promise<ValidationResponse> {
    try {
      logger.info('Validating content with B1', {
        traceId,
        generationId: generation.requestId,
        contentType: originalRequest.type
      });

      const validationRequest: ValidationRequest = {
        id: `val_${generation.requestId}`,
        generationId: generation.requestId,
        content: generation.content,
        contentType: originalRequest.type,
        context: originalRequest.context,
        urgency: originalRequest.priority === 'urgent'
      };

      const response = await this.b1Validator.validate(validationRequest);

      logger.info('Content validation completed', {
        traceId,
        generationId: generation.requestId,
        status: response.status,
        overallScore: response.scores.overall,
        issueCount: response.issues.length
      });

      return response;

    } catch (error) {
      logger.error('Content validation failed', {
        traceId,
        generationId: generation.requestId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Handle potential disagreements between A1 and B1
   */
  async handlePotentialDisagreement(
    generation: GenerationResponse,
    validation: ValidationResponse,
    traceId?: string
  ): Promise<Disagreement | null> {
    
    // Check if there's a disagreement
    if (validation.status === 'approved' && validation.scores.overall > 0.8) {
      // No significant disagreement
      return null;
    }

    try {
      logger.info('Handling disagreement', {
        traceId,
        generationId: generation.requestId,
        validationStatus: validation.status,
        overallScore: validation.scores.overall
      });

      const disagreement = await this.disagreementHandler.handleDisagreement(generation, validation);

      logger.info('Disagreement handled', {
        traceId,
        disagreementId: disagreement.id,
        severity: disagreement.severity,
        status: disagreement.status
      });

      return disagreement;

    } catch (error) {
      logger.error('Disagreement handling failed', {
        traceId,
        generationId: generation.requestId,
        error: error.message
      });

      // Don't throw - we can still return a result
      return null;
    }
  }

  /**
   * Build the final workflow result
   */
  async buildWorkflowResult(
    generation: GenerationResponse,
    validation: ValidationResponse,
    disagreement: Disagreement | null,
    traceId?: string
  ): Promise<DualAIWorkflowResult> {
    
    let finalContent = generation.content;
    let status = validation.status;
    let confidence = Math.min(generation.metadata.confidence, validation.metadata.confidence);

    // Apply disagreement resolution if available
    if (disagreement?.resolution?.finalContent) {
      finalContent = disagreement.resolution.finalContent;
      status = 'modified';
    }

    // Apply validation suggestions if status is modified
    if (validation.status === 'modified' && validation.suggestions.length > 0) {
      finalContent = await this.applyValidationSuggestions(finalContent, validation.suggestions);
    }

    return {
      requestId: generation.requestId,
      status,
      content: finalContent,
      confidence,
      generation: {
        model: generation.model,
        processingTime: generation.processingTime,
        tokenUsage: generation.tokenUsage,
        metadata: generation.metadata
      },
      validation: {
        status: validation.status,
        scores: validation.scores,
        issues: validation.issues,
        suggestions: validation.suggestions,
        processingTime: validation.processingTime
      },
      disagreement: disagreement ? {
        id: disagreement.id,
        type: disagreement.type,
        severity: disagreement.severity,
        status: disagreement.status,
        resolution: disagreement.resolution
      } : null,
      metadata: {
        traceId,
        processedAt: new Date(),
        workflow: 'dual-ai-v1'
      }
    };
  }

  /**
   * Record learning events from the workflow
   */
  async recordWorkflowLearning(
    request: GenerationRequest,
    generation: GenerationResponse,
    validation: ValidationResponse,
    disagreement: Disagreement | null,
    traceId?: string
  ): Promise<void> {
    try {
      // Record success/failure events
      const eventType = validation.status === 'approved' ? 'success' : 'disagreement';
      
      const learningEvent: LearningEvent = {
        id: `learn_${generation.requestId}`,
        type: eventType,
        sourceId: generation.requestId,
        sourceType: 'dual_ai_workflow',
        data: {
          input: {
            request: {
              type: request.type,
              context: request.context,
              options: request.options
            }
          },
          output: {
            generation: {
              content: generation.content,
              confidence: generation.metadata.confidence,
              model: generation.model
            },
            validation: {
              status: validation.status,
              scores: validation.scores,
              issues: validation.issues
            }
          },
          feedback: validation.status,
          metadata: {
            traceId,
            disagreementId: disagreement?.id,
            processingTime: generation.processingTime + validation.processingTime
          }
        },
        impact: this.calculateWorkflowImpact(validation, disagreement),
        timestamp: new Date()
      };

      await this.learningEngine.recordEvent(learningEvent);

      logger.debug('Workflow learning event recorded', {
        traceId,
        eventId: learningEvent.id,
        type: eventType,
        impactScore: learningEvent.impact.score
      });

    } catch (error) {
      logger.warn('Failed to record workflow learning', {
        traceId,
        requestId: request.id,
        error: error.message
      });
    }
  }

  /**
   * Get system health across all components
   */
  async getSystemHealth(): Promise<SystemHealthResult> {
    try {
      const [
        generatorHealth,
        validatorHealth,
        cacheStats,
        queueStats,
        learningMetrics
      ] = await Promise.all([
        this.a1Generator.getHealth(),
        this.b1Validator.getHealth(),
        this.cacheStrategy.getStats(),
        this.getQueueSystemStats(),
        this.learningEngine.getMetrics()
      ]);

      const overall = this.calculateOverallHealth([
        generatorHealth,
        validatorHealth
      ]);

      return {
        healthy: overall.status === 'healthy',
        components: {
          generator: generatorHealth,
          validator: validatorHealth,
          cache: {
            status: cacheStats.hitRate > 0.7 ? 'healthy' : 'degraded',
            hitRate: cacheStats.hitRate,
            size: cacheStats.size
          },
          queues: queueStats,
          learning: {
            status: learningMetrics.pendingEvents < 1000 ? 'healthy' : 'degraded',
            pendingEvents: learningMetrics.pendingEvents,
            avgImpact: learningMetrics.averageImpactScore
          }
        },
        metrics: {
          concordanceRate: this.calculateConcordanceRate(),
          avgProcessingTime: this.calculateAvgProcessingTime(),
          errorRate: this.calculateErrorRate(),
          lastUpdated: new Date()
        }
      };

    } catch (error) {
      logger.error('Health check failed', {
        error: error.message
      });

      return {
        healthy: false,
        components: {},
        metrics: {
          concordanceRate: 0,
          avgProcessingTime: 0,
          errorRate: 1,
          lastUpdated: new Date()
        },
        error: error.message
      };
    }
  }

  // Private helper methods

  private initializeComponents(): void {
    try {
      // Initialize cache strategy
      this.cacheStrategy = new DualAICacheStrategy(this.config.cache);

      // Initialize queue manager
      this.queueManager = new DualAIQueueManager(this.config.queue);

      // Initialize A1 Generator
      this.a1Generator = new A1Generator({
        ...this.config.generator,
        cacheStrategy: this.cacheStrategy,
        queueManager: this.queueManager
      });

      // Initialize B1 Validator
      this.b1Validator = new B1Validator({
        ...this.config.validator,
        cacheStrategy: this.cacheStrategy,
        queueManager: this.queueManager
      });

      // Initialize Disagreement Handler
      this.disagreementHandler = new DisagreementHandler({
        ...this.config.disagreementHandler,
        learningEngine: this.learningEngine
      });

      // Initialize Learning Engine
      this.learningEngine = new ContinuousLearningEngine(this.config.learning);

      logger.info('Dual-AI service initialized', {
        components: ['generator', 'validator', 'disagreement_handler', 'learning_engine', 'cache', 'queue']
      });

    } catch (error) {
      logger.error('Failed to initialize dual-AI service', {
        error: error.message
      });
      throw error;
    }
  }

  private getDefaultConfig(): DualAIServiceConfig {
    return {
      enableCaching: true,
      cacheTtl: 3600, // 1 hour
      
      generator: {
        modelConfigs: [
          ['assessment', { provider: 'openai', model: 'gpt-4-turbo', temperature: 0.7 }],
          ['report', { provider: 'openai', model: 'gpt-4-turbo', temperature: 0.6 }],
          ['coaching', { provider: 'anthropic', model: 'claude-3-opus-20240229', temperature: 0.8 }],
          ['insight', { provider: 'anthropic', model: 'claude-3-sonnet-20240229', temperature: 0.7 }],
          ['recommendation', { provider: 'openai', model: 'gpt-4-turbo', temperature: 0.6 }]
        ],
        promptTemplates: [
          ['assessment', 'Generate assessment based on context...'],
          ['report', 'Create detailed report...'],
          ['coaching', 'Provide coaching recommendations...'],
          ['insight', 'Generate actionable insights...'],
          ['recommendation', 'Provide strategic recommendations...']
        ],
        capabilities: {
          supportedTypes: ['assessment', 'report', 'coaching', 'insight', 'recommendation'],
          maxTokens: 4096,
          languages: ['en'],
          specializations: ['ocean_personality', 'leadership'],
          rateLimit: {
            requestsPerMinute: 100,
            requestsPerHour: 1000,
            tokensPerMinute: 50000,
            concurrentRequests: 10
          }
        },
        providers: {
          openai: { apiKey: process.env.OPENAI_API_KEY! },
          anthropic: { apiKey: process.env.ANTHROPIC_API_KEY! }
        }
      },

      validator: {
        validationRules: [],
        modelConfig: { provider: 'anthropic', model: 'claude-3-opus-20240229', temperature: 0.1 },
        ethicalGuidelines: [],
        biasDetectors: [],
        complianceRules: [],
        providers: {
          anthropic: { apiKey: process.env.ANTHROPIC_API_KEY! }
        }
      },

      disagreementHandler: {
        resolutionStrategies: [],
        escalationThresholds: {
          confidenceDelta: 0.3,
          severityThreshold: 'high',
          issueCountThreshold: 3
        },
        learningEngine: null as any,
        humanReviewQueue: null as any
      },

      learning: {
        learningQueue: null as any,
        insightEngine: null as any,
        retrainingPipeline: null as any,
        modelRegistry: null as any,
        learningConfig: {
          batchSize: 100,
          batchInterval: 300000,
          processingConcurrency: 5,
          retrainingTriggers: []
        }
      },

      cache: {
        defaultTtl: 3600,
        memory: {
          maxSize: 1000,
          maxTtl: 1800,
          ttl: 300
        },
        redis: {
          enabled: false,
          url: process.env.REDIS_URL || 'redis://localhost:6379'
        }
      },

      queue: {
        defaultQueue: { maxSize: 10000 },
        defaultWorker: { concurrency: 5 },
        queues: {},
        workers: {}
      }
    };
  }

  private buildCacheKey(request: GenerationRequest): string {
    const contextHash = this.hashObject(request.context);
    const optionsHash = this.hashObject(request.options || {});
    return `dual_ai:${request.type}:${contextHash}:${optionsHash}`;
  }

  private hashObject(obj: any): string {
    return Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .substring(0, 16);
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async applyValidationSuggestions(content: any, suggestions: string[]): Promise<any> {
    // In a real implementation, this would intelligently apply suggestions
    // For now, we just return the original content with suggestions noted
    return {
      ...content,
      appliedSuggestions: suggestions,
      note: 'Content modified based on validation suggestions'
    };
  }

  private calculateWorkflowImpact(validation: ValidationResponse, disagreement: Disagreement | null): any {
    let score = 0.5; // Base neutral score

    // Positive impact for high-quality, approved content
    if (validation.status === 'approved' && validation.scores.overall > 0.8) {
      score = 0.7;
    }

    // Negative impact for rejected content
    if (validation.status === 'rejected') {
      score = -0.5;
    }

    // High negative impact for critical disagreements
    if (disagreement?.severity === 'critical') {
      score = -0.8;
    }

    return {
      score,
      confidence: 0.8,
      affectedModels: ['A1Generator', 'B1Validator'],
      suggestedActions: validation.suggestions
    };
  }

  private async getQueueSystemStats(): Promise<any> {
    try {
      const stats = await Promise.all([
        this.queueManager.getQueueStats('generation'),
        this.queueManager.getQueueStats('validation'),
        this.queueManager.getQueueStats('learning')
      ]);

      return {
        status: stats.every(s => s.length < 100) ? 'healthy' : 'degraded',
        generation: stats[0],
        validation: stats[1],
        learning: stats[2]
      };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  private calculateOverallHealth(healthChecks: any[]): any {
    const healthyCount = healthChecks.filter(h => h.status === 'healthy').length;
    const total = healthChecks.length;
    
    if (healthyCount === total) return { status: 'healthy' };
    if (healthyCount >= total * 0.7) return { status: 'degraded' };
    return { status: 'unhealthy' };
  }

  private calculateConcordanceRate(): number {
    // Would calculate from actual metrics
    return 0.85;
  }

  private calculateAvgProcessingTime(): number {
    // Would calculate from actual metrics
    return 2500;
  }

  private calculateErrorRate(): number {
    // Would calculate from actual metrics
    return 0.02;
  }
}

// Supporting interfaces
interface DualAIServiceConfig {
  enableCaching: boolean;
  cacheTtl: number;
  generator: any;
  validator: any;
  disagreementHandler: any;
  learning: any;
  cache: any;
  queue: any;
}

interface DualAIWorkflowResult {
  requestId: string;
  status: 'approved' | 'rejected' | 'modified' | 'escalated';
  content: any;
  confidence: number;
  generation: {
    model: any;
    processingTime: number;
    tokenUsage: any;
    metadata: any;
  };
  validation: {
    status: string;
    scores: any;
    issues: any[];
    suggestions: string[];
    processingTime: number;
  };
  disagreement: {
    id: string;
    type: any;
    severity: string;
    status: string;
    resolution: any;
  } | null;
  metadata: {
    traceId?: string;
    processedAt: Date;
    workflow: string;
  };
}

interface SystemHealthResult {
  healthy: boolean;
  components: any;
  metrics: {
    concordanceRate: number;
    avgProcessingTime: number;
    errorRate: number;
    lastUpdated: Date;
  };
  error?: string;
}

export { DualAIService, DualAIServiceConfig, DualAIWorkflowResult, SystemHealthResult };