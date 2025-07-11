import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from "@ioc/shared/data-access/supabase";

export async function POST(request) {
  try {
    const supabase = await createRouteHandlerClient();
    const { organizationId, filters } = await request.json();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to organization
    const { data: userOrg } = await supabase.
    from('user_organizations').
    select('role').
    eq('user_id', user.id).
    eq('organization_id', organizationId).
    single();

    if (!userOrg) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch OCEAN assessment results
    let query = supabase.
    from('assessment_results').
    select(`
        ocean_scores,
        created_at,
        assessment_responses!inner(
          assessments!inner(organization_id, type)
        )
      `).
    eq('assessment_responses.assessments.organization_id', organizationId).
    eq('assessment_responses.assessments.type', 'ocean');

    // Apply filters
    if (filters?.dateRange) {
      query = query.
      gte('created_at', filters.dateRange.start).
      lte('created_at', filters.dateRange.end);
    }

    const { data: results, error } = await query;

    if (error) {
      console.error('Error fetching OCEAN data:', error);
      // Return mock data for now
      const mockData = [{
        openness: 78.5 + Math.random() * 10 - 5,
        conscientiousness: 82.3 + Math.random() * 10 - 5,
        extraversion: 75.8 + Math.random() * 10 - 5,
        agreeableness: 79.2 + Math.random() * 10 - 5,
        neuroticism: 65.4 + Math.random() * 10 - 5
      }];

      return NextResponse.json({ data: mockData });
    }

    // Calculate average OCEAN scores
    if (results && results.length > 0) {
      const avgScores = results.reduce((acc, result) => {
        if (result.ocean_scores) {
          Object.keys(result.ocean_scores).forEach((trait) => {
            acc[trait] = (acc[trait] || 0) + result.ocean_scores[trait];
          });
        }
        return acc;
      }, {});

      Object.keys(avgScores).forEach((trait) => {
        avgScores[trait] = Math.round(avgScores[trait] / results.length);
      });

      return NextResponse.json({ data: [avgScores] });
    }

    // Return mock data if no results
    const mockData = [{
      openness: 78.5,
      conscientiousness: 82.3,
      extraversion: 75.8,
      agreeableness: 79.2,
      neuroticism: 65.4
    }];

    return NextResponse.json({ data: mockData });
  } catch (error) {
    console.error('Error in OCEAN distribution API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OCEAN distribution' },
      { status: 500 }
    );
  }
}