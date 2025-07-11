-- Analytics Database Materialized Views and Performance Optimization
-- Optimized views for common analytics queries and reporting

-- Enable required extensions for analytics
-- CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
-- CREATE EXTENSION IF NOT EXISTS "pg_trgm";
-- CREATE EXTENSION IF NOT EXISTS "btree_gin";
-- CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE; -- Optional: for time-series optimization

-- ===========================
-- MATERIALIZED VIEWS
-- ===========================

-- Daily Assessment Overview
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_assessment_overview AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_assessments,
  COUNT(DISTINCT org_hash) as unique_organizations,
  AVG(question_count) as avg_question_count,
  COUNT(CASE WHEN type = 'self' THEN 1 END) as self_assessments,
  COUNT(CASE WHEN type = 'peer' THEN 1 END) as peer_assessments,
  COUNT(CASE WHEN type = 'manager' THEN 1 END) as manager_assessments,
  COUNT(CASE WHEN type = '360' THEN 1 END) as full_360_assessments,
  COUNT(CASE WHEN status = 'published' THEN 1 END) as published_assessments,
  COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_assessments
FROM anonymized_assessments
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Create unique index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_assessment_overview_date 
ON mv_daily_assessment_overview (date);

-- Weekly Response Completion Metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_weekly_response_metrics AS
SELECT 
  DATE_TRUNC('week', created_at) as week_start,
  COUNT(*) as total_responses,
  COUNT(DISTINCT respondent_hash) as unique_respondents,
  AVG(completion_percentage) as avg_completion_rate,
  AVG(time_spent_seconds) as avg_time_spent_seconds,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY completion_percentage) as median_completion_rate,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY time_spent_seconds) as p95_time_spent,
  COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_responses,
  COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_responses,
  COUNT(CASE WHEN device_type = 'Mobile' THEN 1 END) as mobile_responses,
  COUNT(CASE WHEN device_type = 'Desktop' THEN 1 END) as desktop_responses,
  COUNT(CASE WHEN device_type = 'Tablet' THEN 1 END) as tablet_responses
FROM anonymized_assessment_responses
WHERE created_at >= NOW() - INTERVAL '26 weeks'
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week_start DESC;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_weekly_response_metrics_week 
ON mv_weekly_response_metrics (week_start);

-- Monthly OCEAN Trait Distributions
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_ocean_distributions AS
SELECT 
  DATE_TRUNC('month', s.created_at) as month,
  s.dimension as trait_name,
  COUNT(*) as sample_size,
  AVG(s.score) as mean_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.score) as median_score,
  STDDEV_POP(s.score) as std_dev,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY s.score) as percentile_25,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY s.score) as percentile_75,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY s.score) as percentile_90,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY s.score) as percentile_95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY s.score) as percentile_99,
  MIN(s.score) as min_score,
  MAX(s.score) as max_score
FROM anonymized_assessment_scores s
WHERE s.dimension IN ('openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism')
  AND s.created_at >= NOW() - INTERVAL '24 months'
GROUP BY DATE_TRUNC('month', s.created_at), s.dimension
ORDER BY month DESC, trait_name;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_ocean_distributions_month_trait 
ON mv_monthly_ocean_distributions (month, trait_name);

-- Industry Performance Benchmarks
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_industry_benchmarks AS
SELECT 
  a.industry_category,
  a.org_size_category,
  s.dimension as trait_name,
  COUNT(*) as sample_size,
  AVG(s.score) as mean_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.score) as median_score,
  STDDEV_POP(s.score) as std_dev,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY s.score) as percentile_25,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY s.score) as percentile_75,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY s.score) as percentile_90,
  MIN(s.score) as min_score,
  MAX(s.score) as max_score,
  -- Calculate z-score boundaries for outlier detection
  AVG(s.score) - (2 * STDDEV_POP(s.score)) as outlier_lower_bound,
  AVG(s.score) + (2 * STDDEV_POP(s.score)) as outlier_upper_bound
