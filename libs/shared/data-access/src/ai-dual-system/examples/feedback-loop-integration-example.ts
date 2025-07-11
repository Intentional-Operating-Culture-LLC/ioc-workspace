/**
 * Feedback Loop Integration Example
 * Complete example showing how to integrate and use the feedback loop system
 */

import { FeedbackLoopService } from '../core/feedback-loop-service';
import { FeedbackLoopQualityController } from '../core/feedback-loop-quality-controller';
import { FeedbackLoopOptimizer } from '../infrastructure/feedback-loop-optimizer';
import { FeedbackLoopAPI } from '../api/feedback-loop-api';
import { DualAIConfig } from '../config/dual-ai-config';
import {
  FeedbackLoopRequest,
  FeedbackLoopResult,
  FeedbackLoopConfiguration
} from '../core/feedback-loop-interfaces';

/**
 * Complete Feedback Loop System Integration
 */
export class FeedbackLoopSystemIntegration {
  private feedbackLoopService: FeedbackLoopService;
  private qualityController: FeedbackLoopQualityController;
  private optimizer: FeedbackLoopOptimizer;
  private api: FeedbackLoopAPI;

  constructor() {
    // Initialize components with production-ready configuration
    this.initializeComponents();
    this.setupEventHandlers();
  }

  private initializeComponents(): void {
    // 1. Initialize Quality Controller with enterprise settings
    this.qualityController = new FeedbackLoopQualityController({
      limits: {
        maxIterations: 12,
        maxProcessingTime: 300000, // 5 minutes
        maxConcurrentLoops: 25,
        maxFeedbackMessages: 8
      },
      thresholds: {
        minConfidenceImprovement: 0.02,
        oscillationDetectionWindow: 5,
        stalenessThreshold: 0.01,
        degradationThreshold: 0.1
      },
      escalation: {
        enableHumanEscalation: true,
        escalationThresholds: {
          criticalIssues: 1,
          ethicalConcerns: 1,
          qualityDegradation: 3,
          timeoutOccurrences: 3
        },
        escalationChannels: ['email', 'slack', 'webhook']
      },
      safety: {
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 5,
        circuitBreakerTimeout: 300000,
        enableGracefulDegradation: true
      },
      audit: {
        enableAuditTrail: true,
        auditDetailLevel: 'detailed',
        retentionPeriod: 2592000000 // 30 days
      }
    });

    // 2. Initialize Performance Optimizer
    this.optimizer = new FeedbackLoopOptimizer({
      caching: {
        enableGenerationCache: true,
        enableValidationCache: true,
        enableFeedbackCache: true,
        maxCacheSize: 5000,
        defaultTtl: 3600000, // 1 hour
        compressionEnabled: true
      },
      batching: {
        enableBatching: true,
        maxBatchSize: 15,
        batchTimeout: 5000,
        minBatchSize: 3
      },
      parallelProcessing: {
        enableParallelValidation: true,
        enableParallelRevision: true,
        maxConcurrency: 8,
        queuePrioritization: true
      },
      smartRetry: {
        enableAdaptiveRetry: true,
        maxRetries: 3,
        backoffMultiplier: 2,
        jitterEnabled: true
      },
      costOptimization: {
        enableTokenOptimization: true,
        enableModelSelection: true,
        priorityBasedRouting: true,
        costThresholds: {
          low: 0.01,
          medium: 0.05,
          high: 0.10
        }
      }
    });

    // 3. Initialize Feedback Loop Service
    const feedbackLoopConfig: Partial<FeedbackLoopConfiguration> = {
      execution: {
        defaultTimeoutMs: 300000,
        maxConcurrentLoops: 25,
        enableCaching: true,
        cacheTimeout: 3600000
      },
      convergence: {
        minImprovementRate: 0.02,
        confidenceStabilityThreshold: 0.01,
        maxIterationsWithoutImprovement: 3
      },
      oscillation: {
        minIterationsToDetect: 4,
        windowSize: 6,
        patternRepetitionThreshold: 0.8
      },
      feedback: {
        maxFeedbackMessagesPerIteration: 8,
        priorityWeights: {
          critical: 1,
          high: 2,
          medium: 3,
          low: 4
        }
      },
      performance: {
        enableIncrementalValidation: true,
        batchSize: 10,
        parallelProcessing: true,
        maxParallelOperations: 8
      }
    };

    this.feedbackLoopService = new FeedbackLoopService(feedbackLoopConfig);

    // 4. Initialize API with security and monitoring
    this.api = new FeedbackLoopAPI(
      this.feedbackLoopService,
      this.qualityController,
      this.optimizer,
      {
        authentication: {
          enableApiKeyAuth: true,
          enableJWTAuth: true,
          requiredScopes: ['loops:read']
        },
        rateLimit: {
          windowMs: 60000,
          maxRequests: 200,
          skipSuccessfulRequests: false
        },
        webhooks: {
          enableWebhooks: true,
          maxRetries: 3,
          retryDelay: 5000,
          timeout: 30000,
          verifySignatures: true,
          signingSecret: process.env.WEBHOOK_SIGNING_SECRET || 'production-secret'
        },
        monitoring: {
          enableMetrics: true,
          enableHealthChecks: true,
          healthCheckInterval: 30000
        }
      }
    );
  }

