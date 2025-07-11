-- OCEAN Integration Validation and Testing Script
-- Date: 2025-01-10
-- Description: Comprehensive validation, testing, and reporting for OCEAN schema

-- ========================================
-- PART 1: SCHEMA VALIDATION FUNCTIONS
-- ========================================

-- Comprehensive schema validation
CREATE OR REPLACE FUNCTION validate_ocean_schema_complete() 
RETURNS TABLE (
    category TEXT,
    check_name TEXT,
    status TEXT,
    details TEXT,
    severity TEXT
) AS $$
BEGIN
    -- Check all required tables exist
    RETURN QUERY
    SELECT 
        'Tables'::TEXT,
        'Core Tables Exist'::TEXT,
        CASE 
            WHEN COUNT(*) = 8 THEN 'PASS'::TEXT 
            ELSE 'FAIL'::TEXT 
        END,
        format('Found %s of 8 required tables', COUNT(*))::TEXT,
        CASE 
            WHEN COUNT(*) = 8 THEN 'INFO'::TEXT 
            ELSE 'CRITICAL'::TEXT 
        END
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

    -- Check all custom types exist
    RETURN QUERY
    SELECT 
        'Types'::TEXT,
        'Custom Types Created'::TEXT,
        CASE 
            WHEN COUNT(*) >= 6 THEN 'PASS'::TEXT 
            ELSE 'FAIL'::TEXT 
        END,
        format('Found %s custom types', COUNT(*))::TEXT,
        CASE 
            WHEN COUNT(*) >= 6 THEN 'INFO'::TEXT 
            ELSE 'CRITICAL'::TEXT 
        END
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

    -- Check foreign key constraints
    RETURN QUERY
    SELECT 
        'Constraints'::TEXT,
        'Foreign Keys Defined'::TEXT,
        CASE 
            WHEN COUNT(*) >= 15 THEN 'PASS'::TEXT 
            ELSE 'WARN'::TEXT 
        END,
        format('%s foreign key constraints found', COUNT(*))::TEXT,
        CASE 
            WHEN COUNT(*) >= 15 THEN 'INFO'::TEXT 
            ELSE 'WARNING'::TEXT 
        END
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
    AND table_schema = 'public'
    AND table_name IN (
        'prompt_nodes',
        'assessment_questions',
        'ocean_assessment_results',
        'ocean_facet_scores'
    );

    -- Check indexes for performance
    RETURN QUERY
    SELECT 
        'Performance'::TEXT,
        'Required Indexes'::TEXT,
        CASE 
            WHEN COUNT(*) >= 20 THEN 'PASS'::TEXT 
            ELSE 'WARN'::TEXT 
        END,
        format('%s indexes on OCEAN tables', COUNT(*))::TEXT,
        'INFO'::TEXT
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename IN (
        'prompt_nodes',
        'assessment_questions',
        'ocean_assessment_results',
        'ocean_facet_scores'
    );

    -- Check RLS policies
    RETURN QUERY
    SELECT 
        'Security'::TEXT,
        'Row Level Security'::TEXT,
        CASE 
            WHEN COUNT(*) >= 5 THEN 'PASS'::TEXT 
            ELSE 'FAIL'::TEXT 
        END,
        format('%s tables with RLS enabled', COUNT(*))::TEXT,
        CASE 
            WHEN COUNT(*) >= 5 THEN 'INFO'::TEXT 
            ELSE 'WARNING'::TEXT 
        END
    FROM pg_tables
    WHERE schemaname = 'public'
    AND rowsecurity = true
    AND tablename IN (
        'prompt_nodes',
        'assessment_questions',
        'ocean_assessment_results'
    );

    -- Check prompt node hierarchy
    RETURN QUERY
    WITH node_stats AS (
        SELECT 
            node_type,
            COUNT(*) as count
        FROM prompt_nodes
        GROUP BY node_type
    )
    SELECT 
        'Data'::TEXT,
        'Prompt Node Hierarchy'::TEXT,
        CASE 
            WHEN SUM(count) > 0 THEN 'PASS'::TEXT 
            ELSE 'FAIL'::TEXT 
        END,
        string_agg(format('%s: %s', node_type, count), ', ')::TEXT,
        'INFO'::TEXT
    FROM node_stats;

    -- Check OCEAN trait coverage
    RETURN QUERY
    SELECT 
        'Data'::TEXT,
        'OCEAN Trait Coverage'::TEXT,
        CASE 
            WHEN COUNT(DISTINCT primary_trait) = 5 THEN 'PASS'::TEXT 
            ELSE 'WARN'::TEXT 
        END,
        format('%s of 5 traits covered', COUNT(DISTINCT primary_trait))::TEXT,
        CASE 
            WHEN COUNT(DISTINCT primary_trait) = 5 THEN 'INFO'::TEXT 
            ELSE 'WARNING'::TEXT 
        END
    FROM prompt_nodes
    WHERE primary_trait IS NOT NULL;

    -- Check functions exist
    RETURN QUERY
    SELECT 
        'Functions'::TEXT,
        'Required Functions'::TEXT,
        CASE 
            WHEN COUNT(*) >= 3 THEN 'PASS'::TEXT 
            ELSE 'FAIL'::TEXT 
        END,
        format('%s functions created', COUNT(*))::TEXT,
        'INFO'::TEXT
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'calculate_node_path',
        'calculate_ocean_scores',
        'validate_ocean_assessment_completion'
    );

    -- Check views exist
    RETURN QUERY
    SELECT 
        'Views'::TEXT,
        'Reporting Views'::TEXT,
        CASE 
            WHEN COUNT(*) >= 2 THEN 'PASS'::TEXT 
            ELSE 'WARN'::TEXT 
        END,
        format('%s views created', COUNT(*))::TEXT,
        'INFO'::TEXT
    FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name IN ('v_ocean_profiles', 'v_prompt_node_hierarchy');

