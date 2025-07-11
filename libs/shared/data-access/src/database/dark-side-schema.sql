-- Dark Side OCEAN Analysis Database Schema
-- Support tables for personality derailers and trait extremes

-- Dark side analyses table - stores comprehensive dark side assessments
CREATE TABLE IF NOT EXISTS dark_side_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Overall risk assessment
  overall_risk_level VARCHAR(20) NOT NULL CHECK (overall_risk_level IN ('low', 'moderate', 'high', 'critical')),
  
  -- Trait-specific risks (JSONB for flexible structure)
  trait_risks JSONB NOT NULL DEFAULT '{}',
  
  -- Stress and amplification factors
  stress_level INTEGER NOT NULL CHECK (stress_level >= 1 AND stress_level <= 10),
  stress_amplification DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  
  -- Team and organizational impact
  team_impact VARCHAR(20) NOT NULL CHECK (team_impact IN ('positive', 'neutral', 'negative', 'toxic')),
  
  -- Behavioral indicators and observations
  behavioral_indicators JSONB NOT NULL DEFAULT '{}',
  
  -- Intervention plan and recommendations
  intervention_plan JSONB NOT NULL DEFAULT '{}',
  
  -- Self-awareness metrics
  self_awareness_gap DECIMAL(3,2) DEFAULT 0.0,
  
  -- Complete analysis data (for historical tracking)
  analysis_data JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Indexes for performance
  INDEX idx_dark_side_analyses_assessment_id (assessment_id),
  INDEX idx_dark_side_analyses_user_id (user_id),
  INDEX idx_dark_side_analyses_organization_id (organization_id),
  INDEX idx_dark_side_analyses_risk_level (overall_risk_level),
  INDEX idx_dark_side_analyses_team_impact (team_impact),
  INDEX idx_dark_side_analyses_created_at (created_at)
);

-- Stress assessments table - tracks stress levels over time
CREATE TABLE IF NOT EXISTS stress_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stress_level INTEGER NOT NULL CHECK (stress_level >= 1 AND stress_level <= 10),
  
  -- Context and triggers
  stress_triggers TEXT[],
  stress_context VARCHAR(500),
  
  -- Assessment metadata
  assessment_method VARCHAR(50) DEFAULT 'self_report', -- 'self_report', 'observer', 'physiological', '360_feedback'
  assessor_id UUID REFERENCES users(id),
  
  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assessment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_stress_assessments_user_id (user_id),
  INDEX idx_stress_assessments_date (assessment_date),
  INDEX idx_stress_assessments_level (stress_level)
);

-- Behavioral observations table - specific behaviors observed by others
CREATE TABLE IF NOT EXISTS behavioral_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  observer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Observation details
  observation_text TEXT NOT NULL,
  observation_category VARCHAR(100), -- 'leadership', 'communication', 'decision_making', 'stress_response', etc.
  observation_context VARCHAR(200), -- meeting, project, crisis, etc.
  
  -- OCEAN trait mapping
  related_trait VARCHAR(20) CHECK (related_trait IN ('openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism')),
  manifestation_type VARCHAR(20) CHECK (manifestation_type IN ('high_extreme', 'low_extreme', 'strength_overuse', 'adaptive', 'maladaptive')),
  
  -- Impact assessment
  impact_severity VARCHAR(20) CHECK (impact_severity IN ('minor', 'moderate', 'significant', 'severe')),
  impact_on_others TEXT,
  
  -- Timing and validation
  observation_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validated_by UUID REFERENCES users(id),
  
  -- Indexes
  INDEX idx_behavioral_observations_user_id (user_id),
  INDEX idx_behavioral_observations_observer_id (observer_id),
  INDEX idx_behavioral_observations_trait (related_trait),
  INDEX idx_behavioral_observations_date (observation_date),
  INDEX idx_behavioral_observations_severity (impact_severity)
);

-- 360 feedback table - comprehensive peer/subordinate/supervisor ratings
CREATE TABLE IF NOT EXISTS feedback_360 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Rater context
  rater_relationship VARCHAR(50) NOT NULL, -- 'supervisor', 'peer', 'subordinate', 'client', 'stakeholder'
  rater_context VARCHAR(200), -- additional context about relationship
  
  -- OCEAN trait rating
  trait VARCHAR(20) NOT NULL CHECK (trait IN ('openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism')),
  rating DECIMAL(3,2) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
  
  -- Dark side specific ratings
  strength_overuse_rating DECIMAL(3,2) CHECK (strength_overuse_rating >= 1.0 AND strength_overuse_rating <= 5.0),
  stress_behavior_rating DECIMAL(3,2) CHECK (stress_behavior_rating >= 1.0 AND stress_behavior_rating <= 5.0),
  
  -- Qualitative feedback
  specific_examples TEXT,
  development_suggestions TEXT,
  positive_observations TEXT,
  concern_areas TEXT,
  
  -- Feedback cycle metadata
  feedback_cycle_id UUID,
  feedback_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique rating per person per trait per cycle
  UNIQUE(subject_user_id, rater_id, trait, feedback_cycle_id),
  
  -- Indexes
  INDEX idx_360_feedback_subject_user_id (subject_user_id),
  INDEX idx_360_feedback_rater_id (rater_id),
  INDEX idx_360_feedback_trait (trait),
  INDEX idx_360_feedback_cycle (feedback_cycle_id),
  INDEX idx_360_feedback_date (feedback_date)
);

