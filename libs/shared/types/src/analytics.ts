// Analytics and Metrics Types

export interface AnalyticsEvent {
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

export interface AnalyticsSummary {
  total_events: number;
  unique_users: number;
  event_types: Record<string, number>;
  date_range: {
    start: string;
    end: string;
  };
  trends: {
    daily_events: Record<string, number>;
    weekly_events: Record<string, number>;
    monthly_events: Record<string, number>;
  };
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface MetricData {
  name: string;
  value: number;
  previous_value?: number;
  change_percentage?: number;
  trend: 'up' | 'down' | 'stable';
  unit?: string;
  format?: 'number' | 'percentage' | 'currency' | 'duration';
  target_value?: number;
  target_threshold?: 'above' | 'below';
}

export interface DashboardKPI {
  id: string;
  name: string;
  description?: string;
  value: number;
  previous_value?: number;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
  trend_direction: 'positive' | 'negative' | 'neutral';
  unit: string;
  format: 'number' | 'percentage' | 'currency' | 'duration';
  target?: number;
  threshold?: {
    warning: number;
    critical: number;
  };
  chart_data?: TimeSeriesData[];
  last_updated: string;
}

export interface UserEngagement {
  total_users: number;
  active_users: number;
  new_users: number;
  returning_users: number;
  avg_session_duration: number;
  bounce_rate: number;
  page_views: number;
  unique_page_views: number;
  events_per_session: number;
  conversion_rate: number;
  retention_rate: {
    day_1: number;
    day_7: number;
    day_30: number;
  };
  user_activity: {
    daily_active_users: Record<string, number>;
    weekly_active_users: Record<string, number>;
    monthly_active_users: Record<string, number>;
  };
}

export interface FunnelStep {
  step: string;
  step_index: number;
  users_reached: number;
  users_completed: number;
  conversion_rate: number;
  drop_off_rate: number;
  avg_time_to_complete?: number;
}

export interface FunnelAnalytics {
  funnel_steps: string[];
  metrics: FunnelStep[];
  total_users: number;
  completed_funnel: number;
  overall_conversion_rate: number;
  avg_completion_time: number;
  optimization_suggestions: string[];
}

export interface CohortAnalysis {
  cohort_period: 'daily' | 'weekly' | 'monthly';
  cohorts: {
    cohort_id: string;
    cohort_date: string;
    initial_users: number;
    retention_data: Record<string, number>;
  }[];
  avg_retention: Record<string, number>;
  cohort_size_trend: TimeSeriesData[];
}

export interface SegmentAnalysis {
  segment_id: string;
  segment_name: string;
  segment_description?: string;
  user_count: number;
  conversion_rate: number;
  avg_revenue_per_user: number;
  churn_rate: number;
  engagement_score: number;
  characteristics: Record<string, any>;
  behavior_patterns: {
    top_events: { event: string; count: number }[];
    preferred_channels: { channel: string; percentage: number }[];
    peak_activity_times: { hour: number; activity_score: number }[];
  };
}

export interface RevenueAnalytics {
  total_revenue: number;
  monthly_recurring_revenue: number;
  annual_recurring_revenue: number;
  one_time_revenue: number;
  refunded_revenue: number;
  net_revenue: number;
  revenue_growth_rate: number;
  revenue_by_channel: Record<string, number>;
  revenue_by_product: Record<string, number>;
  revenue_by_customer_segment: Record<string, number>;
  revenue_trends: {
    daily: TimeSeriesData[];
    weekly: TimeSeriesData[];
    monthly: TimeSeriesData[];
    yearly: TimeSeriesData[];
  };
  forecasted_revenue: {
    next_month: number;
    next_quarter: number;
    next_year: number;
    confidence_interval: { lower: number; upper: number };
  };
}

export interface ConversionAnalytics {
  overall_conversion_rate: number;
  conversion_by_channel: Record<string, number>;
  conversion_by_source: Record<string, number>;
  conversion_by_campaign: Record<string, number>;
  conversion_funnel: FunnelStep[];
  time_to_conversion: {
    avg_days: number;
    median_days: number;
    distribution: { days: number; percentage: number }[];
  };
  conversion_trends: TimeSeriesData[];
  factors_affecting_conversion: {
    factor: string;
    impact: number;
    significance: number;
  }[];
}

export interface CustomerAnalytics {
  total_customers: number;
  new_customers: number;
  active_customers: number;
  churned_customers: number;
  customer_lifetime_value: number;
  customer_acquisition_cost: number;
  churn_rate: number;
  retention_rate: number;
  net_promoter_score: number;
  customer_satisfaction_score: number;
  customer_segments: SegmentAnalysis[];
  customer_journey: {
    stage: string;
    customers: number;
    avg_time_in_stage: number;
    conversion_to_next: number;
  }[];
  top_customers: {
    customer_id: string;
    customer_name: string;
    total_revenue: number;
    orders_count: number;
    last_order_date: string;
  }[];
}

export interface MarketingAnalytics {
  total_campaigns: number;
  active_campaigns: number;
  campaign_performance: {
    campaign_id: string;
    campaign_name: string;
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
    revenue: number;
    roi: number;
    ctr: number;
    conversion_rate: number;
  }[];
  channel_performance: {
    channel: string;
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
    revenue: number;
    roi: number;
  }[];
  attribution_analysis: {
    channel: string;
    first_touch_attribution: number;
    last_touch_attribution: number;
    linear_attribution: number;
    time_decay_attribution: number;
  }[];
  marketing_qualified_leads: number;
  cost_per_lead: number;
  lead_to_customer_conversion_rate: number;
  marketing_contribution_to_revenue: number;
}

export interface OperationalAnalytics {
  system_performance: {
    avg_response_time: number;
    error_rate: number;
    uptime_percentage: number;
    throughput: number;
    active_users: number;
    memory_usage: number;
    cpu_usage: number;
    disk_usage: number;
  };
  feature_usage: {
    feature: string;
    users: number;
    usage_frequency: number;
    avg_time_spent: number;
    satisfaction_score: number;
  }[];
  error_analytics: {
    error_type: string;
    count: number;
    affected_users: number;
    first_seen: string;
    last_seen: string;
    status: 'open' | 'resolved' | 'investigating';
  }[];
  user_feedback: {
    rating: number;
    comment: string;
    feature: string;
    user_id: string;
    created_at: string;
  }[];
}

export interface PredictiveAnalytics {
  churn_prediction: {
    user_id: string;
    churn_probability: number;
    risk_factors: string[];
    recommended_actions: string[];
    confidence_score: number;
  }[];
  revenue_forecast: {
    period: string;
    forecasted_revenue: number;
    confidence_interval: { lower: number; upper: number };
    factors: string[];
  }[];
  demand_forecast: {
    product_id: string;
    forecasted_demand: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    seasonality_factor: number;
  }[];
  customer_lifetime_value_prediction: {
    segment: string;
    predicted_clv: number;
    confidence_score: number;
    key_drivers: string[];
  }[];
}

export interface RealTimeAnalytics {
  timestamp: string;
  active_users: number;
  page_views: number;
  events_per_minute: number;
  conversion_rate: number;
  revenue_per_hour: number;
  top_pages: { page: string; views: number }[];
  top_events: { event: string; count: number }[];
  geographic_distribution: { country: string; users: number }[];
  device_distribution: { device: string; percentage: number }[];
  alerts: {
    id: string;
    type: 'performance' | 'conversion' | 'revenue' | 'error';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: string;
    acknowledged: boolean;
  }[];
}

export interface ReportConfiguration {
  id: string;
  name: string;
  description?: string;
  report_type: 'dashboard' | 'scheduled' | 'ad_hoc';
  metrics: string[];
  dimensions: string[];
  filters: Record<string, any>;
  date_range: {
    start: string;
    end: string;
  };
  visualization_type: 'table' | 'chart' | 'graph' | 'map';
  chart_config?: {
    type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
    x_axis: string;
    y_axis: string;
    color_scheme: string;
  };
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    timezone: string;
    recipients: string[];
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}