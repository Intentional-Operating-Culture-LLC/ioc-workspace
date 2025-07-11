-- OCEAN Integration Data Migration Script
-- Date: 2025-01-10
-- Description: Populate prompt nodes and OCEAN mappings from existing data

-- ========================================
-- PART 1: POPULATE PROMPT NODE HIERARCHY
-- ========================================

-- Create function to safely migrate existing prompts
CREATE OR REPLACE FUNCTION migrate_existing_prompts_to_nodes() 
RETURNS VOID AS $$
DECLARE
    v_root_id UUID;
    v_category_id UUID;
    v_subcategory_id UUID;
BEGIN
    -- Get or create root node
    SELECT id INTO v_root_id FROM prompt_nodes WHERE node_type = 'root' LIMIT 1;
    
    -- Create main categories
    INSERT INTO prompt_nodes (parent_id, node_type, name, description, primary_trait, status)
    VALUES 
        (v_root_id, 'category', 'Personality Assessment', 'Core personality trait questions', NULL, 'active'),
        (v_root_id, 'category', 'Emotional Intelligence', 'Emotional awareness and regulation', 'neuroticism', 'active'),
        (v_root_id, 'category', 'Cognitive Style', 'Thinking and problem-solving approaches', 'openness', 'active'),
        (v_root_id, 'category', 'Social Interaction', 'Interpersonal behavior patterns', 'extraversion', 'active'),
        (v_root_id, 'category', 'Work Style', 'Professional behavior and preferences', 'conscientiousness', 'active'),
        (v_root_id, 'category', 'Values & Ethics', 'Moral reasoning and values', 'agreeableness', 'active')
    ON CONFLICT DO NOTHING;
    
    -- Create subcategories for Personality Assessment
    SELECT id INTO v_category_id FROM prompt_nodes WHERE name = 'Personality Assessment' AND node_type = 'category';
    
    INSERT INTO prompt_nodes (parent_id, node_type, name, description, primary_trait, trait_weights, status)
    VALUES 
        (v_category_id, 'subcategory', 'Openness to Experience', 'Imagination, curiosity, and creativity', 'openness', 
         '{"openness": 1.0}'::jsonb, 'active'),
        (v_category_id, 'subcategory', 'Conscientiousness', 'Organization, dependability, and self-discipline', 'conscientiousness', 
         '{"conscientiousness": 1.0}'::jsonb, 'active'),
        (v_category_id, 'subcategory', 'Extraversion', 'Sociability, assertiveness, and energy', 'extraversion', 
         '{"extraversion": 1.0}'::jsonb, 'active'),
        (v_category_id, 'subcategory', 'Agreeableness', 'Cooperation, trust, and empathy', 'agreeableness', 
         '{"agreeableness": 1.0}'::jsonb, 'active'),
        (v_category_id, 'subcategory', 'Neuroticism', 'Emotional stability and stress response', 'neuroticism', 
         '{"neuroticism": 1.0}'::jsonb, 'active')
    ON CONFLICT DO NOTHING;
    
    -- Add sample prompts for Openness
    SELECT id INTO v_subcategory_id FROM prompt_nodes WHERE name = 'Openness to Experience' AND node_type = 'subcategory';
    
    INSERT INTO prompt_nodes (parent_id, node_type, name, prompt_text, primary_trait, trait_weights, response_options, scoring_rubric, status)
    VALUES 
        (v_subcategory_id, 'prompt', 'Abstract Thinking', 
         'I enjoy thinking about abstract concepts and theoretical ideas.',
         'openness', '{"openness": 0.8, "conscientiousness": 0.2}'::jsonb,
         '[{"value": 1, "label": "Strongly Disagree"}, {"value": 2, "label": "Disagree"}, {"value": 3, "label": "Neutral"}, {"value": 4, "label": "Agree"}, {"value": 5, "label": "Strongly Agree"}]'::jsonb,
         '{"facets": {"intellect": 0.7, "imagination": 0.3}}'::jsonb,
         'active'),
         
        (v_subcategory_id, 'prompt', 'Artistic Appreciation', 
         'I am deeply moved by art, music, or poetry.',
         'openness', '{"openness": 0.9, "agreeableness": 0.1}'::jsonb,
         '[{"value": 1, "label": "Strongly Disagree"}, {"value": 2, "label": "Disagree"}, {"value": 3, "label": "Neutral"}, {"value": 4, "label": "Agree"}, {"value": 5, "label": "Strongly Agree"}]'::jsonb,
         '{"facets": {"artistic_interests": 0.8, "emotionality": 0.2}}'::jsonb,
         'active'),
         
        (v_subcategory_id, 'prompt', 'Novel Experiences', 
         'I actively seek out new experiences and adventures.',
         'openness', '{"openness": 0.7, "extraversion": 0.3}'::jsonb,
         '[{"value": 1, "label": "Strongly Disagree"}, {"value": 2, "label": "Disagree"}, {"value": 3, "label": "Neutral"}, {"value": 4, "label": "Agree"}, {"value": 5, "label": "Strongly Agree"}]'::jsonb,
         '{"facets": {"adventurousness": 0.8, "excitement_seeking": 0.2}}'::jsonb,
         'active')
    ON CONFLICT DO NOTHING;
    
    -- Add sample prompts for Conscientiousness
    SELECT id INTO v_subcategory_id FROM prompt_nodes WHERE name = 'Conscientiousness' AND node_type = 'subcategory';
    
    INSERT INTO prompt_nodes (parent_id, node_type, name, prompt_text, primary_trait, trait_weights, response_options, scoring_rubric, status)
    VALUES 
        (v_subcategory_id, 'prompt', 'Goal Achievement', 
         'I set clear goals and work systematically to achieve them.',
         'conscientiousness', '{"conscientiousness": 0.9, "openness": 0.1}'::jsonb,
         '[{"value": 1, "label": "Strongly Disagree"}, {"value": 2, "label": "Disagree"}, {"value": 3, "label": "Neutral"}, {"value": 4, "label": "Agree"}, {"value": 5, "label": "Strongly Agree"}]'::jsonb,
         '{"facets": {"achievement_striving": 0.7, "self_discipline": 0.3}}'::jsonb,
         'active'),
         
        (v_subcategory_id, 'prompt', 'Organization', 
         'I keep my workspace and belongings well-organized.',
         'conscientiousness', '{"conscientiousness": 1.0}'::jsonb,
         '[{"value": 1, "label": "Strongly Disagree"}, {"value": 2, "label": "Disagree"}, {"value": 3, "label": "Neutral"}, {"value": 4, "label": "Agree"}, {"value": 5, "label": "Strongly Agree"}]'::jsonb,
         '{"facets": {"orderliness": 0.9, "self_efficacy": 0.1}}'::jsonb,
         'active')
    ON CONFLICT DO NOTHING;
    