-- Dark side interventions table - track interventions and their effectiveness
CREATE TABLE IF NOT EXISTS dark_side_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dark_side_analysis_id UUID NOT NULL REFERENCES dark_side_analyses(id) ON DELETE CASCADE,
  
  -- Intervention details
  intervention_type VARCHAR(100) NOT NULL, -- 'coaching', 'training', 'mentoring', 'systemic_change', etc.
  intervention_description TEXT NOT NULL,
  target_traits TEXT[] NOT NULL, -- which OCEAN traits this addresses
  
  -- Goals and metrics
  intervention_goals TEXT[] NOT NULL,
  success_metrics TEXT[] NOT NULL,
  target_behaviors TEXT[],
  
  -- Timeline and status
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  target_completion_date TIMESTAMP WITH TIME ZONE,
  actual_completion_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed', 'cancelled', 'on_hold')),
  
  -- Effectiveness tracking
  effectiveness_rating DECIMAL(3,2) CHECK (effectiveness_rating >= 1.0 AND effectiveness_rating <= 5.0),
  behavioral_change_observed BOOLEAN DEFAULT FALSE,
  team_impact_improvement BOOLEAN DEFAULT FALSE,
  
  -- Progress notes
  progress_notes TEXT[],
  challenges_encountered TEXT[],
  lessons_learned TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  
  -- Indexes
  INDEX idx_dark_side_interventions_user_id (user_id),
  INDEX idx_dark_side_interventions_analysis_id (dark_side_analysis_id),
  INDEX idx_dark_side_interventions_type (intervention_type),
  INDEX idx_dark_side_interventions_status (status),
  INDEX idx_dark_side_interventions_start_date (start_date)
);

-- Early warning alerts table - automated alerts for dark side indicators
CREATE TABLE IF NOT EXISTS dark_side_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type VARCHAR(50) NOT NULL, -- 'behavioral_indicator', 'stress_threshold', 'team_impact', '360_feedback'
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  trait_involved VARCHAR(20) CHECK (trait_involved IN ('openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism')),
  
  -- Alert content
  alert_title VARCHAR(200) NOT NULL,
  alert_description TEXT NOT NULL,
  trigger_data JSONB NOT NULL DEFAULT '{}',
  
  -- Response tracking
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'investigating', 'resolved', 'false_positive')),
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  -- Auto-escalation
  escalation_level INTEGER DEFAULT 1 CHECK (escalation_level >= 1 AND escalation_level <= 5),
  next_escalation_at TIMESTAMP WITH TIME ZONE,
  escalated_to UUID REFERENCES users(id),
  
  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_dark_side_alerts_user_id (user_id),
  INDEX idx_dark_side_alerts_organization_id (organization_id),
  INDEX idx_dark_side_alerts_severity (severity),
  INDEX idx_dark_side_alerts_status (status),
  INDEX idx_dark_side_alerts_trait (trait_involved),
  INDEX idx_dark_side_alerts_created_at (created_at)
);

-- Dark side trends table - aggregate trends and patterns over time
CREATE TABLE IF NOT EXISTS dark_side_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Time period
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'quarterly', 'annual')),
  
  -- Trend metrics
  avg_risk_level DECIMAL(3,2) NOT NULL,
  risk_level_trend VARCHAR(20) CHECK (risk_level_trend IN ('improving', 'stable', 'worsening')),
  avg_stress_level DECIMAL(3,2) NOT NULL,
  stress_trend VARCHAR(20) CHECK (stress_trend IN ('decreasing', 'stable', 'increasing')),
  
  -- Trait-specific trends
  trait_trends JSONB NOT NULL DEFAULT '{}',
  
  -- Team impact trends
  avg_team_morale DECIMAL(3,2),
  team_morale_trend VARCHAR(20) CHECK (team_morale_trend IN ('improving', 'stable', 'declining')),
  intervention_effectiveness DECIMAL(3,2),
  
  -- Behavioral patterns
  predominant_manifestations TEXT[],
  improvement_areas TEXT[],
  persistent_challenges TEXT[],
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique periods per user
  UNIQUE(user_id, period_start, period_end, period_type),
  
  -- Indexes
  INDEX idx_dark_side_trends_user_id (user_id),
  INDEX idx_dark_side_trends_organization_id (organization_id),
  INDEX idx_dark_side_trends_period (period_start, period_end),
  INDEX idx_dark_side_trends_risk_level (avg_risk_level)
);