FROM anonymized_assessment_scores s
JOIN anonymized_assessments a ON s.assessment_hash = a.id
WHERE s.dimension IN ('openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism')
  AND a.industry_category IS NOT NULL
  AND s.created_at >= NOW() - INTERVAL '12 months'
GROUP BY a.industry_category, a.org_size_category, s.dimension
HAVING COUNT(*) >= 10  -- Ensure statistical significance
ORDER BY a.industry_category, a.org_size_category, trait_name;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_industry_benchmarks_composite 
ON mv_industry_benchmarks (industry_category, org_size_category, trait_name);

-- Question Response Patterns
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_question_response_patterns AS
SELECT 
  qr.question_type,
  qr.question_hash,
  COUNT(*) as total_responses,
  AVG(qr.time_spent_seconds) as avg_time_spent,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY qr.time_spent_seconds) as median_time_spent,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY qr.time_spent_seconds) as p95_time_spent,
  AVG(qr.confidence_score) as avg_confidence,
  AVG(qr.answer_length) as avg_answer_length,
  AVG(qr.answer_complexity_score) as avg_complexity_score,
  -- Response quality metrics
  COUNT(CASE WHEN qr.confidence_score >= 0.8 THEN 1 END)::float / COUNT(*) as high_confidence_rate,
  COUNT(CASE WHEN qr.answer_length > 0 THEN 1 END)::float / COUNT(*) as response_rate,
  STDDEV_POP(qr.time_spent_seconds) as time_spent_variance
FROM anonymized_question_responses qr
WHERE qr.created_at >= NOW() - INTERVAL '6 months'
GROUP BY qr.question_type, qr.question_hash
HAVING COUNT(*) >= 5
ORDER BY total_responses DESC;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_question_response_patterns_composite 
ON mv_question_response_patterns (question_type, question_hash);

-- Real-time System Performance Dashboard
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_system_performance_dashboard AS
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  AVG(cpu_usage) as avg_cpu_usage,
  MAX(cpu_usage) as max_cpu_usage,
  AVG(memory_usage) as avg_memory_usage,
  MAX(memory_usage) as max_memory_usage,
  AVG(disk_usage) as avg_disk_usage,
  MAX(disk_usage) as max_disk_usage,
  AVG(active_connections) as avg_active_connections,
  MAX(active_connections) as max_active_connections,
  AVG(avg_response_time_ms) as avg_response_time,
  MAX(avg_response_time_ms) as max_response_time,
  AVG(slow_queries) as avg_slow_queries,
  SUM(failed_queries) as total_failed_queries,
  AVG(cache_hit_rate) as avg_cache_hit_rate,
  AVG(error_rate) as avg_error_rate
FROM system_health_metrics
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_system_performance_dashboard_hour 
ON mv_system_performance_dashboard (hour);

-- Dual AI Validation Performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dual_ai_performance AS
SELECT 
  DATE_TRUNC('week', period_start) as week_start,
  AVG(total_validations) as avg_weekly_validations,
  AVG(agreement_rate) as avg_agreement_rate,
  AVG(validation_accuracy) as avg_validation_accuracy,
  AVG(false_positive_rate) as avg_false_positive_rate,
  AVG(false_negative_rate) as avg_false_negative_rate,
  AVG(avg_processing_time_ms) as avg_processing_time,
  AVG(p95_processing_time_ms) as avg_p95_processing_time,
  -- Performance trends
  LAG(AVG(agreement_rate)) OVER (ORDER BY DATE_TRUNC('week', period_start)) as prev_agreement_rate,
  LAG(AVG(validation_accuracy)) OVER (ORDER BY DATE_TRUNC('week', period_start)) as prev_validation_accuracy
FROM dual_ai_validation_metrics
WHERE period_start >= NOW() - INTERVAL '26 weeks'
GROUP BY DATE_TRUNC('week', period_start)
ORDER BY week_start DESC;

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dual_ai_performance_week 
ON mv_dual_ai_performance (week_start);