END;
$$ LANGUAGE plpgsql;

-- Execute the migration
SELECT migrate_existing_prompts_to_nodes();

-- ========================================
-- PART 2: UPDATE EXISTING ASSESSMENTS
-- ========================================

-- Add OCEAN configuration to existing assessments
UPDATE assessments
SET 
    ocean_config = jsonb_build_object(
        'version', '1.0',
        'scoring_method', 'standard',
        'include_facets', true,
        'include_dark_side', false,
        'norm_group', 'general_population'
    ),
    assessment_tier = CASE 
        WHEN type = 'executive' THEN 'executive'::assessment_tier
        WHEN type = 'comprehensive' THEN 'comprehensive'::assessment_tier
        WHEN type = 'basic' THEN 'basic'::assessment_tier
        ELSE 'standard'::assessment_tier
    END
WHERE ocean_config = '{}' OR ocean_config IS NULL;

-- ========================================
-- PART 3: CREATE SAMPLE OCEAN MAPPINGS
-- ========================================

-- Create mapping table for existing question types to OCEAN traits
CREATE TEMPORARY TABLE question_ocean_mappings (
    question_pattern TEXT,
    ocean_traits JSONB
);

INSERT INTO question_ocean_mappings VALUES
    ('leadership%', '{"extraversion": 0.5, "conscientiousness": 0.3, "openness": 0.2}'),
    ('team%', '{"agreeableness": 0.6, "extraversion": 0.4}'),
    ('stress%', '{"neuroticism": 0.7, "conscientiousness": 0.3}'),
    ('creative%', '{"openness": 0.8, "extraversion": 0.2}'),
    ('analytical%', '{"openness": 0.4, "conscientiousness": 0.6}'),
    ('communication%', '{"extraversion": 0.5, "agreeableness": 0.5}'),
    ('planning%', '{"conscientiousness": 0.8, "openness": 0.2}'),
    ('conflict%', '{"agreeableness": 0.4, "neuroticism": 0.3, "extraversion": 0.3}'),
    ('innovation%', '{"openness": 0.7, "conscientiousness": 0.3}'),
    ('detail%', '{"conscientiousness": 0.9, "neuroticism": 0.1}');