  private setupEventHandlers(): void {
    // Quality control event handlers
    this.qualityController.on('criticalViolation', (data) => {
      console.error('Critical quality violation detected:', data);
      this.handleCriticalViolation(data);
    });

    this.qualityController.on('circuitBreakerOpened', (data) => {
      console.warn('Circuit breaker opened:', data);
      this.handleCircuitBreakerOpen(data);
    });

    this.qualityController.on('humanEscalation', (data) => {
      console.warn('Human escalation required:', data);
      this.handleHumanEscalation(data);
    });

    // Feedback loop service event handlers
    this.feedbackLoopService.on('loopCompleted', (result) => {
      console.log('Feedback loop completed:', result.loopId);
      this.handleLoopCompletion(result);
    });

    this.feedbackLoopService.on('iterationCompleted', (data) => {
      console.log('Iteration completed:', data);
      this.handleIterationCompletion(data);
    });

    this.feedbackLoopService.on('error', (error) => {
      console.error('Feedback loop service error:', error);
      this.handleServiceError(error);
    });
  }

  /**
   * Example: Execute Assessment Feedback Loop
   */
  async executeAssessmentFeedbackLoop(
    responseId: string,
    userId: string,
    assessmentType: 'individual' | 'executive' | 'organizational' = 'individual'
  ): Promise<FeedbackLoopResult> {
    
    const request: FeedbackLoopRequest = {
      requestId: `assessment_${responseId}_${Date.now()}`,
      userId,
      contentType: 'assessment',
      confidenceThreshold: 0.85,
      maxIterations: 10,
      timeoutMs: 240000, // 4 minutes
      priority: 'medium',
      context: {
        industry: 'technology',
        role: 'software-engineer',
        culturalContext: 'western',
        targetAudience: 'professional-development',
        assessmentType,
        responseId
      },
      options: {
        enableIncrementalValidation: true,
        enableOscillationDetection: true,
        enableCaching: true,
        parallelProcessing: true,
        customThresholds: {
          ethics: 0.9,
          bias: 0.85,
          accuracy: 0.8
        }
      }
    };

    try {
      console.log('Starting assessment feedback loop:', request.requestId);
      
      // Execute the feedback loop
      const result = await this.feedbackLoopService.executeFeedbackLoop(request);
      
      console.log('Assessment feedback loop completed:', {
        loopId: result.loopId,
        status: result.status,
        iterations: result.iterationCount,
        finalConfidence: result.qualityMetrics.finalConfidence,
        processingTime: result.processingTime
      });

      return result;

    } catch (error) {
      console.error('Assessment feedback loop failed:', error);
      throw error;
    }
  }

