/**
 * Disagreement Handler - Manages conflicts between A1 Generator and B1 Validator
 * Implements resolution strategies and feeds learning system
 */

import {
  IDisagreementHandler,
  Disagreement,
  DisagreementResolution,
  DisagreementFilters,
  GenerationResponse,
  ValidationResponse,
  DisagreementError,
  DisagreementType,
  DisagreementPosition,
  DisagreementSeverity,
  LearningEvent,
  LearningData,
  LearningImpact,
  IContinuousLearningEngine
} from './interfaces';
import { BaseAIComponent, BaseComponentConfig } from './base-ai-component';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export class DisagreementHandler extends BaseAIComponent implements IDisagreementHandler {
  private resolutionStrategies: Map<string, ResolutionStrategy>;
  private escalationThresholds: EscalationThresholds;
  private learningEngine: IContinuousLearningEngine;
  private humanReviewQueue: IHumanReviewQueue;

  constructor(config: DisagreementHandlerConfig) {
    super(config);
    this.resolutionStrategies = new Map(config.resolutionStrategies);
    this.escalationThresholds = config.escalationThresholds;
    this.learningEngine = config.learningEngine;
    this.humanReviewQueue = config.humanReviewQueue;
  }

  private generateId(): string {
    return `disagreement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async handleDisagreement(
    generation: GenerationResponse,
    validation: ValidationResponse
  ): Promise<Disagreement> {
    const traceId = this.generateTraceId();
    const startTime = Date.now();

    try {
      logger.info('Handling disagreement', {
        traceId,
        generationId: generation.requestId,
        validationId: validation.requestId,
        validationStatus: validation.status
      });

      // Analyze disagreement
      const disagreementType = this.analyzeDisagreementType(generation, validation);
      const severity = this.calculateSeverity(validation);
      
      // Create disagreement record
      const disagreement: Disagreement = {
        id: this.generateId(),
        requestId: generation.requestId,
        generationId: generation.requestId,
        validationId: validation.requestId,
        type: disagreementType,
        severity,
        generatorPosition: this.extractGeneratorPosition(generation),
        validatorPosition: this.extractValidatorPosition(validation),
        status: 'open',
        createdAt: new Date()
      };

      // Store disagreement
      await this.storeDisagreement(disagreement);

      // Attempt automatic resolution
      const resolution = await this.attemptResolution(disagreement, generation, validation);
      
      if (resolution) {
        disagreement.resolution = resolution;
        disagreement.status = 'resolved';
        disagreement.resolvedAt = new Date();
        await this.updateDisagreement(disagreement);
      } else if (this.shouldEscalate(disagreement)) {
        await this.escalateDisagreement(disagreement.id, 'Automatic escalation due to severity');
      }

      // Record learning event
      await this.recordLearningEvent(disagreement, generation, validation);

      // Update metrics
      metrics.record('disagreement_handled', Date.now() - startTime, {
        type: disagreementType.category,
        severity,
        resolved: !!resolution
      });

      logger.info('Disagreement handled', {
        traceId,
        disagreementId: disagreement.id,
        status: disagreement.status,
        duration: Date.now() - startTime
      });

      return disagreement;

    } catch (error) {
      logger.error('Failed to handle disagreement', {
        traceId,
        error: error.message,
        generationId: generation.requestId,
        validationId: validation.requestId
      });

      throw new DisagreementError(
        `Failed to handle disagreement: ${error.message}`,
        { traceId, generation, validation }
      );
    }
  }

  async resolveDisagreement(
    disagreementId: string,
    resolution: DisagreementResolution
  ): Promise<void> {
    const traceId = this.generateTraceId();

    try {
      logger.info('Resolving disagreement', {
        traceId,
        disagreementId,
        method: resolution.method
      });

      // Get disagreement
      const disagreement = await this.getDisagreement(disagreementId);
      if (!disagreement) {
        throw new DisagreementError(`Disagreement not found: ${disagreementId}`);
      }

      if (disagreement.status !== 'open' && disagreement.status !== 'escalated') {
        throw new DisagreementError(`Disagreement already resolved: ${disagreementId}`);
      }

      // Apply resolution
      disagreement.resolution = resolution;
      disagreement.status = 'resolved';
      disagreement.resolvedAt = new Date();

      await this.updateDisagreement(disagreement);

      // Record learning from resolution
      await this.recordResolutionLearning(disagreement, resolution);

      // Update metrics
      metrics.record('disagreement_resolved', 1, {
        method: resolution.method,
        disagreementType: disagreement.type.category,
        severity: disagreement.severity
      });

      logger.info('Disagreement resolved', {
        traceId,
        disagreementId,
        method: resolution.method
      });

    } catch (error) {
      logger.error('Failed to resolve disagreement', {
        traceId,
        disagreementId,
        error: error.message
      });

      throw new DisagreementError(
        `Failed to resolve disagreement: ${error.message}`,
        { disagreementId, resolution }
      );
    }
  }

  async getDisagreements(filters?: DisagreementFilters): Promise<Disagreement[]> {
    try {
      return await this.queryDisagreements(filters);
    } catch (error) {
      logger.error('Failed to get disagreements', {
        error: error.message,
        filters
      });
      throw new DisagreementError(`Failed to get disagreements: ${error.message}`);
    }
  }

  async escalateDisagreement(disagreementId: string, reason: string): Promise<void> {
    const traceId = this.generateTraceId();

    try {
      logger.info('Escalating disagreement', {
        traceId,
        disagreementId,
        reason
      });

      // Get disagreement
      const disagreement = await this.getDisagreement(disagreementId);
      if (!disagreement) {
        throw new DisagreementError(`Disagreement not found: ${disagreementId}`);
      }

      // Update status
      disagreement.status = 'escalated';
      await this.updateDisagreement(disagreement);

      // Add to human review queue
      await this.humanReviewQueue.enqueue({
        disagreementId,
        priority: this.calculateReviewPriority(disagreement),
        reason,
        createdAt: new Date()
      });

      // Send notifications
      await this.sendEscalationNotifications(disagreement, reason);

      // Update metrics
      metrics.record('disagreement_escalated', 1, {
        type: disagreement.type.category,
        severity: disagreement.severity,
        reason
      });

      logger.info('Disagreement escalated', {
        traceId,
        disagreementId,
        reason
      });

    } catch (error) {
      logger.error('Failed to escalate disagreement', {
        traceId,
        disagreementId,
        error: error.message
      });

      throw new DisagreementError(
        `Failed to escalate disagreement: ${error.message}`,
        { disagreementId, reason }
      );
    }
  }

  // Private methods

  private analyzeDisagreementType(
    generation: GenerationResponse,
    validation: ValidationResponse
  ): DisagreementType {
    const issues = validation.issues;
    
    // Categorize based on validation issues
    if (issues.some(i => i.type === 'ethical')) {
      return { category: 'ethics', subCategory: 'ethical_concern' };
    }
    
    if (issues.some(i => i.type === 'bias')) {
      return { category: 'bias', subCategory: 'bias_detection' };
    }
    
    if (issues.some(i => i.type === 'quality')) {
      return { category: 'content', subCategory: 'quality_issue' };
    }
    
    if (issues.some(i => i.type === 'compliance')) {
      return { category: 'accuracy', subCategory: 'compliance_violation' };
    }

    return { category: 'style', subCategory: 'general' };
  }

  private calculateSeverity(validation: ValidationResponse): DisagreementSeverity {
    const criticalIssues = validation.issues.filter(i => i.severity === 'critical');
    const highIssues = validation.issues.filter(i => i.severity === 'high');
    
    if (criticalIssues.length > 0) return 'critical';
    if (highIssues.length > 1) return 'high';
    if (highIssues.length > 0) return 'medium';
    return 'low';
  }

  private extractGeneratorPosition(generation: GenerationResponse): DisagreementPosition {
    return {
      stance: 'Generated content is appropriate and valuable',
      reasoning: generation.metadata.reasoning || [],
      evidence: [generation.content],
      confidence: generation.metadata.confidence
    };
  }

  private extractValidatorPosition(validation: ValidationResponse): DisagreementPosition {
    const issueDescriptions = validation.issues.map(i => i.description);
    
    return {
      stance: `Content has ${validation.issues.length} validation issues`,
      reasoning: issueDescriptions,
      evidence: validation.issues.map(i => i.evidence || []).flat(),
      confidence: validation.metadata.confidence
    };
  }

  private async attemptResolution(
    disagreement: Disagreement,
    generation: GenerationResponse,
    validation: ValidationResponse
  ): Promise<DisagreementResolution | null> {
    
    const strategyKey = this.getResolutionStrategyKey(disagreement);
    const strategy = this.resolutionStrategies.get(strategyKey);
    
    if (!strategy) {
      logger.warn('No resolution strategy found', {
        disagreementType: disagreement.type.category,
        severity: disagreement.severity
      });
      return null;
    }

    try {
      return await strategy.resolve(disagreement, generation, validation);
    } catch (error) {
      logger.warn('Resolution strategy failed', {
        disagreementId: disagreement.id,
        strategy: strategyKey,
        error: error.message
      });
      return null;
    }
  }

  private getResolutionStrategyKey(disagreement: Disagreement): string {
    return `${disagreement.type.category}_${disagreement.severity}`;
  }

  private shouldEscalate(disagreement: Disagreement): boolean {
    const thresholds = this.escalationThresholds;
    
    if (disagreement.severity === 'critical') {
      return true;
    }
    
    if (disagreement.severity === 'high' && 
        disagreement.type.category === 'ethics') {
      return true;
    }
    
    // Check confidence thresholds
    const generatorConfidence = disagreement.generatorPosition.confidence;
    const validatorConfidence = disagreement.validatorPosition.confidence;
    
    if (Math.abs(generatorConfidence - validatorConfidence) > thresholds.confidenceDelta) {
      return true;
    }
    
    return false;
  }

  private async recordLearningEvent(
    disagreement: Disagreement,
    generation: GenerationResponse,
    validation: ValidationResponse
  ): Promise<void> {
    
    const learningData: LearningData = {
      input: {
        generatedContent: generation.content,
        context: generation.metadata
      },
      output: {
        validationIssues: validation.issues,
        validationScores: validation.scores
      },
      feedback: `Disagreement: ${disagreement.type.category}`,
      metadata: {
        disagreementId: disagreement.id,
        severity: disagreement.severity,
        generatorModel: generation.model,
        validatorModel: validation.metadata.validatorModel
      }
    };

    const impact = this.calculateLearningImpact(disagreement);

    const learningEvent: LearningEvent = {
      id: this.generateId(),
      type: 'disagreement',
      sourceId: disagreement.id,
      sourceType: 'disagreement',
      data: learningData,
      impact,
      timestamp: new Date()
    };

    await this.learningEngine.recordEvent(learningEvent);
  }

  private calculateLearningImpact(disagreement: Disagreement): LearningImpact {
    const severityScores = {
      low: 0.2,
      medium: 0.5,
      high: 0.8,
      critical: 1.0
    };

    const categoryWeights = {
      ethics: 1.0,
      bias: 0.9,
      accuracy: 0.8,
      content: 0.6,
      style: 0.4
    };

    const score = severityScores[disagreement.severity] * 
                  (categoryWeights[disagreement.type.category as keyof typeof categoryWeights] || 0.5);

    return {
      score,
      confidence: 0.8,
      affectedModels: ['A1Generator', 'B1Validator'],
      suggestedActions: this.generateSuggestedActions(disagreement)
    };
  }

  private generateSuggestedActions(disagreement: Disagreement): string[] {
    const actions: string[] = [];
    
    switch (disagreement.type.category) {
      case 'ethics':
        actions.push('Update ethical guidelines');
        actions.push('Enhance ethical training data');
        break;
      case 'bias':
        actions.push('Improve bias detection algorithms');
        actions.push('Add diverse training examples');
        break;
      case 'accuracy':
        actions.push('Verify fact-checking sources');
        actions.push('Update knowledge base');
        break;
      case 'content':
        actions.push('Improve content quality metrics');
        actions.push('Enhance prompt engineering');
        break;
      case 'style':
        actions.push('Refine style guidelines');
        actions.push('Update tone detection');
        break;
    }
    
    return actions;
  }

  private async recordResolutionLearning(
    disagreement: Disagreement,
    resolution: DisagreementResolution
  ): Promise<void> {
    
    const learningData: LearningData = {
      input: {
        disagreement: {
          type: disagreement.type,
          severity: disagreement.severity,
          positions: {
            generator: disagreement.generatorPosition,
            validator: disagreement.validatorPosition
          }
        }
      },
      output: {
        resolution: resolution.method,
        finalContent: resolution.finalContent,
        explanation: resolution.explanation
      },
      feedback: resolution.explanation,
      metadata: {
        disagreementId: disagreement.id,
        resolutionMethod: resolution.method,
        approver: resolution.approver
      }
    };

    const impact: LearningImpact = {
      score: 0.7, // Positive learning from resolution
      confidence: 0.9,
      affectedModels: ['A1Generator', 'B1Validator'],
      suggestedActions: resolution.learningNotes || []
    };

    const learningEvent: LearningEvent = {
      id: this.generateId(),
      type: 'correction',
      sourceId: disagreement.id,
      sourceType: 'resolution',
      data: learningData,
      impact,
      timestamp: new Date()
    };

    await this.learningEngine.recordEvent(learningEvent);
  }

  private calculateReviewPriority(disagreement: Disagreement): number {
    const severityPriorities = {
      critical: 1,
      high: 2,
      medium: 3,
      low: 4
    };

    const categoryBoosts = {
      ethics: 0,
      bias: 1,
      accuracy: 2,
      content: 3,
      style: 4
    };

    return severityPriorities[disagreement.severity] + 
           (categoryBoosts[disagreement.type.category as keyof typeof categoryBoosts] || 5);
  }

  private async sendEscalationNotifications(
    disagreement: Disagreement,
    reason: string
  ): Promise<void> {
    // Implementation would send notifications to relevant stakeholders
    logger.info('Escalation notifications sent', {
      disagreementId: disagreement.id,
      reason
    });
  }

  // Database operations (would be implemented with actual database)
  private async storeDisagreement(disagreement: Disagreement): Promise<void> {
    // Store in database
  }

  private async updateDisagreement(disagreement: Disagreement): Promise<void> {
    // Update in database
  }

  private async getDisagreement(id: string): Promise<Disagreement | null> {
    // Retrieve from database
    return null; // Placeholder
  }

  private async queryDisagreements(filters?: DisagreementFilters): Promise<Disagreement[]> {
    // Query database with filters
    return []; // Placeholder
  }
}

// Supporting interfaces and types
interface DisagreementHandlerConfig extends BaseComponentConfig {
  resolutionStrategies: [string, ResolutionStrategy][];
  escalationThresholds: EscalationThresholds;
  learningEngine: IContinuousLearningEngine;
  humanReviewQueue: IHumanReviewQueue;
}

interface ResolutionStrategy {
  resolve(
    disagreement: Disagreement,
    generation: GenerationResponse,
    validation: ValidationResponse
  ): Promise<DisagreementResolution>;
}

interface EscalationThresholds {
  confidenceDelta: number;
  severityThreshold: DisagreementSeverity;
  issueCountThreshold: number;
}

// IContinuousLearningEngine is now imported from interfaces

interface IHumanReviewQueue {
  enqueue(item: HumanReviewItem): Promise<void>;
}

interface HumanReviewItem {
  disagreementId: string;
  priority: number;
  reason: string;
  createdAt: Date;
}

// Built-in resolution strategies
export class AutomaticResolutionStrategy implements ResolutionStrategy {
  async resolve(
    disagreement: Disagreement,
    generation: GenerationResponse,
    validation: ValidationResponse
  ): Promise<DisagreementResolution> {
    
    // Simple automatic resolution based on confidence scores
    const generatorConfidence = disagreement.generatorPosition.confidence;
    const validatorConfidence = disagreement.validatorPosition.confidence;
    
    if (validatorConfidence > generatorConfidence + 0.2) {
      // Validator wins - reject content
      return {
        method: 'automated',
        explanation: 'Validator confidence significantly higher than generator',
        learningNotes: ['Generator needs improvement in this area']
      };
    } else if (generatorConfidence > validatorConfidence + 0.2) {
      // Generator wins - approve with modifications
      return {
        method: 'automated',
        finalContent: generation.content,
        explanation: 'Generator confidence significantly higher than validator',
        learningNotes: ['Validator may be too strict in this case']
      };
    } else {
      // Close call - apply modifications based on suggestions
      const modifiedContent = this.applyModifications(
        generation.content,
        validation.suggestions
      );
      
      return {
        method: 'automated',
        finalContent: modifiedContent,
        explanation: 'Applied validator suggestions to generated content',
        learningNotes: ['Successful compromise between generator and validator']
      };
    }
  }

  private applyModifications(content: any, suggestions: string[]): any {
    // Apply suggestions to content
    // This would be implemented based on content structure
    return content;
  }
}

export { DisagreementHandlerConfig };