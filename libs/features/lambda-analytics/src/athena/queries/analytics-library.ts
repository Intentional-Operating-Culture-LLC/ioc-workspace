/**
 * Analytics Query Library
 * Essential business intelligence queries for IOC
 */

export interface AnalyticsQuery {
  id: string;
  name: string;
  category: string;
  description: string;
  query: string;
  parameters?: QueryParameter[];
  refreshFrequency: string;
  estimatedCost: number;
  businessValue: string;
}

export interface QueryParameter {
  name: string;
  type: string;
  default?: any;
  description: string;
}

export class AnalyticsQueryLibrary {
  private queries: Map<string, AnalyticsQuery> = new Map();

  constructor() {
    this.initializeQueries();
  }

  private initializeQueries(): void {
    // 1. User Growth Analytics
    this.addQuery({
      id: 'user_growth_monthly',
      name: 'Monthly User Growth',
      category: 'growth',
      description: 'Track new vs returning users month-over-month',
      query: `
WITH monthly_users AS (
  SELECT 
    date_format(from_unixtime(cast(timestamp as bigint)/1000), '%Y-%m') as month,
    anonymous_user_id,
    MIN(timestamp) as first_seen
  FROM ioc_analytics.assessment_events
  WHERE date >= date_format(current_date - interval '12' month, '%Y/%m/%d')
  GROUP BY 1, 2
),
user_cohorts AS (
  SELECT 
    month,
    COUNT(DISTINCT anonymous_user_id) as total_users,
    COUNT(DISTINCT CASE 
      WHEN first_seen >= timestamp THEN anonymous_user_id 
    END) as new_users
  FROM monthly_users
  GROUP BY month
)
SELECT 
  month,
  total_users,
  new_users,
  total_users - new_users as returning_users,
  ROUND(100.0 * new_users / total_users, 2) as new_user_percentage,
  ROUND(100.0 * (total_users - LAG(total_users) OVER (ORDER BY month)) / 
    LAG(total_users) OVER (ORDER BY month), 2) as growth_rate
FROM user_cohorts
ORDER BY month DESC;`,
      refreshFrequency: 'daily',
      estimatedCost: 0.02,
      businessValue: 'Track user acquisition and retention trends'
    });

    // 2. OCEAN Trait Distribution
    this.addQuery({
      id: 'ocean_distribution_industry',
      name: 'OCEAN Distribution by Industry',
      category: 'personality',
      description: 'Compare personality traits across industries',
      query: `
WITH trait_stats AS (
  SELECT 
    industry,
    COUNT(*) as sample_size,
    -- Openness
    ROUND(AVG(openness), 3) as openness_mean,
    ROUND(STDDEV(openness), 3) as openness_std,
    ROUND(approx_percentile(openness, 0.50), 3) as openness_median,
    -- Conscientiousness  
    ROUND(AVG(conscientiousness), 3) as conscientiousness_mean,
    ROUND(STDDEV(conscientiousness), 3) as conscientiousness_std,
    ROUND(approx_percentile(conscientiousness, 0.50), 3) as conscientiousness_median,
    -- Extraversion
    ROUND(AVG(extraversion), 3) as extraversion_mean,
    ROUND(STDDEV(extraversion), 3) as extraversion_std,
    ROUND(approx_percentile(extraversion, 0.50), 3) as extraversion_median,
    -- Agreeableness
    ROUND(AVG(agreeableness), 3) as agreeableness_mean,
    ROUND(STDDEV(agreeableness), 3) as agreeableness_std,
    ROUND(approx_percentile(agreeableness, 0.50), 3) as agreeableness_median,
    -- Neuroticism
    ROUND(AVG(neuroticism), 3) as neuroticism_mean,
    ROUND(STDDEV(neuroticism), 3) as neuroticism_std,
    ROUND(approx_percentile(neuroticism, 0.50), 3) as neuroticism_median
  FROM ioc_analytics.ocean_scores
  WHERE year = date_format(current_date, '%Y')
    AND industry IS NOT NULL
  GROUP BY industry
  HAVING sample_size >= 100
)
SELECT * FROM trait_stats
ORDER BY sample_size DESC
LIMIT 20;`,
      refreshFrequency: 'weekly',
      estimatedCost: 0.03,
      businessValue: 'Industry benchmarking for talent insights'
    });

    // 3. Assessment Completion Funnel
    this.addQuery({
      id: 'completion_funnel',
      name: 'Assessment Completion Funnel',
      category: 'engagement',
      description: 'Track drop-off rates through assessment process',
      query: `
WITH assessment_stages AS (
  SELECT 
    anonymous_user_id,
    assessment_id,
    assessment_type,
    device,
    MAX(CASE WHEN completion_time > 0 THEN 1 ELSE 0 END) as completed,
    MIN(timestamp) as start_time,
    MAX(timestamp) as last_activity,
    completion_time
  FROM ioc_analytics.assessment_events
  WHERE date >= date_format(current_date - interval '30' day, '%Y/%m/%d')
  GROUP BY 1, 2, 3, 4, 7
),
funnel_metrics AS (
  SELECT 
    assessment_type,
    device,
    COUNT(*) as total_started,
    SUM(completed) as total_completed,
    AVG(completion_time) as avg_completion_seconds,
    approx_percentile(completion_time, 0.50) as median_completion_seconds,
    SUM(CASE WHEN completion_time > 0 AND completion_time < 300 THEN 1 ELSE 0 END) as quick_completes,
    SUM(CASE WHEN completion_time > 3600 THEN 1 ELSE 0 END) as long_completes
  FROM assessment_stages
  GROUP BY 1, 2
)
SELECT 
  assessment_type,
  device,
  total_started,
  total_completed,
  ROUND(100.0 * total_completed / total_started, 2) as completion_rate,
  ROUND(avg_completion_seconds / 60.0, 1) as avg_completion_minutes,
  ROUND(median_completion_seconds / 60.0, 1) as median_completion_minutes,
  ROUND(100.0 * quick_completes / total_completed, 2) as quick_complete_pct,
  ROUND(100.0 * long_completes / total_completed, 2) as long_complete_pct
FROM funnel_metrics
WHERE total_started >= 10
ORDER BY completion_rate DESC;`,
      refreshFrequency: 'daily',
      estimatedCost: 0.01,
      businessValue: 'Optimize assessment UX and reduce drop-offs'
    });

    // 4. Revenue Analytics
    this.addQuery({
      id: 'revenue_by_cohort',
      name: 'Revenue by User Cohort',
      category: 'revenue',
      description: 'Track revenue contribution by user cohorts',
      query: `
WITH user_cohorts AS (
  SELECT 
    anonymous_user_id,
    date_format(MIN(from_unixtime(cast(timestamp as bigint)/1000)), '%Y-%m') as cohort_month,
    MIN(timestamp) as first_assessment_date
  FROM ioc_analytics.assessment_events
  GROUP BY anonymous_user_id
),
cohort_revenue AS (
  SELECT 
    uc.cohort_month,
    date_format(from_unixtime(cast(ct.timestamp as bigint)/1000), '%Y-%m') as revenue_month,
    COUNT(DISTINCT uc.anonymous_user_id) as active_users,
    SUM(ct.cost_usd) as total_cost,
    AVG(ct.cost_usd) as avg_cost_per_user
  FROM user_cohorts uc
  JOIN ioc_analytics.cost_tracking ct 
    ON uc.anonymous_user_id = ct.user_type
  WHERE ct.service = 'assessment'
  GROUP BY 1, 2
)
SELECT 
  cohort_month,
  revenue_month,
  active_users,
  ROUND(total_cost, 2) as total_cost_usd,
  ROUND(avg_cost_per_user, 4) as avg_cost_per_user_usd,
  ROUND(total_cost / active_users, 4) as cost_per_active_user
FROM cohort_revenue
ORDER BY cohort_month DESC, revenue_month DESC;`,
      refreshFrequency: 'daily',
      estimatedCost: 0.02,
      businessValue: 'Understand user lifetime value and cost trends'
    });

    // 5. Assessment Quality Metrics
    this.addQuery({
      id: 'assessment_quality',
      name: 'Assessment Quality Metrics',
      category: 'quality',
      description: 'Monitor assessment consistency and completeness',
      query: `
SELECT 
  assessment_type,
  date_format(from_unixtime(cast(timestamp as bigint)/1000), '%Y-%m-%d') as assessment_date,
  COUNT(*) as total_assessments,
  AVG(consistency) as avg_consistency_score,
  AVG(completeness) as avg_completeness_score,
  approx_percentile(consistency, 0.25) as consistency_p25,
  approx_percentile(consistency, 0.50) as consistency_p50,
  approx_percentile(consistency, 0.75) as consistency_p75,
  SUM(CASE WHEN consistency < 0.7 THEN 1 ELSE 0 END) as low_consistency_count,
  SUM(CASE WHEN completeness < 0.8 THEN 1 ELSE 0 END) as low_completeness_count
FROM ioc_analytics.ocean_scores
WHERE year = date_format(current_date, '%Y')
  AND month = date_format(current_date, '%m')
GROUP BY 1, 2
HAVING total_assessments >= 10
ORDER BY assessment_date DESC;`,
      refreshFrequency: 'hourly',
      estimatedCost: 0.01,
      businessValue: 'Ensure assessment reliability and validity'
    });

    // 6. Dark Side Indicator Analysis
    this.addQuery({
      id: 'dark_side_indicators',
      name: 'Dark Side Risk Distribution',
      category: 'personality',
      description: 'Analyze distribution of dark side personality indicators',
      query: `
WITH dark_side_analysis AS (
  SELECT 
    industry,
    role,
    map_keys(dark_side_indicators) as indicators,
    map_values(dark_side_indicators) as scores
  FROM ioc_analytics.ocean_scores
  WHERE year = date_format(current_date, '%Y')
    AND dark_side_indicators IS NOT NULL
),
indicator_stats AS (
  SELECT 
    industry,
    indicator,
    AVG(score) as avg_score,
    approx_percentile(score, 0.90) as p90_score,
    SUM(CASE WHEN score > 0.7 THEN 1 ELSE 0 END) as high_risk_count,
    COUNT(*) as total_count
  FROM dark_side_analysis
  CROSS JOIN UNNEST(indicators, scores) AS t(indicator, score)
  GROUP BY industry, indicator
)
SELECT 
  industry,
  indicator,
  ROUND(avg_score, 3) as avg_risk_score,
  ROUND(p90_score, 3) as p90_risk_score,
  high_risk_count,
  total_count,
  ROUND(100.0 * high_risk_count / total_count, 2) as high_risk_percentage
FROM indicator_stats
WHERE total_count >= 50
ORDER BY industry, high_risk_percentage DESC;`,
      refreshFrequency: 'weekly',
      estimatedCost: 0.04,
      businessValue: 'Identify organizational risk patterns'
    });

    // 7. User Journey Analytics
    this.addQuery({
      id: 'user_journey',
      name: 'User Journey Analysis',
      category: 'engagement',
      description: 'Track user progression through multiple assessments',
      query: `
WITH user_journey AS (
  SELECT 
    anonymous_user_id,
    assessment_type,
    ROW_NUMBER() OVER (PARTITION BY anonymous_user_id ORDER BY timestamp) as assessment_sequence,
    timestamp,
    completion_time,
    LAG(assessment_type) OVER (PARTITION BY anonymous_user_id ORDER BY timestamp) as previous_assessment,
    LEAD(assessment_type) OVER (PARTITION BY anonymous_user_id ORDER BY timestamp) as next_assessment
  FROM ioc_analytics.assessment_events
  WHERE date >= date_format(current_date - interval '90' day, '%Y/%m/%d')
),
journey_patterns AS (
  SELECT 
    CONCAT(COALESCE(previous_assessment, 'START'), ' -> ', assessment_type) as transition,
    COUNT(*) as transition_count,
    AVG(completion_time) as avg_completion_time,
    SUM(CASE WHEN next_assessment IS NOT NULL THEN 1 ELSE 0 END) as continued_journey
  FROM user_journey
  WHERE assessment_sequence <= 5
  GROUP BY 1
)
SELECT 
  transition,
  transition_count,
  ROUND(avg_completion_time / 60.0, 1) as avg_completion_minutes,
  continued_journey,
  ROUND(100.0 * continued_journey / transition_count, 2) as continuation_rate
FROM journey_patterns
WHERE transition_count >= 20
ORDER BY transition_count DESC
LIMIT 50;`,
      refreshFrequency: 'daily',
      estimatedCost: 0.03,
      businessValue: 'Optimize user journey and assessment recommendations'
    });

    // 8. Platform Performance
    this.addQuery({
      id: 'platform_performance',
      name: 'Platform Performance Metrics',
      category: 'operations',
      description: 'Monitor platform health and performance',
      query: `
SELECT 
  date_format(from_unixtime(cast(timestamp as bigint)/1000), '%Y-%m-%d %H:00:00') as hour,
  device,
  platform,
  COUNT(*) as total_events,
  COUNT(DISTINCT anonymous_user_id) as unique_users,
  AVG(completion_time) as avg_completion_seconds,
  approx_percentile(completion_time, 0.50) as median_completion_seconds,
  approx_percentile(completion_time, 0.95) as p95_completion_seconds,
  SUM(CASE WHEN completion_time > 7200 THEN 1 ELSE 0 END) as timeout_count
FROM ioc_analytics.assessment_events  
WHERE date = date_format(current_date, '%Y/%m/%d')
GROUP BY 1, 2, 3
ORDER BY hour DESC;`,
      refreshFrequency: 'hourly',
      estimatedCost: 0.005,
      businessValue: 'Monitor platform health and user experience'
    });

    // 9. Facet Analysis
    this.addQuery({
      id: 'facet_deep_dive',
      name: 'Personality Facet Analysis',
      category: 'personality',
      description: 'Deep dive into personality facets',
      query: `
WITH facet_data AS (
  SELECT 
    industry,
    role,
    map_keys(facets) as facet_names,
    map_values(facets) as facet_values
  FROM ioc_analytics.ocean_scores
  WHERE year = date_format(current_date, '%Y')
    AND month = date_format(current_date, '%m')
),
facet_stats AS (
  SELECT 
    industry,
    facet_name,
    facet_value.score as score,
    facet_value.responses as responses,
    facet_value.std_dev as std_dev
  FROM facet_data
  CROSS JOIN UNNEST(facet_names, facet_values) AS t(facet_name, facet_value)
)
SELECT 
  industry,
  facet_name,
  COUNT(*) as sample_size,
  ROUND(AVG(score), 3) as avg_score,
  ROUND(AVG(std_dev), 3) as avg_std_dev,
  ROUND(MIN(score), 3) as min_score,
  ROUND(MAX(score), 3) as max_score,
  ROUND(approx_percentile(score, 0.25), 3) as p25_score,
  ROUND(approx_percentile(score, 0.50), 3) as median_score,
  ROUND(approx_percentile(score, 0.75), 3) as p75_score
FROM facet_stats
WHERE responses >= 3
GROUP BY industry, facet_name
HAVING sample_size >= 30
ORDER BY industry, facet_name;`,
      refreshFrequency: 'weekly',
      estimatedCost: 0.05,
      businessValue: 'Detailed personality insights for talent development'
    });

    // 10. Cost Analysis Dashboard
    this.addQuery({
      id: 'cost_analysis',
      name: 'Service Cost Analysis',
      category: 'operations',
      description: 'Track costs across all services',
      query: `
WITH daily_costs AS (
  SELECT 
    date_format(from_unixtime(cast(timestamp as bigint)/1000), '%Y-%m-%d') as date,
    service,
    operation,
    SUM(cost_usd) as total_cost,
    SUM(usage_amount) as total_usage,
    COUNT(*) as operation_count,
    COUNT(DISTINCT user_type) as unique_users
  FROM ioc_analytics.cost_tracking
  WHERE year = date_format(current_date, '%Y')
    AND month = date_format(current_date, '%m')
  GROUP BY 1, 2, 3
),
cost_summary AS (
  SELECT 
    date,
    service,
    SUM(total_cost) as daily_cost,
    SUM(total_usage) as daily_usage,
    SUM(operation_count) as daily_operations,
    MAX(unique_users) as daily_users
  FROM daily_costs
  GROUP BY date, service
)
SELECT 
  date,
  service,
  ROUND(daily_cost, 4) as cost_usd,
  daily_operations,
  daily_users,
  ROUND(daily_cost / NULLIF(daily_users, 0), 6) as cost_per_user,
  ROUND(daily_cost / NULLIF(daily_operations, 0), 6) as cost_per_operation,
  ROUND(SUM(daily_cost) OVER (PARTITION BY service ORDER BY date ROWS 6 PRECEDING), 2) as rolling_7day_cost
FROM cost_summary
WHERE date >= date_format(current_date - interval '30' day, '%Y-%m-%d')
ORDER BY date DESC, daily_cost DESC;`,
      refreshFrequency: 'hourly',
      estimatedCost: 0.01,
      businessValue: 'Control costs and optimize resource usage'
    });
  }

  private addQuery(query: AnalyticsQuery): void {
    this.queries.set(query.id, query);
  }

  getQuery(id: string): AnalyticsQuery | undefined {
    return this.queries.get(id);
  }

  getQueriesByCategory(category: string): AnalyticsQuery[] {
    return Array.from(this.queries.values())
      .filter(q => q.category === category);
  }

  getAllQueries(): AnalyticsQuery[] {
    return Array.from(this.queries.values());
  }

  getEstimatedMonthlyCost(): number {
    const dailyQueries = this.getAllQueries();
    let monthlyCost = 0;

    dailyQueries.forEach(query => {
      const runsPerMonth = this.getRunsPerMonth(query.refreshFrequency);
      monthlyCost += query.estimatedCost * runsPerMonth;
    });

    return monthlyCost;
  }

  private getRunsPerMonth(frequency: string): number {
    const frequencies: Record<string, number> = {
      'hourly': 24 * 30,
      'daily': 30,
      'weekly': 4,
      'monthly': 1
    };
    return frequencies[frequency] || 30;
  }
}