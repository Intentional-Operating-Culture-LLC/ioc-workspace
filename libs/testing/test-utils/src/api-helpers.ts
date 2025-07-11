/**
 * API testing helpers for IOC Core
 */

import { NextRequest } from 'next/server';

export interface MockRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  searchParams?: Record<string, string>;
  cookies?: Record<string, string>;
}

/**
 * Create a mock Next.js request
 */
export function createMockRequest(
  url: string,
  options: MockRequestOptions = {}
): NextRequest {
  const { method = 'GET', headers = {}, body, searchParams, cookies } = options;

  // Build URL with search params
  const fullUrl = new URL(url, 'http://localhost:3000');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      fullUrl.searchParams.set(key, value);
    });
  }

  // Create request init
  const init: RequestInit = {
    method,
    headers: new Headers(headers),
  };

  // Add body if provided
  if (body && method !== 'GET' && method !== 'HEAD') {
    init.body = JSON.stringify(body);
    init.headers = new Headers({
      'Content-Type': 'application/json',
      ...headers,
    });
  }

  const request = new NextRequest(fullUrl.toString(), init);

  // Add cookies if provided
  if (cookies) {
    Object.entries(cookies).forEach(([name, value]) => {
      request.cookies.set(name, value);
    });
  }

  return request;
}

/**
 * Create a mock authenticated request
 */
export function createAuthenticatedRequest(
  url: string,
  token: string,
  options: MockRequestOptions = {}
): NextRequest {
  return createMockRequest(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Test API response utilities
 */
export async function expectSuccessResponse(response: Response, expectedStatus = 200) {
  expect(response.status).toBe(expectedStatus);
  const data = await response.json();
  expect(data).toBeDefined();
  return data;
}

export async function expectErrorResponse(response: Response, expectedStatus = 400) {
  expect(response.status).toBe(expectedStatus);
  const data = await response.json();
  expect(data.error).toBeDefined();
  return data;
}

/**
 * API route test wrapper
 */
export async function testApiRoute(
  handler: (req: NextRequest) => Promise<Response>,
  request: NextRequest
): Promise<Response> {
  try {
    return await handler(request);
  } catch (error) {
    console.error('API route error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}