-- ===========================
-- PARTIAL INDEXES FOR OPTIMIZATION
-- ===========================

-- Partial indexes for active/recent data
CREATE INDEX IF NOT EXISTS idx_recent_assessments_published 
ON anonymized_assessments (created_at, org_hash) 
WHERE status = 'published' AND created_at >= NOW() - INTERVAL '6 months';

CREATE INDEX IF NOT EXISTS idx_recent_responses_submitted 
ON anonymized_assessment_responses (created_at, assessment_hash) 
WHERE status = 'submitted' AND created_at >= NOW() - INTERVAL '6 months';

CREATE INDEX IF NOT EXISTS idx_recent_scores_ocean 
ON anonymized_assessment_scores (created_at, dimension, score) 
WHERE dimension IN ('openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism')
  AND created_at >= NOW() - INTERVAL '6 months';

-- Partial index for high-quality responses
CREATE INDEX IF NOT EXISTS idx_high_quality_responses 
ON anonymized_assessment_responses (created_at, completion_percentage) 
WHERE completion_percentage >= 80 AND status = 'submitted';

-- Partial index for recent quality metrics
CREATE INDEX IF NOT EXISTS idx_recent_quality_metrics 
ON data_quality_metrics (timestamp, dataset, completeness) 
WHERE timestamp >= NOW() - INTERVAL '30 days';

-- ===========================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ===========================

-- Multi-column indexes for frequent join patterns
CREATE INDEX IF NOT EXISTS idx_assessment_org_industry_size 
ON anonymized_assessments (org_hash, industry_category, org_size_category, created_at);

CREATE INDEX IF NOT EXISTS idx_scores_assessment_dimension_date 
ON anonymized_assessment_scores (assessment_hash, dimension, created_at);

CREATE INDEX IF NOT EXISTS idx_responses_assessment_status_date 
ON anonymized_assessment_responses (assessment_hash, status, created_at);

-- ===========================
-- QUERY OPTIMIZATION FUNCTIONS
-- ===========================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_assessment_overview;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_weekly_response_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_ocean_distributions;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_industry_benchmarks;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_question_response_patterns;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_system_performance_dashboard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dual_ai_performance;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh views on schedule
CREATE OR REPLACE FUNCTION refresh_analytics_views_scheduled()
RETURNS void AS $$
BEGIN
  -- Refresh high-frequency views (every 15 minutes)
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_system_performance_dashboard;
  
  -- Refresh medium-frequency views (every hour)
  IF EXTRACT(MINUTE FROM NOW()) = 0 THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_assessment_overview;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_weekly_response_metrics;
  END IF;
  
  -- Refresh low-frequency views (daily at midnight)
  IF EXTRACT(HOUR FROM NOW()) = 0 AND EXTRACT(MINUTE FROM NOW()) = 0 THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_ocean_distributions;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_industry_benchmarks;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_question_response_patterns;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dual_ai_performance;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze query performance
