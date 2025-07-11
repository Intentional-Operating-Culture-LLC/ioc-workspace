-- OCEAN Assessment Database Schema Extensions
-- This migration adds support for OCEAN scoring, facets, 360 feedback, and dark side analysis

-- Assessment question bank with OCEAN mappings
CREATE TABLE IF NOT EXISTS assessment_questions_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node VARCHAR(100) NOT NULL,
  tier VARCHAR(50) NOT NULL CHECK (tier IN ('individual', 'executive', 'organizational')),
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL,
  primary_trait VARCHAR(20) CHECK (primary_trait IN ('openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism')),
  primary_weight DECIMAL(3,2) DEFAULT 1.0,
  secondary_trait VARCHAR(20) CHECK (secondary_trait IN ('openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism')),
  secondary_weight DECIMAL(3,2) DEFAULT 0.5,
  facets JSONB,
  reverse_scored BOOLEAN DEFAULT FALSE,
  weight INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient node and tier queries
CREATE INDEX idx_questions_bank_node_tier ON assessment_questions_bank(node, tier);
CREATE INDEX idx_questions_bank_traits ON assessment_questions_bank(primary_trait, secondary_trait);

-- Trait mappings for assessments
CREATE TABLE IF NOT EXISTS assessment_trait_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  mappings JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trait_mappings_assessment ON assessment_trait_mappings(assessment_id);

-- Extend assessment_submissions for OCEAN scores
ALTER TABLE assessment_submissions 
ADD COLUMN IF NOT EXISTS ocean_scores JSONB,
ADD COLUMN IF NOT EXISTS ocean_interpretation JSONB,
ADD COLUMN IF NOT EXISTS additional_analysis JSONB,
ADD COLUMN IF NOT EXISTS dark_side_analysis JSONB;

