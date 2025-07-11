import { NextResponse } from 'next/server';

/**
 * Standard error response format
 */
export class APIError extends Error {
  constructor(message, status = 500, code = null, details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Common error responses
 */
export const ErrorResponses = {
  unauthorized: (message = 'Unauthorized') => 
    NextResponse.json({ error: message }, { status: 401 }),
  
  forbidden: (message = 'Access denied') => 
    NextResponse.json({ error: message }, { status: 403 }),
  
  badRequest: (message = 'Bad request', details = null) => 
    NextResponse.json({ error: message, ...(details && { details }) }, { status: 400 }),
  
  notFound: (message = 'Resource not found') => 
    NextResponse.json({ error: message }, { status: 404 }),
  
  conflict: (message = 'Resource conflict') => 
    NextResponse.json({ error: message }, { status: 409 }),
  
  validationError: (errors) => 
    NextResponse.json({ error: 'Validation failed', errors }, { status: 400 }),
  
  internalError: (message = 'Internal server error', error = null) => {
    if (error) {
      console.error('Internal error:', error);
    }
    return NextResponse.json({ 
      error: message, 
      ...(process.env.NODE_ENV === 'development' && error && { debug: error.message })
    }, { status: 500 });
  }
};

/**
 * Error handler wrapper
 */
export function handleAPIError(error) {
  if (error instanceof APIError) {
    return NextResponse.json(
      { 
        error: error.message,
        ...(error.code && { code: error.code }),
        ...(error.details && { details: error.details })
      },
      { status: error.status }
    );
  }

  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    return ErrorResponses.validationError(error.errors);
  }

  // Handle Supabase errors
  if (error.code && error.message) {
    const status = error.code === 'PGRST116' ? 404 : 400;
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status }
    );
  }

  // Default to internal error
  return ErrorResponses.internalError('An unexpected error occurred', error);
}