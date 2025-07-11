-- Dashboard Metrics and Reporting Schema
-- This migration creates the core tables for dashboard data management and weekly reporting

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Dashboard Metrics Storage Tables
CREATE TABLE IF NOT EXISTS dashboard_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- 'user_engagement', 'assessment_completion', 'ocean_scores', 'business_kpis'
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20), -- 'percentage', 'count', 'score', 'currency'
    dimension_1 VARCHAR(100), -- e.g., 'department', 'role', 'team'
    dimension_2 VARCHAR(100), -- e.g., 'quarter', 'month', 'week'
    dimension_3 VARCHAR(100), -- Additional dimension for complex metrics
    metadata JSONB DEFAULT '{}',
    calculation_method TEXT,
    data_source VARCHAR(50), -- 'assessments', 'user_activity', 'ocean_scores', 'external_api'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When the metric was actually recorded
    is_active BOOLEAN DEFAULT TRUE
);

-- Weekly Reports Content and Metadata
CREATE TABLE IF NOT EXISTS weekly_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    report_period_start DATE NOT NULL,
    report_period_end DATE NOT NULL,
    report_type VARCHAR(50) DEFAULT 'standard', -- 'standard', 'executive', 'departmental'
    title VARCHAR(255) NOT NULL,
    executive_summary TEXT,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'generated', 'reviewed', 'published', 'archived'
    template_id UUID,
    generated_by UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE
);

-- Report Sections for flexible report structure
CREATE TABLE IF NOT EXISTS report_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL, -- 'metrics_summary', 'ocean_insights', 'team_performance', 'trends'
    section_title VARCHAR(255) NOT NULL,
    section_order INTEGER NOT NULL DEFAULT 1,
    content TEXT,
    charts_data JSONB DEFAULT '{}',
    tables_data JSONB DEFAULT '{}',
    insights JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Historical Data Tracking
CREATE TABLE IF NOT EXISTS metrics_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    metric_id UUID REFERENCES dashboard_metrics(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    previous_value DECIMAL(15,4),
    current_value DECIMAL(15,4) NOT NULL,
    change_value DECIMAL(15,4),
    change_percentage DECIMAL(8,4),
    change_type VARCHAR(20), -- 'increase', 'decrease', 'no_change'
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    calculation_context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Activity Logs for engagement tracking
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'login', 'assessment_start', 'assessment_complete', 'dashboard_view'
    activity_subtype VARCHAR(50), -- 'ocean_assessment', 'team_view', 'reports_view'
    page_path VARCHAR(255),
    session_id VARCHAR(100),
    user_agent TEXT,
    ip_address INET,
    duration_seconds INTEGER,
    interactions_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Performance Metrics
CREATE TABLE IF NOT EXISTS system_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(50) NOT NULL, -- 'response_time', 'error_rate', 'throughput', 'resource_usage'
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20),
    service_name VARCHAR(50), -- 'api', 'database', 'cache', 'websocket'
    endpoint VARCHAR(255),
    status_code INTEGER,
    error_message TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report Templates for automated generation
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL, -- 'weekly', 'monthly', 'quarterly', 'custom'
    target_audience VARCHAR(50), -- 'executives', 'managers', 'teams', 'all'
    sections_config JSONB NOT NULL, -- Configuration for report sections
    styling_config JSONB DEFAULT '{}',
    export_formats VARCHAR(100) DEFAULT 'pdf,excel', -- Comma-separated list
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report Distribution Lists
CREATE TABLE IF NOT EXISTS report_distribution_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    list_name VARCHAR(255) NOT NULL,
    description TEXT,
    recipient_emails TEXT[], -- Array of email addresses
    recipient_roles VARCHAR(100)[], -- Array of roles to include
    distribution_schedule VARCHAR(50), -- 'weekly', 'monthly', 'on_demand'
    schedule_day_of_week INTEGER, -- 1-7 for weekly reports
    schedule_time TIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessment Aggregations for faster dashboard queries
CREATE TABLE IF NOT EXISTS assessment_aggregations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    aggregation_type VARCHAR(50) NOT NULL, -- 'ocean_department', 'ocean_role', 'completion_rates'
    aggregation_key VARCHAR(100) NOT NULL, -- department name, role, etc.
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_assessments INTEGER DEFAULT 0,
    completed_assessments INTEGER DEFAULT 0,
    ocean_scores JSONB DEFAULT '{}', -- Pre-calculated OCEAN averages
    facet_scores JSONB DEFAULT '{}', -- Pre-calculated facet averages
    metadata JSONB DEFAULT '{}',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for optimal performance
