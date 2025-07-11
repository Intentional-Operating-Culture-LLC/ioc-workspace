/**
 * Service interfaces for IOC Core business logic
 * Provides consistent interfaces for all services with proper TypeScript types
 */

// Base service interface
export interface IService {
  name: string;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  healthCheck(): Promise<ServiceHealth>;
}

// Service health status
export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  lastCheck: Date;
  details?: Record<string, any>;
}

// Email service interfaces
export interface IEmailService extends IService {
  sendTransactionalEmail(options: TransactionalEmailOptions): Promise<EmailSendResult>;
  sendCampaignEmail(options: CampaignEmailOptions): Promise<EmailSendResult>;
  sendTestEmail(options?: TestEmailOptions): Promise<EmailSendResult>;
  getEmailTemplates(): Promise<EmailTemplate[]>;
  getCampaignStats(campaignId: string): Promise<CampaignStats>;
}

export interface TransactionalEmailOptions {
  to: string | string[];
  subject: string;
  content?: string;
  htmlContent?: string;
  textContent?: string;
  fromEmail?: string;
  fromName?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  metadata?: Record<string, any>;
}

export interface CampaignEmailOptions {
  campaignName: string;
  subject: string;
  content?: string;
  htmlContent?: string;
  textContent?: string;
  fromEmail?: string;
  fromName?: string;
  recipients?: EmailRecipient[];
  listKey?: string;
  listName?: string;
  scheduleTime?: Date;
  metadata?: Record<string, any>;
}

export interface TestEmailOptions {
  to?: string;
  subject?: string;
  content?: string;
  campaignName?: string;
  listName?: string;
}

