/**
 * Feedback Loop API Endpoints
 * RESTful API for external monitoring, control, and webhook management
 */

import { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';
import { FeedbackLoopService } from '../core/feedback-loop-service';
import { FeedbackLoopQualityController } from '../core/feedback-loop-quality-controller';
// import { FeedbackLoopOptimizer } from '../infrastructure/feedback-loop-optimizer';
import {
  FeedbackLoopRequest,
  FeedbackLoopResult,
  FeedbackLoopEvent,
  FeedbackLoopWebhookPayload,
  FeedbackLoopHealthStatus
} from '../core/feedback-loop-interfaces';

export interface FeedbackLoopAPIConfiguration {
  authentication: {
    enableApiKeyAuth: boolean;
    enableJWTAuth: boolean;
    requiredScopes: string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  webhooks: {
    enableWebhooks: boolean;
    maxRetries: number;
    retryDelay: number;
    timeout: number;
    verifySignatures: boolean;
    signingSecret: string;
  };
  monitoring: {
    enableMetrics: boolean;
    enableHealthChecks: boolean;
    healthCheckInterval: number;
  };
}

export class FeedbackLoopAPI {
  private router: Router;
  private feedbackLoopService: FeedbackLoopService;
  private qualityController: FeedbackLoopQualityController;
  // private optimizer: FeedbackLoopOptimizer;
  private config: FeedbackLoopAPIConfiguration;
  private webhookSubscriptions: Map<string, WebhookSubscription> = new Map();

  constructor(
    feedbackLoopService: FeedbackLoopService,
    qualityController: FeedbackLoopQualityController,
    // optimizer: FeedbackLoopOptimizer,
    config?: Partial<FeedbackLoopAPIConfiguration>
  ) {
    this.feedbackLoopService = feedbackLoopService;
    this.qualityController = qualityController;
    // this.optimizer = optimizer;
    this.config = {
      ...this.getDefaultConfiguration(),
      ...config
    };
    this.router = Router();
    this.setupRoutes();
    this.setupWebhookHandlers();
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // ====================================================================
    // FEEDBACK LOOP EXECUTION ENDPOINTS
    // ====================================================================

    /**
     * POST /api/feedback-loops
     * Execute a new feedback loop
     */
    this.router.post(
      '/',
      this.authenticate,
      this.validateFeedbackLoopRequest(),
      this.handleValidationErrors,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const request: FeedbackLoopRequest = req.body;
          
          logger.info('Feedback loop API request received', {
            requestId: request.requestId,
            userId: req.user?.id,
            contentType: request.contentType
          });

          // Pre-execution quality gate
          const qualityResult = await this.qualityController.validateLoopRequest(request);
          if (!qualityResult.approved) {
            return res.status(400).json({
              error: 'Quality validation failed',
              reason: qualityResult.reason,
              violations: qualityResult.violations,
              recommendations: qualityResult.recommendations
            });
          }

          // Execute feedback loop
          const result = await this.feedbackLoopService.executeFeedbackLoop(request);
          
          // Send webhook notifications
          if (this.config.webhooks.enableWebhooks) {
            await this.sendWebhookNotification('loop_completed', result);
          }

          // Record metrics
          this.recordAPIMetrics('execute_loop', req, res, result);

          res.status(200).json({
            success: true,
            data: result,
            metadata: {
              apiVersion: '1.0.0',
              timestamp: new Date().toISOString(),
              processingTime: result.processingTime
            }
          });

        } catch (error) {
          next(error);
        }
      }
    );

    /**
     * GET /api/feedback-loops/:loopId
     * Get feedback loop status and results
     */
    this.router.get(
      '/:loopId',
      this.authenticate,
      param('loopId').isUUID().withMessage('Invalid loop ID format'),
      this.handleValidationErrors,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { loopId } = req.params;
          
          const loopState = this.feedbackLoopService.getLoopState(loopId);
          if (!loopState) {
            return res.status(404).json({
              error: 'Feedback loop not found',
              loopId
            });
          }

          // Check authorization
          if (!this.canAccessLoop(req.user, loopState)) {
            return res.status(403).json({
              error: 'Access denied'
            });
          }

          const qualityMetrics = this.qualityController.getMetrics();
          // const optimizationMetrics = this.optimizer.getMetrics();

          res.status(200).json({
            success: true,
            data: {
              loopState,
              qualityMetrics,
              optimizationMetrics
            }
          });

        } catch (error) {
          next(error);
        }
      }
    );

    /**
     * DELETE /api/feedback-loops/:loopId
     * Cancel an active feedback loop
     */
    this.router.delete(
      '/:loopId',
      this.authenticate,
      param('loopId').isUUID().withMessage('Invalid loop ID format'),
      this.handleValidationErrors,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { loopId } = req.params;
          
          const cancelled = await this.feedbackLoopService.cancelLoop(loopId);
          if (!cancelled) {
            return res.status(404).json({
              error: 'Feedback loop not found or already completed',
              loopId
            });
          }

          // Send webhook notification
          if (this.config.webhooks.enableWebhooks) {
            await this.sendWebhookNotification('loop_cancelled', { loopId });
          }

          res.status(200).json({
            success: true,
            message: 'Feedback loop cancelled successfully',
            loopId
          });

        } catch (error) {
          next(error);
        }
      }
    );

    // ====================================================================
    // MONITORING AND METRICS ENDPOINTS
    // ====================================================================

    /**
     * GET /api/feedback-loops/health
     * System health check
     */
    this.router.get(
      '/health',
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const healthStatus = await this.getSystemHealth();
          
          const statusCode = healthStatus.status === 'healthy' ? 200 : 
                           healthStatus.status === 'degraded' ? 206 : 503;

          res.status(statusCode).json({
            status: healthStatus.status,
            timestamp: new Date().toISOString(),
            data: healthStatus
          });

        } catch (error) {
          res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    );

    /**
     * GET /api/feedback-loops/metrics
     * System metrics and statistics
     */
    this.router.get(
      '/metrics',
      this.authenticate,
      this.requireScope('metrics:read'),
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const serviceMetrics = this.feedbackLoopService.getSystemMetrics();
          const qualityMetrics = this.qualityController.getMetrics();
          // const optimizationMetrics = this.optimizer.getMetrics();

          res.status(200).json({
            success: true,
            data: {
              service: serviceMetrics,
              quality: qualityMetrics,
              optimization: optimizationMetrics,
              timestamp: new Date().toISOString()
            }
          });

        } catch (error) {
          next(error);
        }
      }
    );

    /**
     * GET /api/feedback-loops/active
     * List active feedback loops
     */
    this.router.get(
      '/active',
      this.authenticate,
      this.requireScope('loops:read'),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
      query('offset').optional().isInt({ min: 0 }).toInt(),
      this.handleValidationErrors,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const limit = parseInt(req.query.limit as string) || 50;
          const offset = parseInt(req.query.offset as string) || 0;

          const activeLoops = this.feedbackLoopService.getActiveLoops();
          const paginatedLoops = activeLoops.slice(offset, offset + limit);
          
          const loopDetails = await Promise.all(
            paginatedLoops.map(async (loopId) => {
              const state = this.feedbackLoopService.getLoopState(loopId);
              return { loopId, state };
            })
          );

          res.status(200).json({
            success: true,
            data: {
              loops: loopDetails,
              pagination: {
                total: activeLoops.length,
                limit,
                offset,
                hasMore: activeLoops.length > offset + limit
              }
            }
          });

        } catch (error) {
          next(error);
        }
      }
    );

    // ====================================================================
    // WEBHOOK MANAGEMENT ENDPOINTS
    // ====================================================================

    /**
     * POST /api/feedback-loops/webhooks
     * Register a webhook subscription
     */
    this.router.post(
      '/webhooks',
      this.authenticate,
      this.requireScope('webhooks:manage'),
      this.validateWebhookSubscription(),
      this.handleValidationErrors,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const subscription: WebhookSubscription = {
            id: this.generateSubscriptionId(),
            url: req.body.url,
            events: req.body.events,
            secret: req.body.secret,
            active: true,
            createdAt: new Date(),
            userId: req.user?.id
          };

          this.webhookSubscriptions.set(subscription.id, subscription);

          res.status(201).json({
            success: true,
            data: {
              id: subscription.id,
              url: subscription.url,
              events: subscription.events,
              active: subscription.active,
              createdAt: subscription.createdAt
            }
          });

        } catch (error) {
          next(error);
        }
      }
    );

    /**
     * GET /api/feedback-loops/webhooks
     * List webhook subscriptions
     */
    this.router.get(
      '/webhooks',
      this.authenticate,
      this.requireScope('webhooks:read'),
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const userSubscriptions = Array.from(this.webhookSubscriptions.values())
            .filter(sub => sub.userId === req.user?.id)
            .map(sub => ({
              id: sub.id,
              url: sub.url,
              events: sub.events,
              active: sub.active,
              createdAt: sub.createdAt
            }));

          res.status(200).json({
            success: true,
            data: { subscriptions: userSubscriptions }
          });

        } catch (error) {
          next(error);
        }
      }
    );

    /**
     * DELETE /api/feedback-loops/webhooks/:subscriptionId
     * Delete a webhook subscription
     */
    this.router.delete(
      '/webhooks/:subscriptionId',
      this.authenticate,
      this.requireScope('webhooks:manage'),
      param('subscriptionId').isUUID().withMessage('Invalid subscription ID'),
      this.handleValidationErrors,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { subscriptionId } = req.params;
          const subscription = this.webhookSubscriptions.get(subscriptionId);

          if (!subscription || subscription.userId !== req.user?.id) {
            return res.status(404).json({
              error: 'Webhook subscription not found'
            });
          }

          this.webhookSubscriptions.delete(subscriptionId);

          res.status(200).json({
            success: true,
            message: 'Webhook subscription deleted successfully'
          });

        } catch (error) {
          next(error);
        }
      }
    );

    // ====================================================================
    // CONTROL AND ADMINISTRATION ENDPOINTS
    // ====================================================================

    /**
     * POST /api/feedback-loops/control/circuit-breaker/reset
     * Reset the circuit breaker (admin only)
     */
    this.router.post(
      '/control/circuit-breaker/reset',
      this.authenticate,
      this.requireScope('admin:control'),
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          this.qualityController.resetCircuitBreaker();

          res.status(200).json({
            success: true,
            message: 'Circuit breaker reset successfully'
          });

        } catch (error) {
          next(error);
        }
      }
    );

    /**
     * POST /api/feedback-loops/control/cache/clear
     * Clear optimization cache (admin only)
     */
    this.router.post(
      '/control/cache/clear',
      this.authenticate,
      this.requireScope('admin:control'),
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          // this.optimizer.clearCache();

          res.status(200).json({
            success: true,
            message: 'Cache cleared successfully'
          });

        } catch (error) {
          next(error);
        }
      }
    );
  }

  /**
   * Validation middleware
   */
  private validateFeedbackLoopRequest() {
    return [
      body('requestId').isString().isLength({ min: 1, max: 255 }),
      body('contentType').isIn(['assessment', 'report', 'coaching', 'insight', 'recommendation']),
      body('confidenceThreshold').isFloat({ min: 0, max: 1 }),
      body('maxIterations').isInt({ min: 1, max: 50 }),
      body('priority').isIn(['low', 'medium', 'high', 'urgent']),
      body('context').isObject(),
      body('options').optional().isObject()
    ];
  }

  private validateWebhookSubscription() {
    return [
      body('url').isURL().withMessage('Valid URL required'),
      body('events').isArray().withMessage('Events array required'),
      body('events.*').isIn([
        'loop_started', 'iteration_completed', 'loop_completed', 
        'loop_cancelled', 'convergence_achieved', 'oscillation_detected', 
        'timeout_occurred', 'error_occurred'
      ]),
      body('secret').optional().isString().isLength({ min: 16, max: 256 })
    ];
  }

  private handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  };

  /**
   * Authentication and authorization middleware
   */
  private authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Implementation would verify JWT or API key
      // For now, we'll simulate authentication
      req.user = { id: 'user-123', scopes: ['loops:read', 'loops:write', 'metrics:read'] };
      next();
    } catch (error) {
      res.status(401).json({ error: 'Authentication required' });
    }
  };

  private requireScope = (scope: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user?.scopes?.includes(scope)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          requiredScope: scope
        });
      }
      next();
    };
  };

  /**
   * Webhook management
   */
  private setupWebhookHandlers(): void {
    // Listen to feedback loop service events
    this.feedbackLoopService.on('loopCompleted', (result: FeedbackLoopResult) => {
      this.sendWebhookNotification('loop_completed', result);
    });

    this.feedbackLoopService.on('iterationCompleted', (data: any) => {
      this.sendWebhookNotification('iteration_completed', data);
    });

    this.qualityController.on('criticalViolation', (data: any) => {
      this.sendWebhookNotification('error_occurred', data);
    });

    this.qualityController.on('circuitBreakerOpened', (data: any) => {
      this.sendWebhookNotification('error_occurred', {
        type: 'circuit_breaker_opened',
        details: data
      });
    });
  }

  private async sendWebhookNotification(eventType: string, data: any): Promise<void> {
    if (!this.config.webhooks.enableWebhooks) return;

    const event: FeedbackLoopEvent = {
      type: eventType as any,
      loopId: data.loopId || data.id || 'unknown',
      requestId: data.requestId || 'unknown',
      timestamp: new Date(),
      data,
      metadata: {
        version: '1.0.0',
        source: 'feedback-loop-api'
      }
    };

    const relevantSubscriptions = Array.from(this.webhookSubscriptions.values())
      .filter(sub => sub.active && sub.events.includes(eventType));

    const webhookPromises = relevantSubscriptions.map(subscription => 
      this.deliverWebhook(subscription, event)
    );

    await Promise.allSettled(webhookPromises);
  }

  private async deliverWebhook(
    subscription: WebhookSubscription, 
    event: FeedbackLoopEvent
  ): Promise<void> {
    try {
      const payload: FeedbackLoopWebhookPayload = {
        event,
        loop: {
          loopId: event.loopId,
          requestId: event.requestId,
          status: event.data.status || 'unknown',
          currentIteration: event.data.currentIteration || 0,
          confidence: event.data.confidence || 0
        },
        metadata: {
          timestamp: new Date(),
          version: '1.0.0',
          signature: this.generateWebhookSignature(subscription, event)
        }
      };

      const response = await fetch(subscription.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': payload.metadata.signature,
          'User-Agent': 'IOC-FeedbackLoop-Webhook/1.0'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.config.webhooks.timeout)
      });

      if (!response.ok) {
        throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
      }

      logger.debug('Webhook delivered successfully', {
        subscriptionId: subscription.id,
        url: subscription.url,
        eventType: event.type,
        status: response.status
      });

    } catch (error) {
      logger.error('Webhook delivery failed', {
        subscriptionId: subscription.id,
        url: subscription.url,
        eventType: event.type,
        error: error.message
      });

      // Implement retry logic here if needed
      metrics.increment('webhook_delivery_failed', {
        subscriptionId: subscription.id,
        eventType: event.type
      });
    }
  }

  /**
   * Utility methods
   */
  private async getSystemHealth(): Promise<FeedbackLoopHealthStatus> {
    const activeLoops = this.feedbackLoopService.getActiveLoops().length;
    const qualityMetrics = this.qualityController.getMetrics();
    // const optimizationMetrics = this.optimizer.getMetrics();
    const circuitBreakerStatus = this.qualityController.getCircuitBreakerStatus();

    const errorRate = qualityMetrics.qualityViolations / Math.max(qualityMetrics.totalLoopsMonitored, 1);
    const avgResponseTime = 0; // optimizationMetrics.avgResponseTime;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (circuitBreakerStatus.isOpen) {
      status = 'unhealthy';
      issues.push('Circuit breaker is open');
      recommendations.push('Investigate system failures and reset circuit breaker');
    }

    if (errorRate > 0.1) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
      recommendations.push('Review quality control settings');
    }

    if (avgResponseTime > 5000) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push(`High average response time: ${avgResponseTime}ms`);
      recommendations.push('Optimize processing pipeline');
    }

    if (activeLoops > 100) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push(`High number of active loops: ${activeLoops}`);
      recommendations.push('Monitor system capacity');
    }

    return {
      status,
      activeLoops,
      queueDepth: 0, // Would be calculated from actual queue
      avgResponseTime,
      errorRate,
      convergenceRate: qualityMetrics.averageQualityScore,
      lastUpdated: new Date(),
      issues,
      recommendations
    };
  }

  private recordAPIMetrics(
    operation: string, 
    req: Request, 
    res: Response, 
    result?: any
  ): void {
    metrics.record(`feedback_loop_api_${operation}`, 1, {
      method: req.method,
      status: res.statusCode,
      userId: req.user?.id,
      processingTime: result?.processingTime || 0
    });
  }

  private canAccessLoop(user: any, loopState: any): boolean {
    // Implementation would check if user has access to this loop
    return true; // Simplified for demo
  }

  private generateSubscriptionId(): string {
    return `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWebhookSignature(subscription: WebhookSubscription, event: FeedbackLoopEvent): string {
    // Implementation would generate HMAC signature using subscription secret
    return 'sha256=placeholder_signature';
  }

  private getDefaultConfiguration(): FeedbackLoopAPIConfiguration {
    return {
      authentication: {
        enableApiKeyAuth: true,
        enableJWTAuth: true,
        requiredScopes: ['loops:read']
      },
      rateLimit: {
        windowMs: 60000, // 1 minute
        maxRequests: 100,
        skipSuccessfulRequests: false
      },
      webhooks: {
        enableWebhooks: true,
        maxRetries: 3,
        retryDelay: 5000,
        timeout: 30000,
        verifySignatures: true,
        signingSecret: process.env.WEBHOOK_SIGNING_SECRET || 'default-secret'
      },
      monitoring: {
        enableMetrics: true,
        enableHealthChecks: true,
        healthCheckInterval: 30000
      }
    };
  }

  /**
   * Public methods
   */
  public getRouter(): Router {
    return this.router;
  }

  public updateConfiguration(config: Partial<FeedbackLoopAPIConfiguration>): void {
    this.config = { ...this.config, ...config };
    logger.info('Feedback loop API configuration updated');
  }

  public getActiveWebhooks(): number {
    return Array.from(this.webhookSubscriptions.values())
      .filter(sub => sub.active).length;
  }

  public async testWebhook(subscriptionId: string): Promise<boolean> {
    const subscription = this.webhookSubscriptions.get(subscriptionId);
    if (!subscription) return false;

    const testEvent: FeedbackLoopEvent = {
      type: 'loop_started',
      loopId: 'test-loop',
      requestId: 'test-request',
      timestamp: new Date(),
      data: { test: true },
      metadata: {
        version: '1.0.0',
        source: 'test'
      }
    };

    try {
      await this.deliverWebhook(subscription, testEvent);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Supporting interfaces
interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  createdAt: Date;
  userId?: string;
}

// Extend Request interface for TypeScript
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        scopes?: string[];
      };
    }
  }
}

export default FeedbackLoopAPI;