CREATE OR REPLACE FUNCTION analyze_query_performance()
RETURNS TABLE (
  query_hash text,
  calls bigint,
  total_time double precision,
  mean_time double precision,
  rows bigint,
  query_text text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg_stat_statements.query,
    pg_stat_statements.calls,
    pg_stat_statements.total_time,
    pg_stat_statements.mean_time,
    pg_stat_statements.rows,
    pg_stat_statements.query
  FROM pg_stat_statements
  WHERE pg_stat_statements.query LIKE '%anonymized_%'
  ORDER BY pg_stat_statements.mean_time DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Function to get table statistics
CREATE OR REPLACE FUNCTION get_table_statistics()
RETURNS TABLE (
  table_name text,
  row_count bigint,
  total_size text,
  index_size text,
  table_size text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname||'.'||tablename as table_name,
    n_tup_ins - n_tup_del as row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
    AND tablename LIKE 'anonymized_%'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- ===========================
-- AUTOMATIC MAINTENANCE
-- ===========================

-- Create maintenance log table
CREATE TABLE IF NOT EXISTS maintenance_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  operation VARCHAR(50) NOT NULL,
  target_table VARCHAR(100),
  duration_ms INTEGER,
  rows_affected INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB
);

-- Function to log maintenance operations
CREATE OR REPLACE FUNCTION log_maintenance_operation(
  operation_type VARCHAR(50),
  target_table VARCHAR(100),
  duration_ms INTEGER,
  rows_affected INTEGER DEFAULT NULL,
  success BOOLEAN DEFAULT true,
  error_message TEXT DEFAULT NULL,
  metadata JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO maintenance_log (
    operation, target_table, duration_ms, rows_affected, success, error_message, metadata
  ) VALUES (
    operation_type, target_table, duration_ms, rows_affected, success, error_message, metadata
  );
END;
$$ LANGUAGE plpgsql;

-- Function for automatic statistics update
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
DECLARE
  table_name TEXT;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
BEGIN
  start_time := NOW();
  
  -- Update statistics for all anonymized tables
  FOR table_name IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename LIKE 'anonymized_%'
  LOOP
    EXECUTE 'ANALYZE ' || table_name;
  END LOOP;
  
  -- Update statistics for materialized views
  FOR table_name IN 
    SELECT matviewname FROM pg_matviews 
    WHERE schemaname = 'public' 
    AND matviewname LIKE 'mv_%'
  LOOP
    EXECUTE 'ANALYZE ' || table_name;
  END LOOP;
  
  end_time := NOW();
  
  PERFORM log_maintenance_operation(
    'analyze_tables',
    'all_tables',
    EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER * 1000,
    NULL,
    true,
    NULL,
    '{"operation": "analyze_all_tables"}'::jsonb
  );
END;
$$ LANGUAGE plpgsql;

-- ===========================
-- PERFORMANCE MONITORING
-- ===========================

-- View for monitoring query performance
CREATE OR REPLACE VIEW v_query_performance AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE query LIKE '%anonymized_%'
ORDER BY mean_time DESC;

-- View for monitoring table growth
CREATE OR REPLACE VIEW v_table_growth AS
SELECT 
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_tup_ins - n_tup_del as net_growth,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'anonymized_%'
ORDER BY n_tup_ins - n_tup_del DESC;

-- View for monitoring index usage
CREATE OR REPLACE VIEW v_index_usage AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'anonymized_%'
ORDER BY idx_scan DESC;

-- Comments for documentation
COMMENT ON MATERIALIZED VIEW mv_daily_assessment_overview IS 'Daily aggregated assessment metrics for reporting and trend analysis';
COMMENT ON MATERIALIZED VIEW mv_weekly_response_metrics IS 'Weekly response completion and engagement metrics';
COMMENT ON MATERIALIZED VIEW mv_monthly_ocean_distributions IS 'Monthly OCEAN trait score distributions for longitudinal analysis';
COMMENT ON MATERIALIZED VIEW mv_industry_benchmarks IS 'Industry and organization size benchmarks for comparative analysis';
COMMENT ON MATERIALIZED VIEW mv_question_response_patterns IS 'Question-level response patterns and quality metrics';
COMMENT ON MATERIALIZED VIEW mv_system_performance_dashboard IS 'System performance metrics for monitoring and alerting';
COMMENT ON MATERIALIZED VIEW mv_dual_ai_performance IS 'Dual AI validation system performance metrics';

COMMENT ON FUNCTION refresh_all_analytics_views() IS 'Refresh all materialized views - use for manual refresh or during maintenance';
COMMENT ON FUNCTION refresh_analytics_views_scheduled() IS 'Scheduled refresh of materialized views based on update frequency requirements';
COMMENT ON FUNCTION analyze_query_performance() IS 'Analyze query performance using pg_stat_statements';
COMMENT ON FUNCTION get_table_statistics() IS 'Get table size and row count statistics';
COMMENT ON FUNCTION update_table_statistics() IS 'Update table statistics for query optimization';