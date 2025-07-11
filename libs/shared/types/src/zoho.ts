/**
 * Zoho Integration Type Definitions
 */

// Base Zoho Configuration
export interface ZohoEnvironmentConfig {
  ZOHO_CAMPAIGNS_CLIENT_ID: string;
  ZOHO_CAMPAIGNS_CLIENT_SECRET: string;
  ZOHO_CAMPAIGNS_REFRESH_TOKEN: string;
  ZOHO_CAMPAIGNS_ACCESS_TOKEN: string;
  ZOHO_REGION?: string;
  COMPANY_NAME?: string;
  COMPANY_EMAIL?: string;
  COMPANY_ADDRESS?: string;
  ENABLE_EMAIL_AUTOMATION?: string;
  MAX_REQUESTS_PER_MINUTE?: string;
  BURST_SIZE?: string;
  LOG_LEVEL?: string;
  DEBUG?: string;
}

// Campaign Client Types
export interface ZohoCampaignsConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken: string;
  region?: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  rateLimit?: {
    requestsPerMinute: number;
    burstSize: number;
  };
  debugMode?: boolean;
  logger?: {
    info: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
  };
}

// Automation Types
export interface AutomationConfig extends ZohoCampaignsConfig {
  defaultFromEmail: string;
  defaultFromName: string;
  defaultReplyTo: string;
  companyName: string;
  companyAddress: string;
  unsubscribeLink?: string;
  trackingEnabled?: boolean;
  autoOptIn?: boolean;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables?: string[];
}

export interface CampaignConfig {
  name: string;
  subject: string;
  template: string;
  mailingList: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
  schedule?: {
    sendAt: Date;
    timezone?: string;
  };
  testEmails?: string[];
  trackOpens?: boolean;
  trackClicks?: boolean;
  variables?: { [key: string]: any };
}

export interface AutomationSequence {
  id: string;
  name: string;
  triggerType: 'immediate' | 'scheduled' | 'interval';
  triggerData: any;
  steps?: any[];
  campaigns?: CampaignConfig[];
  delays?: number[];
  active?: boolean;
  enabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Monitoring Types
export interface ZohoMonitoringConfig {
  checkInterval?: number; // milliseconds
  healthCheckEndpoint?: string;
  alertThresholds?: {
    errorRate?: number; // percentage
    responseTime?: number; // milliseconds
    queueSize?: number;
  };
  notifications?: {
    email?: string[];
    webhook?: string;
  };
}

export interface MonitoringMetrics {
  timestamp: Date;
  metrics: {
    requestsTotal: number;
    requestsSuccessful: number;
    requestsFailed: number;
    averageResponseTime: number;
    errorRate: number;
    queueSize: number;
    lastError?: {
      message: string;
      timestamp: Date;
      endpoint: string;
    };
  };
  health: {
    status: 'healthy' | 'degraded' | 'down';
    message: string;
    lastCheck: Date;
  };
}

// API Response Types
export interface ZohoApiResponse<T = any> {
  code: number;
  status: string;
  message: string;
  data?: T;
  errors?: Array<{
    code: string;
    message: string;
    details?: any;
  }>;
}

export interface ZohoContact {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  customFields?: { [key: string]: any };
  tags?: string[];
  optInStatus?: 'opted_in' | 'opted_out' | 'not_confirmed';
}

export interface ZohoCampaign {
  campaignId: string;
  campaignName: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sent' | 'sending';
  createdTime: string;
  modifiedTime: string;
  scheduledTime?: string;
  sentTime?: string;
  totalRecipients?: number;
  opens?: number;
  clicks?: number;
  bounces?: number;
  unsubscribes?: number;
}

export interface ZohoMailingList {
  listId: string;
  listName: string;
  listType: 'static' | 'dynamic';
  contactCount: number;
  createdTime: string;
  modifiedTime: string;
  description?: string;
  tags?: string[];
}

// Event Types
export interface ZohoWebhookEvent {
  eventType: 'email_opened' | 'email_clicked' | 'email_bounced' | 'email_unsubscribed' | 'contact_added' | 'contact_updated';
  timestamp: string;
  data: {
    email?: string;
    campaignId?: string;
    listId?: string;
    contactId?: string;
    [key: string]: any;
  };
}

// Error Types
export interface ZohoError extends Error {
  code?: string;
  statusCode?: number;
  details?: any;
  endpoint?: string;
  requestId?: string;
}

export interface ZohoCampaignsError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
  timestamp: string;
}

// Token and Rate Limit Types
export interface TokenInfo {
  accessToken: string;
  expiresAt: Date;
  refreshToken: string;
}

export interface RateLimitStatus {
  remaining: number;
  resetTime: Date;
  limit: number;
}

export interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitHits: number;
  averageResponseTime: number;
}