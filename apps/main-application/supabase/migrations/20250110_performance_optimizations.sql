-- Performance Optimizations and Monitoring Setup
-- This migration implements advanced performance optimizations for the dashboard system

-- Enable additional extensions for performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_buffercache;

-- Create materialized views for frequently accessed dashboard data
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_organization_summary AS
SELECT 
    o.id as organization_id,
    o.name,
    COUNT(DISTINCT uo.user_id) as total_users,
    COUNT(DISTINCT CASE WHEN u.last_login >= NOW() - INTERVAL '7 days' THEN uo.user_id END) as active_users_week,
    COUNT(DISTINCT CASE WHEN u.last_login >= NOW() - INTERVAL '30 days' THEN uo.user_id END) as active_users_month,
    COUNT(DISTINCT a.id) as total_assessments,
    COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_assessments,
    COUNT(DISTINCT CASE WHEN a.created_at >= NOW() - INTERVAL '7 days' THEN a.id END) as recent_assessments,
    CASE 
        WHEN COUNT(DISTINCT a.id) = 0 THEN 0
        ELSE ROUND((COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END)::DECIMAL / COUNT(DISTINCT a.id) * 100), 2)
    END as completion_rate,
    MAX(u.last_login) as latest_activity,
    NOW() as last_updated
FROM organizations o
LEFT JOIN user_organizations uo ON o.id = uo.organization_id AND uo.is_active = true
LEFT JOIN users u ON uo.user_id = u.id
LEFT JOIN assessments a ON o.id = a.organization_id
WHERE o.is_active = true
GROUP BY o.id, o.name;

-- Create unique index on the materialized view
CREATE UNIQUE INDEX idx_mv_organization_summary_org_id ON mv_organization_summary(organization_id);

-- Create materialized view for OCEAN metrics aggregation
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ocean_metrics_summary AS
SELECT 
    a.organization_id,
    DATE_TRUNC('week', oar.created_at) as week_start,
    COUNT(*) as assessment_count,
    AVG(oar.openness_score) as avg_openness,
    AVG(oar.conscientiousness_score) as avg_conscientiousness,
    AVG(oar.extraversion_score) as avg_extraversion,
    AVG(oar.agreeableness_score) as avg_agreeableness,
    AVG(oar.neuroticism_score) as avg_neuroticism,
    STDDEV(oar.openness_score) as stddev_openness,
    STDDEV(oar.conscientiousness_score) as stddev_conscientiousness,
    STDDEV(oar.extraversion_score) as stddev_extraversion,
    STDDEV(oar.agreeableness_score) as stddev_agreeableness,
    STDDEV(oar.neuroticism_score) as stddev_neuroticism,
    NOW() as last_updated
FROM assessments a
JOIN ocean_assessment_results oar ON a.id = oar.assessment_id
WHERE a.status = 'completed'
AND oar.created_at >= NOW() - INTERVAL '1 year'
GROUP BY a.organization_id, DATE_TRUNC('week', oar.created_at);

-- Create indexes for the OCEAN materialized view
CREATE INDEX idx_mv_ocean_metrics_org_week ON mv_ocean_metrics_summary(organization_id, week_start DESC);