export interface EmailRecipient {
  email: string;
  firstName?: string;
  lastName?: string;
  customFields?: Record<string, any>;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  campaignId?: string;
  error?: string;
  details?: Record<string, any>;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignStats {
  campaignId: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  spam: number;
  lastUpdated: Date;
}

// Lead scoring service interfaces
export interface ILeadScoringService extends IService {
  calculateScore(lead: Lead): Promise<LeadScore>;
  updateScore(leadId: string, activities: LeadActivity[]): Promise<LeadScore>;
  getScoreBreakdown(leadId: string): Promise<ScoreBreakdown>;
  getScoringRules(): Promise<ScoringRule[]>;
  updateScoringRules(rules: ScoringRule[]): Promise<void>;
}

export interface Lead {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  industry?: string;
  companySize?: string;
  source?: string;
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadActivity {
  type: 'website_visit' | 'email_open' | 'email_click' | 'form_submission' | 'demo_request' | 'content_download';
  timestamp: Date;
  details?: Record<string, any>;
}

export interface LeadScore {
  leadId: string;
  score: number;
  temperature: 'hot' | 'warm' | 'cold';
  breakdown: {
    demographic: number;
    behavioral: number;
    engagement: number;
  };
  calculatedAt: Date;
}

export interface ScoreBreakdown {
  leadId: string;
  totalScore: number;
  components: ScoreComponent[];
  history: ScoreHistoryItem[];
}

export interface ScoreComponent {
  category: string;
  field: string;
  value: any;
  points: number;
  reason: string;
}

export interface ScoreHistoryItem {
  timestamp: Date;
  score: number;
  change: number;
  reason: string;
}

export interface ScoringRule {
  id: string;
  category: 'demographic' | 'behavioral' | 'engagement' | 'negative';
  field: string;
  condition: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in_list';
  value: any;
  points: number;
  active: boolean;
}

// Campaign management service interfaces
export interface ICampaignManagementService extends IService {
  createCampaign(options: CampaignCreateOptions): Promise<Campaign>;
  updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign>;
  deleteCampaign(campaignId: string): Promise<void>;
  getCampaign(campaignId: string): Promise<Campaign>;
  listCampaigns(filters?: CampaignFilters): Promise<Campaign[]>;
  scheduleCampaign(campaignId: string, scheduleTime: Date): Promise<void>;
  pauseCampaign(campaignId: string): Promise<void>;
  resumeCampaign(campaignId: string): Promise<void>;
  getCampaignPerformance(campaignId: string): Promise<CampaignPerformance>;
}

export interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'social' | 'multi-channel';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  subject?: string;
  content?: string;
  audience: CampaignAudience;
  schedule?: CampaignSchedule;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignCreateOptions {
  name: string;
  type: Campaign['type'];
  subject?: string;
  content?: string;
  audience: CampaignAudience;
  schedule?: CampaignSchedule;
  metadata?: Record<string, any>;
}

export interface CampaignAudience {
  type: 'list' | 'segment' | 'manual';
  listIds?: string[];
  segmentId?: string;
  recipients?: string[];
  excludeIds?: string[];
}

export interface CampaignSchedule {
  startTime: Date;
  endTime?: Date;
  timezone?: string;
  recurring?: boolean;
  recurrencePattern?: string;
}

export interface CampaignFilters {
  status?: Campaign['status'];
  type?: Campaign['type'];
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface CampaignPerformance {
  campaignId: string;
  metrics: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
    revenue: number;
  };
  engagement: {
    openRate: number;
    clickRate: number;
    conversionRate: number;
  };
  topLinks: LinkPerformance[];
  deviceBreakdown: Record<string, number>;
  locationBreakdown: Record<string, number>;
}

export interface LinkPerformance {
  url: string;
  clicks: number;
  uniqueClicks: number;
  conversionRate: number;
}

// Analytics service interfaces
export interface IAnalyticsService extends IService {
  trackEvent(event: AnalyticsEvent): Promise<void>;
  getMetrics(options: MetricsQuery): Promise<MetricsResult>;
  generateReport(options: ReportOptions): Promise<Report>;
  getDashboardData(dashboardId: string): Promise<DashboardData>;
  exportData(options: ExportOptions): Promise<ExportResult>;
}

export interface AnalyticsEvent {
  type: string;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}

export interface MetricsQuery {
  metrics: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  startDate: Date;
  endDate: Date;
  granularity?: 'hour' | 'day' | 'week' | 'month';
}

export interface MetricsResult {
  metrics: Record<string, number>;
  dimensions: Record<string, any[]>;
  timeSeries?: TimeSeriesData[];
}

export interface TimeSeriesData {
  timestamp: Date;
  values: Record<string, number>;
}

export interface ReportOptions {
  type: 'summary' | 'detailed' | 'custom';
  metrics: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  startDate: Date;
  endDate: Date;
  format?: 'json' | 'csv' | 'pdf';
}

export interface Report {
  id: string;
  name: string;
  type: string;
  data: any;
  generatedAt: Date;
  url?: string;
}

export interface DashboardData {
  dashboardId: string;
  widgets: DashboardWidget[];
  lastUpdated: Date;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'map';
  title: string;
  data: any;
  config: Record<string, any>;
}

export interface ExportOptions {
  type: 'contacts' | 'campaigns' | 'analytics' | 'custom';
  format: 'csv' | 'json' | 'excel';
  filters?: Record<string, any>;
  fields?: string[];
}

export interface ExportResult {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  url?: string;
  expiresAt?: Date;
  error?: string;
}

// Configuration service interfaces
export interface IConfigurationService extends IService {
  get<T = any>(key: string): T;
  set(key: string, value: any): void;
  getAll(): Record<string, any>;
  validate(): ValidationResult;
  reload(): Promise<void>;
  subscribe(key: string, callback: (value: any) => void): () => void;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  key: string;
  message: string;
  value?: any;
}

export interface ValidationWarning {
  key: string;
  message: string;
  suggestion?: string;
}

// Service registry for dependency injection
export interface IServiceRegistry {
  register<T extends IService>(name: string, service: T): void;
  get<T extends IService>(name: string): T;
  getAll(): Map<string, IService>;
  has(name: string): boolean;
  unregister(name: string): void;
  initializeAll(): Promise<void>;
  shutdownAll(): Promise<void>;
  healthCheckAll(): Promise<Map<string, ServiceHealth>>;
}