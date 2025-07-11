-- Scheduled Jobs for Automated Data Collection
-- This migration sets up pg_cron jobs for automated metrics calculation and data aggregation

-- Ensure pg_cron extension is available
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create job logging table
CREATE TABLE IF NOT EXISTS scheduled_job_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name VARCHAR(100) NOT NULL,
    job_type VARCHAR(50) NOT NULL, -- 'metrics_calculation', 'data_aggregation', 'report_generation'
    status VARCHAR(20) NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    rows_processed INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create job configuration table
CREATE TABLE IF NOT EXISTS scheduled_job_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name VARCHAR(100) NOT NULL UNIQUE,
    job_type VARCHAR(50) NOT NULL,
    schedule_expression VARCHAR(100) NOT NULL, -- Cron expression
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    failure_count INTEGER DEFAULT 0,
    max_failures INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 300,
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to log job execution
CREATE OR REPLACE FUNCTION log_job_execution(
    p_job_name VARCHAR(100),
    p_job_type VARCHAR(50),
    p_status VARCHAR(20),
    p_rows_processed INTEGER DEFAULT 0,
    p_error_message TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
    v_duration INTEGER;
BEGIN
    -- Get the most recent running job for this job name
    SELECT id, EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER 
    INTO v_log_id, v_duration
    FROM scheduled_job_logs 
    WHERE job_name = p_job_name AND status = 'running'
    ORDER BY started_at DESC 
    LIMIT 1;
    
    IF v_log_id IS NOT NULL THEN
        -- Update existing log entry
        UPDATE scheduled_job_logs 
        SET 
            status = p_status,
            completed_at = NOW(),
            duration_seconds = v_duration,
            rows_processed = p_rows_processed,
            error_message = p_error_message,
            metadata = p_metadata
        WHERE id = v_log_id;
    ELSE
        -- Create new log entry
        INSERT INTO scheduled_job_logs (
            job_name, job_type, status, rows_processed, error_message, metadata
        ) VALUES (
            p_job_name, p_job_type, p_status, p_rows_processed, p_error_message, p_metadata
        ) RETURNING id INTO v_log_id;
    END IF;
    
    -- Update job configuration
    UPDATE scheduled_job_config 
    SET 
        last_run_at = NOW(),
        failure_count = CASE WHEN p_status = 'failed' THEN failure_count + 1 ELSE 0 END
    WHERE job_name = p_job_name;
    
    RETURN v_log_id;
END;
$$;

-- Function to calculate metrics for all active organizations
CREATE OR REPLACE FUNCTION job_calculate_all_metrics()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_record RECORD;
    v_total_processed INTEGER := 0;
    v_error_count INTEGER := 0;
    v_log_id UUID;
BEGIN
    -- Start job logging
    v_log_id := log_job_execution('calculate_all_metrics', 'metrics_calculation', 'running');
    
    -- Process each active organization
    FOR v_org_record IN 
        SELECT id, name FROM organizations WHERE is_active = true
    LOOP
        BEGIN
            -- Calculate metrics for this organization
            PERFORM calculate_dashboard_metrics(
                v_org_record.id,
                NULL, -- All metric types
                NOW() - INTERVAL '1 day',
                NOW()
            );
            
            v_total_processed := v_total_processed + 1;
            
        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            -- Log the error but continue processing other organizations
            RAISE WARNING 'Error calculating metrics for organization %: %', v_org_record.id, SQLERRM;
        END;
    END LOOP;
    
    -- Complete job logging
    IF v_error_count > 0 THEN
        PERFORM log_job_execution(
            'calculate_all_metrics', 
            'metrics_calculation', 
            'completed', 
            v_total_processed,
            'Processed with ' || v_error_count || ' errors',
            jsonb_build_object('total_processed', v_total_processed, 'error_count', v_error_count)
        );
    ELSE
        PERFORM log_job_execution(
            'calculate_all_metrics', 
            'metrics_calculation', 
            'completed', 
            v_total_processed,
            NULL,
            jsonb_build_object('total_processed', v_total_processed)
        );
    END IF;
END;
$$;

-- Function to generate assessment aggregations for all organizations
CREATE OR REPLACE FUNCTION job_generate_all_aggregations()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_record RECORD;
    v_total_processed INTEGER := 0;
    v_total_rows INTEGER := 0;
    v_error_count INTEGER := 0;
    v_rows_created INTEGER;
    v_log_id UUID;
BEGIN
    -- Start job logging
    v_log_id := log_job_execution('generate_all_aggregations', 'data_aggregation', 'running');
    
    -- Process each active organization
    FOR v_org_record IN 
        SELECT id, name FROM organizations WHERE is_active = true
    LOOP
        BEGIN
            -- Generate aggregations for this organization
            v_rows_created := generate_assessment_aggregations(
                v_org_record.id,
                (CURRENT_DATE - INTERVAL '7 days')::DATE,
                CURRENT_DATE
            );
            
            v_total_processed := v_total_processed + 1;
            v_total_rows := v_total_rows + v_rows_created;
            
        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            RAISE WARNING 'Error generating aggregations for organization %: %', v_org_record.id, SQLERRM;
        END;
    END LOOP;
    
    -- Complete job logging
    IF v_error_count > 0 THEN
        PERFORM log_job_execution(
            'generate_all_aggregations', 
            'data_aggregation', 
            'completed', 
            v_total_rows,
            'Processed with ' || v_error_count || ' errors',
            jsonb_build_object('organizations_processed', v_total_processed, 'total_rows', v_total_rows, 'error_count', v_error_count)
        );
    ELSE
        PERFORM log_job_execution(
            'generate_all_aggregations', 
            'data_aggregation', 
            'completed', 
            v_total_rows,
            NULL,
            jsonb_build_object('organizations_processed', v_total_processed, 'total_rows', v_total_rows)
        );
    END IF;
END;
$$;

-- Function to cleanup old data
CREATE OR REPLACE FUNCTION job_cleanup_old_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER := 0;
    v_log_id UUID;
BEGIN
    -- Start job logging
    v_log_id := log_job_execution('cleanup_old_data', 'maintenance', 'running');
    
    -- Cleanup old user activity logs (older than 90 days)
    DELETE FROM user_activity_logs 
    WHERE recorded_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Cleanup old system performance metrics (older than 30 days)
    DELETE FROM system_performance_metrics 
    WHERE recorded_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;
    
    -- Cleanup old job logs (older than 60 days)
    DELETE FROM scheduled_job_logs 
    WHERE created_at < NOW() - INTERVAL '60 days';
    GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;
    
    -- Archive old dashboard metrics to history table
    INSERT INTO metrics_history (
        organization_id, metric_id, metric_type, metric_name, 
        current_value, period_start, period_end, calculation_context
    )
    SELECT 
        organization_id, id, metric_type, metric_name, 
        metric_value, recorded_at - INTERVAL '1 day', recorded_at, 
        jsonb_build_object('archived_at', NOW(), 'original_metadata', metadata)
    FROM dashboard_metrics 
    WHERE recorded_at < NOW() - INTERVAL '30 days' 
    AND id NOT IN (SELECT metric_id FROM metrics_history WHERE metric_id IS NOT NULL);
    
    -- Delete old dashboard metrics after archiving
    DELETE FROM dashboard_metrics 
    WHERE recorded_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;
    
    -- Complete job logging
    PERFORM log_job_execution(
        'cleanup_old_data', 
        'maintenance', 
        'completed', 
        v_deleted_count,
        NULL,
        jsonb_build_object('deleted_records', v_deleted_count)
    );
END;
$$;

-- Function to generate weekly reports
CREATE OR REPLACE FUNCTION job_generate_weekly_reports()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_record RECORD;
    v_total_processed INTEGER := 0;
    v_error_count INTEGER := 0;
    v_log_id UUID;
    v_report_id UUID;
    v_week_start DATE;
    v_week_end DATE;
BEGIN
    -- Start job logging
    v_log_id := log_job_execution('generate_weekly_reports', 'report_generation', 'running');
    
    -- Calculate last week's date range
    v_week_start := (CURRENT_DATE - INTERVAL '1 week')::DATE - (EXTRACT(DOW FROM CURRENT_DATE - INTERVAL '1 week')::INTEGER - 1);
    v_week_end := v_week_start + INTERVAL '6 days';
    
    -- Process each active organization
    FOR v_org_record IN 
        SELECT id, name FROM organizations WHERE is_active = true
    LOOP
        BEGIN
            -- Check if report already exists for this week
            SELECT id INTO v_report_id
            FROM weekly_reports
            WHERE organization_id = v_org_record.id
            AND report_period_start = v_week_start
            AND report_period_end = v_week_end;
            
            IF v_report_id IS NULL THEN
                -- Create new weekly report
                INSERT INTO weekly_reports (
                    organization_id, report_period_start, report_period_end,
                    title, status, template_id
                ) VALUES (
                    v_org_record.id, v_week_start, v_week_end,
                    'Weekly Report - ' || v_org_record.name || ' - ' || v_week_start,
                    'generated', 
                    (SELECT id FROM report_templates WHERE template_type = 'weekly' AND is_default = true LIMIT 1)
                ) RETURNING id INTO v_report_id;
                
                -- Add standard sections
                INSERT INTO report_sections (report_id, section_type, section_title, section_order, content)
                VALUES 
                    (v_report_id, 'executive_summary', 'Executive Summary', 1, 'Weekly summary of key metrics and insights.'),
                    (v_report_id, 'metrics_summary', 'Key Metrics', 2, 'Dashboard metrics for the reporting period.'),
                    (v_report_id, 'ocean_insights', 'OCEAN Assessment Insights', 3, 'Analysis of personality assessment results.'),
                    (v_report_id, 'team_performance', 'Team Performance', 4, 'Team and department performance metrics.');
                
                v_total_processed := v_total_processed + 1;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            RAISE WARNING 'Error generating weekly report for organization %: %', v_org_record.id, SQLERRM;
        END;
    END LOOP;
    
    -- Complete job logging
    IF v_error_count > 0 THEN
        PERFORM log_job_execution(
            'generate_weekly_reports', 
            'report_generation', 
            'completed', 
            v_total_processed,
            'Processed with ' || v_error_count || ' errors',
            jsonb_build_object('reports_generated', v_total_processed, 'error_count', v_error_count, 'week_start', v_week_start, 'week_end', v_week_end)
        );
    ELSE
        PERFORM log_job_execution(
            'generate_weekly_reports', 
            'report_generation', 
            'completed', 
            v_total_processed,
            NULL,
            jsonb_build_object('reports_generated', v_total_processed, 'week_start', v_week_start, 'week_end', v_week_end)
        );
    END IF;
END;
$$;

-- Function to monitor system performance
CREATE OR REPLACE FUNCTION job_monitor_system_performance()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_db_size BIGINT;
    v_active_connections INTEGER;
    v_slow_queries INTEGER;
    v_log_id UUID;
BEGIN
    -- Start job logging
    v_log_id := log_job_execution('monitor_system_performance', 'monitoring', 'running');
    
    -- Get database size
    SELECT pg_database_size(current_database()) INTO v_db_size;
    
    -- Get active connections
    SELECT COUNT(*) INTO v_active_connections
    FROM pg_stat_activity 
    WHERE state = 'active';
    
    -- Get slow queries count (queries running longer than 5 seconds)
    SELECT COUNT(*) INTO v_slow_queries
    FROM pg_stat_activity 
    WHERE state = 'active' 
    AND query_start < NOW() - INTERVAL '5 seconds';
    
    -- Record performance metrics
    INSERT INTO system_performance_metrics (
        metric_type, metric_name, metric_value, metric_unit, service_name
    ) VALUES 
        ('resource_usage', 'database_size_bytes', v_db_size, 'bytes', 'database'),
        ('resource_usage', 'active_connections', v_active_connections, 'count', 'database'),
        ('performance', 'slow_queries_count', v_slow_queries, 'count', 'database');
    
    -- Complete job logging
    PERFORM log_job_execution(
        'monitor_system_performance', 
        'monitoring', 
        'completed', 
        3, -- Number of metrics recorded
        NULL,
        jsonb_build_object(
            'database_size_mb', ROUND(v_db_size / 1024.0 / 1024.0, 2),
            'active_connections', v_active_connections,
            'slow_queries', v_slow_queries
        )
    );
END;
$$;

-- Insert job configurations
INSERT INTO scheduled_job_config (job_name, job_type, schedule_expression, configuration) VALUES
('calculate_all_metrics', 'metrics_calculation', '0 */6 * * *', '{"description": "Calculate dashboard metrics every 6 hours"}'),
('generate_all_aggregations', 'data_aggregation', '0 2 * * *', '{"description": "Generate assessment aggregations daily at 2 AM"}'),
('cleanup_old_data', 'maintenance', '0 3 * * 0', '{"description": "Clean up old data weekly on Sunday at 3 AM"}'),
('generate_weekly_reports', 'report_generation', '0 8 * * 1', '{"description": "Generate weekly reports every Monday at 8 AM"}'),
('monitor_system_performance', 'monitoring', '*/5 * * * *', '{"description": "Monitor system performance every 5 minutes"}')
ON CONFLICT (job_name) DO NOTHING;

-- Schedule the jobs using pg_cron
-- Note: In production, these would be scheduled via pg_cron.schedule()
-- For now, we'll create the schedule configuration

-- Create a function to setup cron jobs
CREATE OR REPLACE FUNCTION setup_cron_jobs()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Schedule metrics calculation every 6 hours
    PERFORM cron.schedule(
        'calculate_all_metrics',
        '0 */6 * * *',
        'SELECT job_calculate_all_metrics();'
    );
    
    -- Schedule aggregations daily at 2 AM
    PERFORM cron.schedule(
        'generate_all_aggregations',
        '0 2 * * *',
        'SELECT job_generate_all_aggregations();'
    );
    
    -- Schedule cleanup weekly on Sunday at 3 AM
    PERFORM cron.schedule(
        'cleanup_old_data',
        '0 3 * * 0',
        'SELECT job_cleanup_old_data();'
    );
    
    -- Schedule weekly reports every Monday at 8 AM
    PERFORM cron.schedule(
        'generate_weekly_reports',
        '0 8 * * 1',
        'SELECT job_generate_weekly_reports();'
    );
    
    -- Schedule system monitoring every 5 minutes
    PERFORM cron.schedule(
        'monitor_system_performance',
        '*/5 * * * *',
        'SELECT job_monitor_system_performance();'
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION job_calculate_all_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION job_generate_all_aggregations() TO authenticated;
GRANT EXECUTE ON FUNCTION job_cleanup_old_data() TO authenticated;
GRANT EXECUTE ON FUNCTION job_generate_weekly_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION job_monitor_system_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION log_job_execution(VARCHAR, VARCHAR, VARCHAR, INTEGER, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION setup_cron_jobs() TO authenticated;

-- Enable RLS on job tables
ALTER TABLE scheduled_job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_job_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for job tables (admin access only)
CREATE POLICY "job_logs_admin_access" ON scheduled_job_logs
    USING (EXISTS (
        SELECT 1 FROM user_organizations uo
        JOIN organizations o ON uo.organization_id = o.id
        WHERE uo.user_id = auth.uid() AND uo.role IN ('admin', 'owner')
    ));

CREATE POLICY "job_config_admin_access" ON scheduled_job_config
    USING (EXISTS (
        SELECT 1 FROM user_organizations uo
        JOIN organizations o ON uo.organization_id = o.id
        WHERE uo.user_id = auth.uid() AND uo.role IN ('admin', 'owner')
    ));

-- Add indexes for job tables
CREATE INDEX idx_scheduled_job_logs_job_started ON scheduled_job_logs(job_name, started_at DESC);
CREATE INDEX idx_scheduled_job_logs_status_started ON scheduled_job_logs(status, started_at DESC);
CREATE INDEX idx_scheduled_job_config_active ON scheduled_job_config(is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE scheduled_job_logs IS 'Logs for scheduled job execution and monitoring';
COMMENT ON TABLE scheduled_job_config IS 'Configuration for scheduled jobs';
COMMENT ON FUNCTION job_calculate_all_metrics IS 'Scheduled job to calculate metrics for all organizations';
COMMENT ON FUNCTION job_generate_all_aggregations IS 'Scheduled job to generate assessment aggregations';
COMMENT ON FUNCTION job_cleanup_old_data IS 'Scheduled job to cleanup old data and archive metrics';
COMMENT ON FUNCTION job_generate_weekly_reports IS 'Scheduled job to generate weekly reports';
COMMENT ON FUNCTION job_monitor_system_performance IS 'Scheduled job to monitor system performance';