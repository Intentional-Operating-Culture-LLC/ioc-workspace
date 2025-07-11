/**
 * A1 Generator - Content Generation Component
 * Responsible for generating assessments, reports, insights, and coaching content
 */

import {
  IA1Generator,
  GenerationRequest,
  GenerationResponse,
  GeneratorCapabilities,
  ComponentHealth,
  ModelConfig,
  GenerationError,
  GenerationMetadata,
  TokenUsage,
  ContentType
} from './interfaces';
import { BaseAIComponent, BaseComponentConfig } from './base-ai-component';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export class A1Generator extends BaseAIComponent implements IA1Generator {
  private modelConfigs: Map<ContentType, ModelConfig>;
  private promptTemplates: Map<string, string>;
  private capabilities: GeneratorCapabilities;

  constructor(config: A1GeneratorConfig) {
    super(config);
    this.modelConfigs = new Map(config.modelConfigs);
    this.promptTemplates = new Map(config.promptTemplates);
    this.capabilities = config.capabilities;
  }

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    const startTime = Date.now();
    const traceId = this.generateTraceId();

    try {
      logger.info('Starting content generation', {
        traceId,
        requestId: request.id,
        type: request.type,
        userId: request.userId
      });

      // Validate request
      this.validateRequest(request);

      // Get appropriate model configuration
      const modelConfig = this.getModelConfig(request.type);

      // Build prompt
      const prompt = await this.buildPrompt(request);

      // Generate content
      const content = await this.generateContent(prompt, modelConfig, request);

      // Extract metadata
      const metadata = this.extractMetadata(content, request);

      // Track token usage
      const tokenUsage = this.calculateTokenUsage(prompt, content);

      const response: GenerationResponse = {
        requestId: request.id,
        content: content.result,
        model: modelConfig,
        metadata,
        processingTime: Date.now() - startTime,
        tokenUsage
      };

      // Record metrics
      metrics.record('generation_success', 1, {
        type: request.type,
        duration: response.processingTime,
        tokens: tokenUsage.total,
        confidence: metadata.confidence
      });

      logger.info('Content generation completed', {
        traceId,
        requestId: request.id,
        duration: response.processingTime,
        confidence: metadata.confidence
      });

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Content generation failed', {
        traceId,
        requestId: request.id,
        error: error.message,
        duration
      });

      metrics.record('generation_error', 1, {
        type: request.type,
        error: error.constructor.name,
        duration
      });

      throw new GenerationError(
        `Failed to generate content: ${error.message}`,
        { requestId: request.id, traceId, originalError: error }
      );
    }
  }

  async generateBatch(requests: GenerationRequest[]): Promise<GenerationResponse[]> {
    const batchId = this.generateBatchId();
    const startTime = Date.now();

    try {
      logger.info('Starting batch generation', {
        batchId,
        count: requests.length
      });

      // Process requests in parallel with concurrency limit
      const concurrency = (this.config as A1GeneratorConfig).batchConcurrency || 5;
      const results: GenerationResponse[] = [];

      for (let i = 0; i < requests.length; i += concurrency) {
        const batch = requests.slice(i, i + concurrency);
        const batchPromises = batch.map(request => this.generate(request));
        const batchResults = await Promise.allSettled(batchPromises);

        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            logger.error('Batch item failed', {
              batchId,
              error: result.reason.message
            });
            // Could implement fallback or retry logic here
          }
        }
      }

      const duration = Date.now() - startTime;
      
      logger.info('Batch generation completed', {
        batchId,
        total: requests.length,
        successful: results.length,
        duration
      });

      metrics.record('batch_generation', 1, {
        total: requests.length,
        successful: results.length,
        duration
      });

      return results;

    } catch (error) {
      logger.error('Batch generation failed', {
        batchId,
        error: error.message
      });

      throw new GenerationError(
        `Batch generation failed: ${error.message}`,
        { batchId, requestCount: requests.length }
      );
    }
  }

  getCapabilities(): GeneratorCapabilities {
    return { ...this.capabilities };
  }

  async getHealth(): Promise<ComponentHealth> {
    const startTime = Date.now();

    try {
      // Test basic functionality
      const testRequest: GenerationRequest = {
        id: 'health-check',
        userId: 'system',
        organizationId: 'system',
        type: 'insight',
        context: { test: true },
        timestamp: new Date()
      };

      await this.generate(testRequest);

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

  // Private methods

  private validateRequest(request: GenerationRequest): void {
    if (!request.id || !request.userId || !request.type) {
      throw new GenerationError('Invalid request: missing required fields');
    }

    if (!this.capabilities.supportedTypes.includes(request.type)) {
      throw new GenerationError(`Unsupported content type: ${request.type}`);
    }

    // Add more validation as needed
  }

  private getModelConfig(type: ContentType): ModelConfig {
    const config = this.modelConfigs.get(type) || this.modelConfigs.get('assessment');
    if (!config) {
      throw new GenerationError(`No model configuration found for type: ${type}`);
    }
    return config;
  }

  private async buildPrompt(request: GenerationRequest): Promise<string> {
    const templateKey = this.getTemplateKey(request.type, request.options?.style);
    const baseTemplate = this.promptTemplates.get(templateKey);
    
    if (!baseTemplate) {
      throw new GenerationError(`No prompt template found for key: ${templateKey}`);
    }

    // Apply context and customization
    let prompt = baseTemplate;

    // Replace placeholders with actual values
    prompt = this.replacePlaceholders(prompt, request.context);

    // Apply style modifications
    if (request.options?.style) {
      prompt = this.applyStyleModifications(prompt, request.options.style);
    }

    // Apply cultural context
    if (request.options?.culturalContext) {
      prompt = this.applyCulturalContext(prompt, request.options.culturalContext);
    }

    // Apply industry context
    if (request.options?.industryContext) {
      prompt = this.applyIndustryContext(prompt, request.options.industryContext);
    }

    return prompt;
  }

  private async generateContent(
    prompt: string,
    modelConfig: ModelConfig,
    request: GenerationRequest
  ): Promise<ContentGenerationResult> {
    const provider = this.getProvider(modelConfig.provider);
    
    const generationRequest = {
      model: modelConfig.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: modelConfig.temperature || 0.7,
      max_tokens: modelConfig.maxTokens || 2048,
      top_p: modelConfig.topP || 0.9,
      frequency_penalty: modelConfig.frequencyPenalty || 0,
      presence_penalty: modelConfig.presencePenalty || 0
    };

    const response = await provider.complete(generationRequest as any);

    return {
      result: this.parseResponse(response.content, request.type),
      raw: response.content,
      usage: response.usage,
      reasoning: this.extractReasoning(response.content),
      confidence: this.estimateConfidence(response)
    };
  }

  private extractMetadata(
    content: ContentGenerationResult,
    request: GenerationRequest
  ): GenerationMetadata {
    return {
      confidence: content.confidence,
      reasoning: content.reasoning,
      sources: this.extractSources(content.result),
      assumptions: this.extractAssumptions(content.result),
      limitations: this.extractLimitations(content.result)
    };
  }

  private calculateTokenUsage(prompt: string, content: ContentGenerationResult): TokenUsage {
    // Estimate token usage based on content length
    // In a real implementation, this would come from the API response
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(content.raw.length / 4);
    const total = promptTokens + completionTokens;

    return {
      prompt: promptTokens,
      completion: completionTokens,
      total,
      cost: this.calculateCost(total, content.confidence)
    };
  }

  private parseResponse(content: string, type: ContentType): any {
    try {
      // Type-specific parsing logic
      switch (type) {
        case 'assessment':
          return this.parseAssessmentResponse(content);
        case 'report':
          return this.parseReportResponse(content);
        case 'coaching':
          return this.parseCoachingResponse(content);
        case 'insight':
          return this.parseInsightResponse(content);
        case 'recommendation':
          return this.parseRecommendationResponse(content);
        default:
          return { content };
      }
    } catch (error) {
      logger.warn('Failed to parse response, returning raw content', {
        type,
        error: error.message
      });
      return { content };
    }
  }

  private parseAssessmentResponse(content: string): any {
    // Parse assessment-specific response format
    try {
      const parsed = JSON.parse(content);
      return {
        questions: parsed.questions || [],
        metadata: parsed.metadata || {},
        scoring: parsed.scoring || {}
      };
    } catch {
      // Fallback to structured text parsing
      return this.parseStructuredText(content, 'assessment');
    }
  }

  private parseReportResponse(content: string): any {
    try {
      const parsed = JSON.parse(content);
      return {
        sections: parsed.sections || [],
        summary: parsed.summary || '',
        recommendations: parsed.recommendations || [],
        metrics: parsed.metrics || {}
      };
    } catch {
      return this.parseStructuredText(content, 'report');
    }
  }

  private parseCoachingResponse(content: string): any {
    try {
      const parsed = JSON.parse(content);
      return {
        message: parsed.message || content,
        tone: parsed.tone || 'supportive',
        actionItems: parsed.actionItems || [],
        resources: parsed.resources || []
      };
    } catch {
      return { message: content };
    }
  }

  private parseInsightResponse(content: string): any {
    try {
      const parsed = JSON.parse(content);
      return {
        insight: parsed.insight || content,
        evidence: parsed.evidence || [],
        implications: parsed.implications || [],
        confidence: parsed.confidence || 0.7
      };
    } catch {
      return { insight: content };
    }
  }

  private parseRecommendationResponse(content: string): any {
    try {
      const parsed = JSON.parse(content);
      return {
        recommendations: parsed.recommendations || [],
        priority: parsed.priority || 'medium',
        timeline: parsed.timeline || 'immediate',
        rationale: parsed.rationale || ''
      };
    } catch {
      return { recommendations: [content] };
    }
  }

  private parseStructuredText(content: string, type: string): any {
    // Implement text parsing logic for non-JSON responses
    const lines = content.split('\n').filter(line => line.trim());
    
    return {
      content,
      parsed: lines,
      type
    };
  }

  private getTemplateKey(type: ContentType, style?: string): string {
    return style ? `${type}_${style}` : type;
  }

  private replacePlaceholders(template: string, context: Record<string, any>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(context)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    
    return result;
  }

  private applyStyleModifications(prompt: string, style: string): string {
    const styleModifiers = {
      formal: 'Use a formal, professional tone. Avoid casual language.',
      casual: 'Use a conversational, friendly tone. Keep it approachable.',
      technical: 'Include technical details and precise terminology.',
      executive: 'Focus on strategic insights and high-level recommendations.'
    };

    const modifier = styleModifiers[style as keyof typeof styleModifiers];
    return modifier ? `${prompt}\n\nStyle: ${modifier}` : prompt;
  }

  private applyCulturalContext(prompt: string, context: string): string {
    return `${prompt}\n\nCultural Context: Consider ${context} cultural norms and values.`;
  }

  private applyIndustryContext(prompt: string, context: string): string {
    return `${prompt}\n\nIndustry Context: Tailor for ${context} industry specifics.`;
  }

  private extractReasoning(content: string): string[] {
    // Extract reasoning from structured responses
    const reasoningPattern = /(?:because|since|due to|reasoning:|rationale:)\s*([^.]+)/gi;
    const matches = content.match(reasoningPattern) || [];
    return matches.map(match => match.trim());
  }

  private estimateConfidence(response: any): number {
    // Estimate confidence based on response characteristics
    let confidence = 0.7; // Base confidence

    // Adjust based on response length
    if (response.content.length > 500) confidence += 0.1;
    if (response.content.length < 100) confidence -= 0.1;

    // Adjust based on structured data
    if (response.content.includes('confidence') || response.content.includes('certain')) {
      confidence += 0.1;
    }

    // Adjust based on uncertainty markers
    if (response.content.includes('might') || response.content.includes('possibly')) {
      confidence -= 0.1;
    }

    return Math.max(0.1, Math.min(0.99, confidence));
  }

  private extractSources(result: any): string[] {
    // Extract sources from the generated content
    if (typeof result === 'object' && result.sources) {
      return result.sources;
    }
    return [];
  }

  private extractAssumptions(result: any): string[] {
    // Extract assumptions from the generated content
    if (typeof result === 'object' && result.assumptions) {
      return result.assumptions;
    }
    return [];
  }

  private extractLimitations(result: any): string[] {
    // Extract limitations from the generated content
    if (typeof result === 'object' && result.limitations) {
      return result.limitations;
    }
    return [];
  }

  private calculateCost(tokens: number, confidence: number): number {
    // Calculate cost based on token usage and model
    const costPerThousandTokens = 0.002; // Example rate
    return (tokens / 1000) * costPerThousandTokens;
  }

  private getRecentErrorRate(): number {
    // Calculate error rate from recent metrics
    return metrics.getErrorRate('generation', 3600); // Last hour
  }

  private async getQueueDepth(): Promise<number> {
    // Get current queue depth
    return this.queueManager?.getQueueStats('generation').then(stats => stats.length) || 0;
  }
}

// Supporting interfaces and types
interface A1GeneratorConfig extends BaseComponentConfig {
  modelConfigs: [ContentType, ModelConfig][];
  promptTemplates: [string, string][];
  capabilities: GeneratorCapabilities;
  batchConcurrency?: number;
}

interface ContentGenerationResult {
  result: any;
  raw: string;
  usage: any;
  reasoning: string[];
  confidence: number;
}

export { A1GeneratorConfig };