import { z } from 'zod';
import { ErrorResponses } from './errors.js';

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  // UUID validation
  uuid: z.string().uuid(),
  
  // Email validation
  email: z.string().email(),
  
  // Organization roles
  organizationRole: z.enum(['owner', 'admin', 'member', 'viewer']),
  
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
  
  // Date range
  dateRange: z.object({
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
  }),
  
  // User preferences
  userPreferences: z.object({
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      sms: z.boolean().optional(),
    }).optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
  }),
};

/**
 * Parse and validate request body
 */
export async function validateRequestBody(request, schema) {
  try {
    const body = await request.json();
    const validated = schema.parse(body);
    return { data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: ErrorResponses.validationError(error.errors) };
    }
    return { error: ErrorResponses.badRequest('Invalid request body') };
  }
}

/**
 * Parse and validate query parameters
 */
export function validateQueryParams(request, schema) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const validated = schema.parse(params);
    return { data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: ErrorResponses.validationError(error.errors) };
    }
    return { error: ErrorResponses.badRequest('Invalid query parameters') };
  }
}

/**
 * Create paginated response
 */
export function createPaginatedResponse(data, pagination, total) {
  const { page, limit } = pagination;
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Build safe SQL query filters
 */
export function buildQueryFilters(query, filters) {
  const safeFilters = { ...filters };
  
  // Remove null/undefined values
  Object.keys(safeFilters).forEach(key => {
    if (safeFilters[key] === null || safeFilters[key] === undefined) {
      delete safeFilters[key];
    }
  });
  
  // Apply filters
  Object.entries(safeFilters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      query = query.in(key, value);
    } else if (typeof value === 'string' && value.includes('%')) {
      query = query.ilike(key, value);
    } else {
      query = query.eq(key, value);
    }
  });
  
  return query;
}