-- OCEAN Integration Database Schema Migration
-- Date: 2025-01-10
-- Description: Comprehensive schema updates to support OCEAN personality assessment integration
-- with node-based prompt hierarchy and detailed trait/facet scoring

-- ========================================
-- PART 1: CREATE NEW TYPES
-- ========================================

-- OCEAN trait types
CREATE TYPE ocean_trait AS ENUM ('openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism');

-- Node types for prompt hierarchy
CREATE TYPE prompt_node_type AS ENUM ('root', 'category', 'subcategory', 'prompt', 'variant');

-- Node status
CREATE TYPE node_status AS ENUM ('active', 'inactive', 'draft', 'archived');

-- Assessment tier levels
CREATE TYPE assessment_tier AS ENUM ('basic', 'standard', 'advanced', 'executive', 'comprehensive');

-- Emotional regulation spectrum
CREATE TYPE emotional_spectrum AS ENUM ('very_low', 'low', 'moderate', 'high', 'very_high');

-- Dark side indicator levels
CREATE TYPE dark_side_level AS ENUM ('none', 'mild', 'moderate', 'significant', 'severe');

-- ========================================
-- PART 2: CREATE PROMPT NODES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS prompt_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES prompt_nodes(id) ON DELETE CASCADE,
    node_type prompt_node_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    path TEXT NOT NULL, -- Materialized path for hierarchy queries
    depth INTEGER NOT NULL DEFAULT 0,
    position INTEGER DEFAULT 0, -- Ordering within parent
    metadata JSONB DEFAULT '{}',
    status node_status DEFAULT 'active',
    
    -- OCEAN trait associations
    primary_trait ocean_trait,
    trait_weights JSONB DEFAULT '{}', -- {"openness": 0.8, "conscientiousness": 0.2}
    
    -- Prompt-specific fields
    prompt_text TEXT,
    response_options JSONB, -- For structured responses
    scoring_rubric JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_hierarchy CHECK (
        (node_type = 'root' AND parent_id IS NULL) OR
        (node_type != 'root' AND parent_id IS NOT NULL)
    ),
    CONSTRAINT valid_prompt_fields CHECK (
        (node_type IN ('prompt', 'variant') AND prompt_text IS NOT NULL) OR
        (node_type NOT IN ('prompt', 'variant'))
    )
);

-- Create indexes for prompt_nodes
CREATE INDEX idx_prompt_nodes_parent ON prompt_nodes(parent_id);
CREATE INDEX idx_prompt_nodes_path ON prompt_nodes(path);
CREATE INDEX idx_prompt_nodes_type_status ON prompt_nodes(node_type, status);
CREATE INDEX idx_prompt_nodes_primary_trait ON prompt_nodes(primary_trait);
CREATE INDEX idx_prompt_nodes_path_gist ON prompt_nodes USING gist(path gist_trgm_ops);

-- ========================================
-- PART 3: UPDATE EXISTING TABLES
-- ========================================

-- Add OCEAN fields to assessments table
ALTER TABLE assessments 
ADD COLUMN IF NOT EXISTS assessment_tier assessment_tier DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS node_pattern TEXT, -- Node selection pattern
ADD COLUMN IF NOT EXISTS ocean_config JSONB DEFAULT '{}', -- Configuration for OCEAN scoring
ADD COLUMN IF NOT EXISTS ocean_results JSONB DEFAULT '{}', -- Summary OCEAN results
ADD COLUMN IF NOT EXISTS completion_percentage DECIMAL(5,2) DEFAULT 0;

-- Create assessment_questions table if not exists
CREATE TABLE IF NOT EXISTS assessment_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    node_id UUID REFERENCES prompt_nodes(id),
    question_order INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_metadata JSONB DEFAULT '{}',
    
    -- OCEAN mapping
    ocean_traits JSONB NOT NULL DEFAULT '{}', -- {"openness": 0.7, "conscientiousness": 0.3}
    facet_mappings JSONB DEFAULT '{}', -- Specific facet contributions
    
    -- Response tracking
    presented_at TIMESTAMP WITH TIME ZONE,
    answered_at TIMESTAMP WITH TIME ZONE,
    response_time_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_assessment_question_order UNIQUE(assessment_id, question_order)
);

