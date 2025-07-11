import { z } from 'zod';

// Organization creation schema
export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  website: z.string().url().optional(),
  industry: z.string().max(100).optional(),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).optional(),
  description: z.string().optional(),
  logo_url: z.string().url().optional(),
  settings: z.object({
    features: z.object({
      assessments: z.boolean().default(true),
      analytics: z.boolean().default(true),
      automation: z.boolean().default(false),
    }).optional(),
    branding: z.object({
      primary_color: z.string().optional(),
      secondary_color: z.string().optional(),
    }).optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
});

// Organization update schema
export const updateOrganizationSchema = createOrganizationSchema.partial();

// Organization query schema
export const listOrganizationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).optional(),
});