import { z } from 'zod';

// Assessment creation schema
export const createAssessmentSchema = z.object({
  title: z.string().min(1).max(255),
  type: z.enum(['survey', 'evaluation', 'test', 'feedback']),
  organizationId: z.string().uuid(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  questions: z.array(z.object({
    id: z.string(),
    type: z.enum(['text', 'select', 'multiselect', 'rating', 'boolean']),
    text: z.string(),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(),
    validation: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
    }).optional(),
  })).optional(),
  settings: z.object({
    allowAnonymous: z.boolean().default(false),
    requiresApproval: z.boolean().default(false),
    showResults: z.boolean().default(false),
    timeLimit: z.number().optional(), // in minutes
    maxAttempts: z.number().default(1),
  }).optional(),
  assignments: z.array(z.object({
    userId: z.string().uuid(),
    dueDate: z.string().datetime().optional(),
  })).optional(),
});

// Assessment update schema
export const updateAssessmentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
  dueDate: z.string().datetime().optional(),
  settings: z.object({
    allowAnonymous: z.boolean().optional(),
    requiresApproval: z.boolean().optional(),
    showResults: z.boolean().optional(),
    timeLimit: z.number().optional(),
    maxAttempts: z.number().optional(),
  }).optional(),
});

// Assessment submission schema
export const submitAssessmentSchema = z.object({
  responses: z.array(z.object({
    questionId: z.string(),
    value: z.any(), // Value depends on question type
  })),
  timeSpent: z.number().optional(), // in seconds
  metadata: z.object({
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
  }).optional(),
});

// Assessment query schema
export const listAssessmentsQuerySchema = z.object({
  organizationId: z.string().uuid().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']).optional(),
  userId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});