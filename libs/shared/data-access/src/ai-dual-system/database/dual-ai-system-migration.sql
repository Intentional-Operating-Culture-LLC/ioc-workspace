-- ==============================================================================
-- IOC Dual-AI System Database Migration
-- Creates all necessary tables for the A1 Generator / B1 Validator system
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- AI REQUESTS AND RESPONSES
-- ==============================================================================

-- Core AI requests table
CREATE TABLE ai_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('assessment', 'report', 'coaching', 'insight', 'recommendation')),
    context JSONB NOT NULL DEFAULT '{}',
    options JSONB DEFAULT '{}',
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    trace_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- A1 Generator responses
CREATE TABLE ai_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES ai_requests(id) ON DELETE CASCADE,
    model_provider VARCHAR(50) NOT NULL CHECK (model_provider IN ('openai', 'anthropic', 'google', 'local')),
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50),
    content JSONB NOT NULL,
    raw_content TEXT,
    processing_time_ms INTEGER NOT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    token_usage JSONB DEFAULT '{}',
    cost_cents INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    reasoning JSONB DEFAULT '[]',
    sources JSONB DEFAULT '[]',
    assumptions JSONB DEFAULT '[]',
    limitations JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- B1 Validator responses
CREATE TABLE ai_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_id UUID REFERENCES ai_generations(id) ON DELETE CASCADE,
    validator_model_provider VARCHAR(50) NOT NULL,
    validator_model_name VARCHAR(100) NOT NULL,
    validation_status VARCHAR(20) NOT NULL CHECK (validation_status IN ('approved', 'rejected', 'modified', 'escalated')),
    processing_time_ms INTEGER NOT NULL,
    ethical_score DECIMAL(3,2) CHECK (ethical_score >= 0 AND ethical_score <= 1),
    bias_score DECIMAL(3,2) CHECK (bias_score >= 0 AND bias_score <= 1),
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
    compliance_score DECIMAL(3,2) CHECK (compliance_score >= 0 AND compliance_score <= 1),
    overall_score DECIMAL(3,2) CHECK (overall_score >= 0 AND overall_score <= 1),
    issues JSONB DEFAULT '[]',
    suggestions JSONB DEFAULT '[]',
    rules_applied JSONB DEFAULT '[]',
    checklist_results JSONB DEFAULT '{}',
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    urgency BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- DISAGREEMENT MANAGEMENT
-- ==============================================================================

-- Disagreements between A1 and B1
CREATE TABLE ai_disagreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES ai_requests(id) ON DELETE CASCADE,
    generation_id UUID REFERENCES ai_generations(id) ON DELETE CASCADE,
    validation_id UUID REFERENCES ai_validations(id) ON DELETE CASCADE,
    disagreement_type_category VARCHAR(50) NOT NULL CHECK (disagreement_type_category IN ('content', 'style', 'ethics', 'accuracy', 'bias')),
    disagreement_type_subcategory VARCHAR(100),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    generator_position JSONB NOT NULL,
    validator_position JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'escalated', 'dismissed')),
    resolution_method VARCHAR(50) CHECK (resolution_method IN ('automated', 'human', 'policy', 'consensus')),
    final_content JSONB,
    resolution_explanation TEXT,
    resolution_approver VARCHAR(255),
    learning_notes JSONB DEFAULT '[]',
    escalation_reason TEXT,
    escalated_to VARCHAR(255),
    escalated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- ==============================================================================
-- CONTINUOUS LEARNING SYSTEM
-- ==============================================================================

-- Learning events from all sources
CREATE TABLE ai_learning_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('disagreement', 'feedback', 'correction', 'success', 'failure')),
    source_id UUID NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    learning_data JSONB NOT NULL,
    impact_score DECIMAL(3,2) NOT NULL CHECK (impact_score >= -1 AND impact_score <= 1),
    impact_confidence DECIMAL(3,2) CHECK (impact_confidence >= 0 AND impact_confidence <= 1),
    affected_models JSONB DEFAULT '[]',
    suggested_actions JSONB DEFAULT '[]',
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'processed', 'failed')),
    processing_priority INTEGER DEFAULT 5 CHECK (processing_priority >= 1 AND processing_priority <= 10),
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Learning insights generated from events
CREATE TABLE ai_learning_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    insight_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    evidence JSONB DEFAULT '[]',
    impact VARCHAR(20) CHECK (impact IN ('low', 'medium', 'high')),
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    recommendations JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'applied', 'dismissed', 'superseded')),
    applied_at TIMESTAMP WITH TIME ZONE,
    created_from_events JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Learning patterns detected across events