-- Create optimized indexes for dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboard_metrics_composite 
    ON dashboard_metrics(organization_id, metric_type, metric_name, recorded_at DESC) 
    WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_logs_composite
    ON user_activity_logs(organization_id, user_id, activity_type, recorded_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assessment_responses_composite
    ON assessment_responses(assessment_id, status, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ocean_assessment_results_composite
    ON ocean_assessment_results(assessment_id, created_at DESC);

-- Create covering indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assessments_covering
    ON assessments(organization_id, status, created_at DESC)
    INCLUDE (id, user_id, updated_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_organizations_covering
    ON user_organizations(organization_id, is_active)
    INCLUDE (user_id, role, created_at)
    WHERE is_active = true;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_dashboard_materialized_views()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Refresh organization summary
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_organization_summary;
    
    -- Refresh OCEAN metrics summary
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ocean_metrics_summary;
    
    -- Log the refresh
    INSERT INTO system_performance_metrics (
        metric_type, metric_name, metric_value, service_name
    ) VALUES (
        'maintenance', 'materialized_view_refresh', 1, 'database'
    );
END;
$$;

-- Function to analyze table statistics
CREATE OR REPLACE FUNCTION analyze_dashboard_tables()
RETURNS TABLE(table_name TEXT, row_count BIGINT, size_bytes BIGINT, last_analyze TIMESTAMP)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update table statistics
    ANALYZE dashboard_metrics;
    ANALYZE user_activity_logs;
    ANALYZE weekly_reports;
    ANALYZE assessment_aggregations;
    ANALYZE system_performance_metrics;
    
    -- Return table statistics
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        n_tup_ins + n_tup_upd + n_tup_del as row_count,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes,
        last_analyze
    FROM pg_stat_user_tables 
    WHERE tablename IN (
        'dashboard_metrics', 'user_activity_logs', 'weekly_reports', 
        'assessment_aggregations', 'system_performance_metrics'
    );
END;
$$;

-- Function to get slow queries
CREATE OR REPLACE FUNCTION get_slow_queries(
    min_duration_ms INTEGER DEFAULT 1000,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(
    query TEXT,
    calls BIGINT,
    total_time DOUBLE PRECISION,
    mean_time DOUBLE PRECISION,
    rows BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pss.query,
        pss.calls,
        pss.total_exec_time,
        pss.mean_exec_time,
        pss.rows
    FROM pg_stat_statements pss
    WHERE pss.mean_exec_time > min_duration_ms
    ORDER BY pss.mean_exec_time DESC
    LIMIT limit_count;
END;
$$;

-- Function to get database cache hit ratio
CREATE OR REPLACE FUNCTION get_cache_hit_ratio()
RETURNS TABLE(
    cache_type TEXT,
    hit_ratio NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Buffer Cache' as cache_type,
        ROUND(
            100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0),
            2
        ) as hit_ratio
    FROM pg_statio_user_tables
    
    UNION ALL
    
    SELECT 
        'Index Cache' as cache_type,
        ROUND(
            100.0 * sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit + idx_blks_read), 0),
            2
        ) as hit_ratio
    FROM pg_statio_user_tables;
END;
$$;

-- Function to monitor connection usage
CREATE OR REPLACE FUNCTION get_connection_stats()
RETURNS TABLE(
    active_connections INTEGER,
    idle_connections INTEGER,
    total_connections INTEGER,
    max_connections INTEGER,
    connection_usage_pct NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE state = 'active')::INTEGER as active_connections,
        COUNT(*) FILTER (WHERE state = 'idle')::INTEGER as idle_connections,
        COUNT(*)::INTEGER as total_connections,
        current_setting('max_connections')::INTEGER as max_connections,
        ROUND(
            100.0 * COUNT(*) / current_setting('max_connections')::INTEGER,
            2
        ) as connection_usage_pct
    FROM pg_stat_activity
    WHERE pid != pg_backend_pid();
END;
$$;

-- Function for automatic partition management
CREATE OR REPLACE FUNCTION manage_table_partitions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    partition_date DATE;
    table_name TEXT;
    partition_name TEXT;
BEGIN
    -- Create monthly partitions for user_activity_logs for next 3 months
    FOR i IN 0..2 LOOP
        partition_date := DATE_TRUNC('month', NOW() + (i || ' months')::INTERVAL);
        partition_name := 'user_activity_logs_' || TO_CHAR(partition_date, 'YYYY_MM');
        
        -- Check if partition already exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE tablename = partition_name
        ) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF user_activity_logs 
                 FOR VALUES FROM (%L) TO (%L)',
                partition_name,
                partition_date,
                partition_date + INTERVAL '1 month'
            );
            
            -- Create index on the partition
            EXECUTE format(
                'CREATE INDEX %I ON %I (organization_id, recorded_at DESC)',
                'idx_' || partition_name || '_org_date',
                partition_name
            );
        END IF;
    END LOOP;
    
    -- Drop old partitions (older than 6 months)
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE tablename LIKE 'user_activity_logs_%'
        AND tablename < 'user_activity_logs_' || TO_CHAR(NOW() - INTERVAL '6 months', 'YYYY_MM')
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I', table_name);
    END LOOP;
END;
$$;

-- Create alerting function for performance issues
CREATE OR REPLACE FUNCTION check_performance_alerts()
RETURNS TABLE(
    alert_level TEXT,
    alert_type TEXT,
    message TEXT,
    metric_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cache_ratio NUMERIC;
    active_conns INTEGER;
    max_conns INTEGER;
    slow_query_count INTEGER;
BEGIN
    -- Check cache hit ratio
    SELECT hit_ratio INTO cache_ratio
    FROM get_cache_hit_ratio()
    WHERE cache_type = 'Buffer Cache';
    
    IF cache_ratio < 90 THEN
        RETURN QUERY SELECT 
            'WARNING'::TEXT,
            'CACHE_HIT_RATIO'::TEXT,
            'Low buffer cache hit ratio: ' || cache_ratio || '%'::TEXT,
            cache_ratio;
    END IF;
    
    -- Check connection usage
    SELECT active_connections, max_connections 
    INTO active_conns, max_conns
    FROM get_connection_stats();
    
    IF active_conns::NUMERIC / max_conns > 0.8 THEN
        RETURN QUERY SELECT 
            'CRITICAL'::TEXT,
            'HIGH_CONNECTION_USAGE'::TEXT,
            'High connection usage: ' || active_conns || '/' || max_conns::TEXT,
            (active_conns::NUMERIC / max_conns * 100);
    END IF;
    
    -- Check for slow queries
    SELECT COUNT(*) INTO slow_query_count
    FROM get_slow_queries(5000, 5);
    
    IF slow_query_count > 0 THEN
        RETURN QUERY SELECT 
            'WARNING'::TEXT,
            'SLOW_QUERIES'::TEXT,
            'Found ' || slow_query_count || ' slow queries (>5s)'::TEXT,
            slow_query_count::NUMERIC;
    END IF;
END;
$$;

-- Create automated maintenance function
CREATE OR REPLACE FUNCTION run_maintenance_tasks()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Refresh materialized views
    PERFORM refresh_dashboard_materialized_views();
    
    -- Update table statistics
    PERFORM analyze_dashboard_tables();
    
    -- Manage partitions
    PERFORM manage_table_partitions();
    
    -- Clean up old pg_stat_statements data
    PERFORM pg_stat_statements_reset();
    
    -- Vacuum analyze critical tables
    VACUUM ANALYZE dashboard_metrics;
    VACUUM ANALYZE user_activity_logs;
    VACUUM ANALYZE assessment_aggregations;
    
    -- Log maintenance completion
    INSERT INTO system_performance_metrics (
        metric_type, metric_name, metric_value, service_name
    ) VALUES (
        'maintenance', 'maintenance_tasks_completed', 1, 'database'
    );
END;
$$;

-- Create performance monitoring table
CREATE TABLE IF NOT EXISTS performance_monitoring (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    check_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cache_hit_ratio NUMERIC,
    active_connections INTEGER,
    connection_usage_pct NUMERIC,
    slow_query_count INTEGER,
    largest_table_size_mb NUMERIC,
    alerts JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to record performance snapshot
CREATE OR REPLACE FUNCTION record_performance_snapshot()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cache_ratio NUMERIC;
    conn_stats RECORD;
    slow_queries INTEGER;
    largest_table NUMERIC;
    alerts JSONB := '[]';
    alert_record RECORD;
BEGIN
    -- Get cache hit ratio
    SELECT hit_ratio INTO cache_ratio
    FROM get_cache_hit_ratio()
    WHERE cache_type = 'Buffer Cache';
    
    -- Get connection stats
    SELECT * INTO conn_stats FROM get_connection_stats();
    
    -- Count slow queries
    SELECT COUNT(*) INTO slow_queries
    FROM get_slow_queries(1000, 100);
    
    -- Get largest table size
    SELECT ROUND(pg_total_relation_size('user_activity_logs') / 1024.0 / 1024.0, 2)
    INTO largest_table;
    
    -- Collect alerts
    FOR alert_record IN 
        SELECT * FROM check_performance_alerts()
    LOOP
        alerts := alerts || jsonb_build_object(
            'level', alert_record.alert_level,
            'type', alert_record.alert_type,
            'message', alert_record.message,
            'value', alert_record.metric_value
        );
    END LOOP;
    
    -- Insert performance snapshot
    INSERT INTO performance_monitoring (
        cache_hit_ratio,
        active_connections,
        connection_usage_pct,
        slow_query_count,
        largest_table_size_mb,
        alerts
    ) VALUES (
        cache_ratio,
        conn_stats.active_connections,
        conn_stats.connection_usage_pct,
        slow_queries,
        largest_table,
        alerts
    );
    
    -- Clean up old monitoring data (keep 30 days)
    DELETE FROM performance_monitoring 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Grant permissions for performance functions
GRANT EXECUTE ON FUNCTION refresh_dashboard_materialized_views() TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_dashboard_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION get_slow_queries(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cache_hit_ratio() TO authenticated;
GRANT EXECUTE ON FUNCTION get_connection_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION check_performance_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION record_performance_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION run_maintenance_tasks() TO authenticated;

-- Enable RLS on performance monitoring table
ALTER TABLE performance_monitoring ENABLE ROW LEVEL SECURITY;

-- RLS policy for performance monitoring (admin access only)
CREATE POLICY "performance_monitoring_admin_access" ON performance_monitoring
    USING (EXISTS (
        SELECT 1 FROM user_organizations uo
        JOIN organizations o ON uo.organization_id = o.id
        WHERE uo.user_id = auth.uid() AND uo.role IN ('admin', 'owner')
    ));

-- Create indexes for performance monitoring
CREATE INDEX idx_performance_monitoring_time ON performance_monitoring(check_time DESC);
CREATE INDEX idx_performance_monitoring_alerts ON performance_monitoring USING GIN(alerts);

-- Schedule performance monitoring (to be called by cron job)
INSERT INTO scheduled_job_config (job_name, job_type, schedule_expression, configuration) VALUES
('record_performance_snapshot', 'monitoring', '*/15 * * * *', '{"description": "Record performance snapshot every 15 minutes"}'),
('run_maintenance_tasks', 'maintenance', '0 4 * * *', '{"description": "Run maintenance tasks daily at 4 AM"}')
ON CONFLICT (job_name) DO NOTHING;

-- Comments for documentation
COMMENT ON MATERIALIZED VIEW mv_organization_summary IS 'Pre-computed organization metrics for faster dashboard queries';
COMMENT ON MATERIALIZED VIEW mv_ocean_metrics_summary IS 'Pre-computed OCEAN assessment metrics by week and organization';
COMMENT ON FUNCTION refresh_dashboard_materialized_views IS 'Refreshes all dashboard-related materialized views';
COMMENT ON FUNCTION analyze_dashboard_tables IS 'Updates table statistics for query optimization';
COMMENT ON FUNCTION get_slow_queries IS 'Returns queries with execution time above threshold';
COMMENT ON FUNCTION get_cache_hit_ratio IS 'Returns database cache hit ratios for performance monitoring';
COMMENT ON FUNCTION check_performance_alerts IS 'Checks for performance issues and returns alerts';
COMMENT ON FUNCTION record_performance_snapshot IS 'Records current performance metrics for monitoring';
COMMENT ON TABLE performance_monitoring IS 'Historical performance monitoring data and alerts';