CREATE INDEX idx_assessment_questions_assessment ON assessment_questions(assessment_id);
CREATE INDEX idx_assessment_questions_node ON assessment_questions(node_id);

-- Update assessment_responses to link with questions
ALTER TABLE assessment_responses
ADD COLUMN IF NOT EXISTS assessment_question_id UUID REFERENCES assessment_questions(id),
ADD COLUMN IF NOT EXISTS ocean_scores JSONB DEFAULT '{}'; -- Calculated scores for this response

-- Create or update assessment_submissions table
CREATE TABLE IF NOT EXISTS assessment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    status assessment_status DEFAULT 'pending',
    
    -- OCEAN results storage
    ocean_trait_scores JSONB NOT NULL DEFAULT '{}', -- {"openness": 72.5, ...}
    ocean_facet_scores JSONB NOT NULL DEFAULT '{}', -- All 30 facets
    
    -- Additional metrics
    consistency_score DECIMAL(5,2),
    response_pattern_flags JSONB DEFAULT '[]', -- Suspicious patterns
    
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    time_taken_seconds INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_assessment_submissions_assessment ON assessment_submissions(assessment_id);
CREATE INDEX idx_assessment_submissions_user ON assessment_submissions(user_id);
CREATE INDEX idx_assessment_submissions_status ON assessment_submissions(status);

-- ========================================
-- PART 4: CREATE NEW OCEAN TABLES
-- ========================================

-- Main OCEAN assessment results table
CREATE TABLE IF NOT EXISTS ocean_assessment_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_submission_id UUID REFERENCES assessment_submissions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    
    -- Big Five trait scores (0-100 scale)
    openness_score DECIMAL(5,2) NOT NULL CHECK (openness_score >= 0 AND openness_score <= 100),
    conscientiousness_score DECIMAL(5,2) NOT NULL CHECK (conscientiousness_score >= 0 AND conscientiousness_score <= 100),
    extraversion_score DECIMAL(5,2) NOT NULL CHECK (extraversion_score >= 0 AND extraversion_score <= 100),
    agreeableness_score DECIMAL(5,2) NOT NULL CHECK (agreeableness_score >= 0 AND agreeableness_score <= 100),
    neuroticism_score DECIMAL(5,2) NOT NULL CHECK (neuroticism_score >= 0 AND neuroticism_score <= 100),
    
    -- Percentile ranks
    openness_percentile INTEGER CHECK (openness_percentile >= 0 AND openness_percentile <= 100),
    conscientiousness_percentile INTEGER CHECK (conscientiousness_percentile >= 0 AND conscientiousness_percentile <= 100),
    extraversion_percentile INTEGER CHECK (extraversion_percentile >= 0 AND extraversion_percentile <= 100),
    agreeableness_percentile INTEGER CHECK (agreeableness_percentile >= 0 AND agreeableness_percentile <= 100),
    neuroticism_percentile INTEGER CHECK (neuroticism_percentile >= 0 AND neuroticism_percentile <= 100),
    
    -- Metadata
    calculation_method VARCHAR(50) DEFAULT 'standard',
    norm_group VARCHAR(50) DEFAULT 'general_population',
    confidence_intervals JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ocean_results_submission ON ocean_assessment_results(assessment_submission_id);
CREATE INDEX idx_ocean_results_user ON ocean_assessment_results(user_id);
CREATE INDEX idx_ocean_results_organization ON ocean_assessment_results(organization_id);

