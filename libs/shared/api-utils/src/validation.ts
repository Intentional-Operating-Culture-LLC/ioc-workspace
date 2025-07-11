import { NextRequest } from 'next/server';
import { z, ZodError, ZodSchema } from 'zod';
import { ValidationError } from './errors';

/**
 * Request validation utilities
 */
export class ValidationUtils {
  /**
   * Validate request body against schema
   */
  static async validateBody<T>(
    request: NextRequest,
    schema: ZodSchema<T>
  ): Promise<T> {
    try {
      const body = await request.json();
      return schema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid request body', {
          errors: error.errors,
        });
      }
      throw new ValidationError('Invalid request body');
    }
  }

  /**
   * Validate query parameters against schema
   */
  static validateQuery<T>(
    request: NextRequest,
    schema: ZodSchema<T>
  ): T {
    try {
      const searchParams = request.nextUrl.searchParams;
      const query: Record<string, string | string[]> = {};

      searchParams.forEach((value, key) => {
        const existing = query[key];
        if (existing) {
          query[key] = Array.isArray(existing) 
            ? [...existing, value] 
            : [existing, value];
        } else {
          query[key] = value;
        }
      });

      return schema.parse(query);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid query parameters', {
          errors: error.errors,
        });
      }
      throw new ValidationError('Invalid query parameters');
    }
  }

  /**
   * Validate route parameters against schema
   */
  static validateParams<T>(
    params: unknown,
    schema: ZodSchema<T>
  ): T {
    try {
      return schema.parse(params);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid route parameters', {
          errors: error.errors,
        });
      }
      throw new ValidationError('Invalid route parameters');
    }
  }

  /**
   * Validate headers against schema
   */
  static validateHeaders<T>(
    request: NextRequest,
    schema: ZodSchema<T>
  ): T {
    try {
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });

      return schema.parse(headers);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Invalid headers', {
          errors: error.errors,
        });
      }
      throw new ValidationError('Invalid headers');
    }
  }
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  /**
   * UUID v4 schema
   */
  uuid: z.string().uuid(),

  /**
   * Email schema
   */
  email: z.string().email(),

  /**
   * URL schema
   */
  url: z.string().url(),

  /**
   * Date string schema
   */
  dateString: z.string().datetime(),

  /**
   * Pagination query schema
   */
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),

  /**
   * ID parameter schema
   */
  idParam: z.object({
    id: z.string().uuid(),
  }),

  /**
   * Search query schema
   */
  searchQuery: z.object({
    q: z.string().min(1).optional(),
    filters: z.record(z.string()).optional(),
  }),
};

/**
 * Custom validators
 */
export const validators = {
  /**
   * Check if string is empty
   */
  isEmpty: (value: unknown): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },

  /**
   * Check if string is valid email
   */
  isEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Check if string is valid phone number
   */
  isPhoneNumber: (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s\-()]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  },

  /**
   * Check if string is strong password
   */
  isStrongPassword: (password: string): boolean => {
    // At least 8 characters, one uppercase, one lowercase, one number, one special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  },

  /**
   * Check if value is valid JSON
   */
  isJSON: (str: string): boolean => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if string is valid slug
   */
  isSlug: (slug: string): boolean => {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug);
  },
};

/**
 * Sanitization utilities
 */
export const sanitizers = {
  /**
   * Escape HTML entities
   */
  escapeHtml: (str: string): string => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
    };
    return str.replace(/[&<>"'/]/g, (s) => map[s]);
  },

  /**
   * Remove HTML tags
   */
  stripHtml: (str: string): string => {
    return str.replace(/<[^>]*>/g, '');
  },

  /**
   * Trim and normalize whitespace
   */
  normalizeWhitespace: (str: string): string => {
    return str.replace(/\s+/g, ' ').trim();
  },

  /**
   * Convert to slug
   */
  toSlug: (str: string): string => {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },
};