CREATE TABLE ai_learning_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    evidence_event_ids JSONB DEFAULT '[]',
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    impact_score DECIMAL(3,2) CHECK (impact_score >= -1 AND impact_score <= 1),
    frequency_count INTEGER DEFAULT 1,
    first_observed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_observed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- MODEL MANAGEMENT AND RETRAINING
-- ==============================================================================

-- Model registry and status tracking
CREATE TABLE ai_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name VARCHAR(100) NOT NULL UNIQUE,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('generator', 'validator', 'hybrid')),
    provider VARCHAR(50) NOT NULL,
    version VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'retraining', 'deprecated', 'failed')),
    capabilities JSONB DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    configuration JSONB DEFAULT '{}',
    last_trained_at TIMESTAMP WITH TIME ZONE,
    next_retraining_due TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model retraining jobs
CREATE TABLE ai_retraining_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
    job_type VARCHAR(50) DEFAULT 'full' CHECK (job_type IN ('full', 'incremental', 'fine_tune')),
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    triggered_by VARCHAR(50) NOT NULL,
    trigger_reason TEXT,
    training_data_path TEXT,
    training_data_size INTEGER,
    validation_split DECIMAL(3,2) DEFAULT 0.2,
    epochs INTEGER DEFAULT 3,
    batch_size INTEGER DEFAULT 32,
    learning_rate DECIMAL(10,8) DEFAULT 0.001,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    current_epoch INTEGER DEFAULT 0,
    current_loss DECIMAL(10,6),
    validation_loss DECIMAL(10,6),
    performance_improvement DECIMAL(5,4),
    resource_usage JSONB DEFAULT '{}',
    logs JSONB DEFAULT '[]',
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- VALIDATION RULES AND CONFIGURATION
-- ==============================================================================