END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PART 2: DATA INTEGRITY CHECKS
-- ========================================

CREATE OR REPLACE FUNCTION check_ocean_data_integrity() 
RETURNS TABLE (
    check_name TEXT,
    issue_count INTEGER,
    details TEXT,
    severity TEXT
) AS $$
BEGIN
    -- Check for orphaned prompt nodes
    RETURN QUERY
    SELECT 
        'Orphaned Prompt Nodes'::TEXT,
        COUNT(*)::INTEGER,
        CASE 
            WHEN COUNT(*) > 0 THEN 'Node IDs: ' || string_agg(id::text, ', ' ORDER BY id)
            ELSE 'No orphaned nodes found'
        END::TEXT,
        CASE 
            WHEN COUNT(*) > 0 THEN 'WARNING'::TEXT 
            ELSE 'INFO'::TEXT 
        END
    FROM prompt_nodes
    WHERE parent_id IS NOT NULL
    AND parent_id NOT IN (SELECT id FROM prompt_nodes);

    -- Check for invalid trait weights
    RETURN QUERY
    SELECT 
        'Invalid Trait Weights'::TEXT,
        COUNT(*)::INTEGER,
        CASE 
            WHEN COUNT(*) > 0 THEN 'Nodes with invalid weights'
            ELSE 'All trait weights valid'
        END::TEXT,
        CASE 
            WHEN COUNT(*) > 0 THEN 'ERROR'::TEXT 
            ELSE 'INFO'::TEXT 
        END
    FROM prompt_nodes
    WHERE trait_weights IS NOT NULL
    AND NOT (
        SELECT bool_and(
            (value::numeric >= -1 AND value::numeric <= 1)
        )
        FROM jsonb_each_text(trait_weights)
        WHERE key IN ('openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism')
    );

    -- Check for assessments without questions
    RETURN QUERY
    SELECT 
        'Assessments Without Questions'::TEXT,
        COUNT(*)::INTEGER,
        CASE 
            WHEN COUNT(*) > 0 THEN 'Assessment IDs need questions'
            ELSE 'All assessments have questions'
        END::TEXT,
        CASE 
            WHEN COUNT(*) > 0 THEN 'WARNING'::TEXT 
            ELSE 'INFO'::TEXT 
        END
    FROM assessments a
    WHERE NOT EXISTS (
        SELECT 1 FROM assessment_questions aq
        WHERE aq.assessment_id = a.id
    )
    AND a.status != 'cancelled';

    -- Check for incomplete OCEAN results
    RETURN QUERY
    WITH incomplete_results AS (
        SELECT id
        FROM ocean_assessment_results
        WHERE openness_score IS NULL
        OR conscientiousness_score IS NULL
        OR extraversion_score IS NULL
        OR agreeableness_score IS NULL
        OR neuroticism_score IS NULL
    )
    SELECT 
        'Incomplete OCEAN Results'::TEXT,
        COUNT(*)::INTEGER,
        CASE 
            WHEN COUNT(*) > 0 THEN 'Results missing trait scores'
            ELSE 'All results complete'
        END::TEXT,
        CASE 
            WHEN COUNT(*) > 0 THEN 'ERROR'::TEXT 
            ELSE 'INFO'::TEXT 
        END
    FROM incomplete_results;

    -- Check for score range violations
    RETURN QUERY
    SELECT 
        'Score Range Violations'::TEXT,
        COUNT(*)::INTEGER,
        'Facet scores outside 0-100 range'::TEXT,
        CASE 
            WHEN COUNT(*) > 0 THEN 'ERROR'::TEXT 
            ELSE 'INFO'::TEXT 
        END
    FROM ocean_facet_scores
    WHERE imagination < 0 OR imagination > 100
    OR self_efficacy < 0 OR self_efficacy > 100
    OR friendliness < 0 OR friendliness > 100
    OR trust < 0 OR trust > 100
    OR anxiety < 0 OR anxiety > 100;

