import { NextResponse } from 'next/server';
import { ApiError } from './errors';

/**
 * Standard API response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    [key: string]: unknown;
  };
}

/**
 * Creates a successful API response
 */
export function successResponse<T>(
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    { status: statusCode }
  );
}

/**
 * Creates an error API response
 */
export function errorResponse(
  error: Error | ApiError,
  meta?: Record<string, unknown>
): NextResponse<ApiResponse> {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  const code = error instanceof ApiError ? error.code : 'INTERNAL_ERROR';
  const details = error instanceof ApiError ? error.details : undefined;

  // Log internal errors
  if (statusCode >= 500) {
    console.error('Internal error:', error);
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message: error.message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    },
    { status: statusCode }
  );
}

/**
 * Creates a paginated API response
 */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
  meta?: Record<string, unknown>
): NextResponse<ApiResponse<PaginatedData<T>>> {
  const totalPages = Math.ceil(total / pageSize);
  
  return successResponse(
    {
      items,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
    200,
    meta
  );
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  if (error instanceof ApiError) {
    return errorResponse(error);
  }

  if (error instanceof Error) {
    return errorResponse(error);
  }

  return errorResponse(new Error('An unexpected error occurred'));
}

/**
 * Creates a no content response (204)
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Creates a redirect response
 */
export function redirectResponse(url: string, permanent = false): NextResponse {
  return NextResponse.redirect(url, permanent ? 308 : 307);
}