-- OCEAN Integration Rollback Script
-- Date: 2025-01-10
-- Description: Complete rollback script for OCEAN integration
-- 
-- IMPORTANT: This script will completely remove all OCEAN-related schema changes.
-- Make sure to backup any important data before running this rollback.

-- ========================================
-- PART 1: BACKUP CRITICAL DATA (Optional)
-- ========================================

-- Create backup tables before rollback (uncomment if needed)
/*
CREATE TABLE _backup_ocean_assessment_results AS SELECT * FROM ocean_assessment_results;
CREATE TABLE _backup_ocean_facet_scores AS SELECT * FROM ocean_facet_scores;
CREATE TABLE _backup_prompt_nodes AS SELECT * FROM prompt_nodes;
CREATE TABLE _backup_assessment_questions AS SELECT * FROM assessment_questions;
*/

-- ========================================
-- PART 2: DROP VIEWS
-- ========================================

DROP VIEW IF EXISTS v_ocean_migration_status CASCADE;
DROP VIEW IF EXISTS v_ocean_profiles CASCADE;
DROP VIEW IF EXISTS v_prompt_node_hierarchy CASCADE;

-- ========================================
-- PART 3: DROP FUNCTIONS
-- ========================================

-- Drop validation and utility functions
DROP FUNCTION IF EXISTS generate_ocean_summary_report() CASCADE;
DROP FUNCTION IF EXISTS generate_ocean_test_data(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS analyze_ocean_performance() CASCADE;
DROP FUNCTION IF EXISTS check_ocean_data_integrity() CASCADE;
DROP FUNCTION IF EXISTS validate_ocean_schema_complete() CASCADE;
DROP FUNCTION IF EXISTS validate_ocean_schema() CASCADE;

-- Drop OCEAN calculation functions
DROP FUNCTION IF EXISTS calculate_ocean_percentiles(JSONB, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_prompts_for_tier(assessment_tier, ocean_trait) CASCADE;
DROP FUNCTION IF EXISTS validate_ocean_assessment_completion(UUID) CASCADE;
DROP FUNCTION IF EXISTS calculate_ocean_scores(UUID) CASCADE;
DROP FUNCTION IF EXISTS calculate_node_path() CASCADE;

-- Drop any remaining migration functions
DROP FUNCTION IF EXISTS migrate_existing_prompts_to_nodes() CASCADE;

-- ========================================
-- PART 4: DROP TRIGGERS
-- ========================================

DROP TRIGGER IF EXISTS set_node_path ON prompt_nodes;

-- ========================================
-- PART 5: DROP POLICIES
-- ========================================

-- Drop all RLS policies on OCEAN tables
DROP POLICY IF EXISTS "OCEAN results visible to user and organization" ON ocean_assessment_results;
DROP POLICY IF EXISTS "Assessment questions visible to assessment participants" ON assessment_questions;
DROP POLICY IF EXISTS "Prompt nodes visible to authenticated users" ON prompt_nodes;

-- ========================================
-- PART 6: DROP TABLES
-- ========================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS dark_side_indicators CASCADE;
DROP TABLE IF EXISTS executive_ocean_profiles CASCADE;
DROP TABLE IF EXISTS emotional_regulation_scores CASCADE;
DROP TABLE IF EXISTS ocean_facet_scores CASCADE;
DROP TABLE IF EXISTS ocean_assessment_results CASCADE;
DROP TABLE IF EXISTS assessment_submissions CASCADE;
DROP TABLE IF EXISTS assessment_questions CASCADE;
DROP TABLE IF EXISTS prompt_nodes CASCADE;

-- ========================================
-- PART 7: REMOVE COLUMNS FROM EXISTING TABLES
-- ========================================

-- Remove OCEAN columns from assessments table
ALTER TABLE assessments 
DROP COLUMN IF EXISTS assessment_tier CASCADE,
DROP COLUMN IF EXISTS node_pattern CASCADE,
DROP COLUMN IF EXISTS ocean_config CASCADE,
DROP COLUMN IF EXISTS ocean_results CASCADE,
DROP COLUMN IF EXISTS completion_percentage CASCADE;

-- Remove OCEAN columns from assessment_responses
ALTER TABLE assessment_responses
DROP COLUMN IF EXISTS assessment_question_id CASCADE,
DROP COLUMN IF EXISTS ocean_scores CASCADE;

-- ========================================
-- PART 8: DROP INDEXES
-- ========================================

-- Drop all OCEAN-related indexes (if they weren't dropped with tables)
DROP INDEX IF EXISTS idx_prompt_nodes_parent;
DROP INDEX IF EXISTS idx_prompt_nodes_path;
DROP INDEX IF EXISTS idx_prompt_nodes_type_status;
DROP INDEX IF EXISTS idx_prompt_nodes_primary_trait;
DROP INDEX IF EXISTS idx_prompt_nodes_path_gist;
DROP INDEX IF EXISTS idx_prompt_nodes_trait_weights;
DROP INDEX IF EXISTS idx_prompt_nodes_type_trait;

DROP INDEX IF EXISTS idx_assessment_questions_assessment;
DROP INDEX IF EXISTS idx_assessment_questions_node;
DROP INDEX IF EXISTS idx_assessment_questions_ocean_traits;

DROP INDEX IF EXISTS idx_assessment_submissions_assessment;
DROP INDEX IF EXISTS idx_assessment_submissions_user;
DROP INDEX IF EXISTS idx_assessment_submissions_status;

DROP INDEX IF EXISTS idx_ocean_results_submission;
DROP INDEX IF EXISTS idx_ocean_results_user;
DROP INDEX IF EXISTS idx_ocean_results_organization;
DROP INDEX IF EXISTS idx_ocean_results_user_org;

DROP INDEX IF EXISTS idx_ocean_facets_result;
DROP INDEX IF EXISTS idx_emotional_regulation_result;
DROP INDEX IF EXISTS idx_executive_profiles_result;
DROP INDEX IF EXISTS idx_executive_profiles_user;
DROP INDEX IF EXISTS idx_dark_side_result;
DROP INDEX IF EXISTS idx_dark_side_risk_level;

DROP INDEX IF EXISTS idx_assessments_ocean_config;
DROP INDEX IF EXISTS idx_assessments_tier;

-- ========================================
-- PART 9: DROP TYPES
-- ========================================

-- Drop custom types (CASCADE to handle dependencies)
DROP TYPE IF EXISTS dark_side_level CASCADE;
DROP TYPE IF EXISTS emotional_spectrum CASCADE;
DROP TYPE IF EXISTS assessment_tier CASCADE;
DROP TYPE IF EXISTS node_status CASCADE;
DROP TYPE IF EXISTS prompt_node_type CASCADE;
DROP TYPE IF EXISTS ocean_trait CASCADE;

-- ========================================
-- PART 10: VERIFICATION
-- ========================================

-- Verify rollback completion
DO $$
DECLARE
    v_ocean_tables INTEGER;
    v_ocean_types INTEGER;
    v_ocean_functions INTEGER;
    v_ocean_columns INTEGER;
BEGIN
    -- Count remaining OCEAN tables
    SELECT COUNT(*) INTO v_ocean_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'prompt_nodes',
        'assessment_questions',
        'assessment_submissions',
        'ocean_assessment_results',
        'ocean_facet_scores',
        'emotional_regulation_scores',
        'executive_ocean_profiles',
        'dark_side_indicators'
    );
    
    -- Count remaining OCEAN types
    SELECT COUNT(*) INTO v_ocean_types
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    AND t.typname IN (
        'ocean_trait',
        'prompt_node_type',
        'node_status',
        'assessment_tier',
        'emotional_spectrum',
        'dark_side_level'
    );
    
    -- Count remaining OCEAN functions
    SELECT COUNT(*) INTO v_ocean_functions
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname LIKE '%ocean%';
    
    -- Count remaining OCEAN columns
    SELECT COUNT(*) INTO v_ocean_columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND column_name IN ('ocean_config', 'ocean_results', 'assessment_tier', 'node_pattern')
    AND table_name = 'assessments';
    
    -- Report results
    RAISE NOTICE 'OCEAN Rollback Verification:';
    RAISE NOTICE '============================';
    RAISE NOTICE 'Remaining OCEAN tables: %', v_ocean_tables;
    RAISE NOTICE 'Remaining OCEAN types: %', v_ocean_types;
    RAISE NOTICE 'Remaining OCEAN functions: %', v_ocean_functions;
    RAISE NOTICE 'Remaining OCEAN columns in assessments: %', v_ocean_columns;
    
    IF v_ocean_tables = 0 AND v_ocean_types = 0 AND v_ocean_columns = 0 THEN
        RAISE NOTICE 'SUCCESS: OCEAN schema completely removed';
    ELSE
        RAISE WARNING 'WARNING: Some OCEAN objects may still exist';
    END IF;
END $$;

-- ========================================
-- PART 11: RESTORE ORIGINAL STATE
-- ========================================

-- If you need to restore any original constraints or defaults that were modified,
-- add them here. For example:

-- Restore any original constraints on assessments table
-- (Only if they were modified during migration)

-- ========================================
-- PART 12: CLEANUP
-- ========================================

-- Drop any temporary tables created during migration
DROP TABLE IF EXISTS question_ocean_mappings;

-- Final message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'OCEAN Integration Rollback Complete';
    RAISE NOTICE '===================================';
    RAISE NOTICE 'All OCEAN-related schema changes have been removed.';
    RAISE NOTICE '';
    RAISE NOTICE 'If you created backup tables, they are prefixed with _backup_';
    RAISE NOTICE 'You can query them or drop them when no longer needed:';
    RAISE NOTICE '  DROP TABLE IF EXISTS _backup_ocean_assessment_results;';
    RAISE NOTICE '  DROP TABLE IF EXISTS _backup_ocean_facet_scores;';
    RAISE NOTICE '  DROP TABLE IF EXISTS _backup_prompt_nodes;';
    RAISE NOTICE '  DROP TABLE IF EXISTS _backup_assessment_questions;';
END $$;