// Marketing Dashboard Type Definitions
import type { TimeSeriesData } from './analytics';

export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'archived';
export type ChannelType = 'email' | 'social' | 'search' | 'display' | 'video' | 'affiliate' | 'direct';
export type MetricType = 'impression' | 'click' | 'conversion' | 'engagement' | 'revenue' | 'cost';
export type InsightPriority = 'critical' | 'high' | 'medium' | 'low' | 'informational';
export type InsightType = 'prediction' | 'anomaly' | 'recommendation' | 'trend';

export interface Campaign {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  channel: ChannelType;
  budget_total?: number;
  budget_spent: number;
  start_date?: string;
  end_date?: string;
  target_audience: Record<string, any>;
  goals: Record<string, any>;
  metadata: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignMetric {
  id: string;
  campaign_id: string;
  metric_date: string;
  metric_hour?: number;
  metric_type: MetricType;
  value: number;
  channel: ChannelType;
  platform?: string;
  device_type?: string;
  location?: string;
  demographics: Record<string, any>;
  created_at: string;
}

export interface AIInsight {
  id: string;
  organization_id: string;
  campaign_id?: string;
  insight_type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  data: Record<string, any>;
  confidence_score?: number;
  impact_score?: number;
  is_actionable: boolean;
  action_taken: boolean;
  action_details?: Record<string, any>;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  total_campaigns: number;
  active_campaigns: number;
  total_spend: number;
  total_revenue: number;
  roi: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  avg_ctr: number;
  avg_conversion_rate: number;
  top_performing_channel: ChannelType;
  budget_utilization: number;
}

export interface CampaignPerformance {
  campaign_id: string;
  campaign_name: string;
  channel: ChannelType;
  status: CampaignStatus;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  cost: number;
  roi: number;
  ctr: number;
  conversion_rate: number;
  trend: 'up' | 'down' | 'stable';
  trend_percentage: number;
}

export interface AttributionData {
  channel: ChannelType;
  touchpoints: number;
  attributed_conversions: number;
  attributed_revenue: number;
  first_touch_conversions: number;
  last_touch_conversions: number;
  linear_attribution_value: number;
  time_decay_attribution_value: number;
}

// TimeSeriesData is now exported from analytics.ts

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
  }[];
}

export interface MarketingBudget {
  id: string;
  organization_id: string;
  period_start: string;
  period_end: string;
  total_budget: number;
  allocated_budget: number;
  spent_budget: number;
  channel_allocation: Record<ChannelType, number>;
  alerts_enabled: boolean;
  alert_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface ContentPerformance {
  id: string;
  content_id: string;
  content_type: 'blog' | 'video' | 'infographic' | 'social_post';
  title: string;
  url?: string;
  campaign_id?: string;
  views: number;
  unique_views: number;
  engagement_rate: number;
  average_time_spent: number;
  bounce_rate: number;
  conversion_rate: number;
  social_shares: Record<string, number>;
}

export interface LeadScore {
  id: string;
  lead_id: string;
  demographic_score: number;
  behavioral_score: number;
  engagement_score: number;
  total_score: number;
  conversion_probability: number;
  recommended_actions: string[];
  last_activity_date: string;
}

// Filter Types
export interface CampaignFilters {
  status?: CampaignStatus[];
  channels?: ChannelType[];
  date_range?: {
    start: string;
    end: string;
  };
  budget_range?: {
    min: number;
    max: number;
  };
}

export interface MetricFilters {
  campaigns?: string[];
  channels?: ChannelType[];
  date_range?: {
    start: string;
    end: string;
  };
  metric_types?: MetricType[];
  platforms?: string[];
}

// Real-time metrics
export interface RealTimeMetrics {
  timestamp: string;
  active_campaigns: number;
  current_spend: number;
  current_revenue: number;
  live_impressions: number;
  live_clicks: number;
  live_conversions: number;
  hourly_trend: TimeSeriesData[];
}

// Business metrics
export interface BusinessMetrics {
  total_revenue: number;
  monthly_recurring_revenue: number;
  customer_acquisition_cost: number;
  lifetime_value: number;
  churn_rate: number;
  conversion_funnel: {
    stage: string;
    count: number;
    conversion_rate: number;
  }[];
  revenue_by_channel: Record<ChannelType, number>;
  profit_margins: {
    gross_margin: number;
    operating_margin: number;
    net_margin: number;
  };
}

// Zoho Integration Types
export interface ZohoContact {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string;
  phone?: string;
  lead_source: string;
  created_time: string;
  modified_time: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ZohoDeal {
  id: string;
  deal_name: string;
  account_name: string;
  amount: number;
  stage: string;
  probability: number;
  expected_revenue: number;
  closing_date: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  contact_name: string;
  created_time: string;
  modified_time: string;
}

export interface ZohoLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  phone?: string;
  lead_source: string;
  lead_status: string;
  rating: string;
  created_time: string;
  modified_time: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ZohoSyncStatus {
  last_sync: string;
  status: 'success' | 'error' | 'in_progress';
  records_synced: number;
  errors: string[];
  next_sync?: string;
}

// Integration insights
export interface IntegrationInsight {
  id: string;
  type: 'lead_scoring' | 'deal_prediction' | 'campaign_optimization' | 'customer_segmentation';
  title: string;
  description: string;
  data: Record<string, any>;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  action_items: string[];
  created_at: string;
  expires_at?: string;
}