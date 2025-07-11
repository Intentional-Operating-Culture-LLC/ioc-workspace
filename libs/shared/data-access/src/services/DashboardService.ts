import { Database } from '@/database/types';
import { createClient } from '@supabase/supabase-js';

export interface DashboardMetric {
  id: string;
  organization_id: string;
  metric_type: string;
  metric_name: string;
  metric_value: number;
  metric_unit?: string;
  dimension_1?: string;
  dimension_2?: string;
  dimension_3?: string;
  metadata?: Record<string, any>;
  calculation_method?: string;
  data_source?: string;
  recorded_at: string;
  created_at: string;
}

export interface DashboardSummary {
  organization_id: string;
  period_start: string;
  period_end: string;
  user_stats: {
    total_users: number;
    active_users: number;
    engagement_rate: number;
  };
  assessment_stats: {
    total_assessments: number;
    completed_assessments: number;
    recent_assessments: number;
    completion_rate: number;
  };
  activity_stats: {
    total_activities: number;
    active_users_period: number;
    avg_session_duration: number;
  };
  latest_metrics: Array<{
    type: string;
    name: string;
    value: number;
    unit: string;
    metadata: Record<string, any>;
  }>;
}

export interface UserActivity {
  id: string;
  user_id: string;
  organization_id: string;
  activity_type: string;
  activity_subtype?: string;
  page_path?: string;
  session_id?: string;
  duration_seconds?: number;
  interactions_count: number;
  metadata?: Record<string, any>;
  recorded_at: string;
  created_at: string;
}

export interface RealtimeData {
  timestamp: string;
  organization_id: string;
  active_users_15min: number;
  active_users_today: number;
  activities_last_hour: number;
  assessments_started_hour: number;
  assessments_completed_hour: number;
  avg_response_time_ms: number;
  current_error_rate: number;
  system_status: 'healthy' | 'warning' | 'degraded';
}

export interface TrendAnalysis {
  metric_type: string;
  metric_name: string;
  organization_id: string;
  periods_analyzed: number;
  trend_data: Array<{
    week_start: string;
    value: number;
    data_points: number;
    previous_value?: number;
    change_percentage?: number;
  }>;
  overall_trend: 'positive' | 'negative' | 'stable' | 'insufficient_data';
}

export interface AssessmentAggregation {
  id: string;
  organization_id: string;
  aggregation_type: string;
  aggregation_key: string;
  period_start: string;
  period_end: string;
  total_assessments: number;
  completed_assessments: number;
  ocean_scores: Record<string, number>;
  facet_scores: Record<string, any>;
  metadata?: Record<string, any>;
  calculated_at: string;
}

export class DashboardService {
  constructor(private supabase: ReturnType<typeof createClient>) {}

  async getMetrics(params: {
    organizationId: string;
    metricType?: string;
    metricName?: string;
    periodStart?: string;
    periodEnd?: string;
    limit?: number;
  }): Promise<{ data: DashboardMetric[]; count: number }> {
    let query = this.supabase
      .from('dashboard_metrics')
      .select('*', { count: 'exact' })
      .eq('organization_id', params.organizationId)
      .eq('is_active', true)
      .order('recorded_at', { ascending: false });

    if (params.metricType) {
      query = query.eq('metric_type', params.metricType);
    }

    if (params.metricName) {
      query = query.eq('metric_name', params.metricName);
    }

    if (params.periodStart) {
      query = query.gte('recorded_at', params.periodStart);
    }

    if (params.periodEnd) {
      query = query.lte('recorded_at', params.periodEnd);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch dashboard metrics: ${error.message}`);
    }

    return { data: data || [], count: count || 0 };
  }

  async updateMetric(params: {
    organizationId: string;
    metricType: string;
    metricName: string;
    metricValue: number;
    metricUnit?: string;
    dimension1?: string;
    dimension2?: string;
    dimension3?: string;
    metadata?: Record<string, any>;
    calculationMethod?: string;
    dataSource?: string;
  }): Promise<DashboardMetric> {
    const { data, error } = await this.supabase
      .from('dashboard_metrics')
      .insert({
        organization_id: params.organizationId,
        metric_type: params.metricType,
        metric_name: params.metricName,
        metric_value: params.metricValue,
        metric_unit: params.metricUnit,
        dimension_1: params.dimension1,
        dimension_2: params.dimension2,
        dimension_3: params.dimension3,
        metadata: params.metadata,
        calculation_method: params.calculationMethod,
        data_source: params.dataSource,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update dashboard metric: ${error.message}`);
    }