CREATE INDEX idx_dashboard_metrics_org_type_date ON dashboard_metrics(organization_id, metric_type, recorded_at DESC);
CREATE INDEX idx_dashboard_metrics_name_date ON dashboard_metrics(metric_name, recorded_at DESC);
CREATE INDEX idx_dashboard_metrics_active ON dashboard_metrics(is_active) WHERE is_active = true;

CREATE INDEX idx_weekly_reports_org_period ON weekly_reports(organization_id, report_period_start DESC);
CREATE INDEX idx_weekly_reports_status ON weekly_reports(status, created_at DESC);

CREATE INDEX idx_report_sections_report_order ON report_sections(report_id, section_order);

CREATE INDEX idx_metrics_history_org_type_period ON metrics_history(organization_id, metric_type, period_end DESC);
CREATE INDEX idx_metrics_history_metric_id ON metrics_history(metric_id, period_end DESC);

CREATE INDEX idx_user_activity_logs_user_date ON user_activity_logs(user_id, recorded_at DESC);
CREATE INDEX idx_user_activity_logs_org_type_date ON user_activity_logs(organization_id, activity_type, recorded_at DESC);
CREATE INDEX idx_user_activity_logs_session ON user_activity_logs(session_id, recorded_at DESC);

CREATE INDEX idx_system_performance_type_date ON system_performance_metrics(metric_type, recorded_at DESC);
CREATE INDEX idx_system_performance_service_date ON system_performance_metrics(service_name, recorded_at DESC);

CREATE INDEX idx_assessment_aggregations_org_type_period ON assessment_aggregations(organization_id, aggregation_type, period_end DESC);

-- Create partial indexes for frequently queried active records
CREATE INDEX idx_dashboard_metrics_active_org_type ON dashboard_metrics(organization_id, metric_type, recorded_at DESC) 
WHERE is_active = true;

CREATE INDEX idx_weekly_reports_active_org ON weekly_reports(organization_id, report_period_start DESC) 
WHERE is_active = true;

-- Add Row Level Security (RLS) policies
ALTER TABLE dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_distribution_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_aggregations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization-based access
CREATE POLICY "dashboard_metrics_org_access" ON dashboard_metrics
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY "weekly_reports_org_access" ON weekly_reports
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY "report_sections_org_access" ON report_sections
    USING (report_id IN (
        SELECT id FROM weekly_reports 
        WHERE organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND is_active = true
        )
    ));

CREATE POLICY "metrics_history_org_access" ON metrics_history
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY "user_activity_logs_org_access" ON user_activity_logs
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY "system_performance_metrics_admin_access" ON system_performance_metrics
    USING (EXISTS (
        SELECT 1 FROM user_organizations uo
        JOIN organizations o ON uo.organization_id = o.id
        WHERE uo.user_id = auth.uid() AND uo.role IN ('admin', 'owner')
    ));

CREATE POLICY "report_templates_access" ON report_templates
    USING (true); -- Templates can be viewed by all authenticated users

CREATE POLICY "report_distribution_lists_org_access" ON report_distribution_lists
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY "assessment_aggregations_org_access" ON assessment_aggregations
    USING (organization_id IN (
        SELECT organization_id FROM user_organizations 
        WHERE user_id = auth.uid() AND is_active = true
    ));

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dashboard_metrics_updated_at 
    BEFORE UPDATE ON dashboard_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_reports_updated_at 
    BEFORE UPDATE ON weekly_reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_sections_updated_at 
    BEFORE UPDATE ON report_sections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at 
    BEFORE UPDATE ON report_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_distribution_lists_updated_at 
    BEFORE UPDATE ON report_distribution_lists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE dashboard_metrics IS 'Stores all dashboard metrics with flexible dimensions and metadata';
COMMENT ON TABLE weekly_reports IS 'Main table for weekly reports with metadata and status tracking';
COMMENT ON TABLE report_sections IS 'Flexible sections for reports with charts, tables, and insights';
COMMENT ON TABLE metrics_history IS 'Historical tracking of metric changes over time';
COMMENT ON TABLE user_activity_logs IS 'Detailed user activity tracking for engagement analytics';
COMMENT ON TABLE system_performance_metrics IS 'System performance monitoring data';
COMMENT ON TABLE report_templates IS 'Reusable templates for automated report generation';
COMMENT ON TABLE report_distribution_lists IS 'Email distribution lists for automated report delivery';
COMMENT ON TABLE assessment_aggregations IS 'Pre-calculated aggregations for faster dashboard queries';