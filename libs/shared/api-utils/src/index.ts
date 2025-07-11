/**
 * @ioc/api-utils - Shared API utilities for IOC Core applications
 */

// Export all error classes
export * from './errors';

// Export response utilities
export * from './responses';

// Export authentication utilities
export * from './auth';

// Export validation utilities
export * from './validation';

// Export middleware utilities
export * from './middleware';

// Re-export commonly used items for convenience
export {
  // Errors
  ApiError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
} from './errors';

export {
  // Response helpers
  successResponse,
  errorResponse,
  paginatedResponse,
  handleApiError,
  noContentResponse,
  redirectResponse,
} from './responses';

export {
  // Auth utilities
  AuthUtils,
  PasswordUtils,
  SessionUtils,
} from './auth';

export {
  // Validation utilities
  ValidationUtils,
  commonSchemas,
  validators,
  sanitizers,
} from './validation';

export {
  // Middleware
  cors,
  rateLimit,
  auth,
  logging,
  requestId,
  securityHeaders,
  compose,
  withErrorHandler,
} from './middleware';