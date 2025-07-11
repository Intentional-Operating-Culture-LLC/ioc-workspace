-- Weekly Reporting System Database Schema
-- This schema supports flexible templates, automated generation, editorial workflows, and distribution

-- Report Templates Table
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL DEFAULT 'weekly', -- weekly, monthly, quarterly, custom
    template_data JSONB NOT NULL, -- Template structure and configuration
    sections JSONB NOT NULL, -- Array of section configurations
    output_formats TEXT[] DEFAULT ARRAY['web', 'pdf', 'email'],
    variables JSONB DEFAULT '{}', -- Dynamic variables for template
    styling JSONB DEFAULT '{}', -- Styling configuration
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1
);

-- Report Instances Table
CREATE TABLE IF NOT EXISTS report_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    report_period_start DATE NOT NULL,
    report_period_end DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, review, approved, published, archived
    content JSONB NOT NULL, -- Generated content by section
    metadata JSONB DEFAULT '{}', -- Additional metadata
    generated_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

-- Report Sections Table
CREATE TABLE IF NOT EXISTS report_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
    section_name VARCHAR(255) NOT NULL,
    section_type VARCHAR(50) NOT NULL, -- metrics, chart, text, table, insights, alerts
    order_index INTEGER NOT NULL,
    configuration JSONB NOT NULL, -- Section-specific configuration
    data_sources JSONB DEFAULT '[]', -- Array of data source configurations
    automation_rules JSONB DEFAULT '{}', -- Rules for automated content generation
    is_required BOOLEAN DEFAULT TRUE,
    is_automated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report Automation Rules Table
