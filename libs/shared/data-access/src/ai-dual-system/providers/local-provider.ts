/**
 * Local AI Provider (Placeholder)
 */

import { AIProvider, CompletionRequest, CompletionResponse, RateLimitStatus } from '../core/base-ai-component';

export default class LocalProvider implements AIProvider {
  constructor(config: any) {
    // TODO: Implement local AI provider
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    throw new Error('Local provider not implemented');
  }

  async healthCheck(): Promise<void> {
    throw new Error('Local provider not implemented');
  }

  getRateLimit(): RateLimitStatus {
    return {
      requests: 0,
      tokens: 0,
      resetAt: new Date()
    };
  }
}