-- ========================================
-- PART 4: CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Additional performance indexes
CREATE INDEX idx_prompt_nodes_trait_weights ON prompt_nodes USING GIN (trait_weights);
CREATE INDEX idx_assessment_questions_ocean_traits ON assessment_questions USING GIN (ocean_traits);
CREATE INDEX idx_assessments_ocean_config ON assessments USING GIN (ocean_config);
CREATE INDEX idx_assessments_tier ON assessments(assessment_tier);

-- Create composite indexes for common queries
CREATE INDEX idx_ocean_results_user_org ON ocean_assessment_results(user_id, organization_id);
CREATE INDEX idx_prompt_nodes_type_trait ON prompt_nodes(node_type, primary_trait) WHERE status = 'active';

-- ========================================
-- PART 5: CREATE UTILITY FUNCTIONS
-- ========================================

-- Function to get applicable prompts for an assessment tier
CREATE OR REPLACE FUNCTION get_prompts_for_tier(
    p_tier assessment_tier,
    p_trait ocean_trait DEFAULT NULL
) RETURNS TABLE (
    node_id UUID,
    prompt_text TEXT,
    trait_weights JSONB,
    response_options JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pn.id,
        pn.prompt_text,
        pn.trait_weights,
        pn.response_options
    FROM prompt_nodes pn
    WHERE pn.node_type IN ('prompt', 'variant')
    AND pn.status = 'active'
    AND (p_trait IS NULL OR pn.primary_trait = p_trait)
    AND CASE p_tier
        WHEN 'basic' THEN pn.metadata->>'difficulty' IN ('easy', 'medium')
        WHEN 'standard' THEN pn.metadata->>'difficulty' NOT IN ('expert')
        WHEN 'advanced' THEN true
        WHEN 'executive' THEN pn.metadata->>'executive_relevant' = 'true'
        WHEN 'comprehensive' THEN true
    END
    ORDER BY 
        pn.primary_trait,
        pn.position;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate percentile ranks
CREATE OR REPLACE FUNCTION calculate_ocean_percentiles(
    p_trait_scores JSONB,
    p_norm_group VARCHAR DEFAULT 'general_population'
) RETURNS JSONB AS $$
DECLARE
    v_percentiles JSONB := '{}';
    v_trait TEXT;
    v_score NUMERIC;
BEGIN
    -- This is a simplified version - in production, you'd query actual norm tables
    FOR v_trait, v_score IN SELECT * FROM jsonb_each_text(p_trait_scores)
    LOOP
        v_percentiles := v_percentiles || jsonb_build_object(
            v_trait || '_percentile',
            CASE 
                WHEN v_score::numeric <= 20 THEN 10
                WHEN v_score::numeric <= 35 THEN 25
                WHEN v_score::numeric <= 50 THEN 50
                WHEN v_score::numeric <= 65 THEN 75
                WHEN v_score::numeric <= 80 THEN 90
                ELSE 95
            END
        );
    END LOOP;
    
    RETURN v_percentiles;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PART 6: SAMPLE DATA FOR TESTING
-- ========================================

-- Create sample executive prompts
DO $$
DECLARE
    v_exec_cat_id UUID;
BEGIN
    -- Create executive assessment category
    INSERT INTO prompt_nodes (parent_id, node_type, name, description, status)
    VALUES (
        (SELECT id FROM prompt_nodes WHERE node_type = 'root' LIMIT 1),
        'category',
        'Executive Assessment',
        'Leadership and executive competency evaluation',
        'active'
    ) RETURNING id INTO v_exec_cat_id;
    
    -- Add executive-specific prompts
    INSERT INTO prompt_nodes (parent_id, node_type, name, prompt_text, primary_trait, trait_weights, metadata, status)
    VALUES 
        (v_exec_cat_id, 'prompt', 'Strategic Vision',
         'I can easily envision long-term strategic possibilities and their implications.',
         'openness', '{"openness": 0.6, "conscientiousness": 0.4}'::jsonb,
         '{"executive_relevant": "true", "leadership_dimension": "strategic_thinking"}'::jsonb,
         'active'),
         
        (v_exec_cat_id, 'prompt', 'Decision Under Pressure',
         'I make sound decisions quickly even when faced with incomplete information.',
         'conscientiousness', '{"conscientiousness": 0.5, "neuroticism": -0.3, "openness": 0.2}'::jsonb,
         '{"executive_relevant": "true", "leadership_dimension": "decision_making"}'::jsonb,
         'active'),
         
        (v_exec_cat_id, 'prompt', 'Stakeholder Management',
         'I effectively balance competing stakeholder interests while maintaining relationships.',
         'agreeableness', '{"agreeableness": 0.5, "extraversion": 0.3, "conscientiousness": 0.2}'::jsonb,
         '{"executive_relevant": "true", "leadership_dimension": "people_leadership"}'::jsonb,
         'active');
END $$;

-- ========================================
-- PART 7: VALIDATION QUERIES
-- ========================================

-- Create validation function
CREATE OR REPLACE FUNCTION validate_ocean_schema() 
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check prompt nodes
    RETURN QUERY
    SELECT 
        'Prompt Nodes Created'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END,
        'Count: ' || COUNT(*)::TEXT
    FROM prompt_nodes;
    
    -- Check trait coverage
    RETURN QUERY
    SELECT 
        'All OCEAN Traits Covered'::TEXT,
        CASE WHEN COUNT(DISTINCT primary_trait) = 5 THEN 'PASS' ELSE 'FAIL' END,
        'Traits: ' || string_agg(DISTINCT primary_trait::text, ', ')
    FROM prompt_nodes
    WHERE primary_trait IS NOT NULL;
    
    -- Check assessment updates
    RETURN QUERY
    SELECT 
        'Assessments Updated'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
        'Assessments without tier: ' || COUNT(*)::TEXT
    FROM assessments
    WHERE assessment_tier IS NULL;
    
    -- Check indexes
    RETURN QUERY
    SELECT 
        'Performance Indexes Created'::TEXT,
        CASE WHEN COUNT(*) >= 10 THEN 'PASS' ELSE 'FAIL' END,
        'Index count: ' || COUNT(*)::TEXT
    FROM pg_indexes
    WHERE tablename IN ('prompt_nodes', 'ocean_assessment_results', 'assessment_questions')
    AND schemaname = 'public';
END;
$$ LANGUAGE plpgsql;

-- Run validation
SELECT * FROM validate_ocean_schema();

-- ========================================
-- PART 8: CLEANUP
-- ========================================

-- Drop temporary objects
DROP TABLE IF EXISTS question_ocean_mappings;
DROP FUNCTION IF EXISTS migrate_existing_prompts_to_nodes();

-- Add comments for documentation
COMMENT ON TABLE prompt_nodes IS 'Hierarchical structure for OCEAN assessment prompts and questions';
COMMENT ON TABLE ocean_assessment_results IS 'Main OCEAN personality trait scores for each assessment';
COMMENT ON TABLE ocean_facet_scores IS 'Detailed 30-facet breakdown of OCEAN traits';
COMMENT ON TABLE emotional_regulation_scores IS 'Emotional regulation and spectrum analysis results';
COMMENT ON TABLE executive_ocean_profiles IS 'Executive leadership competency scores derived from OCEAN';
COMMENT ON TABLE dark_side_indicators IS 'Detection and measurement of potentially problematic trait extremes';