-- Validation rules for B1 Validator
CREATE TABLE ai_validation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('ethical', 'bias', 'quality', 'compliance')),
    description TEXT NOT NULL,
    condition_expression TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    active BOOLEAN DEFAULT TRUE,
    weight DECIMAL(3,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
    applicable_content_types JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ethical guidelines for content validation
CREATE TABLE ai_ethical_guidelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guideline_name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    violation_patterns JSONB DEFAULT '[]',
    mitigation_strategies JSONB DEFAULT '[]',
    active BOOLEAN DEFAULT TRUE,
    version VARCHAR(20) DEFAULT '1.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bias detection configuration
CREATE TABLE ai_bias_detectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    detector_name VARCHAR(100) NOT NULL UNIQUE,
    bias_type VARCHAR(50) NOT NULL,
    detection_method VARCHAR(50) NOT NULL CHECK (detection_method IN ('keyword', 'pattern', 'ml_model', 'statistical')),
    configuration JSONB DEFAULT '{}',
    sensitivity DECIMAL(3,2) DEFAULT 0.5 CHECK (sensitivity >= 0 AND sensitivity <= 1),
    active BOOLEAN DEFAULT TRUE,
    performance_metrics JSONB DEFAULT '{}',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- PERFORMANCE METRICS AND MONITORING
-- ==============================================================================

-- System performance metrics
CREATE TABLE ai_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram', 'timer')),
    metric_value DECIMAL(15,6) NOT NULL,
    tags JSONB DEFAULT '{}',
    component VARCHAR(50) CHECK (component IN ('generator', 'validator', 'disagreement_handler', 'learning_engine', 'system')),
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Concordance rate tracking (agreement between A1 and B1)
CREATE TABLE ai_concordance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    time_period VARCHAR(20) NOT NULL CHECK (time_period IN ('hourly', 'daily', 'weekly', 'monthly')),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    total_requests INTEGER NOT NULL,
    agreements INTEGER NOT NULL,
    disagreements INTEGER NOT NULL,
    escalations INTEGER NOT NULL,
    concordance_rate DECIMAL(5,4) NOT NULL CHECK (concordance_rate >= 0 AND concordance_rate <= 1),
    by_content_type JSONB DEFAULT '{}',
    by_severity JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- HUMAN REVIEW AND CURATION
-- ==============================================================================

-- Human review queue
CREATE TABLE ai_human_review_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disagreement_id UUID REFERENCES ai_disagreements(id) ON DELETE CASCADE,
    review_type VARCHAR(50) DEFAULT 'disagreement' CHECK (review_type IN ('disagreement', 'ethical_concern', 'quality_issue', 'bias_report')),
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    assigned_to VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_review', 'completed', 'escalated')),
    reason TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    deadline TIMESTAMP WITH TIME ZONE,
    assigned_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Human review decisions and feedback
CREATE TABLE ai_human_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_item_id UUID REFERENCES ai_human_review_queue(id) ON DELETE CASCADE,
    reviewer VARCHAR(255) NOT NULL,
    decision VARCHAR(50) NOT NULL CHECK (decision IN ('approve_generator', 'approve_validator', 'approve_modified', 'reject_both', 'escalate_further')),
    confidence VARCHAR(20) CHECK (confidence IN ('low', 'medium', 'high')),
    explanation TEXT NOT NULL,
    modified_content JSONB,
    learning_notes JSONB DEFAULT '[]',
    follow_up_actions JSONB DEFAULT '[]',
    review_time_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- AUDIT AND COMPLIANCE
-- ==============================================================================

-- Audit log for all AI system actions
CREATE TABLE ai_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    actor_type VARCHAR(50) DEFAULT 'system' CHECK (actor_type IN ('system', 'user', 'admin', 'ai_component')),
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    before_state JSONB,
    after_state JSONB,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    trace_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data retention and compliance tracking
CREATE TABLE ai_data_retention (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    retention_policy VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    anonymized_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    compliance_notes TEXT
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================

-- AI Requests indexes
CREATE INDEX idx_ai_requests_user_org ON ai_requests(user_id, organization_id);
CREATE INDEX idx_ai_requests_status ON ai_requests(status);
CREATE INDEX idx_ai_requests_type ON ai_requests(request_type);
CREATE INDEX idx_ai_requests_created ON ai_requests(created_at);
CREATE INDEX idx_ai_requests_priority ON ai_requests(priority, created_at);

-- AI Generations indexes
CREATE INDEX idx_ai_generations_request ON ai_generations(request_id);
CREATE INDEX idx_ai_generations_model ON ai_generations(model_provider, model_name);
CREATE INDEX idx_ai_generations_confidence ON ai_generations(confidence_score);
CREATE INDEX idx_ai_generations_created ON ai_generations(created_at);

-- AI Validations indexes
CREATE INDEX idx_ai_validations_generation ON ai_validations(generation_id);
CREATE INDEX idx_ai_validations_status ON ai_validations(validation_status);
CREATE INDEX idx_ai_validations_scores ON ai_validations(overall_score, ethical_score, bias_score);
CREATE INDEX idx_ai_validations_created ON ai_validations(created_at);

-- Disagreements indexes
CREATE INDEX idx_ai_disagreements_status ON ai_disagreements(status);
CREATE INDEX idx_ai_disagreements_severity ON ai_disagreements(severity);
CREATE INDEX idx_ai_disagreements_type ON ai_disagreements(disagreement_type_category);
CREATE INDEX idx_ai_disagreements_created ON ai_disagreements(created_at);
CREATE INDEX idx_ai_disagreements_resolution ON ai_disagreements(resolution_method, resolved_at);

-- Learning Events indexes
CREATE INDEX idx_ai_learning_events_type ON ai_learning_events(event_type);
CREATE INDEX idx_ai_learning_events_status ON ai_learning_events(processing_status);
CREATE INDEX idx_ai_learning_events_priority ON ai_learning_events(processing_priority, created_at);
CREATE INDEX idx_ai_learning_events_source ON ai_learning_events(source_type, source_id);
CREATE INDEX idx_ai_learning_events_impact ON ai_learning_events(impact_score);

-- Performance Metrics indexes
CREATE INDEX idx_ai_performance_metrics_name_time ON ai_performance_metrics(metric_name, created_at);
CREATE INDEX idx_ai_performance_metrics_component ON ai_performance_metrics(component, created_at);
CREATE INDEX idx_ai_performance_metrics_tags ON ai_performance_metrics USING GIN(tags);

-- Human Review indexes
CREATE INDEX idx_ai_human_review_queue_status ON ai_human_review_queue(status, priority);
CREATE INDEX idx_ai_human_review_queue_assigned ON ai_human_review_queue(assigned_to, status);
CREATE INDEX idx_ai_human_review_queue_deadline ON ai_human_review_queue(deadline) WHERE deadline IS NOT NULL;

-- Audit Log indexes
CREATE INDEX idx_ai_audit_log_action_time ON ai_audit_log(action, created_at);
CREATE INDEX idx_ai_audit_log_actor ON ai_audit_log(actor, actor_type);
CREATE INDEX idx_ai_audit_log_target ON ai_audit_log(target_type, target_id);
CREATE INDEX idx_ai_audit_log_trace ON ai_audit_log(trace_id) WHERE trace_id IS NOT NULL;

-- ==============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==============================================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_requests_updated_at BEFORE UPDATE ON ai_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_models_updated_at BEFORE UPDATE ON ai_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_validation_rules_updated_at BEFORE UPDATE ON ai_validation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_ethical_guidelines_updated_at BEFORE UPDATE ON ai_ethical_guidelines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit logging trigger
CREATE OR REPLACE FUNCTION log_ai_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO ai_audit_log (
        action,
        actor,
        actor_type,
        target_type,
        target_id,
        before_state,
        after_state,
        created_at
    ) VALUES (
        TG_OP,
        COALESCE(current_setting('app.current_user', true), 'system'),
        'system',
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Apply audit logging to critical tables
CREATE TRIGGER ai_requests_audit AFTER INSERT OR UPDATE OR DELETE ON ai_requests FOR EACH ROW EXECUTE FUNCTION log_ai_changes();
CREATE TRIGGER ai_disagreements_audit AFTER INSERT OR UPDATE OR DELETE ON ai_disagreements FOR EACH ROW EXECUTE FUNCTION log_ai_changes();
CREATE TRIGGER ai_human_reviews_audit AFTER INSERT OR UPDATE OR DELETE ON ai_human_reviews FOR EACH ROW EXECUTE FUNCTION log_ai_changes();
CREATE TRIGGER ai_validation_rules_audit AFTER INSERT OR UPDATE OR DELETE ON ai_validation_rules FOR EACH ROW EXECUTE FUNCTION log_ai_changes();

-- ==============================================================================
-- VIEWS FOR ANALYTICS AND REPORTING
-- ==============================================================================

-- System health dashboard view
CREATE VIEW ai_system_health AS
SELECT 
    'dual_ai_system' as system_name,
    COUNT(CASE WHEN ar.status = 'pending' THEN 1 END) as pending_requests,
    COUNT(CASE WHEN ar.status = 'processing' THEN 1 END) as processing_requests,
    COUNT(CASE WHEN ar.status = 'completed' THEN 1 END) as completed_requests,
    COUNT(CASE WHEN ar.status = 'failed' THEN 1 END) as failed_requests,
    COUNT(CASE WHEN ad.status = 'open' THEN 1 END) as open_disagreements,
    COUNT(CASE WHEN ad.severity = 'critical' THEN 1 END) as critical_disagreements,
    COUNT(CASE WHEN hrq.status = 'pending' THEN 1 END) as pending_human_reviews,
    AVG(ag.confidence_score) as avg_generator_confidence,
    AVG(av.overall_score) as avg_validation_score,
    NOW() as last_updated
FROM ai_requests ar
LEFT JOIN ai_generations ag ON ar.id = ag.request_id
LEFT JOIN ai_validations av ON ag.id = av.generation_id
LEFT JOIN ai_disagreements ad ON ar.id = ad.request_id
LEFT JOIN ai_human_review_queue hrq ON ad.id = hrq.disagreement_id
WHERE ar.created_at >= NOW() - INTERVAL '24 hours';

-- Learning insights summary
CREATE VIEW ai_learning_summary AS
SELECT 
    ale.event_type,
    COUNT(*) as event_count,
    AVG(ale.impact_score) as avg_impact_score,
    COUNT(CASE WHEN ale.processing_status = 'processed' THEN 1 END) as processed_count,
    COUNT(CASE WHEN ale.processing_status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN ale.processing_status = 'failed' THEN 1 END) as failed_count
FROM ai_learning_events ale
WHERE ale.created_at >= NOW() - INTERVAL '7 days'
GROUP BY ale.event_type
ORDER BY event_count DESC;

-- Model performance comparison
CREATE VIEW ai_model_performance AS
SELECT 
    ag.model_provider,
    ag.model_name,
    COUNT(*) as total_generations,
    AVG(ag.confidence_score) as avg_confidence,
    AVG(ag.processing_time_ms) as avg_processing_time,
    AVG(av.overall_score) as avg_validation_score,
    COUNT(CASE WHEN av.validation_status = 'approved' THEN 1 END)::FLOAT / COUNT(*) as approval_rate,
    SUM(ag.cost_cents) as total_cost_cents
FROM ai_generations ag
LEFT JOIN ai_validations av ON ag.id = av.generation_id
WHERE ag.created_at >= NOW() - INTERVAL '30 days'
GROUP BY ag.model_provider, ag.model_name
ORDER BY total_generations DESC;

-- ==============================================================================
-- INITIAL DATA SETUP
-- ==============================================================================

-- Insert default validation rules
INSERT INTO ai_validation_rules (rule_name, rule_type, description, condition_expression, severity, active) VALUES
('no_harmful_content', 'ethical', 'Detect harmful or offensive content', 'content.contains_harmful_keywords()', 'critical', true),
('bias_detection_gender', 'bias', 'Detect gender bias in language', 'content.has_gender_bias()', 'high', true),
('bias_detection_racial', 'bias', 'Detect racial bias in language', 'content.has_racial_bias()', 'high', true),
('readability_check', 'quality', 'Ensure content is readable', 'content.readability_score() >= 0.6', 'medium', true),
('factual_accuracy', 'quality', 'Check factual accuracy claims', 'content.verify_facts()', 'high', true),
('privacy_compliance', 'compliance', 'Ensure privacy compliance', 'content.respects_privacy()', 'high', true),
('professional_tone', 'quality', 'Maintain professional tone', 'content.tone_analysis().professional >= 0.7', 'low', true);

-- Insert default ethical guidelines
INSERT INTO ai_ethical_guidelines (guideline_name, category, description, severity) VALUES
('respect_for_persons', 'autonomy', 'Respect individual autonomy and dignity', 'critical'),
('do_no_harm', 'beneficence', 'Avoid causing harm to individuals or groups', 'critical'),
('fairness_and_justice', 'justice', 'Ensure fair and equitable treatment', 'high'),
('transparency', 'transparency', 'Be transparent about AI involvement', 'medium'),
('privacy_protection', 'privacy', 'Protect user privacy and data', 'high'),
('avoid_discrimination', 'fairness', 'Avoid discriminatory language or recommendations', 'high');

-- Insert default bias detectors
INSERT INTO ai_bias_detectors (detector_name, bias_type, detection_method, configuration, sensitivity) VALUES
('gender_bias_keywords', 'gender', 'keyword', '{"keywords": ["he", "she", "man", "woman"], "context_window": 50}', 0.7),
('racial_bias_patterns', 'racial', 'pattern', '{"patterns": ["racial_stereotypes", "cultural_assumptions"]}', 0.8),
('age_bias_detector', 'age', 'ml_model', '{"model_path": "/models/age_bias_detector.pkl"}', 0.6),
('socioeconomic_bias', 'socioeconomic', 'statistical', '{"thresholds": {"income_assumptions": 0.5}}', 0.7);

-- Insert default AI models
INSERT INTO ai_models (model_name, model_type, provider, version, status, capabilities) VALUES
('gpt-4-turbo', 'generator', 'openai', '2024-04-09', 'active', '{"max_tokens": 4096, "supports_json": true}'),
('claude-3-opus', 'validator', 'anthropic', '20240229', 'active', '{"ethical_reasoning": true, "bias_detection": true}'),
('gpt-3.5-turbo', 'generator', 'openai', '2024-01-25', 'active', '{"max_tokens": 4096, "cost_effective": true}'),
('claude-3-sonnet', 'validator', 'anthropic', '20240229', 'active', '{"fast_validation": true, "cost_effective": true}');

-- Create initial performance metrics
INSERT INTO ai_performance_metrics (metric_name, metric_type, metric_value, component) VALUES
('system_initialized', 'counter', 1, 'system'),
('database_version', 'gauge', 1.0, 'system');

COMMIT;