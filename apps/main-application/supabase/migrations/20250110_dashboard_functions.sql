-- Dashboard Functions and Stored Procedures
-- This migration creates optimized functions for dashboard data processing and metrics calculation

-- Function to calculate and store dashboard metrics
CREATE OR REPLACE FUNCTION calculate_dashboard_metrics(
    p_organization_id UUID,
    p_metric_type VARCHAR(50) DEFAULT NULL,
    p_period_start TIMESTAMP WITH TIME ZONE DEFAULT (NOW() - INTERVAL '7 days'),
    p_period_end TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_metrics JSON;
    v_user_engagement DECIMAL(8,4);
    v_assessment_completion DECIMAL(8,4);
    v_ocean_avg JSONB;
    v_result JSONB := '{}';
BEGIN
    -- Calculate User Engagement Metrics
    IF p_metric_type IS NULL OR p_metric_type = 'user_engagement' THEN
        WITH user_activity AS (
            SELECT 
                COUNT(DISTINCT user_id) as active_users,
                COUNT(*) as total_activities,
                AVG(duration_seconds) as avg_session_duration
            FROM user_activity_logs
            WHERE organization_id = p_organization_id
            AND recorded_at BETWEEN p_period_start AND p_period_end
        ),
        total_users AS (
            SELECT COUNT(DISTINCT user_id) as total_org_users
            FROM user_organizations
            WHERE organization_id = p_organization_id AND is_active = true
        )
        SELECT 
            CASE 
                WHEN tu.total_org_users = 0 THEN 0
                ELSE ROUND((ua.active_users::DECIMAL / tu.total_org_users * 100), 2)
            END INTO v_user_engagement
        FROM user_activity ua
        CROSS JOIN total_users tu;
        
        -- Store user engagement metric
        INSERT INTO dashboard_metrics (
            organization_id, metric_type, metric_name, metric_value, metric_unit,
            dimension_1, recorded_at, calculation_method
        ) VALUES (
            p_organization_id, 'user_engagement', 'active_user_percentage', 
            v_user_engagement, 'percentage', 'weekly', p_period_end,
            'active_users / total_users * 100'
        );
        
        v_result := v_result || jsonb_build_object('user_engagement', v_user_engagement);
    END IF;

    -- Calculate Assessment Completion Metrics
    IF p_metric_type IS NULL OR p_metric_type = 'assessment_completion' THEN
        WITH assessment_stats AS (
            SELECT 
                COUNT(*) as total_assessments,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_assessments,
                AVG(CASE WHEN status = 'completed' THEN 
                    EXTRACT(EPOCH FROM (updated_at - created_at))/3600 
                END) as avg_completion_hours
            FROM assessments
            WHERE organization_id = p_organization_id
            AND created_at BETWEEN p_period_start AND p_period_end
        )
        SELECT 
            CASE 
                WHEN total_assessments = 0 THEN 0
                ELSE ROUND((completed_assessments::DECIMAL / total_assessments * 100), 2)
            END INTO v_assessment_completion
        FROM assessment_stats;
        
        -- Store assessment completion metric
        INSERT INTO dashboard_metrics (
            organization_id, metric_type, metric_name, metric_value, metric_unit,
            dimension_1, recorded_at, calculation_method
        ) VALUES (
            p_organization_id, 'assessment_completion', 'completion_rate', 
            v_assessment_completion, 'percentage', 'weekly', p_period_end,
            'completed_assessments / total_assessments * 100'
        );
        
        v_result := v_result || jsonb_build_object('assessment_completion', v_assessment_completion);
    END IF;

    -- Calculate OCEAN Score Averages
    IF p_metric_type IS NULL OR p_metric_type = 'ocean_scores' THEN
        WITH ocean_stats AS (
            SELECT 
                AVG(openness_score) as avg_openness,
                AVG(conscientiousness_score) as avg_conscientiousness,
                AVG(extraversion_score) as avg_extraversion,
                AVG(agreeableness_score) as avg_agreeableness,
                AVG(neuroticism_score) as avg_neuroticism,
                COUNT(*) as total_results
            FROM ocean_assessment_results oar
            JOIN assessments a ON oar.assessment_id = a.id
            WHERE a.organization_id = p_organization_id
            AND oar.created_at BETWEEN p_period_start AND p_period_end
        )
        SELECT jsonb_build_object(
            'openness', ROUND(avg_openness, 2),
            'conscientiousness', ROUND(avg_conscientiousness, 2),
            'extraversion', ROUND(avg_extraversion, 2),
            'agreeableness', ROUND(avg_agreeableness, 2),
            'neuroticism', ROUND(avg_neuroticism, 2),
            'total_results', total_results
        ) INTO v_ocean_avg
        FROM ocean_stats;
        
        -- Store OCEAN metrics
        INSERT INTO dashboard_metrics (
            organization_id, metric_type, metric_name, metric_value, metric_unit,
            dimension_1, metadata, recorded_at, calculation_method
        ) VALUES (
            p_organization_id, 'ocean_scores', 'average_scores', 
            (v_ocean_avg->>'total_results')::DECIMAL, 'count', 'weekly', v_ocean_avg, p_period_end,
            'AVG() of all OCEAN scores in period'
        );
        
        v_result := v_result || jsonb_build_object('ocean_scores', v_ocean_avg);
    END IF;

    RETURN v_result;
END;
$$;

-- Function to get dashboard summary for an organization
CREATE OR REPLACE FUNCTION get_dashboard_summary(
    p_organization_id UUID,
    p_period_days INTEGER DEFAULT 7
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_summary JSON;
    v_period_start TIMESTAMP WITH TIME ZONE;
    v_period_end TIMESTAMP WITH TIME ZONE;
BEGIN
    v_period_end := NOW();
    v_period_start := v_period_end - (p_period_days || ' days')::INTERVAL;
    
    WITH metrics_summary AS (
        SELECT 
            metric_type,
            metric_name,
            metric_value,
            metric_unit,
            dimension_1,
            metadata,
            recorded_at,
            ROW_NUMBER() OVER (PARTITION BY metric_type, metric_name ORDER BY recorded_at DESC) as rn
        FROM dashboard_metrics
        WHERE organization_id = p_organization_id
        AND recorded_at >= v_period_start
        AND is_active = true
    ),
    latest_metrics AS (
        SELECT 
            metric_type,
            metric_name,
            metric_value,
            metric_unit,
            metadata
        FROM metrics_summary
        WHERE rn = 1
    ),
    user_stats AS (
        SELECT 
            COUNT(DISTINCT user_id) as total_users,
            COUNT(DISTINCT CASE WHEN last_login >= v_period_start THEN user_id END) as active_users
        FROM user_organizations uo
        LEFT JOIN users u ON uo.user_id = u.id
        WHERE uo.organization_id = p_organization_id AND uo.is_active = true
    ),
    assessment_stats AS (
        SELECT 
            COUNT(*) as total_assessments,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_assessments,
            COUNT(*) FILTER (WHERE created_at >= v_period_start) as recent_assessments
        FROM assessments
        WHERE organization_id = p_organization_id
    ),
    activity_stats AS (
        SELECT 
            COUNT(*) as total_activities,
            COUNT(DISTINCT user_id) as active_users_period,
            AVG(duration_seconds) as avg_session_duration
        FROM user_activity_logs
        WHERE organization_id = p_organization_id
        AND recorded_at >= v_period_start
    )
    SELECT json_build_object(
        'organization_id', p_organization_id,
        'period_start', v_period_start,
        'period_end', v_period_end,
        'user_stats', json_build_object(
            'total_users', us.total_users,
            'active_users', us.active_users,
            'engagement_rate', CASE 
                WHEN us.total_users = 0 THEN 0
                ELSE ROUND((us.active_users::DECIMAL / us.total_users * 100), 2)
            END
        ),
        'assessment_stats', json_build_object(
            'total_assessments', ast.total_assessments,
            'completed_assessments', ast.completed_assessments,
            'recent_assessments', ast.recent_assessments,
            'completion_rate', CASE 
                WHEN ast.total_assessments = 0 THEN 0
                ELSE ROUND((ast.completed_assessments::DECIMAL / ast.total_assessments * 100), 2)
            END
        ),
        'activity_stats', json_build_object(
            'total_activities', act.total_activities,
            'active_users_period', act.active_users_period,
            'avg_session_duration', ROUND(act.avg_session_duration, 2)
        ),
        'latest_metrics', COALESCE(
            (SELECT json_agg(json_build_object(
                'type', metric_type,
                'name', metric_name,
                'value', metric_value,
                'unit', metric_unit,
                'metadata', metadata
            ))
            FROM latest_metrics), '[]'::json
        )
    ) INTO v_summary
    FROM user_stats us
    CROSS JOIN assessment_stats ast
    CROSS JOIN activity_stats act;
    
    RETURN v_summary;
END;
$$;

-- Function to track user activity
CREATE OR REPLACE FUNCTION track_user_activity(
    p_user_id UUID,
    p_organization_id UUID,
    p_activity_type VARCHAR(50),
    p_activity_subtype VARCHAR(50) DEFAULT NULL,
    p_page_path VARCHAR(255) DEFAULT NULL,
    p_session_id VARCHAR(100) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_duration_seconds INTEGER DEFAULT NULL,
    p_interactions_count INTEGER DEFAULT 0,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO user_activity_logs (
        user_id, organization_id, activity_type, activity_subtype,
        page_path, session_id, user_agent, ip_address,
        duration_seconds, interactions_count, metadata
    ) VALUES (
        p_user_id, p_organization_id, p_activity_type, p_activity_subtype,
        p_page_path, p_session_id, p_user_agent, p_ip_address::INET,
        p_duration_seconds, p_interactions_count, p_metadata
    ) RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
END;
$$;

-- Function to calculate metric trends
CREATE OR REPLACE FUNCTION calculate_metric_trends(
    p_organization_id UUID,
    p_metric_type VARCHAR(50),
    p_metric_name VARCHAR(100),
    p_periods INTEGER DEFAULT 4
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_trends JSON;
BEGIN
    WITH weekly_metrics AS (
        SELECT 
            DATE_TRUNC('week', recorded_at) as week_start,
            AVG(metric_value) as avg_value,
            COUNT(*) as data_points
        FROM dashboard_metrics
        WHERE organization_id = p_organization_id
        AND metric_type = p_metric_type
        AND metric_name = p_metric_name
        AND is_active = true
        AND recorded_at >= NOW() - (p_periods || ' weeks')::INTERVAL
        GROUP BY DATE_TRUNC('week', recorded_at)
        ORDER BY week_start DESC
        LIMIT p_periods
    ),
    trend_analysis AS (
        SELECT 
            week_start,
            avg_value,
            data_points,
            LAG(avg_value) OVER (ORDER BY week_start) as previous_value,
            CASE 
                WHEN LAG(avg_value) OVER (ORDER BY week_start) IS NULL THEN 0
                WHEN LAG(avg_value) OVER (ORDER BY week_start) = 0 THEN 0
                ELSE ROUND(
                    ((avg_value - LAG(avg_value) OVER (ORDER BY week_start)) / 
                     LAG(avg_value) OVER (ORDER BY week_start) * 100), 2
                )
            END as change_percentage
        FROM weekly_metrics
    )
    SELECT json_build_object(
        'metric_type', p_metric_type,
        'metric_name', p_metric_name,
        'organization_id', p_organization_id,
        'periods_analyzed', p_periods,
        'trend_data', json_agg(
            json_build_object(
                'week_start', week_start,
                'value', avg_value,
                'data_points', data_points,
                'previous_value', previous_value,
                'change_percentage', change_percentage
            ) ORDER BY week_start
        ),
        'overall_trend', CASE 
            WHEN COUNT(*) < 2 THEN 'insufficient_data'
            WHEN AVG(change_percentage) > 5 THEN 'positive'
            WHEN AVG(change_percentage) < -5 THEN 'negative'
            ELSE 'stable'
        END
    ) INTO v_trends
    FROM trend_analysis;
    
    RETURN v_trends;
END;
$$;

-- Function to generate assessment aggregations
CREATE OR REPLACE FUNCTION generate_assessment_aggregations(
    p_organization_id UUID,
    p_period_start DATE DEFAULT (CURRENT_DATE - INTERVAL '7 days')::DATE,
    p_period_end DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rows_created INTEGER := 0;
BEGIN
    -- Delete existing aggregations for the period
    DELETE FROM assessment_aggregations 
    WHERE organization_id = p_organization_id
    AND period_start >= p_period_start
    AND period_end <= p_period_end;
    
    -- Generate department-based aggregations
    WITH dept_aggregations AS (
        SELECT 
            p_organization_id as organization_id,
            'ocean_department' as aggregation_type,
            COALESCE(u.department, 'Unknown') as aggregation_key,
            p_period_start as period_start,
            p_period_end as period_end,
            COUNT(a.id) as total_assessments,
            COUNT(a.id) FILTER (WHERE a.status = 'completed') as completed_assessments,
            jsonb_build_object(
                'openness', ROUND(AVG(oar.openness_score), 2),
                'conscientiousness', ROUND(AVG(oar.conscientiousness_score), 2),
                'extraversion', ROUND(AVG(oar.extraversion_score), 2),
                'agreeableness', ROUND(AVG(oar.agreeableness_score), 2),
                'neuroticism', ROUND(AVG(oar.neuroticism_score), 2)
            ) as ocean_scores,
            jsonb_build_object(
                'total_facets', COUNT(ofs.id),
                'avg_facet_score', ROUND(AVG(ofs.score), 2)
            ) as facet_scores
        FROM assessments a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN ocean_assessment_results oar ON a.id = oar.assessment_id
        LEFT JOIN ocean_facet_scores ofs ON a.id = ofs.assessment_id
        WHERE a.organization_id = p_organization_id
        AND a.created_at::DATE BETWEEN p_period_start AND p_period_end
        GROUP BY u.department
    )
    INSERT INTO assessment_aggregations (
        organization_id, aggregation_type, aggregation_key, period_start, period_end,
        total_assessments, completed_assessments, ocean_scores, facet_scores
    )
    SELECT * FROM dept_aggregations;
    
    GET DIAGNOSTICS v_rows_created = ROW_COUNT;
    
    -- Generate role-based aggregations
    WITH role_aggregations AS (
        SELECT 
            p_organization_id as organization_id,
            'ocean_role' as aggregation_type,
            COALESCE(u.role, 'Unknown') as aggregation_key,
            p_period_start as period_start,
            p_period_end as period_end,
            COUNT(a.id) as total_assessments,
            COUNT(a.id) FILTER (WHERE a.status = 'completed') as completed_assessments,
            jsonb_build_object(
                'openness', ROUND(AVG(oar.openness_score), 2),
                'conscientiousness', ROUND(AVG(oar.conscientiousness_score), 2),
                'extraversion', ROUND(AVG(oar.extraversion_score), 2),
                'agreeableness', ROUND(AVG(oar.agreeableness_score), 2),
                'neuroticism', ROUND(AVG(oar.neuroticism_score), 2)
            ) as ocean_scores,
            jsonb_build_object(
                'total_facets', COUNT(ofs.id),
                'avg_facet_score', ROUND(AVG(ofs.score), 2)
            ) as facet_scores
        FROM assessments a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN ocean_assessment_results oar ON a.id = oar.assessment_id
        LEFT JOIN ocean_facet_scores ofs ON a.id = ofs.assessment_id
        WHERE a.organization_id = p_organization_id
        AND a.created_at::DATE BETWEEN p_period_start AND p_period_end
        GROUP BY u.role
    )
    INSERT INTO assessment_aggregations (
        organization_id, aggregation_type, aggregation_key, period_start, period_end,
        total_assessments, completed_assessments, ocean_scores, facet_scores
    )
    SELECT * FROM role_aggregations;
    
    GET DIAGNOSTICS v_rows_created = v_rows_created + ROW_COUNT;
    
    RETURN v_rows_created;
END;
$$;

-- Function to get real-time dashboard data
CREATE OR REPLACE FUNCTION get_realtime_dashboard_data(
    p_organization_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_data JSON;
BEGIN
    WITH current_stats AS (
        SELECT 
            -- Active users in last 15 minutes
            COUNT(DISTINCT user_id) FILTER (
                WHERE recorded_at >= NOW() - INTERVAL '15 minutes'
            ) as active_users_15min,
            
            -- Active users today
            COUNT(DISTINCT user_id) FILTER (
                WHERE recorded_at >= CURRENT_DATE
            ) as active_users_today,
            
            -- Recent activities
            COUNT(*) FILTER (
                WHERE recorded_at >= NOW() - INTERVAL '1 hour'
            ) as activities_last_hour,
            
            -- Assessment activities
            COUNT(*) FILTER (
                WHERE activity_type = 'assessment_start' 
                AND recorded_at >= NOW() - INTERVAL '1 hour'
            ) as assessments_started_hour,
            
            COUNT(*) FILTER (
                WHERE activity_type = 'assessment_complete' 
                AND recorded_at >= NOW() - INTERVAL '1 hour'
            ) as assessments_completed_hour
        FROM user_activity_logs
        WHERE organization_id = p_organization_id
    ),
    system_health AS (
        SELECT 
            AVG(metric_value) FILTER (
                WHERE metric_type = 'response_time' 
                AND recorded_at >= NOW() - INTERVAL '5 minutes'
            ) as avg_response_time,
            
            AVG(metric_value) FILTER (
                WHERE metric_type = 'error_rate' 
                AND recorded_at >= NOW() - INTERVAL '5 minutes'
            ) as current_error_rate
        FROM system_performance_metrics
    )
    SELECT json_build_object(
        'timestamp', NOW(),
        'organization_id', p_organization_id,
        'active_users_15min', cs.active_users_15min,
        'active_users_today', cs.active_users_today,
        'activities_last_hour', cs.activities_last_hour,
        'assessments_started_hour', cs.assessments_started_hour,
        'assessments_completed_hour', cs.assessments_completed_hour,
        'avg_response_time_ms', ROUND(sh.avg_response_time, 2),
        'current_error_rate', ROUND(sh.current_error_rate, 4),
        'system_status', CASE 
            WHEN sh.avg_response_time > 1000 OR sh.current_error_rate > 0.05 THEN 'degraded'
            WHEN sh.avg_response_time > 500 OR sh.current_error_rate > 0.01 THEN 'warning'
            ELSE 'healthy'
        END
    ) INTO v_data
    FROM current_stats cs
    CROSS JOIN system_health sh;
    
    RETURN v_data;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_dashboard_metrics(UUID, VARCHAR, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_summary(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION track_user_activity(UUID, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TEXT, TEXT, INTEGER, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_metric_trends(UUID, VARCHAR, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_assessment_aggregations(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_realtime_dashboard_data(UUID) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION calculate_dashboard_metrics IS 'Calculates and stores dashboard metrics for an organization';
COMMENT ON FUNCTION get_dashboard_summary IS 'Returns comprehensive dashboard summary for an organization';
COMMENT ON FUNCTION track_user_activity IS 'Tracks user activity for engagement analytics';
COMMENT ON FUNCTION calculate_metric_trends IS 'Calculates trend analysis for specific metrics';
COMMENT ON FUNCTION generate_assessment_aggregations IS 'Generates pre-calculated aggregations for faster queries';
COMMENT ON FUNCTION get_realtime_dashboard_data IS 'Returns real-time dashboard data for live updates';