  /**
   * Example: Execute Report Generation Feedback Loop
   */
  async executeReportFeedbackLoop(
    assessmentResults: any,
    userId: string,
    reportType: 'standard' | 'executive' | 'coaching' = 'standard'
  ): Promise<FeedbackLoopResult> {
    
    const request: FeedbackLoopRequest = {
      requestId: `report_${assessmentResults.id}_${Date.now()}`,
      userId,
      contentType: 'report',
      confidenceThreshold: 0.88,
      maxIterations: 8,
      timeoutMs: 180000, // 3 minutes
      priority: reportType === 'executive' ? 'high' : 'medium',
      context: {
        targetAudience: reportType,
        previousAssessment: assessmentResults,
        reportStyle: reportType,
        includeActionPlan: true
      },
      options: {
        enableIncrementalValidation: true,
        enableOscillationDetection: true,
        enableCaching: true,
        parallelProcessing: true
      }
    };

    try {
      console.log('Starting report feedback loop:', request.requestId);
      
      const result = await this.feedbackLoopService.executeFeedbackLoop(request);
      
      console.log('Report feedback loop completed:', {
        loopId: result.loopId,
        status: result.status,
        finalConfidence: result.qualityMetrics.finalConfidence
      });

      return result;

    } catch (error) {
      console.error('Report feedback loop failed:', error);
      throw error;
    }
  }

