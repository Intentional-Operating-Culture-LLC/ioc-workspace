-- Feedback Loop Database Schema
-- Comprehensive schema for persisting feedback loop data, iterations, and metrics

-- ============================================================================
-- CORE FEEDBACK LOOP TABLES
-- ============================================================================

-- Main feedback loop tracking table
CREATE TABLE feedback_loops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id),
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('assessment', 'report', 'coaching', 'insight', 'recommendation')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'error', 'timeout')),
    
    -- Configuration
    confidence_threshold DECIMAL(3,2) NOT NULL CHECK (confidence_threshold BETWEEN 0 AND 1),
    max_iterations INTEGER NOT NULL CHECK (max_iterations > 0 AND max_iterations <= 50),
    timeout_ms INTEGER NOT NULL DEFAULT 300000,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Progress tracking
    current_iteration INTEGER NOT NULL DEFAULT 0,
    final_iteration INTEGER DEFAULT 0,
    converged BOOLEAN DEFAULT FALSE,
    convergence_reason VARCHAR(50) CHECK (convergence_reason IN ('threshold_met', 'max_iterations', 'timeout', 'oscillation', 'minimal_improvement')),
    
    -- Quality metrics
    initial_confidence DECIMAL(3,2),
    final_confidence DECIMAL(3,2),
    confidence_improvement DECIMAL(3,2),
    quality_score DECIMAL(3,2),
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    total_processing_time INTEGER, -- milliseconds
    
    -- Context and metadata
    context JSONB NOT NULL DEFAULT '{}',
    options JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Feedback loop iterations table
CREATE TABLE feedback_loop_iterations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_loop_id UUID NOT NULL REFERENCES feedback_loops(id) ON DELETE CASCADE,
    iteration_number INTEGER NOT NULL CHECK (iteration_number > 0),
    
    -- Generation data
    generation_request_id VARCHAR(255) NOT NULL,
    generation_content JSONB NOT NULL,
    generation_model VARCHAR(100) NOT NULL,
    generation_confidence DECIMAL(3,2),
    generation_processing_time INTEGER,
    generation_token_usage JSONB,
    generation_metadata JSONB DEFAULT '{}',
    
    -- Validation data
    validation_request_id VARCHAR(255) NOT NULL,
    validation_status VARCHAR(50) NOT NULL CHECK (validation_status IN ('approved', 'needs_improvement', 'rejected', 'requires_human_review')),
    validation_scores JSONB NOT NULL, -- overall, accuracy, clarity, bias, ethics, compliance
    validation_processing_time INTEGER,
    validation_metadata JSONB DEFAULT '{}',
    
    -- Feedback data
    feedback_messages JSONB NOT NULL DEFAULT '[]',
    improvement_applied BOOLEAN DEFAULT FALSE,
    confidence_improvement DECIMAL(3,2) DEFAULT 0,
    
    -- Timing
    iteration_start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    iteration_end_time TIMESTAMP WITH TIME ZONE,
    processing_time INTEGER,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(feedback_loop_id, iteration_number)
);

-- Node validations table (detailed validation results per node)
CREATE TABLE feedback_loop_node_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iteration_id UUID NOT NULL REFERENCES feedback_loop_iterations(id) ON DELETE CASCADE,
    node_id VARCHAR(255) NOT NULL,
    node_type VARCHAR(50) NOT NULL CHECK (node_type IN ('scoring', 'insight', 'recommendation', 'context')),
    
    -- Validation results
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    status VARCHAR(50) NOT NULL CHECK (status IN ('approved', 'needs_improvement', 'rejected')),
    scores JSONB NOT NULL, -- accuracy, clarity, bias, ethics, compliance
    
    -- Issues and suggestions
    issues JSONB NOT NULL DEFAULT '[]',
    suggestions JSONB NOT NULL DEFAULT '[]',
    
    -- Content tracking
    content_hash VARCHAR(64), -- SHA-256 hash of content for caching
    content_size INTEGER,
    
    -- Processing metrics
    processing_time INTEGER,
    validated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(iteration_id, node_id)
);