END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PART 3: PERFORMANCE ANALYSIS
-- ========================================

CREATE OR REPLACE FUNCTION analyze_ocean_performance() 
RETURNS TABLE (
    object_name TEXT,
    object_type TEXT,
    size_pretty TEXT,
    row_count BIGINT,
    index_count INTEGER,
    recommendations TEXT
) AS $$
BEGIN
    -- Analyze table sizes and row counts
    RETURN QUERY
    WITH table_stats AS (
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size_pretty,
            n_live_tup as row_count
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        AND tablename IN (
            'prompt_nodes',
            'assessment_questions',
            'ocean_assessment_results',
            'ocean_facet_scores'
        )
    ),
    index_stats AS (
        SELECT 
            tablename,
            COUNT(*) as index_count
        FROM pg_indexes
        WHERE schemaname = 'public'
        GROUP BY tablename
    )
    SELECT 
        ts.tablename::TEXT,
        'TABLE'::TEXT,
        ts.size_pretty::TEXT,
        ts.row_count::BIGINT,
        COALESCE(ist.index_count, 0)::INTEGER,
        CASE 
            WHEN ts.row_count > 100000 AND COALESCE(ist.index_count, 0) < 3 
            THEN 'Consider adding more indexes'
            WHEN ts.row_count > 1000000 
            THEN 'Consider partitioning'
            ELSE 'OK'
        END::TEXT
    FROM table_stats ts
    LEFT JOIN index_stats ist ON ts.tablename = ist.tablename;

END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PART 4: TEST DATA GENERATION
-- ========================================

