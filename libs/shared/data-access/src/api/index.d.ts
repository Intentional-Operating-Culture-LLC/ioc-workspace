// API module type declarations

export * from './analytics';
export * from './assessments';
export * from './organizations';
export * from './users';
export * from './errors';

// Service exports
export interface ApiService {
  analytics: any;
  assessments: any;
  organizations: any;
  users: any;
}

export const services: ApiService;