-- Feedback messages table (structured feedback communication)
CREATE TABLE feedback_loop_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iteration_id UUID NOT NULL REFERENCES feedback_loop_iterations(id) ON DELETE CASCADE,
    node_id VARCHAR(255) NOT NULL,
    
    -- Message details
    current_confidence DECIMAL(3,2) NOT NULL,
    target_confidence DECIMAL(3,2) NOT NULL,
    urgency VARCHAR(20) NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Content
    current_content JSONB NOT NULL,
    issues JSONB NOT NULL DEFAULT '[]',
    suggested_improvements JSONB NOT NULL DEFAULT '[]',
    
    -- Processing
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- QUALITY CONTROL TABLES
-- ============================================================================

-- Quality violations tracking
CREATE TABLE feedback_loop_quality_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_loop_id UUID NOT NULL REFERENCES feedback_loops(id) ON DELETE CASCADE,
    iteration_id UUID REFERENCES feedback_loop_iterations(id) ON DELETE CASCADE,
    
    -- Violation details
    violation_type VARCHAR(50) NOT NULL CHECK (violation_type IN ('iteration_limit', 'time_limit', 'quality_degradation', 'oscillation', 'stagnation', 'ethical_concern')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    
    -- Detection info
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    iteration_number INTEGER,
    
    -- Resolution
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Quality audit log
CREATE TABLE feedback_loop_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_loop_id UUID NOT NULL REFERENCES feedback_loops(id) ON DELETE CASCADE,
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    quality_score DECIMAL(3,2),
    
    -- User context
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    
    -- Audit
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PERFORMANCE AND CACHING TABLES
-- ============================================================================

-- Performance metrics tracking
CREATE TABLE feedback_loop_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_loop_id UUID NOT NULL REFERENCES feedback_loops(id) ON DELETE CASCADE,
    
    -- Timing metrics
    total_processing_time INTEGER NOT NULL,
    avg_iteration_time INTEGER,
    generation_time INTEGER,
    validation_time INTEGER,
    optimization_time INTEGER,
    
    -- Resource usage
    api_calls_made INTEGER DEFAULT 0,
    api_calls_cached INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    tokens_cached INTEGER DEFAULT 0,
    
    -- Efficiency metrics
    cache_hit_rate DECIMAL(3,2),
    parallel_efficiency DECIMAL(3,2),
    optimization_savings INTEGER, -- milliseconds saved
    
    -- Quality metrics
    convergence_rate DECIMAL(3,2),
    oscillation_detected BOOLEAN DEFAULT FALSE,
    escalation_required BOOLEAN DEFAULT FALSE,
    
    -- Recorded at completion
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Cache management table
CREATE TABLE feedback_loop_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    cache_type VARCHAR(50) NOT NULL CHECK (cache_type IN ('generation', 'validation', 'feedback', 'result')),
    
    -- Cache content
    data JSONB NOT NULL,
    compressed BOOLEAN DEFAULT FALSE,
    data_size INTEGER,
    
    -- Timing and expiry
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    access_count INTEGER DEFAULT 1,
    
    -- Metadata
    feedback_loop_id UUID REFERENCES feedback_loops(id) ON DELETE CASCADE,
    content_hash VARCHAR(64),
    metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- MONITORING AND ANALYTICS TABLES
-- ============================================================================

-- System health monitoring
CREATE TABLE feedback_loop_system_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Health metrics
    active_loops INTEGER NOT NULL DEFAULT 0,
    queue_depth INTEGER NOT NULL DEFAULT 0,
    avg_response_time INTEGER NOT NULL,
    error_rate DECIMAL(3,2) NOT NULL DEFAULT 0,
    convergence_rate DECIMAL(3,2) NOT NULL DEFAULT 0,
    
    -- Status indicators
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
    circuit_breaker_open BOOLEAN DEFAULT FALSE,
    
    -- Issues and recommendations
    issues JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    
    -- Timing
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Event tracking for webhooks and notifications
CREATE TABLE feedback_loop_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_loop_id UUID NOT NULL REFERENCES feedback_loops(id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('loop_started', 'iteration_completed', 'loop_completed', 'loop_cancelled', 'convergence_achieved', 'oscillation_detected', 'timeout_occurred', 'error_occurred')),
    event_data JSONB NOT NULL DEFAULT '{}',
    
    -- Processing
    processed BOOLEAN DEFAULT FALSE,
    webhook_sent BOOLEAN DEFAULT FALSE,
    webhook_response JSONB,
    
    -- Timing
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Primary query indexes
CREATE INDEX idx_feedback_loops_user_id ON feedback_loops(user_id);
CREATE INDEX idx_feedback_loops_status ON feedback_loops(status);
CREATE INDEX idx_feedback_loops_created_at ON feedback_loops(created_at);
CREATE INDEX idx_feedback_loops_priority ON feedback_loops(priority);
CREATE INDEX idx_feedback_loops_content_type ON feedback_loops(content_type);

-- Iteration indexes
CREATE INDEX idx_iterations_feedback_loop_id ON feedback_loop_iterations(feedback_loop_id);
CREATE INDEX idx_iterations_iteration_number ON feedback_loop_iterations(iteration_number);
CREATE INDEX idx_iterations_validation_status ON feedback_loop_iterations(validation_status);

-- Node validation indexes
CREATE INDEX idx_node_validations_iteration_id ON feedback_loop_node_validations(iteration_id);
CREATE INDEX idx_node_validations_node_id ON feedback_loop_node_validations(node_id);
CREATE INDEX idx_node_validations_confidence ON feedback_loop_node_validations(confidence);

-- Quality control indexes
CREATE INDEX idx_quality_violations_feedback_loop_id ON feedback_loop_quality_violations(feedback_loop_id);
CREATE INDEX idx_quality_violations_type_severity ON feedback_loop_quality_violations(violation_type, severity);
CREATE INDEX idx_quality_violations_detected_at ON feedback_loop_quality_violations(detected_at);

-- Performance indexes
CREATE INDEX idx_performance_metrics_feedback_loop_id ON feedback_loop_performance_metrics(feedback_loop_id);
CREATE INDEX idx_cache_key ON feedback_loop_cache(cache_key);
CREATE INDEX idx_cache_expires_at ON feedback_loop_cache(expires_at);
CREATE INDEX idx_cache_type ON feedback_loop_cache(cache_type);

-- Event indexes
CREATE INDEX idx_events_feedback_loop_id ON feedback_loop_events(feedback_loop_id);
CREATE INDEX idx_events_type ON feedback_loop_events(event_type);
CREATE INDEX idx_events_processed ON feedback_loop_events(processed);
CREATE INDEX idx_events_occurred_at ON feedback_loop_events(occurred_at);

-- Composite indexes for common queries
CREATE INDEX idx_feedback_loops_status_priority ON feedback_loops(status, priority);
CREATE INDEX idx_iterations_loop_iteration ON feedback_loop_iterations(feedback_loop_id, iteration_number);
CREATE INDEX idx_violations_loop_severity ON feedback_loop_quality_violations(feedback_loop_id, severity);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Active loops summary view
CREATE VIEW v_active_feedback_loops AS
SELECT 
    fl.id,
    fl.request_id,
    fl.user_id,
    fl.content_type,
    fl.status,
    fl.current_iteration,
    fl.max_iterations,
    fl.confidence_threshold,
    fl.final_confidence,
    fl.started_at,
    fl.total_processing_time,
    COALESCE(last_iter.validation_scores->>'overall', '0')::DECIMAL(3,2) as current_confidence,
    EXTRACT(EPOCH FROM (NOW() - fl.started_at)) * 1000 as elapsed_time_ms
FROM feedback_loops fl
LEFT JOIN LATERAL (
    SELECT validation_scores 
    FROM feedback_loop_iterations 
    WHERE feedback_loop_id = fl.id 
    ORDER BY iteration_number DESC 
    LIMIT 1
) last_iter ON true
WHERE fl.status = 'active';

-- Quality violations summary view
CREATE VIEW v_quality_violations_summary AS
SELECT 
    fl.id as feedback_loop_id,
    fl.request_id,
    COUNT(qv.id) as total_violations,
    COUNT(CASE WHEN qv.severity = 'critical' THEN 1 END) as critical_violations,
    COUNT(CASE WHEN qv.severity = 'high' THEN 1 END) as high_violations,
    COUNT(CASE WHEN qv.resolved = false THEN 1 END) as unresolved_violations,
    MAX(qv.detected_at) as last_violation_time
FROM feedback_loops fl
LEFT JOIN feedback_loop_quality_violations qv ON fl.id = qv.feedback_loop_id
GROUP BY fl.id, fl.request_id;

-- Performance metrics summary view
CREATE VIEW v_performance_summary AS
SELECT 
    DATE_TRUNC('hour', recorded_at) as hour,
    COUNT(*) as loops_completed,
    AVG(total_processing_time) as avg_processing_time,
    AVG(cache_hit_rate) as avg_cache_hit_rate,
    AVG(convergence_rate) as avg_convergence_rate,
    SUM(optimization_savings) as total_time_saved
FROM feedback_loop_performance_metrics
WHERE recorded_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', recorded_at)
ORDER BY hour DESC;

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for feedback_loops table
CREATE TRIGGER update_feedback_loops_updated_at 
    BEFORE UPDATE ON feedback_loops 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM feedback_loop_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate loop statistics
CREATE OR REPLACE FUNCTION calculate_loop_statistics(loop_id UUID)
RETURNS TABLE(
    total_iterations INTEGER,
    avg_iteration_time DECIMAL,
    total_feedback_messages INTEGER,
    quality_violations INTEGER,
    confidence_improvement DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(fli.id)::INTEGER as total_iterations,
        AVG(fli.processing_time)::DECIMAL as avg_iteration_time,
        SUM(jsonb_array_length(fli.feedback_messages))::INTEGER as total_feedback_messages,
        COUNT(flqv.id)::INTEGER as quality_violations,
        COALESCE(fl.confidence_improvement, 0)::DECIMAL as confidence_improvement
    FROM feedback_loops fl
    LEFT JOIN feedback_loop_iterations fli ON fl.id = fli.feedback_loop_id
    LEFT JOIN feedback_loop_quality_violations flqv ON fl.id = flqv.feedback_loop_id
    WHERE fl.id = loop_id
    GROUP BY fl.id, fl.confidence_improvement;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE feedback_loops ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_loop_iterations ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_loop_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own feedback loops
CREATE POLICY "Users can access own feedback loops" ON feedback_loops
    FOR ALL USING (auth.uid() = user_id);

-- Policy: Users can access iterations of their own feedback loops
CREATE POLICY "Users can access own iterations" ON feedback_loop_iterations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM feedback_loops 
            WHERE id = feedback_loop_id 
            AND user_id = auth.uid()
        )
    );