  /**
   * Example: Batch Process Multiple Feedback Loops
   */
  async batchProcessAssessments(
    assessmentRequests: Array<{
      responseId: string;
      userId: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
    }>
  ): Promise<FeedbackLoopResult[]> {
    
    console.log(`Starting batch processing of ${assessmentRequests.length} assessments`);
    
    // Process in parallel with concurrency limit
    const concurrencyLimit = 5;
    const results: FeedbackLoopResult[] = [];
    
    for (let i = 0; i < assessmentRequests.length; i += concurrencyLimit) {
      const batch = assessmentRequests.slice(i, i + concurrencyLimit);
      
      const batchPromises = batch.map(async (req) => {
        try {
          return await this.executeAssessmentFeedbackLoop(
            req.responseId,
            req.userId,
            'individual'
          );
        } catch (error) {
          console.error(`Failed to process assessment ${req.responseId}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null) as FeedbackLoopResult[]);
    }
    
    console.log(`Batch processing completed: ${results.length}/${assessmentRequests.length} successful`);
    return results;
  }

  /**
   * Health monitoring and system status
   */
  async getSystemStatus(): Promise<{
    healthy: boolean;
    details: any;
    recommendations: string[];
  }> {
    try {
      const [
        serviceMetrics,
        qualityMetrics,
        optimizationMetrics,
        circuitBreakerStatus
      ] = await Promise.all([
        this.feedbackLoopService.getSystemMetrics(),
        this.qualityController.getMetrics(),
        this.optimizer.getMetrics(),
        this.qualityController.getCircuitBreakerStatus()
      ]);

      const healthy = !circuitBreakerStatus.isOpen && 
                     qualityMetrics.errorRate < 0.1 &&
                     optimizationMetrics.avgResponseTime < 5000;

      const recommendations: string[] = [];
      
      if (circuitBreakerStatus.isOpen) {
        recommendations.push('Circuit breaker is open - investigate system failures');
      }
      
      if (qualityMetrics.errorRate > 0.05) {
        recommendations.push('High error rate detected - review quality thresholds');
      }
      
      if (optimizationMetrics.avgResponseTime > 3000) {
        recommendations.push('High response times - consider performance optimization');
      }
      
      if (serviceMetrics.activeLoops > 20) {
        recommendations.push('High number of active loops - monitor system capacity');
      }

      return {
        healthy,
        details: {
          service: serviceMetrics,
          quality: qualityMetrics,
          optimization: optimizationMetrics,
          circuitBreaker: circuitBreakerStatus
        },
        recommendations
      };

    } catch (error) {
      return {
        healthy: false,
        details: { error: error.message },
        recommendations: ['System health check failed - investigate immediately']
      };
    }
  }

  /**
   * Event handlers for system management
   */
  private async handleCriticalViolation(data: any): Promise<void> {
    // Send immediate alert to operations team
    console.error('CRITICAL: Quality violation requires immediate attention', data);
    
    // Could integrate with alerting systems like PagerDuty, Slack, etc.
    // await this.sendAlert('critical', 'Quality violation detected', data);
  }

  private async handleCircuitBreakerOpen(data: any): Promise<void> {
    // Activate graceful degradation mode
    console.warn('Circuit breaker opened - entering degradation mode', data);
    
    // Could implement fallback mechanisms
    // await this.activateGracefulDegradation();
  }

  private async handleHumanEscalation(data: any): Promise<void> {
    // Create ticket in support system
    console.warn('Human review required for feedback loop', data);
    
    // Could integrate with ticketing systems
    // await this.createSupportTicket(data);
  }

  private handleLoopCompletion(result: FeedbackLoopResult): void {
    // Record analytics and metrics
    console.log('Recording loop completion metrics', {
      loopId: result.loopId,
      converged: result.converged,
      iterations: result.iterationCount,
      confidence: result.qualityMetrics.finalConfidence
    });
    
    // Could send to analytics platform
    // this.analytics.track('feedback_loop_completed', result);
  }

  private handleIterationCompletion(data: any): void {
    // Log iteration progress for monitoring
    console.log('Iteration progress update', data);
  }

  private handleServiceError(error: any): void {
    // Log and potentially restart service components
    console.error('Service error detected', error);
    
    // Could implement auto-recovery mechanisms
    // await this.attemptServiceRecovery(error);
  }

  /**
   * Public API access
   */
  public getAPIRouter() {
    return this.api.getRouter();
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down feedback loop system...');
    
    // Cancel active loops
    const activeLoops = this.feedbackLoopService.getActiveLoops();
    for (const loopId of activeLoops) {
      await this.feedbackLoopService.cancelLoop(loopId);
    }
    
    // Clear caches
    this.optimizer.clearCache();
    
    console.log('Feedback loop system shutdown complete');
  }
}

/**
 * Usage Example
 */
export async function demonstrateUsage() {
  // Initialize the complete system
  const feedbackLoopSystem = new FeedbackLoopSystemIntegration();
  
  try {
    // Example 1: Single assessment
    const assessmentResult = await feedbackLoopSystem.executeAssessmentFeedbackLoop(
      'assessment_12345',
      'user_67890',
      'individual'
    );
    
    console.log('Assessment completed:', assessmentResult);
    
    // Example 2: Generate report from assessment
    const reportResult = await feedbackLoopSystem.executeReportFeedbackLoop(
      assessmentResult.finalGeneration.content,
      'user_67890',
      'executive'
    );
    
    console.log('Report generated:', reportResult);
    
    // Example 3: Check system health
    const systemStatus = await feedbackLoopSystem.getSystemStatus();
    console.log('System status:', systemStatus);
    
    // Example 4: Batch processing
    const batchRequests = [
      { responseId: 'resp_1', userId: 'user_1', priority: 'medium' as const },
      { responseId: 'resp_2', userId: 'user_2', priority: 'high' as const },
      { responseId: 'resp_3', userId: 'user_3', priority: 'low' as const }
    ];
    
    const batchResults = await feedbackLoopSystem.batchProcessAssessments(batchRequests);
    console.log('Batch processing results:', batchResults.length);
    
  } catch (error) {
    console.error('Demonstration failed:', error);
  } finally {
    // Cleanup
    await feedbackLoopSystem.shutdown();
  }
}

// Express.js integration example
export function integrateWithExpress(app: any) {
  const feedbackLoopSystem = new FeedbackLoopSystemIntegration();
  
  // Mount the API routes
  app.use('/api/feedback-loops', feedbackLoopSystem.getAPIRouter());
  
  // Health check endpoint
  app.get('/health/feedback-loops', async (req: any, res: any) => {
    try {
      const status = await feedbackLoopSystem.getSystemStatus();
      res.status(status.healthy ? 200 : 503).json(status);
    } catch (error) {
      res.status(503).json({ healthy: false, error: error.message });
    }
  });
  
  // Graceful shutdown handler
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully');
    await feedbackLoopSystem.shutdown();
    process.exit(0);
  });
  
  return feedbackLoopSystem;
}

export default FeedbackLoopSystemIntegration;