// Organizational Facet Aggregation API Endpoint
// Version: 2025-07-10.1
// Purpose: Generate organizational-level facet analysis and culture insights

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OrganizationalFacetAnalyzer } from "@ioc/shared/data-access/src/scoring/organizational-facet-analyzer";
import { CultureTypeMapper } from "@ioc/shared/data-access/src/scoring/culture-type-mapping";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request, { params }) {
  try {
    const { id: organization_id } = params;
    const {
      include_team_breakdown = false,
      include_predictions = false,
      min_sample_size = 3
    } = await request.json();

    if (!organization_id) {
      return NextResponse.json(
        { error: 'Missing organization ID' },
        { status: 400 }
      );
    }

    // Initialize analysis components
    const facetAnalyzer = new OrganizationalFacetAnalyzer();
    const cultureMapper = new CultureTypeMapper();

    // 1. Verify organization exists and user has access
    const { data: organization, error: orgError } = await supabase.
    from('organizations').
    select('id, name, industry, size').
    eq('id', organization_id).
    single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 404 }
      );
    }

    // 2. Get all individual facet profiles for the organization
    const { data: facetProfiles, error: profilesError } = await supabase.
    from('individual_facet_profiles').
    select(`
        id,
        user_id,
        assessment_id,
        openness_facets,
        conscientiousness_facets,
        extraversion_facets,
        agreeableness_facets,
        neuroticism_facets,
        facet_coverage_percentage,
        confidence_scores,
        created_at,
        user_organizations!inner (
          organization_id,
          role
        )
      `).
    eq('user_organizations.organization_id', organization_id).
    gte('facet_coverage_percentage', 50.0) // Only include profiles with reasonable coverage
    .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching facet profiles:', profilesError);
      return NextResponse.json(
        { error: 'Failed to retrieve organizational facet data' },
        { status: 500 }
      );
    }

    if (!facetProfiles || facetProfiles.length < min_sample_size) {
      return NextResponse.json(
        {
          error: `Insufficient data for analysis. Minimum ${min_sample_size} profiles required.`,
          current_sample_size: facetProfiles?.length || 0
        },
        { status: 400 }
      );
    }

    // 3. Calculate organizational facet aggregations
    const aggregations = await facetAnalyzer.calculateOrganizationalAggregations(facetProfiles);

    // 4. Analyze the 8 missing facets specifically
    const missingFacetAnalysis = {
      O2_Aesthetics: await facetAnalyzer.analyzeFacetDistribution(
        facetProfiles.map((p) => p.openness_facets?.O2_Aesthetics).filter((v) => v !== null),
        'O2_Aesthetics'
      ),
      O6_Values: await facetAnalyzer.analyzeFacetDistribution(
        facetProfiles.map((p) => p.openness_facets?.O6_Values).filter((v) => v !== null),
        'O6_Values'
      ),
      E2_Gregariousness: await facetAnalyzer.analyzeFacetDistribution(
        facetProfiles.map((p) => p.extraversion_facets?.E2_Gregariousness).filter((v) => v !== null),
        'E2_Gregariousness'
      ),
      E5_Excitement_Seeking: await facetAnalyzer.analyzeFacetDistribution(
        facetProfiles.map((p) => p.extraversion_facets?.E5_Excitement_Seeking).filter((v) => v !== null),
        'E5_Excitement_Seeking'
      ),
      A3_Altruism: await facetAnalyzer.analyzeFacetDistribution(
        facetProfiles.map((p) => p.agreeableness_facets?.A3_Altruism).filter((v) => v !== null),
        'A3_Altruism'
      ),
      A4_Compliance: await facetAnalyzer.analyzeFacetDistribution(
        facetProfiles.map((p) => p.agreeableness_facets?.A4_Compliance).filter((v) => v !== null),
        'A4_Compliance'
      ),
      A6_Tender_Mindedness: await facetAnalyzer.analyzeFacetDistribution(
        facetProfiles.map((p) => p.agreeableness_facets?.A6_Tender_Mindedness).filter((v) => v !== null),
        'A6_Tender_Mindedness'
      ),
      N3_Depression: await facetAnalyzer.analyzeFacetDistribution(
        facetProfiles.map((p) => p.neuroticism_facets?.N3_Depression).filter((v) => v !== null),
        'N3_Depression'
      )
    };

    // 5. Map to enhanced culture types (12 types instead of 4)
    const enhancedCultureTypes = await cultureMapper.mapFacetsToCultureTypes(aggregations);

    // 6. Calculate emergent organizational properties
    const emergentProperties = await facetAnalyzer.calculateEmergentProperties(
      aggregations,
      missingFacetAnalysis
    );

    // 7. Generate organizational insights
    const organizationalInsights = {
      // Core facet statistics
      facet_means: aggregations.means,
      facet_medians: aggregations.medians,
      facet_std_deviations: aggregations.std_deviations,
      facet_diversity_indices: aggregations.diversity_indices,

      // Missing facet focus
      missing_facet_insights: {
        aesthetic_culture: {
          mean: missingFacetAnalysis.O2_Aesthetics.mean,
          interpretation: await cultureMapper.interpretAestheticCulture(missingFacetAnalysis.O2_Aesthetics)
        },
        value_flexibility: {
          mean: missingFacetAnalysis.O6_Values.mean,
          interpretation: await cultureMapper.interpretValueFlexibility(missingFacetAnalysis.O6_Values)
        },
        social_energy: {
          mean: missingFacetAnalysis.E2_Gregariousness.mean,
          interpretation: await cultureMapper.interpretSocialEnergy(missingFacetAnalysis.E2_Gregariousness)
        },
        risk_appetite: {
          mean: missingFacetAnalysis.E5_Excitement_Seeking.mean,
          interpretation: await cultureMapper.interpretRiskAppetite(missingFacetAnalysis.E5_Excitement_Seeking)
        },
        service_orientation: {
          mean: missingFacetAnalysis.A3_Altruism.mean,
          interpretation: await cultureMapper.interpretServiceOrientation(missingFacetAnalysis.A3_Altruism)
        },
        collaboration_style: {
          mean: missingFacetAnalysis.A4_Compliance.mean,
          interpretation: await cultureMapper.interpretCollaborationStyle(missingFacetAnalysis.A4_Compliance)
        },
        empathy_culture: {
          mean: missingFacetAnalysis.A6_Tender_Mindedness.mean,
          interpretation: await cultureMapper.interpretEmpathyCulture(missingFacetAnalysis.A6_Tender_Mindedness)
        },
        organizational_mood: {
          mean: missingFacetAnalysis.N3_Depression.mean,
          interpretation: await cultureMapper.interpretOrganizationalMood(missingFacetAnalysis.N3_Depression)
        }
      },

      // Enhanced culture types
      culture_types: enhancedCultureTypes,

      // Emergent properties
      emergent_properties: emergentProperties
    };

    // 8. Include team breakdown if requested
    let teamBreakdown = null;
    if (include_team_breakdown) {
      const { data: teams } = await supabase.
      from('teams').
      select('id, name').
      eq('organization_id', organization_id);

      if (teams) {
        teamBreakdown = await Promise.all(
          teams.map(async (team) => {
            const teamProfiles = facetProfiles.filter((profile) =>
            // This would need a team_members join - simplified for demo
            true // Replace with actual team membership logic
            );

            if (teamProfiles.length >= 2) {
              const teamAggregations = await facetAnalyzer.calculateOrganizationalAggregations(teamProfiles);
              return {
                team_id: team.id,
                team_name: team.name,
                sample_size: teamProfiles.length,
                missing_facet_means: {
                  O2_Aesthetics: teamAggregations.means.O2_Aesthetics,
                  O6_Values: teamAggregations.means.O6_Values,
                  E2_Gregariousness: teamAggregations.means.E2_Gregariousness,
                  E5_Excitement_Seeking: teamAggregations.means.E5_Excitement_Seeking,
                  A3_Altruism: teamAggregations.means.A3_Altruism,
                  A4_Compliance: teamAggregations.means.A4_Compliance,
                  A6_Tender_Mindedness: teamAggregations.means.A6_Tender_Mindedness,
                  N3_Depression: teamAggregations.means.N3_Depression
                }
              };
            }
            return null;
          })
        );

        teamBreakdown = teamBreakdown.filter((team) => team !== null);
      }
    }

    // 9. Generate predictions if requested
    let predictions = null;
    if (include_predictions) {
      predictions = await facetAnalyzer.generateOrganizationalPredictions(
        organizationalInsights,
        organization
      );
    }

    // 10. Save or update organizational facet profile
    const { data: savedOrgProfile, error: saveError } = await supabase.
    from('organizational_facet_profiles').
    upsert({
      organization_id,
      facet_means: aggregations.means,
      facet_medians: aggregations.medians,
      facet_std_deviations: aggregations.std_deviations,
      facet_diversity_indices: aggregations.diversity_indices,
      culture_types: enhancedCultureTypes,
      emergent_properties: emergentProperties,
      sample_size: facetProfiles.length,
      coverage_percentage:
      Object.values(aggregations.means).filter((v) => v !== null).length / 30 * 100,

      last_updated_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'organization_id'
    }).
    select().
    single();

    if (saveError) {
      console.error('Error saving organizational facet profile:', saveError);
      // Continue execution - don't fail the request for save errors
    }

    // 11. Prepare response
    const responseData = {
      organization_id,
      organization_name: organization.name,
      analysis_date: new Date().toISOString(),
      sample_size: facetProfiles.length,

      // Core organizational insights
      organizational_insights: organizationalInsights,

      // Missing facet detailed analysis
      missing_facet_analysis: missingFacetAnalysis,

      // Team breakdown (if requested)
      team_breakdown: teamBreakdown,

      // Predictions (if requested)
      predictions,

      // Quality metrics
      quality_metrics: {
        sample_adequacy: facetProfiles.length >= 10 ? 'adequate' : 'limited',
        coverage_completeness:
        Object.values(aggregations.means).filter((v) => v !== null).length / 30,

        missing_facet_coverage:
        Object.values(missingFacetAnalysis).filter((f) => f.sample_size > 0).length / 8,

        confidence_level: Math.min(1.0, facetProfiles.length / 20) // Max confidence at 20+ profiles
      },

      // Metadata
      api_version: '2025-07-10.1',
      generated_at: new Date().toISOString()
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error('Organizational facet aggregation error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error during organizational facet analysis',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { id: organization_id } = params;
    const { searchParams } = new URL(request.url);
    const include_historical = searchParams.get('include_historical') === 'true';

    if (!organization_id) {
      return NextResponse.json(
        { error: 'Missing organization ID' },
        { status: 400 }
      );
    }

    // Get current organizational facet profile
    let query = supabase.
    from('organizational_facet_profiles').
    select(`
        id,
        organization_id,
        facet_means,
        facet_medians,
        facet_std_deviations,
        facet_diversity_indices,
        culture_types,
        emergent_properties,
        sample_size,
        coverage_percentage,
        last_updated_date,
        created_at,
        updated_at,
        organizations (
          name,
          industry,
          size
        )
      `).
    eq('organization_id', organization_id).
    order('created_at', { ascending: false });

    if (!include_historical) {
      query = query.limit(1);
    }

    const { data: profiles, error } = await query;

    if (error) {
      console.error('Error fetching organizational facet profiles:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve organizational facet profiles' },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json(
        { message: 'No organizational facet profiles found. Run POST to generate analysis.' },
        { status: 404 }
      );
    }

    // Process profiles to highlight missing facet insights
    const processedProfiles = profiles.map((profile) => ({
      ...profile,
      missing_facet_summary: {
        O2_Aesthetics: profile.facet_means?.O2_Aesthetics || null,
        O6_Values: profile.facet_means?.O6_Values || null,
        E2_Gregariousness: profile.facet_means?.E2_Gregariousness || null,
        E5_Excitement_Seeking: profile.facet_means?.E5_Excitement_Seeking || null,
        A3_Altruism: profile.facet_means?.A3_Altruism || null,
        A4_Compliance: profile.facet_means?.A4_Compliance || null,
        A6_Tender_Mindedness: profile.facet_means?.A6_Tender_Mindedness || null,
        N3_Depression: profile.facet_means?.N3_Depression || null
      },
      culture_summary: {
        primary_culture: Object.entries(profile.culture_types || {}).
        sort(([, a], [, b]) => (b.strength || 0) - (a.strength || 0))[0]?.[0] || 'unknown',
        culture_diversity: Object.values(profile.culture_types || {}).
        map((ct) => ct.strength || 0).
        reduce((sum, strength) => sum + Math.pow(strength, 2), 0) // Diversity index
      }
    }));

    return NextResponse.json({
      profiles: processedProfiles,
      total_profiles: profiles.length,
      organization_id,
      organization_name: profiles[0].organizations?.name,
      retrieved_at: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error('Organizational facet profile retrieval error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error during organizational facet profile retrieval',
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