/**
 * Anthropic Provider for the dual-AI system
 * Handles Anthropic Claude API integration with rate limiting and error handling
 */

import { AIProvider, CompletionRequest, CompletionResponse, RateLimitStatus, ProviderConfig } from '../core/base-ai-component';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export default class AnthropicProvider implements AIProvider {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private rateLimit: RateLimitStatus;

  constructor(config: ProviderConfig) {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
    this.timeout = config.timeout || 30000;
    this.rateLimit = {
      remaining: 1000,
      reset: new Date(Date.now() + 60000),
      limit: 1000
    };
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = performance.now();

    try {
      // Check rate limits
      await this.checkRateLimit();

      // Prepare request
      const anthropicRequest = this.formatRequest(request);

      // Make API call
      const response = await this.makeRequest('/v1/messages', anthropicRequest);

      // Extract response
      const completion = this.extractCompletion(response);

      // Update rate limits from headers
      this.updateRateLimit(response.headers);

      // Record metrics
      const duration = performance.now() - startTime;
      metrics.histogram('anthropic_request_duration', duration, { model: request.model });
      metrics.increment('anthropic_request_success', { model: request.model });
      
      if (completion.usage) {
        metrics.histogram('anthropic_tokens', completion.usage.total_tokens, { model: request.model });
        metrics.histogram('anthropic_cost', this.calculateCost(request.model, completion.usage), { model: request.model });
      }

      logger.debug('Anthropic request completed', {
        model: request.model,
        duration: Math.round(duration),
        tokens: completion.usage?.total_tokens,
        finishReason: completion.finishReason
      });

      return completion;

    } catch (error) {
      const duration = performance.now() - startTime;
      
      logger.error('Anthropic request failed', {
        model: request.model,
        error: error.message,
        duration: Math.round(duration)
      });

      metrics.histogram('anthropic_request_duration', duration, { 
        model: request.model, 
        status: 'error' 
      });
      metrics.increment('anthropic_request_error', { 
        model: request.model,
        error: error.name 
      });

      throw this.handleError(error);
    }
  }

  async healthCheck(): Promise<void> {
    try {
      // Anthropic doesn't have a dedicated health endpoint, so we'll make a minimal request
      await this.makeRequest('/v1/messages', {
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'health check' }]
      });
    } catch (error) {
      throw new Error(`Anthropic health check failed: ${error.message}`);
    }
  }

  getRateLimit(): RateLimitStatus {
    return { ...this.rateLimit };
  }

  private formatRequest(request: CompletionRequest): any {
    // Convert OpenAI-style messages to Anthropic format
    const messages = request.messages.filter(msg => msg.role !== 'system');
    const systemMessage = request.messages.find(msg => msg.role === 'system');

    const anthropicRequest: any = {
      model: request.model,
      max_tokens: request.max_tokens ?? 2048,
      messages: messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))
    };

    if (systemMessage) {
      anthropicRequest.system = systemMessage.content;
    }

    if (request.temperature !== undefined) {
      anthropicRequest.temperature = request.temperature;
    }

    if (request.top_p !== undefined) {
      anthropicRequest.top_p = request.top_p;
    }

    if (request.stop) {
      anthropicRequest.stop_sequences = request.stop;
    }

    return anthropicRequest;
  }

  private async makeRequest(endpoint: string, body: any, method: string = 'POST'): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'User-Agent': 'IOC-DualAI/1.0'
    };

    const options: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout)
    };

    if (method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${errorBody}`);
    }

    return {
      data: await response.json(),
      headers: response.headers
    };
  }

  private extractCompletion(response: any): CompletionResponse {
    const data = response.data;
    
    if (!data.content || data.content.length === 0) {
      throw new Error('No content returned from Anthropic');
    }

    // Anthropic returns content as an array of content blocks
    const content = data.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('');
    
    return {
      content,
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      },
      model: data.model,
      finishReason: data.stop_reason || 'unknown'
    };
  }

  private updateRateLimit(headers: Headers): void {
    const remaining = headers.get('anthropic-ratelimit-requests-remaining');
    const reset = headers.get('anthropic-ratelimit-requests-reset');
    const limit = headers.get('anthropic-ratelimit-requests-limit');

    if (remaining) {
      this.rateLimit.remaining = parseInt(remaining, 10);
    }

    if (reset) {
      // Anthropic reset header is typically a timestamp
      this.rateLimit.reset = new Date(reset);
    }

    if (limit) {
      this.rateLimit.limit = parseInt(limit, 10);
    }
  }

  private async checkRateLimit(): Promise<void> {
    if (this.rateLimit.remaining <= 0 && new Date() < this.rateLimit.reset) {
      const waitTime = this.rateLimit.reset.getTime() - Date.now();
      
      logger.warn('Rate limit exceeded, waiting', {
        waitTime,
        resetTime: this.rateLimit.reset.toISOString()
      });

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  private calculateCost(model: string, usage: any): number {
    // Anthropic pricing (as of 2024 - adjust as needed)
    const pricing: Record<string, { prompt: number; completion: number }> = {
      'claude-3-opus-20240229': { prompt: 0.015, completion: 0.075 },
      'claude-3-sonnet-20240229': { prompt: 0.003, completion: 0.015 },
      'claude-3-haiku-20240307': { prompt: 0.00025, completion: 0.00125 },
      'claude-3-5-sonnet-20241022': { prompt: 0.003, completion: 0.015 }
    };

    const modelPricing = pricing[model] || pricing['claude-3-haiku-20240307'];
    
    const promptCost = (usage.prompt_tokens / 1000) * modelPricing.prompt;
    const completionCost = (usage.completion_tokens / 1000) * modelPricing.completion;
    
    return promptCost + completionCost;
  }

  private handleError(error: any): Error {
    if (error.name === 'AbortError') {
      return new Error('Anthropic request timeout');
    }

    if (error.message?.includes('429')) {
      return new Error('Anthropic rate limit exceeded');
    }

    if (error.message?.includes('401')) {
      return new Error('Anthropic authentication failed');
    }

    if (error.message?.includes('402')) {
      return new Error('Anthropic quota exceeded');
    }

    if (error.message?.includes('503')) {
      return new Error('Anthropic service unavailable');
    }

    if (error.message?.includes('400')) {
      return new Error('Anthropic request invalid');
    }

    return error;
  }
}