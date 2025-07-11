// OCEAN Facet-Level Analysis API Endpoint
// Version: 2025-07-10.1
// Purpose: Generate comprehensive 30-facet OCEAN personality profiles

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FacetScoringEngine } from "@ioc/shared/data-access/src/scoring/facet-scoring-engine";
import { OceanFacetMapper } from "@ioc/shared/data-access/src/scoring/ocean-facet-mapping";
import { ValidationService } from "@ioc/shared/data-access/src/validation/assessment-validation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { assessment_id, user_id, tier = 'individual', include_predictions = false } = await request.json();

    // Validate required parameters
    if (!assessment_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing required parameters: assessment_id and user_id' },
        { status: 400 }
      );
    }

    // Validate tier parameter
    if (!['individual', 'executive', 'organizational'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be individual, executive, or organizational' },
        { status: 400 }
      );
    }

    // Initialize scoring components
    const facetScorer = new FacetScoringEngine();
    const facetMapper = new OceanFacetMapper();
    const validator = new ValidationService();

    // 1. Retrieve assessment responses
    const { data: responses, error: responsesError } = await supabase.
    from('assessment_responses').
    select(`
        id,
        question_id,
        response_value,
        response_text,
        response_time_ms,
        prompts (
          id,
          node_id,
          prompt_type,
          metadata
        )
      `).
    eq('assessment_id', assessment_id).
    eq('user_id', user_id);

    if (responsesError) {
      console.error('Error fetching responses:', responsesError);
      return NextResponse.json(
        { error: 'Failed to retrieve assessment responses' },
        { status: 500 }
      );
    }

    if (!responses || responses.length === 0) {
      return NextResponse.json(
        { error: 'No assessment responses found for the given assessment_id and user_id' },
        { status: 404 }
      );
    }

    // 2. Get node-to-facet correlation mappings
    const { data: mappings, error: mappingsError } = await supabase.
    from('node_facet_mappings').
    select('*');

    if (mappingsError) {
      console.error('Error fetching mappings:', mappingsError);
      return NextResponse.json(
        { error: 'Failed to retrieve facet mappings' },
        { status: 500 }
      );
    }

    // 3. Calculate facet scores for all 30 facets
    const facetScores = await facetScorer.calculateAllFacetScores(
      responses,
      mappings,
      tier
    );

    // 4. Validate facet score quality
    const validationResults = await validator.validateFacetScores(facetScores, responses);

    // 5. Generate facet profile
    const facetProfile = {
      // Openness Facets
      openness_facets: {
        O1_Fantasy: facetScores.O1 || null,
        O2_Aesthetics: facetScores.O2 || null,
        O3_Feelings: facetScores.O3 || null,
        O4_Actions: facetScores.O4 || null,
        O5_Ideas: facetScores.O5 || null,
        O6_Values: facetScores.O6 || null
      },

      // Conscientiousness Facets
      conscientiousness_facets: {
        C1_Competence: facetScores.C1 || null,
        C2_Order: facetScores.C2 || null,
        C3_Dutifulness: facetScores.C3 || null,
        C4_Achievement_Striving: facetScores.C4 || null,
        C5_Self_Discipline: facetScores.C5 || null,
        C6_Deliberation: facetScores.C6 || null
      },

      // Extraversion Facets
      extraversion_facets: {
        E1_Warmth: facetScores.E1 || null,
        E2_Gregariousness: facetScores.E2 || null,
        E3_Assertiveness: facetScores.E3 || null,
        E4_Activity: facetScores.E4 || null,
        E5_Excitement_Seeking: facetScores.E5 || null,
        E6_Positive_Emotions: facetScores.E6 || null
      },

      // Agreeableness Facets
      agreeableness_facets: {
        A1_Trust: facetScores.A1 || null,
        A2_Straightforwardness: facetScores.A2 || null,
        A3_Altruism: facetScores.A3 || null,
        A4_Compliance: facetScores.A4 || null,
        A5_Modesty: facetScores.A5 || null,
        A6_Tender_Mindedness: facetScores.A6 || null
      },

      // Neuroticism Facets
      neuroticism_facets: {
        N1_Anxiety: facetScores.N1 || null,
        N2_Angry_Hostility: facetScores.N2 || null,
        N3_Depression: facetScores.N3 || null,
        N4_Self_Consciousness: facetScores.N4 || null,
        N5_Impulsiveness: facetScores.N5 || null,
        N6_Vulnerability: facetScores.N6 || null
      }
    };

    // 6. Calculate aggregate Big 5 scores from facets
    const big5Scores = facetMapper.aggregateFacetsToTraits(facetProfile);

    // 7. Generate node correlation mappings
    const nodeCorrelations = await facetMapper.calculateNodeCorrelations(
      responses,
      mappings,
      facetScores
    );

    // 8. Calculate coverage and confidence metrics
    const coverageMetrics = facetScorer.calculateCoverageMetrics(facetScores);

    // 9. Store or update facet profile in database
    const { data: savedProfile, error: saveError } = await supabase.
    from('individual_facet_profiles').
    upsert({
      user_id,
      assessment_id,
      openness_facets: facetProfile.openness_facets,
      conscientiousness_facets: facetProfile.conscientiousness_facets,
      extraversion_facets: facetProfile.extraversion_facets,
      agreeableness_facets: facetProfile.agreeableness_facets,
      neuroticism_facets: facetProfile.neuroticism_facets,
      node_mappings: nodeCorrelations,
      facet_coverage_percentage: coverageMetrics.coverage_percentage,
      confidence_scores: coverageMetrics.confidence_scores,
      assessment_tier: tier,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,assessment_id'
    }).
    select().
    single();

    if (saveError) {
      console.error('Error saving facet profile:', saveError);
      return NextResponse.json(
        { error: 'Failed to save facet profile' },
        { status: 500 }
      );
    }

    // 10. Generate predictions if requested
    let predictions = null;
    if (include_predictions) {
      predictions = await facetMapper.generatePersonalityPredictions(
        facetProfile,
        big5Scores,
        tier
      );
    }

    // 11. Prepare response data
    const responseData = {
      profile_id: savedProfile.id,
      user_id,
      assessment_id,
      tier,

      // Facet-level scores
      facet_profile: facetProfile,

      // Aggregated Big 5 scores
      big5_scores: big5Scores,

      // Node correlation data
      node_correlations: nodeCorrelations,

      // Quality metrics
      coverage_metrics: coverageMetrics,
      validation_results: validationResults,

      // Missing facet coverage (primary focus of this implementation)
      missing_facet_coverage: {
        O2_Aesthetics: facetProfile.openness_facets.O2_Aesthetics,
        O6_Values: facetProfile.openness_facets.O6_Values,
        E2_Gregariousness: facetProfile.extraversion_facets.E2_Gregariousness,
        E5_Excitement_Seeking: facetProfile.extraversion_facets.E5_Excitement_Seeking,
        A3_Altruism: facetProfile.agreeableness_facets.A3_Altruism,
        A4_Compliance: facetProfile.agreeableness_facets.A4_Compliance,
        A6_Tender_Mindedness: facetProfile.agreeableness_facets.A6_Tender_Mindedness,
        N3_Depression: facetProfile.neuroticism_facets.N3_Depression
      },

      // Tier-specific insights
      tier_insights: await facetMapper.generateTierInsights(facetProfile, tier),

      // Predictions (if requested)
      predictions,

      // Metadata
      generated_at: new Date().toISOString(),
      api_version: '2025-07-10.1'
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error('Facet analysis error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error during facet analysis',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const assessment_id = searchParams.get('assessment_id');
    const include_historical = searchParams.get('include_historical') === 'true';

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing required parameter: user_id' },
        { status: 400 }
      );
    }

    let query = supabase.
    from('individual_facet_profiles').
    select(`
        id,
        assessment_id,
        openness_facets,
        conscientiousness_facets,
        extraversion_facets,
        agreeableness_facets,
        neuroticism_facets,
        node_mappings,
        facet_coverage_percentage,
        confidence_scores,
        assessment_tier,
        created_at,
        updated_at,
        assessments (
          id,
          assessment_type,
          completed_at
        )
      `).
    eq('user_id', user_id).
    order('created_at', { ascending: false });

    // Filter by specific assessment if provided
    if (assessment_id) {
      query = query.eq('assessment_id', assessment_id);
    }

    // Limit to most recent if not including historical
    if (!include_historical) {
      query = query.limit(1);
    }

    const { data: profiles, error } = await query;

    if (error) {
      console.error('Error fetching facet profiles:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve facet profiles' },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json(
        { message: 'No facet profiles found for this user' },
        { status: 404 }
      );
    }

    // Process profiles to highlight missing facet coverage
    const processedProfiles = profiles.map((profile) => ({
      ...profile,
      missing_facet_scores: {
        O2_Aesthetics: profile.openness_facets?.O2_Aesthetics || null,
        O6_Values: profile.openness_facets?.O6_Values || null,
        E2_Gregariousness: profile.extraversion_facets?.E2_Gregariousness || null,
        E5_Excitement_Seeking: profile.extraversion_facets?.E5_Excitement_Seeking || null,
        A3_Altruism: profile.agreeableness_facets?.A3_Altruism || null,
        A4_Compliance: profile.agreeableness_facets?.A4_Compliance || null,
        A6_Tender_Mindedness: profile.agreeableness_facets?.A6_Tender_Mindedness || null,
        N3_Depression: profile.neuroticism_facets?.N3_Depression || null
      },
      coverage_summary: {
        total_facets: 30,
        covered_facets: Object.values({
          ...profile.openness_facets,
          ...profile.conscientiousness_facets,
          ...profile.extraversion_facets,
          ...profile.agreeableness_facets,
          ...profile.neuroticism_facets
        }).filter((score) => score !== null).length,
        missing_facets_covered: Object.values({
          O2_Aesthetics: profile.openness_facets?.O2_Aesthetics,
          O6_Values: profile.openness_facets?.O6_Values,
          E2_Gregariousness: profile.extraversion_facets?.E2_Gregariousness,
          E5_Excitement_Seeking: profile.extraversion_facets?.E5_Excitement_Seeking,
          A3_Altruism: profile.agreeableness_facets?.A3_Altruism,
          A4_Compliance: profile.agreeableness_facets?.A4_Compliance,
          A6_Tender_Mindedness: profile.agreeableness_facets?.A6_Tender_Mindedness,
          N3_Depression: profile.neuroticism_facets?.N3_Depression
        }).filter((score) => score !== null).length
      }
    }));

    return NextResponse.json({
      profiles: processedProfiles,
      total_profiles: profiles.length,
      user_id,
      retrieved_at: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error('Facet profile retrieval error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error during facet profile retrieval',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// OPTIONS method for CORS
export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}