CREATE TABLE IF NOT EXISTS report_automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- metric_calculation, trend_analysis, alert_generation, insight_generation
    configuration JSONB NOT NULL, -- Rule configuration
    data_query JSONB NOT NULL, -- Database query configuration
    transformation_logic JSONB DEFAULT '{}', -- Data transformation rules
    threshold_rules JSONB DEFAULT '{}', -- Alert thresholds
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Editorial Workflow Table
CREATE TABLE IF NOT EXISTS report_editorial_workflow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_instance_id UUID NOT NULL REFERENCES report_instances(id) ON DELETE CASCADE,
    step_name VARCHAR(255) NOT NULL,
    step_type VARCHAR(50) NOT NULL, -- draft, review, approval, publish
    assignee_id UUID REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, rejected
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report Comments and Collaboration Table
CREATE TABLE IF NOT EXISTS report_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_instance_id UUID NOT NULL REFERENCES report_instances(id) ON DELETE CASCADE,
    section_id VARCHAR(255), -- Optional section reference
    user_id UUID NOT NULL REFERENCES users(id),
    comment_text TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'general', -- general, suggestion, approval, rejection
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report Distribution Lists Table
CREATE TABLE IF NOT EXISTS report_distribution_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    distribution_channels TEXT[] DEFAULT ARRAY['email'], -- email, slack, web, webhook
    subscribers JSONB NOT NULL DEFAULT '[]', -- Array of subscriber configurations
    schedule_configuration JSONB DEFAULT '{}', -- Automated delivery schedule
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Report Subscriptions Table
CREATE TABLE IF NOT EXISTS report_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    template_id UUID REFERENCES report_templates(id) ON DELETE CASCADE,
    distribution_list_id UUID REFERENCES report_distribution_lists(id) ON DELETE CASCADE,
    subscription_type VARCHAR(50) NOT NULL, -- individual, list
    delivery_preferences JSONB DEFAULT '{}', -- Channel preferences, frequency, format
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report Delivery History Table
CREATE TABLE IF NOT EXISTS report_delivery_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_instance_id UUID NOT NULL REFERENCES report_instances(id) ON DELETE CASCADE,
    delivery_channel VARCHAR(50) NOT NULL, -- email, slack, web, webhook
    recipient_id UUID REFERENCES users(id),
    recipient_address VARCHAR(255), -- email, slack channel, etc.
    delivery_status VARCHAR(50) NOT NULL, -- sent, delivered, failed, read
    delivery_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_timestamp TIMESTAMP WITH TIME ZONE,
    engagement_data JSONB DEFAULT '{}', -- Click tracking, time spent, etc.
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report Analytics Table
CREATE TABLE IF NOT EXISTS report_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_instance_id UUID NOT NULL REFERENCES report_instances(id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL,
    metric_value NUMERIC,
    metric_data JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report Feedback Table
CREATE TABLE IF NOT EXISTS report_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_instance_id UUID NOT NULL REFERENCES report_instances(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    section_id VARCHAR(255), -- Optional section reference
    feedback_type VARCHAR(50) NOT NULL, -- rating, comment, suggestion
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report Archive Table
CREATE TABLE IF NOT EXISTS report_archive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_instance_id UUID NOT NULL REFERENCES report_instances(id) ON DELETE CASCADE,
    archived_content JSONB NOT NULL,
    archived_metadata JSONB DEFAULT '{}',
    archived_by UUID NOT NULL REFERENCES users(id),
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    retention_period INTEGER DEFAULT 365, -- Days to retain
    auto_delete_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_templates_org_id ON report_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_instances_template_id ON report_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_report_instances_org_id ON report_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_instances_status ON report_instances(status);
CREATE INDEX IF NOT EXISTS idx_report_instances_period ON report_instances(report_period_start, report_period_end);
CREATE INDEX IF NOT EXISTS idx_report_sections_template_id ON report_sections(template_id);
CREATE INDEX IF NOT EXISTS idx_report_automation_rules_template_id ON report_automation_rules(template_id);
CREATE INDEX IF NOT EXISTS idx_report_editorial_workflow_instance_id ON report_editorial_workflow(report_instance_id);
CREATE INDEX IF NOT EXISTS idx_report_comments_instance_id ON report_comments(report_instance_id);
CREATE INDEX IF NOT EXISTS idx_report_distribution_lists_org_id ON report_distribution_lists(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_subscriptions_user_id ON report_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_report_delivery_history_instance_id ON report_delivery_history(report_instance_id);
CREATE INDEX IF NOT EXISTS idx_report_analytics_instance_id ON report_analytics(report_instance_id);
CREATE INDEX IF NOT EXISTS idx_report_feedback_instance_id ON report_feedback(report_instance_id);
CREATE INDEX IF NOT EXISTS idx_report_archive_instance_id ON report_archive(report_instance_id);

-- Row Level Security (RLS) Policies
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_editorial_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_distribution_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_delivery_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_archive ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_templates
CREATE POLICY "Users can view templates in their organization" ON report_templates
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can create templates in their organization" ON report_templates
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can update templates in their organization" ON report_templates
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Similar policies for other tables...
-- (Additional RLS policies would be implemented for each table following the same pattern)

-- Functions for automated report generation
CREATE OR REPLACE FUNCTION generate_weekly_report_metrics(
    p_organization_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
    assessment_metrics JSONB;
    user_metrics JSONB;
    activity_metrics JSONB;
BEGIN
    -- Calculate assessment metrics
    SELECT jsonb_build_object(
        'total_assessments', COUNT(*),
        'active_assessments', COUNT(*) FILTER (WHERE status = 'active'),
        'completed_assessments', COUNT(*) FILTER (WHERE status = 'completed'),
        'assessment_responses', COALESCE(SUM((SELECT COUNT(*) FROM assessment_responses ar WHERE ar.assessment_id = a.id)), 0),
        'average_completion_rate', COALESCE(AVG(
            CASE 
                WHEN (SELECT COUNT(*) FROM assessment_responses ar WHERE ar.assessment_id = a.id) > 0 
                THEN (SELECT COUNT(*) FROM assessment_responses ar WHERE ar.assessment_id = a.id AND ar.status = 'submitted')::float / 
                     (SELECT COUNT(*) FROM assessment_responses ar WHERE ar.assessment_id = a.id)::float * 100
                ELSE 0 
            END
        ), 0)
    ) INTO assessment_metrics
    FROM assessments a
    WHERE a.organization_id = p_organization_id
    AND a.created_at BETWEEN p_start_date AND p_end_date;

    -- Calculate user metrics
    SELECT jsonb_build_object(
        'total_users', COUNT(*),
        'active_users', COUNT(*) FILTER (WHERE last_sign_in_at BETWEEN p_start_date AND p_end_date),
        'new_users', COUNT(*) FILTER (WHERE created_at BETWEEN p_start_date AND p_end_date)
    ) INTO user_metrics
    FROM user_organizations uo
    JOIN users u ON uo.user_id = u.id
    WHERE uo.organization_id = p_organization_id
    AND uo.is_active = true;

    -- Calculate activity metrics
    SELECT jsonb_build_object(
        'total_events', COUNT(*),
        'unique_active_users', COUNT(DISTINCT user_id),
        'event_breakdown', jsonb_object_agg(event_type, event_count)
    ) INTO activity_metrics
    FROM (
        SELECT 
            event_type,
            COUNT(*) as event_count,
            user_id
        FROM analytics_events
        WHERE organization_id = p_organization_id
        AND created_at BETWEEN p_start_date AND p_end_date
        GROUP BY event_type, user_id
    ) events;

    -- Combine all metrics
    result := jsonb_build_object(
        'period_start', p_start_date,
        'period_end', p_end_date,
        'assessments', assessment_metrics,
        'users', user_metrics,
        'activities', activity_metrics,
        'generated_at', NOW()
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate trend analysis
CREATE OR REPLACE FUNCTION calculate_report_trends(
    p_organization_id UUID,
    p_current_start DATE,
    p_current_end DATE,
    p_previous_start DATE,
    p_previous_end DATE
) RETURNS JSONB AS $$
DECLARE
    current_metrics JSONB;
    previous_metrics JSONB;
    trends JSONB;
BEGIN
    -- Get current period metrics
    SELECT generate_weekly_report_metrics(p_organization_id, p_current_start, p_current_end) INTO current_metrics;
    
    -- Get previous period metrics
    SELECT generate_weekly_report_metrics(p_organization_id, p_previous_start, p_previous_end) INTO previous_metrics;
    
    -- Calculate trends
    trends := jsonb_build_object(
        'assessment_growth', CASE 
            WHEN (previous_metrics->'assessments'->>'total_assessments')::int > 0 
            THEN ((current_metrics->'assessments'->>'total_assessments')::float / (previous_metrics->'assessments'->>'total_assessments')::float - 1) * 100
            ELSE 0 
        END,
        'user_growth', CASE 
            WHEN (previous_metrics->'users'->>'total_users')::int > 0 
            THEN ((current_metrics->'users'->>'total_users')::float / (previous_metrics->'users'->>'total_users')::float - 1) * 100
            ELSE 0 
        END,
        'activity_growth', CASE 
            WHEN (previous_metrics->'activities'->>'total_events')::int > 0 
            THEN ((current_metrics->'activities'->>'total_events')::float / (previous_metrics->'activities'->>'total_events')::float - 1) * 100
            ELSE 0 
        END,
        'completion_rate_change', (current_metrics->'assessments'->>'average_completion_rate')::float - (previous_metrics->'assessments'->>'average_completion_rate')::float
    );
    
    RETURN jsonb_build_object(
        'current_period', current_metrics,
        'previous_period', previous_metrics,
        'trends', trends
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to all relevant tables
CREATE TRIGGER update_report_templates_updated_at BEFORE UPDATE ON report_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_report_instances_updated_at BEFORE UPDATE ON report_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_report_sections_updated_at BEFORE UPDATE ON report_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_report_automation_rules_updated_at BEFORE UPDATE ON report_automation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_report_editorial_workflow_updated_at BEFORE UPDATE ON report_editorial_workflow FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_report_comments_updated_at BEFORE UPDATE ON report_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_report_distribution_lists_updated_at BEFORE UPDATE ON report_distribution_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_report_subscriptions_updated_at BEFORE UPDATE ON report_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();