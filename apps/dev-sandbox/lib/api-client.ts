/**
 * API Testing Client
 * Provides utilities for testing and interacting with API endpoints
 */

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string | number | boolean>;
  timeout?: number;
  retries?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  ok: boolean;
  duration: number;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private interceptors: {
    request: Array<(config: RequestOptions) => RequestOptions | Promise<RequestOptions>>;
    response: Array<(response: ApiResponse) => ApiResponse | Promise<ApiResponse>>;
    error: Array<(error: ApiError) => ApiError | Promise<ApiError>>;
  };

  constructor(baseUrl: string = '', defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    };
    this.interceptors = {
      request: [],
      response: [],
      error: [],
    };
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(
    interceptor: (config: RequestOptions) => RequestOptions | Promise<RequestOptions>
  ): void {
    this.interceptors.request.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(
    interceptor: (response: ApiResponse) => ApiResponse | Promise<ApiResponse>
  ): void {
    this.interceptors.response.push(interceptor);
  }

  /**
   * Add error interceptor
   */
  addErrorInterceptor(
    interceptor: (error: ApiError) => ApiError | Promise<ApiError>
  ): void {
    this.interceptors.error.push(interceptor);
  }

  /**
   * Make API request
   */
  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    let config = { ...options };

    // Apply request interceptors
    for (const interceptor of this.interceptors.request) {
      config = await interceptor(config);
    }

    const url = this.buildUrl(endpoint, config.query);
    const fetchOptions: RequestInit = {
      method: config.method || 'GET',
      headers: {
        ...this.defaultHeaders,
        ...config.headers,
      },
    };

    if (config.body && ['POST', 'PUT', 'PATCH'].includes(fetchOptions.method!)) {
      fetchOptions.body = JSON.stringify(config.body);
    }

    if (config.timeout) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);
      fetchOptions.signal = controller.signal;
    }

    try {
      let response = await this.fetchWithRetry(url, fetchOptions, config.retries || 0);
      
      const data = await this.parseResponse<T>(response);
      const duration = Date.now() - startTime;

      let apiResponse: ApiResponse<T> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        ok: response.ok,
        duration,
      };

      // Apply response interceptors
      for (const interceptor of this.interceptors.response) {
        apiResponse = await interceptor(apiResponse);
      }

      return apiResponse;
    } catch (error: any) {
      let apiError: ApiError = {
        message: error.message || 'Request failed',
        status: error.status,
        code: error.code,
        details: error,
      };

      // Apply error interceptors
      for (const interceptor of this.interceptors.error) {
        apiError = await interceptor(apiError);
      }

      throw apiError;
    }
  }

  /**
   * Convenience methods
   */
  get<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  put<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  patch<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  delete<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(endpoint: string, query?: Record<string, string | number | boolean>): string {
    const url = new URL(endpoint, this.baseUrl);
    
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    
    return url.toString();
  }

  /**
   * Parse response based on content type
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return response.json();
    } else if (contentType?.includes('text/')) {
      return response.text() as any;
    } else {
      return response.blob() as any;
    }
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries: number,
    attempt: number = 1
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok && retries > 0 && this.shouldRetry(response.status)) {
        await this.delay(this.getRetryDelay(attempt));
        return this.fetchWithRetry(url, options, retries - 1, attempt + 1);
      }
      
      return response;
    } catch (error) {
      if (retries > 0) {
        await this.delay(this.getRetryDelay(attempt));
        return this.fetchWithRetry(url, options, retries - 1, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Check if status code is retryable
   */
  private shouldRetry(status: number): boolean {
    return [408, 429, 500, 502, 503, 504].includes(status);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private getRetryDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt - 1), 10000);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create API test suite
 */
export function createApiTestSuite(baseUrl: string) {
  const client = new ApiClient(baseUrl);
  
  return {
    client,
    
    /**
     * Test endpoint availability
     */
    async testEndpoint(endpoint: string, expectedStatus: number = 200): Promise<boolean> {
      try {
        const response = await client.get(endpoint);
        return response.status === expectedStatus;
      } catch (error: any) {
        return error.status === expectedStatus;
      }
    },
    
    /**
     * Test CRUD operations
     */
    async testCrud<T = any>(resourceEndpoint: string, testData: T): Promise<{
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
    }> {
      const results = {
        create: false,
        read: false,
        update: false,
        delete: false,
      };
      
      try {
        // Create
        const createResponse = await client.post(resourceEndpoint, testData);
        results.create = createResponse.ok;
        const id = createResponse.data.id;
        
        // Read
        const readResponse = await client.get(`${resourceEndpoint}/${id}`);
        results.read = readResponse.ok;
        
        // Update
        const updateResponse = await client.patch(`${resourceEndpoint}/${id}`, { updated: true });
        results.update = updateResponse.ok;
        
        // Delete
        const deleteResponse = await client.delete(`${resourceEndpoint}/${id}`);
        results.delete = deleteResponse.ok;
      } catch (error) {
        console.error('CRUD test error:', error);
      }
      
      return results;
    },
    
    /**
     * Load test endpoint
     */
    async loadTest(
      endpoint: string,
      options: {
        requests: number;
        concurrent: number;
        method?: RequestOptions['method'];
        body?: any;
      }
    ): Promise<{
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      averageResponseTime: number;
      minResponseTime: number;
      maxResponseTime: number;
    }> {
      const { requests, concurrent, method = 'GET', body } = options;
      const results: number[] = [];
      let successCount = 0;
      let failCount = 0;
      
      const makeRequest = async () => {
        try {
          const response = await client.request(endpoint, { method, body });
          results.push(response.duration);
          if (response.ok) successCount++;
          else failCount++;
        } catch (error) {
          failCount++;
          results.push(-1);
        }
      };
      
      // Execute requests in batches
      for (let i = 0; i < requests; i += concurrent) {
        const batch = Math.min(concurrent, requests - i);
        await Promise.all(Array(batch).fill(null).map(() => makeRequest()));
      }
      
      const validResults = results.filter(r => r > 0);
      
      return {
        totalRequests: requests,
        successfulRequests: successCount,
        failedRequests: failCount,
        averageResponseTime: validResults.reduce((a, b) => a + b, 0) / validResults.length || 0,
        minResponseTime: Math.min(...validResults) || 0,
        maxResponseTime: Math.max(...validResults) || 0,
      };
    },
  };
}

/**
 * Mock API client for testing
 */
export class MockApiClient extends ApiClient {
  private mocks: Map<string, { response: any; status: number }> = new Map();
  
  /**
   * Add mock response
   */
  addMock(endpoint: string, response: any, status: number = 200): void {
    this.mocks.set(endpoint, { response, status });
  }
  
  /**
   * Clear all mocks
   */
  clearMocks(): void {
    this.mocks.clear();
  }
  
  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const mock = this.mocks.get(endpoint);
    
    if (mock) {
      return {
        data: mock.response,
        status: mock.status,
        statusText: mock.status === 200 ? 'OK' : 'Error',
        headers: new Headers(),
        ok: mock.status >= 200 && mock.status < 300,
        duration: Math.random() * 100,
      };
    }
    
    return super.request(endpoint, options);
  }
}