// Dashboard API validation schemas

export const dashboardMetricsQuerySchema = {
  metric_type: { type: 'string', required: false },
  metric_name: { type: 'string', required: false },
  period_start: { type: 'string', required: false },
  period_end: { type: 'string', required: false },
  limit: { type: 'number', required: false, min: 1, max: 1000 }
};

export const dashboardSummaryQuerySchema = {
  period_days: { type: 'number', required: false, min: 1, max: 365 }
};

export const trendAnalysisQuerySchema = {
  metric_type: { type: 'string', required: true },
  metric_name: { type: 'string', required: true },
  periods: { type: 'number', required: false, min: 2, max: 12 }
};

export const aggregationsQuerySchema = {
  aggregation_type: { type: 'string', required: false },
  aggregation_key: { type: 'string', required: false },
  period_start: { type: 'string', required: false },
  period_end: { type: 'string', required: false },
  limit: { type: 'number', required: false, min: 1, max: 500 }
};

export const updateMetricSchema = {
  metric_type: { type: 'string', required: true },
  metric_name: { type: 'string', required: true },
  metric_value: { type: 'number', required: true },
  metric_unit: { type: 'string', required: false },
  dimension_1: { type: 'string', required: false },
  dimension_2: { type: 'string', required: false },
  dimension_3: { type: 'string', required: false },
  metadata: { type: 'object', required: false },
  calculation_method: { type: 'string', required: false },
  data_source: { type: 'string', required: false }
};

export const activityQuerySchema = {
  user_id: { type: 'string', required: false },
  activity_type: { type: 'string', required: false },
  period_start: { type: 'string', required: false },
  period_end: { type: 'string', required: false },
  limit: { type: 'number', required: false, min: 1, max: 500 }
};

export const trackActivitySchema = {
  activity_type: { type: 'string', required: true },
  activity_subtype: { type: 'string', required: false },
  page_path: { type: 'string', required: false },
  session_id: { type: 'string', required: false },
  user_agent: { type: 'string', required: false },
  ip_address: { type: 'string', required: false },
  duration_seconds: { type: 'number', required: false },
  interactions_count: { type: 'number', required: false },
  metadata: { type: 'object', required: false }
};