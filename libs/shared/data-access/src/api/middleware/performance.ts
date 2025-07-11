/**
 * @fileoverview API performance middleware for response optimization
 * @description Implements compression, caching, and response optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

export interface CacheConfig {
  ttl?: number;
  staleWhileRevalidate?: number;
  tags?: string[];
}

export interface ResponseOptimizationOptions {
  enableCompression?: boolean;
  enableCaching?: boolean;
  cacheConfig?: CacheConfig;
  enableFieldFiltering?: boolean;
  enablePagination?: boolean;
}

/**
 * Response cache implementation
 */
class ResponseCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  set(key: string, data: any, ttl: number = 60000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }
}

const responseCache = new ResponseCache();

/**
 * API response optimization middleware
 */
export async function withResponseOptimization(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: ResponseOptimizationOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const {
      enableCompression = true,
      enableCaching = true,
      cacheConfig = {},
      enableFieldFiltering = true,
      enablePagination = true
    } = options;

    // Generate cache key
    const cacheKey = generateCacheKey(req);

    // Check cache
    if (enableCaching && req.method === 'GET') {
      const cached = responseCache.get(cacheKey);
      if (cached) {
        return createOptimizedResponse(cached, {
          'X-Cache': 'HIT',
          'Cache-Control': generateCacheControl(cacheConfig)
        });
      }
    }

    // Process request
    const response = await handler(req);
    
    // Extract response data
    let data = await response.json();

    // Apply field filtering if requested
    if (enableFieldFiltering) {
      data = applyFieldFiltering(data, req);
    }

    // Apply pagination if requested
    if (enablePagination) {
      data = applyPagination(data, req);
    }

    // Cache successful GET responses
    if (enableCaching && req.method === 'GET' && response.status === 200) {
      responseCache.set(cacheKey, data, cacheConfig.ttl || 60000);
    }

    // Create optimized response with compression
    return createOptimizedResponse(data, {
      'X-Cache': 'MISS',
      'Cache-Control': generateCacheControl(cacheConfig),
      ...(enableCompression ? { 'Content-Encoding': 'gzip' } : {})
    }, enableCompression);
  };
}

/**
 * Generate cache key from request
 */
function generateCacheKey(req: NextRequest): string {
  const url = new URL(req.url);
  const params = Array.from(url.searchParams.entries()).sort();
  return `${req.method}:${url.pathname}:${JSON.stringify(params)}`;
}

/**
 * Generate Cache-Control header
 */
function generateCacheControl(config: CacheConfig): string {
  const directives: string[] = [];
  
  if (config.ttl) {
    directives.push(`max-age=${Math.floor(config.ttl / 1000)}`);
  }
  
  if (config.staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${Math.floor(config.staleWhileRevalidate / 1000)}`);
  }
  
  if (config.tags && config.tags.length > 0) {
    directives.push('must-revalidate');
  }
  
  return directives.join(', ') || 'no-cache';
}

/**
 * Apply field filtering based on query parameters
 */
function applyFieldFiltering(data: any, req: NextRequest): any {
  const url = new URL(req.url);
  const fields = url.searchParams.get('fields');
  
  if (!fields) return data;
  
  const fieldList = fields.split(',').map(f => f.trim());
  
  if (Array.isArray(data)) {
    return data.map(item => filterFields(item, fieldList));
  }
  
  return filterFields(data, fieldList);
}

/**
 * Filter object fields
 */
function filterFields(obj: any, fields: string[]): any {
  const filtered: any = {};
  
  for (const field of fields) {
    if (field.includes('.')) {
      // Handle nested fields
      const [parent, ...rest] = field.split('.');
      if (obj[parent]) {
        filtered[parent] = filtered[parent] || {};
        const nestedField = rest.join('.');
        Object.assign(filtered[parent], filterFields(obj[parent], [nestedField]));
      }
    } else if (obj.hasOwnProperty(field)) {
      filtered[field] = obj[field];
    }
  }
  
  return filtered;
}

/**
 * Apply pagination to array responses
 */
function applyPagination(data: any, req: NextRequest): any {
  if (!Array.isArray(data)) return data;
  
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  
  const start = (page - 1) * limit;
  const end = start + limit;
  
  return {
    data: data.slice(start, end),
    pagination: {
      page,
      limit,
      total: data.length,
      totalPages: Math.ceil(data.length / limit),
      hasNext: end < data.length,
      hasPrev: page > 1
    }
  };
}

/**
 * Create optimized response with optional compression
 */
async function createOptimizedResponse(
  data: any,
  headers: Record<string, string>,
  compress: boolean = true
): Promise<NextResponse> {
  const jsonData = JSON.stringify(data);
  
  if (compress && jsonData.length > 1024) {
    // Compress responses larger than 1KB
    try {
      const compressed = await gzipAsync(Buffer.from(jsonData));
      return new NextResponse(compressed, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
    } catch (error) {
      console.error('Compression failed:', error);
    }
  }
  
  return NextResponse.json(data, {
    status: 200,
    headers
  });
}

/**
 * Batch API requests middleware
 */
export async function withBatchRequests(
  handlers: Map<string, (req: NextRequest) => Promise<NextResponse>>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    if (req.method !== 'POST') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const { requests } = await req.json();
    
    if (!Array.isArray(requests)) {
      return NextResponse.json({ error: 'Invalid batch request format' }, { status: 400 });
    }

    const results = await Promise.all(
      requests.map(async (batchReq: any) => {
        const handler = handlers.get(batchReq.endpoint);
        if (!handler) {
          return { error: 'Unknown endpoint', endpoint: batchReq.endpoint };
        }

        try {
          const mockReq = new NextRequest(
            new URL(batchReq.endpoint, req.url),
            {
              method: batchReq.method || 'GET',
              headers: req.headers,
              body: batchReq.body ? JSON.stringify(batchReq.body) : undefined
            }
          );

          const response = await handler(mockReq);
          const data = await response.json();
          
          return {
            endpoint: batchReq.endpoint,
            status: response.status,
            data
          };
        } catch (error) {
          return {
            endpoint: batchReq.endpoint,
            error: error instanceof Error ? error.message : 'Internal error'
          };
        }
      })
    );

    return NextResponse.json({ results }, {
      headers: {
        'X-Batch-Count': results.length.toString()
      }
    });
  };
}

/**
 * Export convenience functions
 */
export const apiCache = {
  set: (key: string, data: any, ttl?: number) => responseCache.set(key, data, ttl),
  get: (key: string) => responseCache.get(key),
  clear: () => responseCache.clear()
};