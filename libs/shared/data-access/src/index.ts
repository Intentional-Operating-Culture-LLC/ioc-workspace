// Main library exports
export * from './database';
// Export only server-side supabase clients
export { createServerClient, createAppDirectoryClient, createServiceRoleClient } from './supabase';
export * from './engines';
export * from './contexts';
export * from './utils';
export * from './performance';
// Export zoho and services as namespaces to avoid conflicts
export * as zoho from './zoho';
export * as services from './services';
// Export API modules
export * as api from './api';
// Export scoring modules
export * from './scoring';

// Meta BI System - Complete Business Intelligence Platform
export * as metaBI from './meta-bi';
export { MetaBISystem } from './meta-bi';

// Re-export types and interfaces
export type {
  AnalyticsSummary,
  OrganizationMember,
  UserPermissions,
} from './database';

export type {
  AssessmentType,
  QuestionOption,
  Question,
  BenchmarkData,
  Recommendation,
} from './engines';

export type {
  AuthUser,
  AuthContextType,
  CEOUser,
  CEOAuthContextType,
  WebSocketContextType,
} from './contexts';

export type {
  OceanTraits,
  OceanScoreDetails,
  OceanFacets,
  QuestionTraitMapping,
  ScoringResult,
} from './scoring';