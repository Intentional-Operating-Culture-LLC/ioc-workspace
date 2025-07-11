/**
 * B1 Validator - Ethical Review and Validation Component
 * Responsible for validating content for ethics, bias, quality, and compliance
 */

import {
  IB1Validator,
  ValidationRequest,
  ValidationResponse,
  ValidationRule,
  ComponentHealth,
  ValidationError,
  ValidationIssue,
  ValidationScores,
  ValidationMetadata,
  ModelConfig,
  DisagreementSeverity
} from './interfaces';
import { BaseAIComponent, BaseComponentConfig } from './base-ai-component';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export class B1Validator extends BaseAIComponent implements IB1Validator {
  private validationRules: Map<string, ValidationRule>;
  private modelConfig: ModelConfig;
  private ethicalGuidelines: EthicalGuideline[];
  private biasDetectors: BiasDetector[];
  private complianceRules: ComplianceRule[];

  constructor(config: B1ValidatorConfig) {
    super(config);
    this.validationRules = new Map(config.validationRules.map(rule => [rule.id, rule]));
    this.modelConfig = config.modelConfig;
    this.ethicalGuidelines = config.ethicalGuidelines;
    this.biasDetectors = config.biasDetectors;
    this.complianceRules = config.complianceRules;
  }

  async validate(request: ValidationRequest): Promise<ValidationResponse> {
    const startTime = Date.now();
    const traceId = this.generateTraceId();

    try {
      logger.info('Starting content validation', {
        traceId,
        requestId: request.id,
        contentType: request.contentType,
        urgency: request.urgency
      });

      // Validate request
      this.validateRequest(request);

      // Run validation checks in parallel
      const [
        ethicalIssues,
        biasIssues,
        qualityIssues,
        complianceIssues
      ] = await Promise.all([
        this.checkEthics(request),
        this.checkBias(request),
        this.checkQuality(request),
        this.checkCompliance(request)
      ]);

      // Combine all issues
      const allIssues = [
        ...ethicalIssues,
        ...biasIssues,
        ...qualityIssues,
        ...complianceIssues
      ];

      // Calculate scores
      const scores = this.calculateScores(allIssues, request);

      // Generate suggestions
      const suggestions = await this.generateSuggestions(allIssues, request);

      // Determine validation status
      const status = this.determineStatus(scores, allIssues);

      // Create metadata
      const metadata = this.createMetadata(request, allIssues);

      const response: ValidationResponse = {
        requestId: request.id,
        status,
        issues: allIssues,
        suggestions,
        scores,
        metadata,
        processingTime: Date.now() - startTime
      };

      // Record metrics
      metrics.record('validation_success', 1, {
        contentType: request.contentType,
        status,
        duration: response.processingTime,
        issueCount: allIssues.length,
        overallScore: scores.overall
      });

      logger.info('Content validation completed', {
        traceId,
        requestId: request.id,
        status,
        issueCount: allIssues.length,
        duration: response.processingTime
      });

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Content validation failed', {
        traceId,
        requestId: request.id,
        error: error.message,
        duration
      });

      metrics.record('validation_error', 1, {
        contentType: request.contentType,
        error: error.constructor.name,
        duration
      });

      throw new ValidationError(
        `Failed to validate content: ${error.message}`,
        { requestId: request.id, traceId, originalError: error }
      );
    }
  }

  async validateBatch(requests: ValidationRequest[]): Promise<ValidationResponse[]> {
    const batchId = this.generateBatchId();
    const startTime = Date.now();

    try {
      logger.info('Starting batch validation', {
        batchId,
        count: requests.length
      });

      // Process requests in parallel with concurrency limit
      const concurrency = (this.config as B1ValidatorConfig).batchConcurrency || 10;
      const results: ValidationResponse[] = [];

      for (let i = 0; i < requests.length; i += concurrency) {
        const batch = requests.slice(i, i + concurrency);
        const batchPromises = batch.map(request => this.validate(request));
        const batchResults = await Promise.allSettled(batchPromises);

        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            logger.error('Batch validation item failed', {
              batchId,
              error: result.reason.message
            });
          }
        }
      }

      const duration = Date.now() - startTime;
      
      logger.info('Batch validation completed', {
        batchId,
        total: requests.length,
        successful: results.length,
        duration
      });

      return results;

    } catch (error) {
      logger.error('Batch validation failed', {
        batchId,
        error: error.message
      });

      throw new ValidationError(
        `Batch validation failed: ${error.message}`,
        { batchId, requestCount: requests.length }
      );
    }
  }

  getValidationRules(): ValidationRule[] {
    return Array.from(this.validationRules.values()).filter(rule => rule.active);
  }

  async updateRules(rules: ValidationRule[]): Promise<void> {
    try {
      // Validate new rules
      for (const rule of rules) {
        this.validateRule(rule);
      }

      // Update rules map
      this.validationRules.clear();
      for (const rule of rules) {
        this.validationRules.set(rule.id, rule);
      }

      logger.info('Validation rules updated', {
        ruleCount: rules.length
      });

      metrics.record('rules_updated', 1, {
        count: rules.length
      });

    } catch (error) {
      logger.error('Failed to update validation rules', {
        error: error.message
      });
      throw new ValidationError(`Failed to update rules: ${error.message}`);
    }
  }

  async getHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      // Test basic functionality
      const testRequest: ValidationRequest = {
        id: 'health-check',
        generationId: 'test',
        content: { test: 'content' },
        contentType: 'insight',
        context: { test: true },
        urgency: false
      };

      await this.validate(testRequest);

      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency,
        errorRate: this.getRecentErrorRate(),
        queueDepth: await this.getQueueDepth(),
        lastCheck: new Date()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        errorRate: this.getRecentErrorRate(),
        lastCheck: new Date(),
        issues: [error.message]
      };
    }
  }

  // Private validation methods

  private async checkEthics(request: ValidationRequest): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    try {
      // Check against ethical guidelines
      for (const guideline of this.ethicalGuidelines) {
        const violation = await this.checkEthicalGuideline(request.content, guideline);
        if (violation) {
          issues.push({
            type: 'ethical',
            severity: violation.severity,
            description: violation.description,
            location: violation.location,
            evidence: violation.evidence,
            suggestedFix: violation.suggestedFix
          });
        }
      }

      // Use AI model for ethical review
      const aiEthicalReview = await this.performAIEthicalReview(request);
      issues.push(...aiEthicalReview);

    } catch (error) {
      logger.warn('Ethics check failed', {
        requestId: request.id,
        error: error.message
      });
    }

    return issues;
  }

  private async checkBias(request: ValidationRequest): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    try {
      // Run bias detection algorithms
      for (const detector of this.biasDetectors) {
        const biasResult = await detector.detect(request.content, request.context);
        if (biasResult.detected) {
          issues.push({
            type: 'bias',
            severity: biasResult.severity,
            description: `${biasResult.type} bias detected: ${biasResult.description}`,
            location: biasResult.location,
            evidence: biasResult.evidence,
            suggestedFix: biasResult.mitigation
          });
        }
      }

      // Use AI model for bias detection
      const aiBiasReview = await this.performAIBiasReview(request);
      issues.push(...aiBiasReview);

    } catch (error) {
      logger.warn('Bias check failed', {
        requestId: request.id,
        error: error.message
      });
    }

    return issues;
  }

  private async checkQuality(request: ValidationRequest): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    try {
      // Check content quality metrics
      const qualityMetrics = this.analyzeQuality(request.content);

      if (qualityMetrics.readability < 0.6) {
        issues.push({
          type: 'quality',
          severity: 'medium',
          description: 'Content readability is below acceptable threshold',
          suggestedFix: 'Simplify language and sentence structure'
        });
      }

      if (qualityMetrics.coherence < 0.7) {
        issues.push({
          type: 'quality',
          severity: 'medium',
          description: 'Content lacks coherence',
          suggestedFix: 'Improve logical flow and transitions'
        });
      }

      if (qualityMetrics.completeness < 0.8) {
        issues.push({
          type: 'quality',
          severity: 'low',
          description: 'Content appears incomplete',
          suggestedFix: 'Add missing information and details'
        });
      }

      // Use AI model for quality assessment
      const aiQualityReview = await this.performAIQualityReview(request);
      issues.push(...aiQualityReview);

    } catch (error) {
      logger.warn('Quality check failed', {
        requestId: request.id,
        error: error.message
      });
    }

    return issues;
  }

  private async checkCompliance(request: ValidationRequest): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    try {
      // Check against compliance rules
      for (const rule of this.complianceRules) {
        const violation = await this.checkComplianceRule(request.content, rule);
        if (violation) {
          issues.push({
            type: 'compliance',
            severity: violation.severity,
            description: violation.description,
            location: violation.location,
            evidence: violation.evidence,
            suggestedFix: violation.suggestedFix
          });
        }
      }

    } catch (error) {
      logger.warn('Compliance check failed', {
        requestId: request.id,
        error: error.message
      });
    }

    return issues;
  }

  private async performAIEthicalReview(request: ValidationRequest): Promise<ValidationIssue[]> {
    const prompt = this.buildEthicalReviewPrompt(request);
    const provider = this.getProvider(this.modelConfig.provider);

    const response = await provider.complete({
      model: this.modelConfig.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1, // Low temperature for consistent ethical review
      max_tokens: 1000
    });

    return this.parseEthicalReviewResponse(response.content);
  }

  private async performAIBiasReview(request: ValidationRequest): Promise<ValidationIssue[]> {
    const prompt = this.buildBiasReviewPrompt(request);
    const provider = this.getProvider(this.modelConfig.provider);

    const response = await provider.complete({
      model: this.modelConfig.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1000
    });

    return this.parseBiasReviewResponse(response.content);
  }

  private async performAIQualityReview(request: ValidationRequest): Promise<ValidationIssue[]> {
    const prompt = this.buildQualityReviewPrompt(request);
    const provider = this.getProvider(this.modelConfig.provider);

    const response = await provider.complete({
      model: this.modelConfig.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 800
    });

    return this.parseQualityReviewResponse(response.content);
  }

  private calculateScores(issues: ValidationIssue[], request: ValidationRequest): ValidationScores {
    const ethicalIssues = issues.filter(i => i.type === 'ethical');
    const biasIssues = issues.filter(i => i.type === 'bias');
    const qualityIssues = issues.filter(i => i.type === 'quality');
    const complianceIssues = issues.filter(i => i.type === 'compliance');

    const ethical = this.calculateCategoryScore(ethicalIssues);
    const bias = 1 - this.calculateCategoryScore(biasIssues); // Inverted for bias
    const quality = this.calculateCategoryScore(qualityIssues);
    const compliance = this.calculateCategoryScore(complianceIssues);
    const accuracy = this.calculateAccuracyScore(issues);
    const clarity = this.calculateClarityScore(issues);

    const overall = (ethical * 0.25 + bias * 0.25 + quality * 0.2 + compliance * 0.15 + accuracy * 0.1 + clarity * 0.05);

    return { ethical, bias, quality, compliance, accuracy, clarity, overall };
  }

  private calculateCategoryScore(issues: ValidationIssue[]): number {
    if (issues.length === 0) return 1.0;

    const severityWeights = {
      low: 0.1,
      medium: 0.3,
      high: 0.6,
      critical: 1.0
    };

    let totalDeduction = 0;
    for (const issue of issues) {
      totalDeduction += severityWeights[issue.severity];
    }

    // Cap maximum deduction
    totalDeduction = Math.min(totalDeduction, 0.9);

    return Math.max(0.1, 1.0 - totalDeduction);
  }

  private calculateAccuracyScore(issues: ValidationIssue[]): number {
    const factualIssues = issues.filter(issue => issue.type === 'factual');
    return this.calculateCategoryScore(factualIssues);
  }

  private calculateClarityScore(issues: ValidationIssue[]): number {
    const clarityIssues = issues.filter(issue => issue.type === 'quality' && 
      issue.description.toLowerCase().includes('clarity'));
    return this.calculateCategoryScore(clarityIssues);
  }

  private async generateSuggestions(
    issues: ValidationIssue[],
    request: ValidationRequest
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Extract suggestions from issues
    for (const issue of issues) {
      if (issue.suggestedFix) {
        suggestions.push(issue.suggestedFix);
      }
    }

    // Generate additional AI-powered suggestions
    if (issues.length > 0) {
      const aiSuggestions = await this.generateAISuggestions(issues, request);
      suggestions.push(...aiSuggestions);
    }

    // Remove duplicates and limit
    return [...new Set(suggestions)].slice(0, 10);
  }

  private async generateAISuggestions(
    issues: ValidationIssue[],
    request: ValidationRequest
  ): Promise<string[]> {
    const prompt = this.buildSuggestionPrompt(issues, request);
    const provider = this.getProvider(this.modelConfig.provider);

    try {
      const response = await provider.complete({
        model: this.modelConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500
      });

      return this.parseSuggestionResponse(response.content);
    } catch (error) {
      logger.warn('Failed to generate AI suggestions', {
        requestId: request.id,
        error: error.message
      });
      return [];
    }
  }

  private determineStatus(scores: ValidationScores, issues: ValidationIssue[]): 'approved' | 'rejected' | 'modified' | 'escalated' {
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');

    if (criticalIssues.length > 0) {
      return 'escalated';
    }

    if (scores.overall < 0.5 || highIssues.length > 2) {
      return 'rejected';
    }

    if (scores.overall < 0.8 || issues.length > 0) {
      return 'modified';
    }

    return 'approved';
  }

  private createMetadata(request: ValidationRequest, issues: ValidationIssue[]): ValidationMetadata {
    const appliedRules = Array.from(this.validationRules.keys());
    const checklist = this.createValidationChecklist(issues);

    return {
      validatorModel: this.modelConfig,
      confidence: this.calculateConfidence(issues),
      rulesApplied: appliedRules,
      checklistResults: checklist
    };
  }

  private calculateConfidence(issues: ValidationIssue[]): number {
    // Base confidence
    let confidence = 0.9;

    // Reduce confidence based on uncertainty in issues
    const uncertainIssues = issues.filter(i => 
      i.description.includes('might') || i.description.includes('possibly')
    );

    confidence -= uncertainIssues.length * 0.05;

    return Math.max(0.1, Math.min(0.99, confidence));
  }

  private createValidationChecklist(issues: ValidationIssue[]): Record<string, boolean> {
    const checklist = {
      ethical_review: true,
      bias_check: true,
      quality_assessment: true,
      compliance_check: true,
      harmful_content: true,
      privacy_concerns: true,
      factual_accuracy: true
    };

    // Mark failed checks
    for (const issue of issues) {
      switch (issue.type) {
        case 'ethical':
          checklist.ethical_review = false;
          if (issue.description.includes('harmful')) {
            checklist.harmful_content = false;
          }
          break;
        case 'bias':
          checklist.bias_check = false;
          break;
        case 'quality':
          checklist.quality_assessment = false;
          if (issue.description.includes('accuracy')) {
            checklist.factual_accuracy = false;
          }
          break;
        case 'compliance':
          checklist.compliance_check = false;
          if (issue.description.includes('privacy')) {
            checklist.privacy_concerns = false;
          }
          break;
      }
    }

    return checklist;
  }

  // Helper methods for specific checks

  private async checkEthicalGuideline(
    content: any,
    guideline: EthicalGuideline
  ): Promise<EthicalViolation | null> {
    // Implementation would depend on the specific guideline
    return null; // Placeholder
  }

  private analyzeQuality(content: any): QualityMetrics {
    // Implement quality analysis algorithms
    return {
      readability: 0.8,
      coherence: 0.9,
      completeness: 0.85
    };
  }

  private async checkComplianceRule(
    content: any,
    rule: ComplianceRule
  ): Promise<ComplianceViolation | null> {
    // Implementation would depend on the specific rule
    return null; // Placeholder
  }

  // Prompt building methods

  private buildEthicalReviewPrompt(request: ValidationRequest): string {
    return `
Review the following content for ethical concerns:

Content Type: ${request.contentType}
Content: ${JSON.stringify(request.content)}

Check for:
- Harmful or offensive content
- Discrimination or bias
- Privacy violations
- Misleading information
- Inappropriate tone or language

Respond with a JSON array of issues found, each containing:
- type: "ethical"
- severity: "low" | "medium" | "high" | "critical"
- description: string
- location: string (if applicable)
- suggestedFix: string

If no issues found, respond with an empty array.
    `.trim();
  }

  private buildBiasReviewPrompt(request: ValidationRequest): string {
    return `
Analyze the following content for potential bias:

Content Type: ${request.contentType}
Content: ${JSON.stringify(request.content)}

Check for various types of bias including:
- Gender bias
- Racial/ethnic bias
- Age bias
- Cultural bias
- Confirmation bias
- Selection bias

Respond with a JSON array of bias issues found, each containing:
- type: "bias"
- severity: "low" | "medium" | "high" | "critical"
- description: string
- location: string (if applicable)
- evidence: array of strings
- suggestedFix: string

If no bias detected, respond with an empty array.
    `.trim();
  }

  private buildQualityReviewPrompt(request: ValidationRequest): string {
    return `
Assess the quality of the following content:

Content Type: ${request.contentType}
Content: ${JSON.stringify(request.content)}

Evaluate:
- Clarity and readability
- Completeness and thoroughness
- Accuracy and factual correctness
- Relevance to the context
- Professional tone and grammar

Respond with a JSON array of quality issues found, each containing:
- type: "quality"
- severity: "low" | "medium" | "high"
- description: string
- suggestedFix: string

If quality is acceptable, respond with an empty array.
    `.trim();
  }

  private buildSuggestionPrompt(issues: ValidationIssue[], request: ValidationRequest): string {
    return `
Based on the following validation issues, provide specific suggestions for improvement:

Issues: ${JSON.stringify(issues)}
Content Type: ${request.contentType}

Provide 3-5 actionable suggestions to address these issues.
Respond with a JSON array of suggestion strings.
    `.trim();
  }

  // Response parsing methods

  private parseEthicalReviewResponse(response: string): ValidationIssue[] {
    try {
      return JSON.parse(response) || [];
    } catch {
      return [];
    }
  }

  private parseBiasReviewResponse(response: string): ValidationIssue[] {
    try {
      return JSON.parse(response) || [];
    } catch {
      return [];
    }
  }

  private parseQualityReviewResponse(response: string): ValidationIssue[] {
    try {
      return JSON.parse(response) || [];
    } catch {
      return [];
    }
  }

  private parseSuggestionResponse(response: string): string[] {
    try {
      return JSON.parse(response) || [];
    } catch {
      return [];
    }
  }

  private validateRequest(request: ValidationRequest): void {
    if (!request.id || !request.generationId || !request.content) {
      throw new ValidationError('Invalid request: missing required fields');
    }
  }

  private validateRule(rule: ValidationRule): void {
    if (!rule.id || !rule.name || !rule.type) {
      throw new ValidationError('Invalid rule: missing required fields');
    }
  }

  private getRecentErrorRate(): number {
    return metrics.getErrorRate('validation', 3600); // Last hour
  }

  private async getQueueDepth(): Promise<number> {
    return this.queueManager?.getQueueStats('validation').then(stats => stats.length) || 0;
  }
}

// Supporting interfaces and types
interface B1ValidatorConfig extends BaseComponentConfig {
  validationRules: ValidationRule[];
  modelConfig: ModelConfig;
  ethicalGuidelines: EthicalGuideline[];
  biasDetectors: BiasDetector[];
  complianceRules: ComplianceRule[];
  batchConcurrency?: number;
}

interface EthicalGuideline {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: DisagreementSeverity;
}

interface BiasDetector {
  id: string;
  name: string;
  type: string;
  detect(content: any, context: any): Promise<BiasDetectionResult>;
}

interface BiasDetectionResult {
  detected: boolean;
  type: string;
  severity: DisagreementSeverity;
  description: string;
  location?: string;
  evidence: string[];
  mitigation: string;
}

interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  regulation: string;
  severity: DisagreementSeverity;
}

interface EthicalViolation {
  severity: DisagreementSeverity;
  description: string;
  location?: string;
  evidence?: string[];
  suggestedFix: string;
}

interface ComplianceViolation {
  severity: DisagreementSeverity;
  description: string;
  location?: string;
  evidence?: string[];
  suggestedFix: string;
}

interface QualityMetrics {
  readability: number;
  coherence: number;
  completeness: number;
}

export { B1ValidatorConfig };