-- Facet scores table for detailed analysis
CREATE TABLE IF NOT EXISTS assessment_facet_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES assessment_submissions(id) ON DELETE CASCADE,
  trait VARCHAR(20) NOT NULL,
  facet VARCHAR(50) NOT NULL,
  score DECIMAL(3,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_facet_scores_submission ON assessment_facet_scores(submission_id);
CREATE INDEX idx_facet_scores_trait_facet ON assessment_facet_scores(trait, facet);

-- 360 feedback results table
CREATE TABLE IF NOT EXISTS assessment_360_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  subject_user_id UUID NOT NULL REFERENCES users(id),
  aggregated_scores JSONB NOT NULL,
  observer_agreement JSONB NOT NULL,
  blind_spots JSONB,
  rater_counts JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_360_results_assessment_subject ON assessment_360_results(assessment_id, subject_user_id);

-- Executive profiles table
CREATE TABLE IF NOT EXISTS executive_ocean_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  submission_id UUID NOT NULL REFERENCES assessment_submissions(id),
  ocean_scores JSONB NOT NULL,
  leadership_styles JSONB NOT NULL,
  influence_tactics JSONB NOT NULL,
  team_predictions JSONB NOT NULL,
  stress_response JSONB NOT NULL,
  dark_side_risk JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_executive_profiles_user_org ON executive_ocean_profiles(user_id, organization_id);

-- Organizational profiles table
CREATE TABLE IF NOT EXISTS organizational_ocean_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  assessment_id UUID NOT NULL REFERENCES assessments(id),
  collective_traits JSONB NOT NULL,
  trait_diversity JSONB NOT NULL,
  culture_type VARCHAR(50) NOT NULL,
  emergent_properties JSONB NOT NULL,
  health_metrics JSONB NOT NULL,
  team_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_profiles_organization ON organizational_ocean_profiles(organization_id);

-- Team composition snapshots
CREATE TABLE IF NOT EXISTS team_composition_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  team_id UUID,
  mean_traits JSONB NOT NULL,
  trait_diversity JSONB NOT NULL,
  role_fit_scores JSONB,
  dynamic_predictions JSONB NOT NULL,
  optimal_additions JSONB,
  member_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_snapshots_org_team ON team_composition_snapshots(organization_id, team_id);

-- Executive-org fit analyses
CREATE TABLE IF NOT EXISTS executive_org_fit_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executive_user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  trait_alignment JSONB NOT NULL,
  complementary_fit JSONB NOT NULL,
  overall_fit_score DECIMAL(3,2) NOT NULL,
  recommendations TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exec_org_fit ON executive_org_fit_analyses(executive_user_id, organization_id);

-- Update assessment_assignments for 360 feedback
ALTER TABLE assessment_assignments
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add OCEAN summary to assignments for quick access
ALTER TABLE assessment_assignments
ADD COLUMN IF NOT EXISTS ocean_summary JSONB;

-- Function to validate OCEAN scores
CREATE OR REPLACE FUNCTION validate_ocean_scores(scores JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if all traits are present and within valid range
  RETURN (
    scores ? 'openness' AND 
    scores ? 'conscientiousness' AND 
    scores ? 'extraversion' AND 
    scores ? 'agreeableness' AND 
    scores ? 'neuroticism' AND
    (scores->>'openness')::DECIMAL BETWEEN 1 AND 5 AND
    (scores->>'conscientiousness')::DECIMAL BETWEEN 1 AND 5 AND
    (scores->>'extraversion')::DECIMAL BETWEEN 1 AND 5 AND
    (scores->>'agreeableness')::DECIMAL BETWEEN 1 AND 5 AND
    (scores->>'neuroticism')::DECIMAL BETWEEN 1 AND 5
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assessment_360_results_updated_at
BEFORE UPDATE ON assessment_360_results
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Sample question bank data for OCEAN assessment
INSERT INTO assessment_questions_bank (node, tier, question_text, question_type, primary_trait, primary_weight, facets) VALUES
-- Openness Core
('openness-core', 'individual', 'I enjoy exploring new ideas and concepts', 'likert', 'openness', 1.0, '{"openness": {"ideas": 1.0}}'),
('openness-core', 'individual', 'I prefer routine over variety', 'likert', 'openness', 1.0, '{"openness": {"actions": 1.0}}'),
('openness-core', 'individual', 'Art and beauty are important to me', 'likert', 'openness', 1.0, '{"openness": {"aesthetics": 1.0}}'),

-- Conscientiousness Core
('conscientiousness-core', 'individual', 'I complete tasks thoroughly and on time', 'likert', 'conscientiousness', 1.0, '{"conscientiousness": {"dutifulness": 1.0}}'),
('conscientiousness-core', 'individual', 'I keep my workspace organized', 'likert', 'conscientiousness', 1.0, '{"conscientiousness": {"order": 1.0}}'),
('conscientiousness-core', 'individual', 'I set and achieve ambitious goals', 'likert', 'conscientiousness', 1.0, '{"conscientiousness": {"achievementStriving": 1.0}}'),

-- Executive Strategic Openness
('strategic-openness', 'executive', 'I actively seek diverse perspectives when making strategic decisions', 'likert', 'openness', 1.2, '{"openness": {"ideas": 1.0, "values": 0.5}}'),
('strategic-openness', 'executive', 'I encourage experimentation and calculated risk-taking', 'likert', 'openness', 1.2, '{"openness": {"actions": 1.0}}'),

-- Emotional Awareness
('emotional-awareness', 'individual', 'I am aware of my emotional reactions as they occur', 'likert', 'neuroticism', -0.8, '{"neuroticism": {"anxiety": -1.0}}'),
('emotional-awareness', 'individual', 'I can accurately identify what triggers my stress', 'likert', 'neuroticism', -0.8, NULL),

-- Dark Side Indicators
('overuse-indicators', 'executive', 'When stressed, I tend to micromanage my team', 'likert', 'conscientiousness', 1.0, NULL),
('stress-triggers', 'executive', 'Ambiguous situations make me extremely uncomfortable', 'likert', 'openness', -1.0, NULL);

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;