-- Views for common queries

-- Current dark side risk summary view
CREATE OR REPLACE VIEW current_dark_side_risk AS
SELECT 
  u.id as user_id,
  u.email,
  u.full_name,
  o.id as organization_id,
  o.name as organization_name,
  dsa.overall_risk_level,
  dsa.stress_level,
  dsa.team_impact,
  dsa.self_awareness_gap,
  dsa.created_at as last_assessment,
  (dsa.trait_risks->>'openness')::jsonb as openness_risk,
  (dsa.trait_risks->>'conscientiousness')::jsonb as conscientiousness_risk,
  (dsa.trait_risks->>'extraversion')::jsonb as extraversion_risk,
  (dsa.trait_risks->>'agreeableness')::jsonb as agreeableness_risk,
  (dsa.trait_risks->>'neuroticism')::jsonb as neuroticism_risk
FROM users u
JOIN organizations o ON u.organization_id = o.id
LEFT JOIN LATERAL (
  SELECT *
  FROM dark_side_analyses dsa2
  WHERE dsa2.user_id = u.id
  ORDER BY dsa2.created_at DESC
  LIMIT 1
) dsa ON true;

-- Team dark side dashboard view
CREATE OR REPLACE VIEW team_dark_side_dashboard AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  COUNT(CASE WHEN dsa.overall_risk_level = 'critical' THEN 1 END) as critical_risk_count,
  COUNT(CASE WHEN dsa.overall_risk_level = 'high' THEN 1 END) as high_risk_count,
  COUNT(CASE WHEN dsa.overall_risk_level = 'moderate' THEN 1 END) as moderate_risk_count,
  COUNT(CASE WHEN dsa.overall_risk_level = 'low' THEN 1 END) as low_risk_count,
  COUNT(CASE WHEN dsa.team_impact = 'toxic' THEN 1 END) as toxic_impact_count,
  COUNT(CASE WHEN dsa.team_impact = 'negative' THEN 1 END) as negative_impact_count,
  AVG(dsa.stress_level) as avg_stress_level,
  AVG(dsa.self_awareness_gap) as avg_awareness_gap,
  COUNT(DISTINCT dsa.user_id) as assessed_users_count
FROM organizations o
LEFT JOIN dark_side_analyses dsa ON dsa.organization_id = o.id 
  AND dsa.created_at > NOW() - INTERVAL '90 days'
GROUP BY o.id, o.name;

-- Early warning indicators view
CREATE OR REPLACE VIEW active_dark_side_warnings AS
SELECT 
  u.id as user_id,
  u.full_name,
  u.email,
  o.name as organization_name,
  dsa.severity,
  dsa.alert_title,
  dsa.alert_description,
  dsa.trait_involved,
  dsa.created_at,
  dsa.escalation_level,
  CASE 
    WHEN dsa.created_at < NOW() - INTERVAL '7 days' AND dsa.severity IN ('high', 'critical') THEN 'OVERDUE'
    WHEN dsa.created_at < NOW() - INTERVAL '3 days' AND dsa.severity = 'critical' THEN 'URGENT'
    ELSE 'ACTIVE'
  END as urgency_status
FROM dark_side_alerts dsa
JOIN users u ON dsa.user_id = u.id
JOIN organizations o ON dsa.organization_id = o.id
WHERE dsa.status IN ('active', 'acknowledged')
ORDER BY 
  CASE dsa.severity 
    WHEN 'critical' THEN 1 
    WHEN 'high' THEN 2 
    WHEN 'medium' THEN 3 
    ELSE 4 
  END,
  dsa.created_at DESC;

-- Add trigger to update dark_side_analyses updated_at
CREATE OR REPLACE FUNCTION update_dark_side_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_dark_side_analyses_updated_at
  BEFORE UPDATE ON dark_side_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_dark_side_analyses_updated_at();

-- Add trigger to update dark_side_interventions updated_at
CREATE TRIGGER trigger_update_dark_side_interventions_updated_at
  BEFORE UPDATE ON dark_side_interventions
  FOR EACH ROW
  EXECUTE FUNCTION update_dark_side_analyses_updated_at();

-- Add trigger to update dark_side_alerts updated_at
CREATE TRIGGER trigger_update_dark_side_alerts_updated_at
  BEFORE UPDATE ON dark_side_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_dark_side_analyses_updated_at();

-- Permissions (adjust based on your RLS policies)
ALTER TABLE dark_side_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stress_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavioral_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_360 ENABLE ROW LEVEL SECURITY;
ALTER TABLE dark_side_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dark_side_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dark_side_trends ENABLE ROW LEVEL SECURITY;