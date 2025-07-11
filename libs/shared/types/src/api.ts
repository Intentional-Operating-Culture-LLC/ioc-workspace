// API Request/Response Types

// Generic API Response Types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
  status: number;
  timestamp?: string;
}

export interface ApiError {
  error: string;
  message: string;
  status: number;
  code?: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

// Common request types
export interface PaginationParams {
  page?: number;
  per_page?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface FilterParams {
  filter?: Record<string, any>;
  search?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface ApiRequestParams extends PaginationParams, SortParams, FilterParams {
  include?: string[];
  exclude?: string[];
}

// Marketing API Types
export interface MarketingMetricsRequest {
  organization_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
  metrics?: string[];
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

export interface MarketingMetricsResponse {
  metrics: {
    total_campaigns: number;
    active_campaigns: number;
    total_spend: number;
    total_revenue: number;
    roi: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    conversion_rate: number;
    budget_utilization: number;
  };
  trends: {
    metric: string;
    current_value: number;
    previous_value: number;
    change_percentage: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  updated_at: string;
}

export interface CampaignPerformanceRequest extends ApiRequestParams {
  organization_id?: string;
  campaign_ids?: string[];
  channels?: string[];
  status?: string[];
  date_range?: {
    start: string;
    end: string;
  };
}

export interface AttributionRequest {
  organization_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
  attribution_model?: 'first_touch' | 'last_touch' | 'linear' | 'time_decay';
  channels?: string[];
}

export interface RevenueAttributionRequest extends AttributionRequest {
  granularity?: 'day' | 'week' | 'month';
  include_organic?: boolean;
}

// User Management API Types
export interface CreateUserRequest {
  email: string;
  full_name: string;
  password?: string;
  phone?: string;
  role?: string;
  organization_id?: string;
  send_invitation?: boolean;
}

export interface UpdateUserRequest {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  is_active?: boolean;
  role?: string;
  permissions?: Record<string, any>;
}

export interface UsersListRequest extends ApiRequestParams {
  organization_id?: string;
  role?: string;
  is_active?: boolean;
  search?: string;
}

// Organization API Types
export interface CreateOrganizationRequest {
  name: string;
  slug?: string;
  description?: string;
  industry?: string;
  size?: string;
  website?: string;
  billing_email?: string;
  settings?: Record<string, any>;
}

export interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  industry?: string;
  size?: string;
  website?: string;
  logo_url?: string;
  billing_email?: string;
  settings?: Record<string, any>;
}

export interface OrganizationMembersRequest extends ApiRequestParams {
  organization_id: string;
  role?: string;
  search?: string;
}

// Assessment API Types
export interface CreateAssessmentRequest {
  title: string;
  description?: string;
  type: 'self' | 'peer' | 'manager' | '360' | 'custom';
  organization_id: string;
  instructions?: string;
  time_limit_minutes?: number;
  settings?: Record<string, any>;
  questions?: {
    question_text: string;
    question_type: 'text' | 'textarea' | 'select' | 'multiselect' | 'scale' | 'boolean' | 'likert';
    required?: boolean;
    options?: string[];
    validation_rules?: Record<string, any>;
  }[];
}

export interface UpdateAssessmentRequest {
  title?: string;
  description?: string;
  status?: 'draft' | 'published' | 'archived';
  instructions?: string;
  time_limit_minutes?: number;
  settings?: Record<string, any>;
}

export interface AssessmentListRequest extends ApiRequestParams {
  organization_id?: string;
  status?: string;
  type?: string;
  created_by?: string;
}

export interface SubmitAssessmentRequest {
  assessment_id: string;
  responses: {
    question_id: string;
    answer_value: string;
    answer_data?: Record<string, any>;
    confidence_score?: number;
    time_spent_seconds?: number;
  }[];
  subject_id?: string;
  time_spent_seconds?: number;
}

// Analytics API Types
export interface AnalyticsEventRequest {
  event_type: string;
  event_category: string;
  event_data?: Record<string, any>;
  organization_id?: string;
  user_id?: string;
  session_id?: string;
  page_url?: string;
  referrer?: string;
}

export interface AnalyticsEventsRequest extends ApiRequestParams {
  organization_id?: string;
  user_id?: string;
  event_type?: string;
  event_category?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface AnalyticsSummaryRequest {
  organization_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
  metrics?: string[];
  group_by?: 'day' | 'week' | 'month';
}

// Business Metrics API Types
export interface BusinessMetricsRequest {
  organization_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
  metrics?: string[];
  include_forecasts?: boolean;
}

export interface BusinessMetricsResponse {
  revenue: {
    total: number;
    recurring: number;
    one_time: number;
    by_channel: Record<string, number>;
  };
  customers: {
    total: number;
    new: number;
    churned: number;
    retention_rate: number;
  };
  metrics: {
    cac: number;
    ltv: number;
    churn_rate: number;
    conversion_rate: number;
  };
  forecasts?: {
    revenue: number;
    customers: number;
    churn: number;
  };
}

// Integration API Types
export interface IntegrationSyncRequest {
  integration_type: 'zoho' | 'salesforce' | 'hubspot' | 'mailchimp';
  organization_id?: string;
  force_sync?: boolean;
  sync_types?: string[];
}

export interface IntegrationSyncResponse {
  sync_id: string;
  status: 'started' | 'completed' | 'failed';
  records_processed: number;
  errors: string[];
  started_at: string;
  completed_at?: string;
}

export interface IntegrationStatusRequest {
  integration_type: 'zoho' | 'salesforce' | 'hubspot' | 'mailchimp';
  organization_id?: string;
}

export interface IntegrationStatusResponse {
  integration_type: string;
  status: 'connected' | 'disconnected' | 'error' | 'syncing';
  last_sync: string;
  next_sync?: string;
  records_synced: number;
  errors: string[];
  configuration: Record<string, any>;
}

// Zoho specific types
export interface ZohoContactsRequest extends ApiRequestParams {
  organization_id?: string;
  modified_since?: string;
  fields?: string[];
}

export interface ZohoDealsRequest extends ApiRequestParams {
  organization_id?: string;
  stage?: string;
  modified_since?: string;
  fields?: string[];
}

export interface ZohoLeadsRequest extends ApiRequestParams {
  organization_id?: string;
  status?: string;
  modified_since?: string;
  fields?: string[];
}

export interface ZohoAIInsightsRequest {
  organization_id?: string;
  insight_types?: string[];
  priority?: 'critical' | 'high' | 'medium' | 'low';
  date_range?: {
    start: string;
    end: string;
  };
}

// Health Check API Types
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      response_time: number;
      message?: string;
    };
    cache: {
      status: 'healthy' | 'unhealthy';
      response_time: number;
      message?: string;
    };
    external_apis: {
      status: 'healthy' | 'unhealthy';
      services: Record<string, {
        status: 'healthy' | 'unhealthy';
        response_time: number;
        message?: string;
      }>;
    };
  };
}

// Webhook Types
export interface WebhookPayload {
  event: string;
  data: Record<string, any>;
  timestamp: string;
  organization_id?: string;
  user_id?: string;
  signature?: string;
}

export interface WebhookEvent {
  id: string;
  event_type: string;
  payload: WebhookPayload;
  endpoint_url: string;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  attempts: number;
  last_attempt?: string;
  next_attempt?: string;
  created_at: string;
}

// File Upload Types
export interface FileUploadRequest {
  file: File;
  folder?: string;
  public?: boolean;
  metadata?: Record<string, any>;
}

export interface FileUploadResponse {
  file_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  public_url?: string;
  metadata?: Record<string, any>;
  uploaded_at: string;
}