-- Detailed facet scores table (30 facets total)
CREATE TABLE IF NOT EXISTS ocean_facet_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ocean_result_id UUID REFERENCES ocean_assessment_results(id) ON DELETE CASCADE,
    
    -- Openness facets
    imagination DECIMAL(5,2) CHECK (imagination >= 0 AND imagination <= 100),
    artistic_interests DECIMAL(5,2) CHECK (artistic_interests >= 0 AND artistic_interests <= 100),
    emotionality DECIMAL(5,2) CHECK (emotionality >= 0 AND emotionality <= 100),
    adventurousness DECIMAL(5,2) CHECK (adventurousness >= 0 AND adventurousness <= 100),
    intellect DECIMAL(5,2) CHECK (intellect >= 0 AND intellect <= 100),
    liberalism DECIMAL(5,2) CHECK (liberalism >= 0 AND liberalism <= 100),
    
    -- Conscientiousness facets
    self_efficacy DECIMAL(5,2) CHECK (self_efficacy >= 0 AND self_efficacy <= 100),
    orderliness DECIMAL(5,2) CHECK (orderliness >= 0 AND orderliness <= 100),
    dutifulness DECIMAL(5,2) CHECK (dutifulness >= 0 AND dutifulness <= 100),
    achievement_striving DECIMAL(5,2) CHECK (achievement_striving >= 0 AND achievement_striving <= 100),
    self_discipline DECIMAL(5,2) CHECK (self_discipline >= 0 AND self_discipline <= 100),
    cautiousness DECIMAL(5,2) CHECK (cautiousness >= 0 AND cautiousness <= 100),
    
    -- Extraversion facets
    friendliness DECIMAL(5,2) CHECK (friendliness >= 0 AND friendliness <= 100),
    gregariousness DECIMAL(5,2) CHECK (gregariousness >= 0 AND gregariousness <= 100),
    assertiveness DECIMAL(5,2) CHECK (assertiveness >= 0 AND assertiveness <= 100),
    activity_level DECIMAL(5,2) CHECK (activity_level >= 0 AND activity_level <= 100),
    excitement_seeking DECIMAL(5,2) CHECK (excitement_seeking >= 0 AND excitement_seeking <= 100),
    cheerfulness DECIMAL(5,2) CHECK (cheerfulness >= 0 AND cheerfulness <= 100),
    
    -- Agreeableness facets
    trust DECIMAL(5,2) CHECK (trust >= 0 AND trust <= 100),
    morality DECIMAL(5,2) CHECK (morality >= 0 AND morality <= 100),
    altruism DECIMAL(5,2) CHECK (altruism >= 0 AND altruism <= 100),
    cooperation DECIMAL(5,2) CHECK (cooperation >= 0 AND cooperation <= 100),
    modesty DECIMAL(5,2) CHECK (modesty >= 0 AND modesty <= 100),
    sympathy DECIMAL(5,2) CHECK (sympathy >= 0 AND sympathy <= 100),
    
    -- Neuroticism facets
    anxiety DECIMAL(5,2) CHECK (anxiety >= 0 AND anxiety <= 100),
    anger DECIMAL(5,2) CHECK (anger >= 0 AND anger <= 100),
    depression DECIMAL(5,2) CHECK (depression >= 0 AND depression <= 100),
    self_consciousness DECIMAL(5,2) CHECK (self_consciousness >= 0 AND self_consciousness <= 100),
    immoderation DECIMAL(5,2) CHECK (immoderation >= 0 AND immoderation <= 100),
    vulnerability DECIMAL(5,2) CHECK (vulnerability >= 0 AND vulnerability <= 100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ocean_facets_result ON ocean_facet_scores(ocean_result_id);

-- Emotional regulation scores
CREATE TABLE IF NOT EXISTS emotional_regulation_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ocean_result_id UUID REFERENCES ocean_assessment_results(id) ON DELETE CASCADE,
    
    -- Core emotional regulation dimensions
    emotional_awareness emotional_spectrum NOT NULL,
    emotional_clarity emotional_spectrum NOT NULL,
    emotional_acceptance emotional_spectrum NOT NULL,
    emotional_tolerance emotional_spectrum NOT NULL,
    emotional_modification emotional_spectrum NOT NULL,
    emotional_recovery emotional_spectrum NOT NULL,
    
    -- Composite scores
    overall_regulation_score DECIMAL(5,2) CHECK (overall_regulation_score >= 0 AND overall_regulation_score <= 100),
    adaptive_strategies_score DECIMAL(5,2) CHECK (adaptive_strategies_score >= 0 AND adaptive_strategies_score <= 100),
    maladaptive_strategies_score DECIMAL(5,2) CHECK (maladaptive_strategies_score >= 0 AND maladaptive_strategies_score <= 100),
    
    -- Specific regulation strategies
    regulation_strategies JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_emotional_regulation_result ON emotional_regulation_scores(ocean_result_id);

-- Executive OCEAN profiles for leadership assessment
CREATE TABLE IF NOT EXISTS executive_ocean_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ocean_result_id UUID REFERENCES ocean_assessment_results(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    
    -- Leadership dimensions based on OCEAN
    strategic_thinking DECIMAL(5,2) CHECK (strategic_thinking >= 0 AND strategic_thinking <= 100),
    decision_making DECIMAL(5,2) CHECK (decision_making >= 0 AND decision_making <= 100),
    people_leadership DECIMAL(5,2) CHECK (people_leadership >= 0 AND people_leadership <= 100),
    change_management DECIMAL(5,2) CHECK (change_management >= 0 AND change_management <= 100),
    execution_excellence DECIMAL(5,2) CHECK (execution_excellence >= 0 AND execution_excellence <= 100),
    innovation_drive DECIMAL(5,2) CHECK (innovation_drive >= 0 AND innovation_drive <= 100),
    
    -- Risk and opportunity profile
    risk_tolerance DECIMAL(5,2) CHECK (risk_tolerance >= 0 AND risk_tolerance <= 100),
    opportunity_recognition DECIMAL(5,2) CHECK (opportunity_recognition >= 0 AND opportunity_recognition <= 100),
    
    -- Derailers and strengths
    potential_derailers JSONB DEFAULT '[]',
    core_strengths JSONB DEFAULT '[]',
    development_areas JSONB DEFAULT '[]',
    
    -- Overall executive effectiveness
    leadership_effectiveness_score DECIMAL(5,2) CHECK (leadership_effectiveness_score >= 0 AND leadership_effectiveness_score <= 100),
    executive_maturity_level VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_executive_profiles_result ON executive_ocean_profiles(ocean_result_id);
CREATE INDEX idx_executive_profiles_user ON executive_ocean_profiles(user_id);

-- Dark side indicators table
CREATE TABLE IF NOT EXISTS dark_side_indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ocean_result_id UUID REFERENCES ocean_assessment_results(id) ON DELETE CASCADE,
    
    -- Dark triad elements
    narcissism_level dark_side_level NOT NULL DEFAULT 'none',
    machiavellianism_level dark_side_level NOT NULL DEFAULT 'none',
    psychopathy_level dark_side_level NOT NULL DEFAULT 'none',
    
    -- Specific dark side behaviors
    manipulation_tendency DECIMAL(5,2) CHECK (manipulation_tendency >= 0 AND manipulation_tendency <= 100),
    empathy_deficit DECIMAL(5,2) CHECK (empathy_deficit >= 0 AND empathy_deficit <= 100),
    entitlement DECIMAL(5,2) CHECK (entitlement >= 0 AND entitlement <= 100),
    aggression_risk DECIMAL(5,2) CHECK (aggression_risk >= 0 AND aggression_risk <= 100),
    impulsivity_risk DECIMAL(5,2) CHECK (impulsivity_risk >= 0 AND impulsivity_risk <= 100),
    
    -- Contextual factors
    stress_induced_behaviors JSONB DEFAULT '[]',
    trigger_situations JSONB DEFAULT '[]',
    
    -- Risk assessment
    overall_risk_level dark_side_level NOT NULL DEFAULT 'none',
    recommended_interventions JSONB DEFAULT '[]',
    monitoring_flags JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dark_side_result ON dark_side_indicators(ocean_result_id);
CREATE INDEX idx_dark_side_risk_level ON dark_side_indicators(overall_risk_level);

-- ========================================
-- PART 5: CREATE HELPER FUNCTIONS
-- ========================================

-- Function to calculate node path
CREATE OR REPLACE FUNCTION calculate_node_path() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.path = NEW.id::text;
        NEW.depth = 0;
    ELSE
        SELECT path || '.' || NEW.id::text, depth + 1
        INTO NEW.path, NEW.depth
        FROM prompt_nodes
        WHERE id = NEW.parent_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_node_path 
    BEFORE INSERT ON prompt_nodes
    FOR EACH ROW EXECUTE FUNCTION calculate_node_path();

-- Function to calculate OCEAN scores from responses
CREATE OR REPLACE FUNCTION calculate_ocean_scores(
    p_assessment_submission_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_ocean_scores JSONB;
    v_facet_scores JSONB;
BEGIN
    -- Calculate trait scores from responses
    WITH response_scores AS (
        SELECT 
            aq.ocean_traits,
            ar.response,
            ar.ocean_scores
        FROM assessment_responses ar
        JOIN assessment_questions aq ON ar.assessment_question_id = aq.id
        JOIN assessment_submissions sub ON sub.assessment_id = ar.assessment_id
        WHERE sub.id = p_assessment_submission_id
    ),
    trait_aggregates AS (
        SELECT 
            jsonb_object_agg(
                trait.key,
                ROUND(AVG((trait.value)::numeric), 2)
            ) as trait_scores
        FROM response_scores rs,
        LATERAL jsonb_each(rs.ocean_scores) AS trait
        GROUP BY trait.key
    )
    SELECT trait_scores INTO v_ocean_scores FROM trait_aggregates;
    
    RETURN v_ocean_scores;
END;
$$ LANGUAGE plpgsql;

-- Function to validate assessment completion
CREATE OR REPLACE FUNCTION validate_ocean_assessment_completion(
    p_assessment_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_total_questions INTEGER;
    v_answered_questions INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_questions
    FROM assessment_questions
    WHERE assessment_id = p_assessment_id;
    
    SELECT COUNT(*) INTO v_answered_questions
    FROM assessment_questions aq
    JOIN assessment_responses ar ON ar.assessment_question_id = aq.id
    WHERE aq.assessment_id = p_assessment_id
    AND ar.response IS NOT NULL;
    
    RETURN v_total_questions > 0 AND v_total_questions = v_answered_questions;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PART 6: CREATE VIEWS FOR REPORTING
-- ========================================

-- Comprehensive OCEAN profile view
CREATE OR REPLACE VIEW v_ocean_profiles AS
SELECT 
    oar.id,
    oar.user_id,
    oar.organization_id,
    oar.openness_score,
    oar.conscientiousness_score,
    oar.extraversion_score,
    oar.agreeableness_score,
    oar.neuroticism_score,
    oar.openness_percentile,
    oar.conscientiousness_percentile,
    oar.extraversion_percentile,
    oar.agreeableness_percentile,
    oar.neuroticism_percentile,
    ofs.imagination,
    ofs.self_efficacy,
    ofs.friendliness,
    ofs.trust,
    ofs.anxiety,
    ers.overall_regulation_score,
    eop.leadership_effectiveness_score,
    dsi.overall_risk_level,
    oar.created_at
FROM ocean_assessment_results oar
LEFT JOIN ocean_facet_scores ofs ON ofs.ocean_result_id = oar.id
LEFT JOIN emotional_regulation_scores ers ON ers.ocean_result_id = oar.id
LEFT JOIN executive_ocean_profiles eop ON eop.ocean_result_id = oar.id
LEFT JOIN dark_side_indicators dsi ON dsi.ocean_result_id = oar.id;

-- Node hierarchy view
CREATE OR REPLACE VIEW v_prompt_node_hierarchy AS
WITH RECURSIVE node_tree AS (
    SELECT 
        id,
        parent_id,
        node_type,
        name,
        path,
        depth,
        primary_trait,
        ARRAY[id] as ancestors
    FROM prompt_nodes
    WHERE parent_id IS NULL
    
    UNION ALL
    
    SELECT 
        pn.id,
        pn.parent_id,
        pn.node_type,
        pn.name,
        pn.path,
        pn.depth,
        pn.primary_trait,
        nt.ancestors || pn.id
    FROM prompt_nodes pn
    JOIN node_tree nt ON pn.parent_id = nt.id
)
SELECT * FROM node_tree;

-- ========================================
-- PART 7: SECURITY POLICIES
-- ========================================

-- Enable RLS on new tables
ALTER TABLE prompt_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocean_assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocean_facet_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_regulation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE executive_ocean_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dark_side_indicators ENABLE ROW LEVEL SECURITY;

-- Prompt nodes policies
CREATE POLICY "Prompt nodes visible to authenticated users" ON prompt_nodes
    FOR SELECT USING (status = 'active' OR auth.uid() IN (
        SELECT id FROM profiles WHERE role IN ('admin', 'organization_admin')
    ));

-- Assessment questions policies
CREATE POLICY "Assessment questions visible to assessment participants" ON assessment_questions
    FOR SELECT USING (
        assessment_id IN (
            SELECT id FROM assessments 
            WHERE user_id = auth.uid() OR organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- OCEAN results policies
CREATE POLICY "OCEAN results visible to user and organization" ON ocean_assessment_results
    FOR SELECT USING (
        user_id = auth.uid() OR 
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'organization_admin')
        )
    );

-- ========================================
-- PART 8: MIGRATION DATA
-- ========================================

-- Insert root prompt nodes
INSERT INTO prompt_nodes (node_type, name, description, status) VALUES
    ('root', 'OCEAN Assessment Root', 'Root node for all OCEAN assessment prompts', 'active');

-- ========================================
-- PART 9: ROLLBACK SCRIPT
-- ========================================
/*
-- To rollback this migration, run:

-- Drop views
DROP VIEW IF EXISTS v_ocean_profiles CASCADE;
DROP VIEW IF EXISTS v_prompt_node_hierarchy CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_node_path() CASCADE;
DROP FUNCTION IF EXISTS calculate_ocean_scores(UUID) CASCADE;
DROP FUNCTION IF EXISTS validate_ocean_assessment_completion(UUID) CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS dark_side_indicators CASCADE;
DROP TABLE IF EXISTS executive_ocean_profiles CASCADE;
DROP TABLE IF EXISTS emotional_regulation_scores CASCADE;
DROP TABLE IF EXISTS ocean_facet_scores CASCADE;
DROP TABLE IF EXISTS ocean_assessment_results CASCADE;
DROP TABLE IF EXISTS assessment_submissions CASCADE;
DROP TABLE IF EXISTS assessment_questions CASCADE;
DROP TABLE IF EXISTS prompt_nodes CASCADE;

-- Remove columns from existing tables
ALTER TABLE assessments 
DROP COLUMN IF EXISTS assessment_tier,
DROP COLUMN IF EXISTS node_pattern,
DROP COLUMN IF EXISTS ocean_config,
DROP COLUMN IF EXISTS ocean_results,
DROP COLUMN IF EXISTS completion_percentage;

ALTER TABLE assessment_responses
DROP COLUMN IF EXISTS assessment_question_id,
DROP COLUMN IF EXISTS ocean_scores;

-- Drop types
DROP TYPE IF EXISTS dark_side_level CASCADE;
DROP TYPE IF EXISTS emotional_spectrum CASCADE;
DROP TYPE IF EXISTS assessment_tier CASCADE;
DROP TYPE IF EXISTS node_status CASCADE;
DROP TYPE IF EXISTS prompt_node_type CASCADE;
DROP TYPE IF EXISTS ocean_trait CASCADE;

*/