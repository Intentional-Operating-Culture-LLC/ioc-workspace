/**
 * OpenAI Provider for the dual-AI system
 * Handles OpenAI API integration with rate limiting and error handling
 */

import { AIProvider, CompletionRequest, CompletionResponse, RateLimitStatus, ProviderConfig } from '../core/base-ai-component';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export default class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private rateLimit: RateLimitStatus;

  constructor(config: ProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
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
      const openaiRequest = this.formatRequest(request);

      // Make API call
      const response = await this.makeRequest('/chat/completions', openaiRequest);

      // Extract response
      const completion = this.extractCompletion(response);

      // Update rate limits from headers
      this.updateRateLimit(response.headers);

      // Record metrics
      const duration = performance.now() - startTime;
      metrics.histogram('openai_request_duration', duration, { model: request.model });
      metrics.increment('openai_request_success', { model: request.model });
      
      if (completion.usage) {
        metrics.histogram('openai_tokens', completion.usage.total_tokens, { model: request.model });
        metrics.histogram('openai_cost', this.calculateCost(request.model, completion.usage), { model: request.model });
      }

      logger.debug('OpenAI request completed', {
        model: request.model,
        duration: Math.round(duration),
        tokens: completion.usage?.total_tokens,
        finishReason: completion.finishReason
      });

      return completion;

    } catch (error) {
      const duration = performance.now() - startTime;
      
      logger.error('OpenAI request failed', {
        model: request.model,
        error: error.message,
        duration: Math.round(duration)
      });

      metrics.histogram('openai_request_duration', duration, { 
        model: request.model, 
        status: 'error' 
      });
      metrics.increment('openai_request_error', { 
        model: request.model,
        error: error.name 
      });

      throw this.handleError(error);
    }
  }

  async healthCheck(): Promise<void> {
    try {
      await this.makeRequest('/models', {}, 'GET');
    } catch (error) {
      throw new Error(`OpenAI health check failed: ${error.message}`);
    }
  }

  getRateLimit(): RateLimitStatus {
    return { ...this.rateLimit };
  }

  private formatRequest(request: CompletionRequest): any {
    return {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 2048,
      top_p: request.top_p ?? 1.0,
      frequency_penalty: request.frequency_penalty ?? 0,
      presence_penalty: request.presence_penalty ?? 0,
      stop: request.stop
    };
  }

  private async makeRequest(endpoint: string, body: any, method: string = 'POST'): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
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
      throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
    }

    return {
      data: await response.json(),
      headers: response.headers
    };
  }

  private extractCompletion(response: any): CompletionResponse {
    const data = response.data;
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No completion choices returned from OpenAI');
    }

    const choice = data.choices[0];
    
    return {
      content: choice.message?.content || choice.text || '',
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0
      },
      model: data.model,
      finishReason: choice.finish_reason || 'unknown'
    };
  }

  private updateRateLimit(headers: Headers): void {
    const remaining = headers.get('x-ratelimit-remaining-requests');
    const reset = headers.get('x-ratelimit-reset-requests');
    const limit = headers.get('x-ratelimit-limit-requests');

    if (remaining) {
      this.rateLimit.remaining = parseInt(remaining, 10);
    }

    if (reset) {
      // OpenAI reset header is in format like "1m23s"
      const resetMs = this.parseResetTime(reset);
      this.rateLimit.reset = new Date(Date.now() + resetMs);
    }

    if (limit) {
      this.rateLimit.limit = parseInt(limit, 10);
    }
  }

  private parseResetTime(resetStr: string): number {
    // Parse strings like "1m23s" or "45s"
    const timeRegex = /(?:(\d+)m)?(?:(\d+)s)?/;
    const match = resetStr.match(timeRegex);
    
    if (!match) return 60000; // Default to 1 minute

    const minutes = parseInt(match[1] || '0', 10);
    const seconds = parseInt(match[2] || '0', 10);
    
    return (minutes * 60 + seconds) * 1000;
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
    // OpenAI pricing (as of 2024 - adjust as needed)
    const pricing: Record<string, { prompt: number; completion: number }> = {
      'gpt-4': { prompt: 0.03, completion: 0.06 },
      'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
      'gpt-4o': { prompt: 0.005, completion: 0.015 },
      'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 },
      'gpt-3.5-turbo-16k': { prompt: 0.003, completion: 0.004 }
    };

    const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];
    
    const promptCost = (usage.prompt_tokens / 1000) * modelPricing.prompt;
    const completionCost = (usage.completion_tokens / 1000) * modelPricing.completion;
    
    return promptCost + completionCost;
  }

  private handleError(error: any): Error {
    if (error.name === 'AbortError') {
      return new Error('OpenAI request timeout');
    }

    if (error.message?.includes('429')) {
      return new Error('OpenAI rate limit exceeded');
    }

    if (error.message?.includes('401')) {
      return new Error('OpenAI authentication failed');
    }

    if (error.message?.includes('402')) {
      return new Error('OpenAI quota exceeded');
    }

    if (error.message?.includes('503')) {
      return new Error('OpenAI service unavailable');
    }

    return error;
  }
}