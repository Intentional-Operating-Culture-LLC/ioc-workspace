// Dashboard and UI Types

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'feed' | 'custom';
  title: string;
  description?: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: Record<string, any>;
  data_source: string;
  refresh_interval?: number;
  is_visible: boolean;
  permissions?: string[];
  created_at: string;
  updated_at: string;
}

export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  organization_id?: string;
  user_id?: string;
  is_default: boolean;
  is_public: boolean;
  widgets: DashboardWidget[];
  grid_config: {
    columns: number;
    row_height: number;
    margin: number;
    responsive_breakpoints: Record<string, number>;
  };
  theme: 'light' | 'dark' | 'auto';
  created_at: string;
  updated_at: string;
}

export interface MetricCard {
  id: string;
  title: string;
  value: number;
  previous_value?: number;
  change_percentage?: number;
  trend: 'up' | 'down' | 'stable';
  trend_direction: 'positive' | 'negative' | 'neutral';
  unit: string;
  format: 'number' | 'percentage' | 'currency' | 'duration';
  icon?: string;
  color?: string;
  target?: number;
  threshold?: {
    warning: number;
    critical: number;
  };
  sparkline_data?: number[];
  last_updated: string;
}

export interface ChartConfiguration {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'radar' | 'gauge';
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string;
      borderWidth?: number;
      fill?: boolean;
      tension?: number;
      pointRadius?: number;
      pointHoverRadius?: number;
    }[];
  };
  options: {
    responsive: boolean;
    maintainAspectRatio: boolean;
    scales?: {
      x?: {
        display: boolean;
        title?: { display: boolean; text: string };
        grid?: { display: boolean };
      };
      y?: {
        display: boolean;
        title?: { display: boolean; text: string };
        grid?: { display: boolean };
        beginAtZero?: boolean;
      };
    };
    plugins?: {
      legend?: {
        display: boolean;
        position: 'top' | 'bottom' | 'left' | 'right';
      };
      tooltip?: {
        enabled: boolean;
        mode: string;
        intersect: boolean;
      };
      title?: {
        display: boolean;
        text: string;
      };
    };
  };
}

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data?: Record<string, any>;
  organization_id?: string;
  user_id?: string;
  triggered_by: string;
  triggered_at: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  auto_resolve: boolean;
  expires_at?: string;
  actions?: {
    id: string;
    label: string;
    action_type: 'link' | 'button' | 'modal';
    action_data: Record<string, any>;
  }[];
}

export interface CEODashboardMetrics {
  revenue: {
    total: number;
    monthly: number;
    growth_rate: number;
    forecast: number;
    target: number;
    trend: 'up' | 'down' | 'stable';
  };
  customers: {
    total: number;
    new: number;
    churned: number;
    retention_rate: number;
    satisfaction_score: number;
    lifetime_value: number;
  };
  operations: {
    burn_rate: number;
    runway_months: number;
    cash_position: number;
    growth_efficiency: number;
    operational_efficiency: number;
  };
  team: {
    total_employees: number;
    new_hires: number;
    attrition_rate: number;
    productivity_score: number;
    engagement_score: number;
  };
  marketing: {
    cac: number;
    cac_payback_period: number;
    marketing_qualified_leads: number;
    conversion_rate: number;
    roas: number;
    brand_awareness: number;
  };
  product: {
    active_users: number;
    feature_adoption: number;
    user_satisfaction: number;
    product_market_fit_score: number;
    development_velocity: number;
  };
}

export interface CEOAlert extends Alert {
  category: 'financial' | 'operational' | 'strategic' | 'compliance' | 'market' | 'team';
  impact: 'low' | 'medium' | 'high' | 'critical';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  recommended_actions: string[];
  stakeholders: string[];
  escalation_path: string[];
  related_metrics: string[];
  business_impact: string;
}

export interface ExecutiveSummary {
  id: string;
  organization_id: string;
  period: {
    start: string;
    end: string;
    type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  };
  key_metrics: {
    metric: string;
    value: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
    status: 'on_track' | 'at_risk' | 'off_track';
  }[];
  highlights: string[];
  concerns: string[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    impact: string;
    effort: string;
    timeline: string;
  }[];
  financial_overview: {
    revenue: number;
    expenses: number;
    profit: number;
    cash_flow: number;
    burn_rate: number;
  };
  operational_overview: {
    customer_satisfaction: number;
    employee_satisfaction: number;
    system_uptime: number;
    quality_score: number;
  };
  strategic_overview: {
    goal_completion: number;
    milestone_progress: number;
    competitive_position: string;
    market_share: number;
  };
  created_at: string;
  generated_by: string;
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'date_range' | 'select' | 'multi_select' | 'text' | 'number_range';
  options?: { value: string; label: string }[];
  default_value?: any;
  required: boolean;
  applies_to: string[];
}

export interface DashboardTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text_primary: string;
    text_secondary: string;
  };
  typography: {
    font_family: string;
    font_sizes: Record<string, number>;
    font_weights: Record<string, number>;
  };
  spacing: Record<string, number>;
  border_radius: Record<string, number>;
  shadows: Record<string, string>;
}

export interface DashboardExport {
  id: string;
  dashboard_id: string;
  export_type: 'pdf' | 'png' | 'csv' | 'excel' | 'json';
  filters: Record<string, any>;
  date_range: {
    start: string;
    end: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_url?: string;
  file_size?: number;
  created_by: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface DashboardSubscription {
  id: string;
  dashboard_id: string;
  user_id: string;
  email: string;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    timezone: string;
    days_of_week?: number[];
    day_of_month?: number;
  };
  filters: Record<string, any>;
  export_format: 'pdf' | 'png' | 'csv' | 'excel';
  is_active: boolean;
  last_sent?: string;
  next_send: string;
  created_at: string;
  updated_at: string;
}

export interface RealTimeUpdate {
  id: string;
  dashboard_id?: string;
  widget_id?: string;
  type: 'metric_update' | 'alert' | 'data_refresh' | 'user_action';
  data: Record<string, any>;
  timestamp: string;
  user_id?: string;
  organization_id?: string;
}

export interface DashboardPermission {
  id: string;
  dashboard_id: string;
  user_id?: string;
  role?: string;
  organization_id?: string;
  permissions: {
    view: boolean;
    edit: boolean;
    delete: boolean;
    share: boolean;
    export: boolean;
    subscribe: boolean;
  };
  granted_by: string;
  granted_at: string;
  expires_at?: string;
}

export interface DashboardUsage {
  id: string;
  dashboard_id: string;
  user_id: string;
  action: 'view' | 'edit' | 'export' | 'share' | 'subscribe';
  duration?: number;
  widgets_interacted?: string[];
  filters_applied?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface DashboardInsight {
  id: string;
  dashboard_id: string;
  type: 'anomaly' | 'trend' | 'correlation' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  data: Record<string, any>;
  actions: string[];
  related_metrics: string[];
  expires_at?: string;
  dismissed: boolean;
  created_at: string;
}