CREATE OR REPLACE FUNCTION generate_ocean_test_data(
    p_num_assessments INTEGER DEFAULT 10
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_assessment_id UUID;
    v_submission_id UUID;
    v_result_id UUID;
    v_node_ids UUID[];
    v_created_count INTEGER := 0;
    v_results JSONB := '{}';
BEGIN
    -- Get test user and organization
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    SELECT id INTO v_org_id FROM organizations LIMIT 1;
    
    -- Get sample prompt nodes
    SELECT array_agg(id) INTO v_node_ids
    FROM prompt_nodes
    WHERE node_type = 'prompt'
    LIMIT 20;
    
    -- Generate test assessments
    FOR i IN 1..p_num_assessments LOOP
        -- Create assessment
        INSERT INTO assessments (
            organization_id,
            user_id,
            type,
            status,
            assessment_tier,
            ocean_config
        ) VALUES (
            v_org_id,
            v_user_id,
            'personality',
            'completed',
            'standard',
            '{"version": "1.0", "include_facets": true}'
        ) RETURNING id INTO v_assessment_id;
        
        -- Create assessment questions
        FOR j IN 1..20 LOOP
            INSERT INTO assessment_questions (
                assessment_id,
                node_id,
                question_order,
                question_text,
                ocean_traits,
                presented_at,
                answered_at,
                response_time_ms
            ) VALUES (
                v_assessment_id,
                v_node_ids[j],
                j,
                'Test question ' || j,
                format('{"openness": %s, "conscientiousness": %s}', 
                    (random() * 0.8 + 0.1)::numeric(3,2),
                    (random() * 0.8 + 0.1)::numeric(3,2)
                )::jsonb,
                NOW() - INTERVAL '1 hour',
                NOW() - INTERVAL '50 minutes',
                (random() * 5000 + 1000)::integer
            );
        END LOOP;
        
        -- Create submission
        INSERT INTO assessment_submissions (
            assessment_id,
            user_id,
            status,
            ocean_trait_scores,
            started_at,
            completed_at
        ) VALUES (
            v_assessment_id,
            v_user_id,
            'completed',
            format('{
                "openness": %s,
                "conscientiousness": %s,
                "extraversion": %s,
                "agreeableness": %s,
                "neuroticism": %s
            }',
                (random() * 40 + 30)::numeric(4,1),
                (random() * 40 + 30)::numeric(4,1),
                (random() * 40 + 30)::numeric(4,1),
                (random() * 40 + 30)::numeric(4,1),
                (random() * 40 + 30)::numeric(4,1)
            )::jsonb,
            NOW() - INTERVAL '1 hour',
            NOW()
        ) RETURNING id INTO v_submission_id;
        
        -- Create OCEAN results
        INSERT INTO ocean_assessment_results (
            assessment_submission_id,
            user_id,
            organization_id,
            openness_score,
            conscientiousness_score,
            extraversion_score,
            agreeableness_score,
            neuroticism_score,
            openness_percentile,
            conscientiousness_percentile,
            extraversion_percentile,
            agreeableness_percentile,
            neuroticism_percentile
        ) VALUES (
            v_submission_id,
            v_user_id,
            v_org_id,
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 50 + 25)::integer,
            (random() * 50 + 25)::integer,
            (random() * 50 + 25)::integer,
            (random() * 50 + 25)::integer,
            (random() * 50 + 25)::integer
        ) RETURNING id INTO v_result_id;
        
        -- Create facet scores
        INSERT INTO ocean_facet_scores (
            ocean_result_id,
            imagination, artistic_interests, emotionality,
            adventurousness, intellect, liberalism,
            self_efficacy, orderliness, dutifulness,
            achievement_striving, self_discipline, cautiousness,
            friendliness, gregariousness, assertiveness,
            activity_level, excitement_seeking, cheerfulness,
            trust, morality, altruism,
            cooperation, modesty, sympathy,
            anxiety, anger, depression,
            self_consciousness, immoderation, vulnerability
        ) VALUES (
            v_result_id,
            -- Openness facets
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            -- Conscientiousness facets
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            -- Extraversion facets
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            -- Agreeableness facets
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            -- Neuroticism facets
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2),
            (random() * 40 + 30)::numeric(5,2)
        );
        
        v_created_count := v_created_count + 1;
    END LOOP;
    
    v_results := jsonb_build_object(
        'assessments_created', v_created_count,
        'status', 'success',
        'message', format('Created %s test assessments with full OCEAN data', v_created_count)
    );
    
    RETURN v_results;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PART 5: REPORTING QUERIES
-- ========================================

