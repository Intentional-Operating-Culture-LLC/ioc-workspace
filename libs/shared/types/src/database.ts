// Database entity types derived from lib/db/* files

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  last_login_at?: string;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
  user_metadata?: Record<string, any>;
  user_organizations?: UserOrganization[];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website?: string;
  industry?: string;
  size?: string;
  billing_email?: string;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_role?: string;
  user_permissions?: Record<string, any>;
  joined_at?: string;
}

export interface UserOrganization {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: Record<string, any>;
  is_active: boolean;
  invited_by?: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
  organization?: Organization;
}

export interface Assessment {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  type: 'self' | 'peer' | 'manager' | '360' | 'custom';
  status: 'draft' | 'published' | 'archived';
  is_public: boolean;
  instructions?: string;
  time_limit_minutes?: number;
  settings: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
  questions?: AssessmentQuestion[];
}

export interface AssessmentQuestion {
  id: string;
  assessment_id: string;
  question_text: string;
  question_type: 'text' | 'textarea' | 'select' | 'multiselect' | 'scale' | 'boolean' | 'likert';
  question_order: number;
  required: boolean;
  options: string[];
  validation_rules: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AssessmentResponse {
  id: string;
  assessment_id: string;
  respondent_id: string;
  subject_id?: string;
  status: 'in_progress' | 'submitted' | 'expired';
  submitted_at?: string;
  time_spent_seconds: number;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
  respondent?: User;
  subject?: User;
  question_responses?: AssessmentQuestionResponse[];
}

export interface AssessmentQuestionResponse {
  id: string;
  response_id: string;
  question_id: string;
  answer_value: string;
  answer_data: Record<string, any>;
  confidence_score?: number;
  time_spent_seconds: number;
  created_at: string;
  question?: AssessmentQuestion;
}

export interface AssessmentScore {
  id: string;
  assessment_id: string;
  response_id: string;
  dimension: string;
  score: number;
  percentile?: number;
  raw_score?: number;
  scoring_rules: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface DatabaseAnalyticsEvent {
  id: string;
  organization_id?: string;
  user_id?: string;
  session_id?: string;
  event_type: string;
  event_category: string;
  event_data: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  page_url?: string;
  created_at: string;
}

export interface DashboardMetric {
  id: string;
  organization_id: string;
  metric_key: string;
  metric_value?: number;
  metric_data?: Record<string, any>;
  category: string;
  updated_at: string;
  created_at: string;
}

// Database query options
export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface SearchUsersOptions extends QueryOptions {
  organizationId?: string;
  isActive?: boolean;
}

export interface GetOrganizationMembersOptions extends QueryOptions {
  role?: string;
}

export interface GetAssessmentOptions extends QueryOptions {
  status?: string;
  type?: string;
  respondentId?: string;
  subjectId?: string;
}

export interface GetAssessmentResponseOptions extends QueryOptions {
  status?: string;
  respondentId?: string;
  subjectId?: string;
}

export interface GetAnalyticsOptions {
  startDate?: string;
  endDate?: string;
  days?: number;
  page?: number;
  limit?: number;
}

// Database result types
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface UserSearchResult {
  users: User[];
  total: number;
}

export interface OrganizationMembersResult {
  members: User[];
  total: number;
}

export interface AssessmentListResult {
  assessments: Assessment[];
  total: number;
}

export interface AssessmentResponseListResult {
  responses: AssessmentResponse[];
  total: number;
}

export interface AnalyticsEventListResult {
  events: DatabaseAnalyticsEvent[];
  total: number;
}