-- Policy: Users can access audit logs of their own feedback loops
CREATE POLICY "Users can access own audit logs" ON feedback_loop_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM feedback_loops 
            WHERE id = feedback_loop_id 
            AND user_id = auth.uid()
        )
    );

-- Admin policy for system monitoring (requires admin role)
CREATE POLICY "Admins can access all data" ON feedback_loops
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_app_meta_data->>'role' = 'admin'
        )
    );

-- ============================================================================
-- SAMPLE DATA AND TESTING
-- ============================================================================

-- Insert sample quality control configuration
INSERT INTO feedback_loop_system_health (
    active_loops, queue_depth, avg_response_time, error_rate, 
    convergence_rate, status, recorded_at
) VALUES (
    0, 0, 1500, 0.02, 0.85, 'healthy', NOW()
);

-- Create indexes for JSON fields that are frequently queried
CREATE INDEX idx_feedback_loops_context_gin ON feedback_loops USING GIN (context);
CREATE INDEX idx_iterations_generation_metadata_gin ON feedback_loop_iterations USING GIN (generation_metadata);
CREATE INDEX idx_iterations_validation_scores_gin ON feedback_loop_iterations USING GIN (validation_scores);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE feedback_loops IS 'Main table tracking feedback loop executions and their lifecycle';
COMMENT ON TABLE feedback_loop_iterations IS 'Detailed tracking of each iteration within a feedback loop';
COMMENT ON TABLE feedback_loop_node_validations IS 'Granular validation results for individual content nodes';
COMMENT ON TABLE feedback_loop_quality_violations IS 'Quality control violations and their resolution status';
COMMENT ON TABLE feedback_loop_performance_metrics IS 'Performance and efficiency metrics for completed loops';
COMMENT ON TABLE feedback_loop_cache IS 'Caching layer for optimizing repeated operations';
COMMENT ON TABLE feedback_loop_events IS 'Event stream for webhooks and external integrations';

COMMENT ON COLUMN feedback_loops.confidence_threshold IS 'Minimum confidence required for convergence (0.0-1.0)';
COMMENT ON COLUMN feedback_loops.converged IS 'Whether the loop achieved successful convergence';
COMMENT ON COLUMN feedback_loop_iterations.confidence_improvement IS 'Change in confidence from previous iteration';
COMMENT ON COLUMN feedback_loop_cache.expires_at IS 'When this cache entry should be considered expired';

-- End of schema