-- Summary report function
CREATE OR REPLACE FUNCTION generate_ocean_summary_report() 
RETURNS TABLE (
    metric_name TEXT,
    metric_value TEXT,
    metric_details JSONB
) AS $$
BEGIN
    -- Total assessments with OCEAN
    RETURN QUERY
    SELECT 
        'Total OCEAN Assessments'::TEXT,
        COUNT(*)::TEXT,
        jsonb_build_object(
            'completed', COUNT(*) FILTER (WHERE status = 'completed'),
            'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
            'by_tier', jsonb_object_agg(assessment_tier::text, count)
        )
    FROM assessments
    CROSS JOIN LATERAL (
        SELECT assessment_tier, COUNT(*) as count
        FROM assessments
        GROUP BY assessment_tier
    ) tier_counts
    WHERE ocean_config IS NOT NULL
    GROUP BY assessment_tier, count;
    
    -- Prompt node statistics
    RETURN QUERY
    SELECT 
        'Prompt Node Statistics'::TEXT,
        COUNT(*)::TEXT,
        jsonb_build_object(
            'by_type', jsonb_object_agg(node_type::text, count),
            'by_trait', jsonb_object_agg(COALESCE(primary_trait::text, 'none'), trait_count),
            'active_prompts', COUNT(*) FILTER (WHERE node_type = 'prompt' AND status = 'active')
        )
    FROM prompt_nodes
    CROSS JOIN LATERAL (
        SELECT node_type, COUNT(*) as count
        FROM prompt_nodes
        GROUP BY node_type
    ) type_counts
    CROSS JOIN LATERAL (
        SELECT primary_trait, COUNT(*) as trait_count
        FROM prompt_nodes
        GROUP BY primary_trait
    ) trait_counts
    GROUP BY node_type, count, primary_trait, trait_count;
    
    -- OCEAN score distributions
    RETURN QUERY
    WITH score_stats AS (
        SELECT 
            AVG(openness_score) as avg_o,
            AVG(conscientiousness_score) as avg_c,
            AVG(extraversion_score) as avg_e,
            AVG(agreeableness_score) as avg_a,
            AVG(neuroticism_score) as avg_n,
            STDDEV(openness_score) as std_o,
            STDDEV(conscientiousness_score) as std_c,
            STDDEV(extraversion_score) as std_e,
            STDDEV(agreeableness_score) as std_a,
            STDDEV(neuroticism_score) as std_n
        FROM ocean_assessment_results
    )
    SELECT 
        'OCEAN Score Statistics'::TEXT,
        'See details'::TEXT,
        jsonb_build_object(
            'averages', jsonb_build_object(
                'openness', ROUND(avg_o, 2),
                'conscientiousness', ROUND(avg_c, 2),
                'extraversion', ROUND(avg_e, 2),
                'agreeableness', ROUND(avg_a, 2),
                'neuroticism', ROUND(avg_n, 2)
            ),
            'std_deviations', jsonb_build_object(
                'openness', ROUND(std_o, 2),
                'conscientiousness', ROUND(std_c, 2),
                'extraversion', ROUND(std_e, 2),
                'agreeableness', ROUND(std_a, 2),
                'neuroticism', ROUND(std_n, 2)
            )
        )
    FROM score_stats;
    
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- PART 6: EXECUTE VALIDATION
-- ========================================

-- Run all validation checks
DO $$
DECLARE
    v_validation_results JSONB;
BEGIN
    -- Create temporary table for results
    CREATE TEMP TABLE validation_results AS
    SELECT * FROM validate_ocean_schema_complete();
    
    -- Add data integrity checks
    INSERT INTO validation_results (category, check_name, status, details, severity)
    SELECT 'Data Integrity', check_name, 
           CASE WHEN issue_count = 0 THEN 'PASS' ELSE 'FAIL' END,
           details, severity
    FROM check_ocean_data_integrity();
    
    -- Log results
    RAISE NOTICE 'OCEAN Schema Validation Results:';
    RAISE NOTICE '================================';
    
    -- Summary
    RAISE NOTICE 'Total Checks: %', (SELECT COUNT(*) FROM validation_results);
    RAISE NOTICE 'Passed: %', (SELECT COUNT(*) FROM validation_results WHERE status = 'PASS');
    RAISE NOTICE 'Failed: %', (SELECT COUNT(*) FROM validation_results WHERE status = 'FAIL');
    RAISE NOTICE 'Warnings: %', (SELECT COUNT(*) FROM validation_results WHERE status = 'WARN');
    
    -- Critical issues
    FOR v_validation_results IN 
        SELECT jsonb_build_object(
            'category', category,
            'check', check_name,
            'details', details
        )
        FROM validation_results 
        WHERE severity = 'CRITICAL'
    LOOP
        RAISE WARNING 'CRITICAL: %', v_validation_results;
    END LOOP;
    
    DROP TABLE validation_results;
END $$;

-- Create final summary view
CREATE OR REPLACE VIEW v_ocean_migration_status AS
SELECT 
    'Migration completed at: ' || NOW()::text as status,
    (SELECT COUNT(*) FROM prompt_nodes) as prompt_nodes_count,
    (SELECT COUNT(*) FROM ocean_assessment_results) as ocean_results_count,
    (SELECT COUNT(DISTINCT primary_trait) FROM prompt_nodes WHERE primary_trait IS NOT NULL) as traits_covered,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%ocean%') as ocean_tables_created;

-- Display final status
SELECT * FROM v_ocean_migration_status;