import { z } from 'zod';

// User profile update schema
export const updateUserSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  avatar_url: z.string().url().optional(),
  phone: z.string().max(50).optional(),
  title: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  bio: z.string().optional(),
  preferences: z.object({
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      sms: z.boolean().optional(),
    }).optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
  }).optional(),
});

// User invitation schema
export const inviteUserSchema = z.object({
  email: z.string().email(),
  organization_id: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).default('member'),
  send_invitation_email: z.boolean().default(true),
});

// User list query schema
export const listUsersQuerySchema = z.object({
  organization_id: z.string().uuid(),
  search: z.string().optional(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']).optional(),
  department: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Remove user query schema
export const removeUserQuerySchema = z.object({
  user_id: z.string().uuid(),
  organization_id: z.string().uuid(),
});