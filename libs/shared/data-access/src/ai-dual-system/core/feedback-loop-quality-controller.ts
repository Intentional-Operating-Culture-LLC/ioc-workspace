/**
 * Feedback Loop Quality Controller
 * Prevents infinite loops, ensures quality thresholds, and manages escalation
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';
import {
  FeedbackLoopRequest,
  FeedbackLoopResult,
  FeedbackLoopState,
  FeedbackLoopIteration,
  ValidationResponse,
  GenerationResponse,
  FeedbackMessage,
  FeedbackLoopError
} from './feedback-loop-interfaces';

export interface QualityControlConfiguration {
  limits: {
    maxIterations: number;
    maxProcessingTime: number;
    maxConcurrentLoops: number;
    maxFeedbackMessages: number;
  };
  thresholds: {
    minConfidenceImprovement: number;
    oscillationDetectionWindow: number;
    stalenessThreshold: number;
    degradationThreshold: number;
  };
  escalation: {
    enableHumanEscalation: boolean;
    escalationThresholds: {
      criticalIssues: number;
      ethicalConcerns: number;
      qualityDegradation: number;
      timeoutOccurrences: number;
    };
    escalationChannels: string[];
  };
  safety: {
    enableCircuitBreaker: boolean;
    circuitBreakerThreshold: number;
    circuitBreakerTimeout: number;
    enableGracefulDegradation: boolean;
  };
  audit: {
    enableAuditTrail: boolean;
    auditDetailLevel: 'minimal' | 'standard' | 'detailed';
    retentionPeriod: number;
  };
}

export interface QualityControlMetrics {
  totalLoopsMonitored: number;
  qualityViolations: number;
  escalations: number;
  circuitBreakerTrips: number;
  averageQualityScore: number;
  timeoutRate: number;
  oscillationRate: number;
  degradationEvents: number;
}

export interface QualityControlResult {
  approved: boolean;
  reason: string;
  qualityScore: number;
  violations: QualityViolation[];
  recommendations: string[];
  escalationRequired: boolean;
  auditTrail: QualityAuditEntry[];
}

export interface QualityViolation {
  type: 'iteration_limit' | 'time_limit' | 'quality_degradation' | 'oscillation' | 'stagnation' | 'ethical_concern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  loopId: string;
  iteration: number;
  metadata: any;
}

export interface QualityAuditEntry {
  timestamp: Date;
  loopId: string;
  action: string;
  details: any;
  qualityScore: number;
  userId?: string;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: Date;
  nextRetryTime: Date;
}

export class FeedbackLoopQualityController extends EventEmitter {
  private config: QualityControlConfiguration;
  private metrics: QualityControlMetrics;
  private circuitBreaker: CircuitBreakerState;
  private activeLoops: Map<string, QualityControlState> = new Map();
  private auditTrail: Map<string, QualityAuditEntry[]> = new Map();
  private violationHistory: QualityViolation[] = [];

  constructor(config?: Partial<QualityControlConfiguration>) {
    super();
    this.config = {
      ...this.getDefaultConfiguration(),
      ...config
    };
    this.metrics = this.initializeMetrics();
    this.circuitBreaker = this.initializeCircuitBreaker();
    this.setupPeriodicChecks();
  }

  /**
   * Pre-execution quality gate
   */
  async validateLoopRequest(request: FeedbackLoopRequest): Promise<QualityControlResult> {
    const startTime = Date.now();
    
    try {
      logger.debug('Validating feedback loop request', {
        requestId: request.requestId,
        maxIterations: request.maxIterations,
        confidenceThreshold: request.confidenceThreshold
      });

      const violations: QualityViolation[] = [];
      const recommendations: string[] = [];

      // Check circuit breaker
      if (this.circuitBreaker.isOpen) {
        return this.createRejectedResult(
          'Circuit breaker is open - system protection engaged',
          0,
          [{
            type: 'time_limit',
            severity: 'critical',
            description: 'System is in protective mode due to recent failures',
            detectedAt: new Date(),
            loopId: request.requestId,
            iteration: 0,
            metadata: { circuitBreakerState: this.circuitBreaker }
          }],
          recommendations
        );
      }

      // Check concurrency limits
      if (this.activeLoops.size >= this.config.limits.maxConcurrentLoops) {
        violations.push({
          type: 'iteration_limit',
          severity: 'high',
          description: `Maximum concurrent loops exceeded (${this.activeLoops.size}/${this.config.limits.maxConcurrentLoops})`,
          detectedAt: new Date(),
          loopId: request.requestId,
          iteration: 0,
          metadata: { activeLoops: this.activeLoops.size }
        });
      }

      // Validate request parameters
      const parameterViolations = this.validateRequestParameters(request);
      violations.push(...parameterViolations);

      // Check system health
      const healthViolations = await this.checkSystemHealth(request);
      violations.push(...healthViolations);

      // Generate recommendations
      if (request.maxIterations > 10) {
        recommendations.push('Consider reducing max iterations for better performance');
      }
      if (request.confidenceThreshold > 0.95) {
        recommendations.push('Very high confidence threshold may lead to excessive iterations');
      }

      const qualityScore = this.calculateInitialQualityScore(request, violations);
      const escalationRequired = this.shouldEscalate(violations, qualityScore);

      // Record audit entry
      if (this.config.audit.enableAuditTrail) {
        this.recordAuditEntry(request.requestId, 'request_validation', {
          violations: violations.length,
          qualityScore,
          escalationRequired
        }, qualityScore);
      }

      const result: QualityControlResult = {
        approved: violations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0,
        reason: violations.length > 0 ? 'Quality violations detected' : 'Request approved',
        qualityScore,
        violations,
        recommendations,
        escalationRequired,
        auditTrail: this.auditTrail.get(request.requestId) || []
      };

      // Initialize loop monitoring if approved
      if (result.approved) {
        this.initializeLoopMonitoring(request);
      }

      return result;

    } catch (error) {
      logger.error('Request validation failed', {
        requestId: request.requestId,
        error: error.message
      });
      
      return this.createRejectedResult(
        `Validation error: ${error.message}`,
        0,
        [],
        ['Review request parameters and try again']
      );
    }
  }

  /**
   * Runtime quality monitoring during iterations
   */
  async monitorIteration(
    loopId: string,
    iteration: FeedbackLoopIteration,
    state: FeedbackLoopState
  ): Promise<QualityControlResult> {
    
    try {
      const violations: QualityViolation[] = [];
      const recommendations: string[] = [];

      // Check iteration limits
      if (iteration.iteration > this.config.limits.maxIterations) {
        violations.push({
          type: 'iteration_limit',
          severity: 'critical',
          description: `Maximum iterations exceeded (${iteration.iteration}/${this.config.limits.maxIterations})`,
          detectedAt: new Date(),
          loopId,
          iteration: iteration.iteration,
          metadata: { maxIterations: this.config.limits.maxIterations }
        });
      }

      // Check processing time
      const totalTime = Date.now() - state.startTime.getTime();
      if (totalTime > this.config.limits.maxProcessingTime) {
        violations.push({
          type: 'time_limit',
          severity: 'high',
          description: `Processing time limit exceeded (${totalTime}ms/${this.config.limits.maxProcessingTime}ms)`,
          detectedAt: new Date(),
          loopId,
          iteration: iteration.iteration,
          metadata: { totalTime, maxTime: this.config.limits.maxProcessingTime }
        });
      }

      // Check for oscillation
      const oscillationViolation = await this.detectOscillation(loopId, iteration);
      if (oscillationViolation) {
        violations.push(oscillationViolation);
      }

      // Check for stagnation
      const stagnationViolation = await this.detectStagnation(loopId, iteration);
      if (stagnationViolation) {
        violations.push(stagnationViolation);
      }

      // Check quality degradation
      const degradationViolation = await this.detectQualityDegradation(loopId, iteration);
      if (degradationViolation) {
        violations.push(degradationViolation);
      }

      // Check ethical concerns
      const ethicalViolations = await this.checkEthicalConcerns(iteration);
      violations.push(...ethicalViolations);

      // Generate dynamic recommendations
      const dynamicRecommendations = this.generateDynamicRecommendations(iteration, violations);
      recommendations.push(...dynamicRecommendations);

      const qualityScore = this.calculateIterationQualityScore(iteration, violations);
      const escalationRequired = this.shouldEscalate(violations, qualityScore);

      // Update loop monitoring state
      this.updateLoopMonitoring(loopId, iteration, qualityScore, violations);

      // Record audit entry
      if (this.config.audit.enableAuditTrail) {
        this.recordAuditEntry(loopId, 'iteration_monitoring', {
          iteration: iteration.iteration,
          violations: violations.length,
          qualityScore
        }, qualityScore);
      }

      const result: QualityControlResult = {
        approved: violations.filter(v => v.severity === 'critical').length === 0,
        reason: violations.length > 0 ? 'Quality issues detected during iteration' : 'Iteration approved',
        qualityScore,
        violations,
        recommendations,
        escalationRequired,
        auditTrail: this.auditTrail.get(loopId) || []
      };

      // Handle violations
      if (violations.length > 0) {
        await this.handleViolations(loopId, violations);
      }

      return result;

    } catch (error) {
      logger.error('Iteration monitoring failed', {
        loopId,
        iteration: iteration.iteration,
        error: error.message
      });

      this.circuitBreaker.failureCount++;
      if (this.circuitBreaker.failureCount >= this.config.safety.circuitBreakerThreshold) {
        await this.openCircuitBreaker();
      }

      throw new FeedbackLoopError(
        `Quality monitoring failed: ${error.message}`,
        'MONITORING_ERROR',
        { loopId, iteration: iteration.iteration, originalError: error }
      );
    }
  }

  /**
   * Post-execution quality validation
   */
  async validateLoopResult(result: FeedbackLoopResult): Promise<QualityControlResult> {
    try {
      const violations: QualityViolation[] = [];
      const recommendations: string[] = [];

      // Validate final quality metrics
      if (result.qualityMetrics.finalConfidence < 0.7) {
        violations.push({
          type: 'quality_degradation',
          severity: 'medium',
          description: `Final confidence below acceptable threshold (${result.qualityMetrics.finalConfidence})`,
          detectedAt: new Date(),
          loopId: result.loopId,
          iteration: result.iterationCount,
          metadata: { finalConfidence: result.qualityMetrics.finalConfidence }
        });
      }

      // Check improvement trajectory
      if (result.qualityMetrics.confidenceImprovement < this.config.thresholds.minConfidenceImprovement) {
        violations.push({
          type: 'stagnation',
          severity: 'low',
          description: 'Minimal confidence improvement achieved',
          detectedAt: new Date(),
          loopId: result.loopId,
          iteration: result.iterationCount,
          metadata: { improvement: result.qualityMetrics.confidenceImprovement }
        });
      }

      // Validate convergence
      if (!result.converged && result.status !== 'max_iterations_reached') {
        violations.push({
          type: 'quality_degradation',
          severity: 'medium',
          description: 'Loop terminated without proper convergence',
          detectedAt: new Date(),
          loopId: result.loopId,
          iteration: result.iterationCount,
          metadata: { status: result.status }
        });
      }

      const qualityScore = this.calculateFinalQualityScore(result, violations);
      const escalationRequired = this.shouldEscalate(violations, qualityScore);

      // Update metrics
      this.updateMetrics(result, violations);

      // Cleanup monitoring
      this.cleanupLoopMonitoring(result.loopId);

      // Record final audit entry
      if (this.config.audit.enableAuditTrail) {
        this.recordAuditEntry(result.loopId, 'result_validation', {
          status: result.status,
          finalConfidence: result.qualityMetrics.finalConfidence,
          violations: violations.length
        }, qualityScore);
      }

      return {
        approved: violations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0,
        reason: violations.length > 0 ? 'Quality concerns in final result' : 'Result validated successfully',
        qualityScore,
        violations,
        recommendations,
        escalationRequired,
        auditTrail: this.auditTrail.get(result.loopId) || []
      };

    } catch (error) {
      logger.error('Result validation failed', {
        loopId: result.loopId,
        error: error.message
      });
      
      return this.createRejectedResult(
        `Result validation error: ${error.message}`,
        0,
        [],
        ['Manual review required']
      );
    }
  }

  /**
   * Violation detection methods
   */
  private async detectOscillation(
    loopId: string,
    iteration: FeedbackLoopIteration
  ): Promise<QualityViolation | null> {
    
    const loopState = this.activeLoops.get(loopId);
    if (!loopState || loopState.confidenceHistory.length < this.config.thresholds.oscillationDetectionWindow) {
      return null;
    }

    const recentHistory = loopState.confidenceHistory.slice(-this.config.thresholds.oscillationDetectionWindow);
    const oscillationPattern = this.detectOscillationPattern(recentHistory);

    if (oscillationPattern.detected) {
      return {
        type: 'oscillation',
        severity: 'high',
        description: `Oscillation pattern detected (amplitude: ${oscillationPattern.amplitude.toFixed(3)})`,
        detectedAt: new Date(),
        loopId,
        iteration: iteration.iteration,
        metadata: {
          pattern: oscillationPattern,
          history: recentHistory
        }
      };
    }

    return null;
  }

  private async detectStagnation(
    loopId: string,
    iteration: FeedbackLoopIteration
  ): Promise<QualityViolation | null> {
    
    const loopState = this.activeLoops.get(loopId);
    if (!loopState || loopState.confidenceHistory.length < 3) {
      return null;
    }

    const recentImprovements = loopState.confidenceHistory
      .slice(-3)
      .map((conf, index, arr) => index > 0 ? conf - arr[index - 1] : 0)
      .slice(1);

    const avgImprovement = recentImprovements.reduce((sum, imp) => sum + imp, 0) / recentImprovements.length;

    if (avgImprovement < this.config.thresholds.minConfidenceImprovement) {
      return {
        type: 'stagnation',
        severity: 'medium',
        description: `Stagnation detected (avg improvement: ${avgImprovement.toFixed(4)})`,
        detectedAt: new Date(),
        loopId,
        iteration: iteration.iteration,
        metadata: {
          averageImprovement: avgImprovement,
          recentImprovements
        }
      };
    }

    return null;
  }

  private async detectQualityDegradation(
    loopId: string,
    iteration: FeedbackLoopIteration
  ): Promise<QualityViolation | null> {
    
    const loopState = this.activeLoops.get(loopId);
    if (!loopState || loopState.confidenceHistory.length < 2) {
      return null;
    }

    const currentConfidence = loopState.confidenceHistory[loopState.confidenceHistory.length - 1];
    const previousConfidence = loopState.confidenceHistory[loopState.confidenceHistory.length - 2];

    const degradation = previousConfidence - currentConfidence;

    if (degradation > this.config.thresholds.degradationThreshold) {
      return {
        type: 'quality_degradation',
        severity: 'high',
        description: `Quality degradation detected (drop: ${degradation.toFixed(3)})`,
        detectedAt: new Date(),
        loopId,
        iteration: iteration.iteration,
        metadata: {
          previousConfidence,
          currentConfidence,
          degradation
        }
      };
    }

    return null;
  }

  private async checkEthicalConcerns(iteration: FeedbackLoopIteration): Promise<QualityViolation[]> {
    const violations: QualityViolation[] = [];

    // Check for ethical issues in validation
    const ethicalScore = iteration.validation.scores.ethical;
    if (ethicalScore < 0.8) {
      violations.push({
        type: 'ethical_concern',
        severity: 'critical',
        description: `Ethical concerns detected (score: ${ethicalScore})`,
        detectedAt: new Date(),
        loopId: '',
        iteration: iteration.iteration,
        metadata: { ethicalScore }
      });
    }

    // Check for bias issues
    const biasScore = iteration.validation.scores.bias;
    if (biasScore < 0.8) {
      violations.push({
        type: 'ethical_concern',
        severity: 'high',
        description: `Bias concerns detected (score: ${biasScore})`,
        detectedAt: new Date(),
        loopId: '',
        iteration: iteration.iteration,
        metadata: { biasScore }
      });
    }

    return violations;
  }

  /**
   * Quality scoring methods
   */
  private calculateInitialQualityScore(
    request: FeedbackLoopRequest,
    violations: QualityViolation[]
  ): number {
    let score = 1.0;

    // Deduct for violations
    violations.forEach(violation => {
      switch (violation.severity) {
        case 'critical': score -= 0.3; break;
        case 'high': score -= 0.2; break;
        case 'medium': score -= 0.1; break;
        case 'low': score -= 0.05; break;
      }
    });

    // Factor in request quality
    if (request.maxIterations > 15) score -= 0.1;
    if (request.confidenceThreshold > 0.95) score -= 0.1;
    if (request.priority === 'urgent') score += 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private calculateIterationQualityScore(
    iteration: FeedbackLoopIteration,
    violations: QualityViolation[]
  ): number {
    let score = iteration.validation.scores.overall;

    // Deduct for violations
    violations.forEach(violation => {
      switch (violation.severity) {
        case 'critical': score -= 0.4; break;
        case 'high': score -= 0.3; break;
        case 'medium': score -= 0.2; break;
        case 'low': score -= 0.1; break;
      }
    });

    // Factor in improvement
    if (iteration.confidenceImprovement > 0) {
      score += iteration.confidenceImprovement * 0.5;
    }

    return Math.max(0, Math.min(1, score));
  }

  private calculateFinalQualityScore(
    result: FeedbackLoopResult,
    violations: QualityViolation[]
  ): number {
    let score = result.qualityMetrics.finalConfidence;

    // Deduct for violations
    violations.forEach(violation => {
      switch (violation.severity) {
        case 'critical': score -= 0.3; break;
        case 'high': score -= 0.2; break;
        case 'medium': score -= 0.1; break;
        case 'low': score -= 0.05; break;
      }
    });

    // Bonus for convergence
    if (result.converged) score += 0.1;

    // Factor in improvement
    score += result.qualityMetrics.confidenceImprovement * 0.5;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Helper methods and utilities
   */
  private getDefaultConfiguration(): QualityControlConfiguration {
    return {
      limits: {
        maxIterations: 15,
        maxProcessingTime: 300000, // 5 minutes
        maxConcurrentLoops: 50,
        maxFeedbackMessages: 10
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
        circuitBreakerTimeout: 300000, // 5 minutes
        enableGracefulDegradation: true
      },
      audit: {
        enableAuditTrail: true,
        auditDetailLevel: 'standard',
        retentionPeriod: 2592000000 // 30 days
      }
    };
  }

  private initializeMetrics(): QualityControlMetrics {
    return {
      totalLoopsMonitored: 0,
      qualityViolations: 0,
      escalations: 0,
      circuitBreakerTrips: 0,
      averageQualityScore: 0,
      timeoutRate: 0,
      oscillationRate: 0,
      degradationEvents: 0
    };
  }

  private initializeCircuitBreaker(): CircuitBreakerState {
    return {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: new Date(0),
      nextRetryTime: new Date(0)
    };
  }

  private setupPeriodicChecks(): void {
    setInterval(() => {
      this.performPeriodicMaintenance();
    }, 60000); // Every minute
  }

  private performPeriodicMaintenance(): void {
    // Clean up old audit entries
    this.cleanupAuditTrail();
    
    // Check circuit breaker status
    this.checkCircuitBreaker();
    
    // Update system metrics
    this.updateSystemMetrics();
  }

  private cleanupAuditTrail(): void {
    const cutoffTime = new Date(Date.now() - this.config.audit.retentionPeriod);
    
    for (const [loopId, entries] of this.auditTrail.entries()) {
      const filteredEntries = entries.filter(entry => entry.timestamp > cutoffTime);
      if (filteredEntries.length === 0) {
        this.auditTrail.delete(loopId);
      } else {
        this.auditTrail.set(loopId, filteredEntries);
      }
    }
  }

  private checkCircuitBreaker(): void {
    if (this.circuitBreaker.isOpen && Date.now() > this.circuitBreaker.nextRetryTime.getTime()) {
      this.circuitBreaker.isOpen = false;
      this.circuitBreaker.failureCount = 0;
      logger.info('Circuit breaker reset - system returning to normal operation');
    }
  }

  private async openCircuitBreaker(): Promise<void> {
    this.circuitBreaker.isOpen = true;
    this.circuitBreaker.lastFailureTime = new Date();
    this.circuitBreaker.nextRetryTime = new Date(Date.now() + this.config.safety.circuitBreakerTimeout);
    this.metrics.circuitBreakerTrips++;
    
    logger.warn('Circuit breaker opened - system entering protective mode', {
      failureCount: this.circuitBreaker.failureCount,
      nextRetryTime: this.circuitBreaker.nextRetryTime
    });

    this.emit('circuitBreakerOpened', this.circuitBreaker);
  }

  // Additional helper methods (simplified implementations)
  private validateRequestParameters(request: FeedbackLoopRequest): QualityViolation[] {
    const violations: QualityViolation[] = [];
    
    if (request.maxIterations > this.config.limits.maxIterations) {
      violations.push({
        type: 'iteration_limit',
        severity: 'medium',
        description: `Requested iterations exceed limit (${request.maxIterations}/${this.config.limits.maxIterations})`,
        detectedAt: new Date(),
        loopId: request.requestId,
        iteration: 0,
        metadata: { requestedIterations: request.maxIterations }
      });
    }
    
    return violations;
  }

  private async checkSystemHealth(request: FeedbackLoopRequest): Promise<QualityViolation[]> {
    // Implementation would check system health metrics
    return [];
  }

  private shouldEscalate(violations: QualityViolation[], qualityScore: number): boolean {
    const criticalViolations = violations.filter(v => v.severity === 'critical').length;
    const ethicalViolations = violations.filter(v => v.type === 'ethical_concern').length;
    
    return criticalViolations >= this.config.escalation.escalationThresholds.criticalIssues ||
           ethicalViolations >= this.config.escalation.escalationThresholds.ethicalConcerns ||
           qualityScore < 0.5;
  }

  private createRejectedResult(
    reason: string,
    qualityScore: number,
    violations: QualityViolation[],
    recommendations: string[]
  ): QualityControlResult {
    return {
      approved: false,
      reason,
      qualityScore,
      violations,
      recommendations,
      escalationRequired: true,
      auditTrail: []
    };
  }

  private recordAuditEntry(
    loopId: string,
    action: string,
    details: any,
    qualityScore: number,
    userId?: string
  ): void {
    if (!this.config.audit.enableAuditTrail) return;

    const entry: QualityAuditEntry = {
      timestamp: new Date(),
      loopId,
      action,
      details,
      qualityScore,
      userId
    };

    const entries = this.auditTrail.get(loopId) || [];
    entries.push(entry);
    this.auditTrail.set(loopId, entries);
  }

  private initializeLoopMonitoring(request: FeedbackLoopRequest): void {
    this.activeLoops.set(request.requestId, {
      loopId: request.requestId,
      startTime: new Date(),
      confidenceHistory: [],
      violationCount: 0,
      qualityScore: 0
    });
  }

  private updateLoopMonitoring(
    loopId: string,
    iteration: FeedbackLoopIteration,
    qualityScore: number,
    violations: QualityViolation[]
  ): void {
    const state = this.activeLoops.get(loopId);
    if (state) {
      state.confidenceHistory.push(iteration.validation.scores.overall);
      state.violationCount += violations.length;
      state.qualityScore = qualityScore;
    }
  }

  private cleanupLoopMonitoring(loopId: string): void {
    this.activeLoops.delete(loopId);
  }

  private detectOscillationPattern(history: number[]): { detected: boolean; amplitude: number } {
    if (history.length < 4) return { detected: false, amplitude: 0 };
    
    // Simple oscillation detection - look for alternating high/low pattern
    let oscillations = 0;
    for (let i = 2; i < history.length; i++) {
      const trend1 = history[i-1] > history[i-2];
      const trend2 = history[i] > history[i-1];
      if (trend1 !== trend2) oscillations++;
    }
    
    const oscillationRate = oscillations / (history.length - 2);
    const amplitude = Math.max(...history) - Math.min(...history);
    
    return {
      detected: oscillationRate > 0.6 && amplitude > 0.1,
      amplitude
    };
  }

  private generateDynamicRecommendations(
    iteration: FeedbackLoopIteration,
    violations: QualityViolation[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (violations.some(v => v.type === 'oscillation')) {
      recommendations.push('Consider reducing learning rate or implementing momentum');
    }
    
    if (violations.some(v => v.type === 'stagnation')) {
      recommendations.push('Try different feedback strategies or increase exploration');
    }
    
    if (iteration.processingTime > 30000) {
      recommendations.push('Consider optimizing processing pipeline or reducing batch size');
    }
    
    return recommendations;
  }

  private async handleViolations(loopId: string, violations: QualityViolation[]): Promise<void> {
    this.violationHistory.push(...violations);
    this.metrics.qualityViolations += violations.length;
    
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      this.emit('criticalViolation', { loopId, violations: criticalViolations });
    }
    
    // Trigger escalation if needed
    const shouldEscalate = violations.some(v => 
      v.severity === 'critical' || v.type === 'ethical_concern'
    );
    
    if (shouldEscalate && this.config.escalation.enableHumanEscalation) {
      await this.escalateToHuman(loopId, violations);
    }
  }

  private async escalateToHuman(loopId: string, violations: QualityViolation[]): Promise<void> {
    this.metrics.escalations++;
    
    logger.warn('Escalating to human review', {
      loopId,
      violations: violations.length,
      criticalViolations: violations.filter(v => v.severity === 'critical').length
    });
    
    this.emit('humanEscalation', { loopId, violations });
  }

  private updateMetrics(result: FeedbackLoopResult, violations: QualityViolation[]): void {
    this.metrics.totalLoopsMonitored++;
    this.metrics.averageQualityScore = this.updateRunningAverage(
      this.metrics.averageQualityScore,
      result.qualityMetrics.finalConfidence
    );
    
    if (result.status === 'timeout') {
      this.metrics.timeoutRate = this.updateRate(this.metrics.timeoutRate, true);
    }
    
    if (violations.some(v => v.type === 'oscillation')) {
      this.metrics.oscillationRate = this.updateRate(this.metrics.oscillationRate, true);
    }
  }

  private updateRunningAverage(current: number, newValue: number): number {
    return (current * 0.9) + (newValue * 0.1);
  }

  private updateRate(currentRate: number, event: boolean): number {
    return event ? Math.min(currentRate + 0.01, 1) : Math.max(currentRate - 0.001, 0);
  }

  private updateSystemMetrics(): void {
    metrics.record('quality_controller_metrics', this.activeLoops.size, {
      totalViolations: this.metrics.qualityViolations,
      escalations: this.metrics.escalations,
      averageQualityScore: this.metrics.averageQualityScore,
      circuitBreakerOpen: this.circuitBreaker.isOpen
    });
  }

  /**
   * Public methods for external monitoring
   */
  public getMetrics(): QualityControlMetrics {
    return { ...this.metrics };
  }

  public getActiveLoops(): string[] {
    return Array.from(this.activeLoops.keys());
  }

  public getViolationHistory(since?: Date): QualityViolation[] {
    if (!since) return [...this.violationHistory];
    return this.violationHistory.filter(v => v.detectedAt >= since);
  }

  public getCircuitBreakerStatus(): CircuitBreakerState {
    return { ...this.circuitBreaker };
  }

  public forceCircuitBreakerOpen(): void {
    this.openCircuitBreaker();
  }

  public resetCircuitBreaker(): void {
    this.circuitBreaker.isOpen = false;
    this.circuitBreaker.failureCount = 0;
    logger.info('Circuit breaker manually reset');
  }
}

interface QualityControlState {
  loopId: string;
  startTime: Date;
  confidenceHistory: number[];
  violationCount: number;
  qualityScore: number;
}

export default FeedbackLoopQualityController;