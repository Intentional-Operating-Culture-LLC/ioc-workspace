import { z } from 'zod';

// Analytics query schema
export const analyticsQuerySchema = z.object({
  organization_id: z.string().uuid(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  event_type: z.string().optional(),
  event_category: z.string().optional(),
  group_by: z.enum(['day', 'week', 'month', 'event_type', 'user']).optional(),
  metrics: z.array(z.enum(['count', 'unique_users', 'avg_time'])).optional(),
});

// Track event schema
export const trackEventSchema = z.object({
  event_type: z.string().max(100),
  event_category: z.string().max(100).optional(),
  event_data: z.record(z.any()).optional(),
  organization_id: z.string().uuid().optional(),
});

// Dashboard metrics schema
export const dashboardMetricsSchema = z.object({
  organization_id: z.string().uuid(),
  period: z.enum(['today', 'week', 'month', 'quarter', 'year']).default('month'),
  compare_previous: z.boolean().default(false),
});

// Export analytics schema
export const exportAnalyticsSchema = z.object({
  organization_id: z.string().uuid(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  format: z.enum(['csv', 'json', 'excel']).default('csv'),
  include_raw: z.boolean().default(false),
});