    return data;
  }

  async calculateMetrics(params: {
    organizationId: string;
    metricType?: string;
    periodStart?: string;
    periodEnd?: string;
  }): Promise<Record<string, any>> {
    const { data, error } = await this.supabase
      .rpc('calculate_dashboard_metrics', {
        p_organization_id: params.organizationId,
        p_metric_type: params.metricType,
        p_period_start: params.periodStart,
        p_period_end: params.periodEnd,
      });

    if (error) {
      throw new Error(`Failed to calculate dashboard metrics: ${error.message}`);
    }

    return data;
  }

  async getSummary(params: {
    organizationId: string;
    periodDays?: number;
  }): Promise<DashboardSummary> {
    const { data, error } = await this.supabase
      .rpc('get_dashboard_summary', {
        p_organization_id: params.organizationId,
        p_period_days: params.periodDays || 7,
      });

    if (error) {
      throw new Error(`Failed to get dashboard summary: ${error.message}`);
    }

    return data;
  }

  async getRealtimeData(params: {
    organizationId: string;
  }): Promise<RealtimeData> {
    const { data, error } = await this.supabase
      .rpc('get_realtime_dashboard_data', {
        p_organization_id: params.organizationId,
      });

    if (error) {
      throw new Error(`Failed to get realtime dashboard data: ${error.message}`);
    }

    return data;
  }

  async getTrends(params: {
    organizationId: string;
    metricType: string;
    metricName: string;
    periods?: number;
  }): Promise<TrendAnalysis> {
    const { data, error } = await this.supabase
      .rpc('calculate_metric_trends', {
        p_organization_id: params.organizationId,
        p_metric_type: params.metricType,
        p_metric_name: params.metricName,
        p_periods: params.periods || 4,
      });

    if (error) {
      throw new Error(`Failed to calculate metric trends: ${error.message}`);
    }

    return data;
  }

  async getAggregations(params: {
    organizationId: string;
    aggregationType?: string;
    aggregationKey?: string;
    periodStart?: string;
    periodEnd?: string;
    limit?: number;
  }): Promise<{ data: AssessmentAggregation[]; count: number }> {
    let query = this.supabase
      .from('assessment_aggregations')
      .select('*', { count: 'exact' })
      .eq('organization_id', params.organizationId)
      .order('calculated_at', { ascending: false });

    if (params.aggregationType) {
      query = query.eq('aggregation_type', params.aggregationType);
    }

    if (params.aggregationKey) {
      query = query.eq('aggregation_key', params.aggregationKey);
    }

    if (params.periodStart) {
      query = query.gte('period_start', params.periodStart);
    }

    if (params.periodEnd) {
      query = query.lte('period_end', params.periodEnd);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch assessment aggregations: ${error.message}`);
    }

    return { data: data || [], count: count || 0 };
  }

  async generateAggregations(params: {
    organizationId: string;
    periodStart?: string;
    periodEnd?: string;
  }): Promise<{ rows_created: number }> {
    const { data, error } = await this.supabase
      .rpc('generate_assessment_aggregations', {
        p_organization_id: params.organizationId,
        p_period_start: params.periodStart,
        p_period_end: params.periodEnd,
      });

    if (error) {
      throw new Error(`Failed to generate assessment aggregations: ${error.message}`);
    }

    return { rows_created: data };
  }

  async getActivity(params: {
    organizationId: string;
    userId?: string;
    activityType?: string;
    periodStart?: string;
    periodEnd?: string;
    limit?: number;
  }): Promise<{ data: UserActivity[]; count: number }> {
    let query = this.supabase
      .from('user_activity_logs')
      .select('*', { count: 'exact' })
      .eq('organization_id', params.organizationId)
      .order('recorded_at', { ascending: false });

    if (params.userId) {
      query = query.eq('user_id', params.userId);
    }

    if (params.activityType) {
      query = query.eq('activity_type', params.activityType);
    }

    if (params.periodStart) {
      query = query.gte('recorded_at', params.periodStart);
    }

    if (params.periodEnd) {
      query = query.lte('recorded_at', params.periodEnd);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch user activity: ${error.message}`);
    }

    return { data: data || [], count: count || 0 };
  }

  async trackActivity(params: {
    userId: string;
    organizationId: string;
    activityType: string;
    activitySubtype?: string;
    pagePath?: string;
    sessionId?: string;
    userAgent?: string;
    ipAddress?: string;
    durationSeconds?: number;
    interactionsCount?: number;
    metadata?: Record<string, any>;
  }): Promise<{ id: string }> {
    const { data, error } = await this.supabase
      .rpc('track_user_activity', {
        p_user_id: params.userId,
        p_organization_id: params.organizationId,
        p_activity_type: params.activityType,
        p_activity_subtype: params.activitySubtype,
        p_page_path: params.pagePath,
        p_session_id: params.sessionId,
        p_user_agent: params.userAgent,
        p_ip_address: params.ipAddress,
        p_duration_seconds: params.durationSeconds,
        p_interactions_count: params.interactionsCount || 0,
        p_metadata: params.metadata || {},
      });

    if (error) {
      throw new Error(`Failed to track user activity: ${error.message}`);
    }

    return { id: data };
  }

  async getMetricHistory(params: {
    organizationId: string;
    metricType?: string;
    metricName?: string;
    periodStart?: string;
    periodEnd?: string;
    limit?: number;
  }): Promise<{ data: any[]; count: number }> {
    let query = this.supabase
      .from('metrics_history')
      .select('*', { count: 'exact' })
      .eq('organization_id', params.organizationId)
      .order('period_end', { ascending: false });

    if (params.metricType) {
      query = query.eq('metric_type', params.metricType);
    }

    if (params.metricName) {
      query = query.eq('metric_name', params.metricName);
    }

    if (params.periodStart) {
      query = query.gte('period_start', params.periodStart);
    }

    if (params.periodEnd) {
      query = query.lte('period_end', params.periodEnd);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch metric history: ${error.message}`);
    }

    return { data: data || [], count: count || 0 };
  }
}