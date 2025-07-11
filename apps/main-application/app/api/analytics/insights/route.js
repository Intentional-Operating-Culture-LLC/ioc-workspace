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

    // Build query with filters
    let query = supabase.
    from('assessment_responses').
    select(`
        *,
        assessments!inner(
          id,
          title,
          type,
          organization_id,
          created_at
        )
      `).
    eq('assessments.organization_id', organizationId).
    eq('status', 'submitted');

    // Apply date range filter
    if (filters?.dateRange) {
      query = query.
      gte('created_at', filters.dateRange.start).
      lte('created_at', filters.dateRange.end);
    }

    // Apply assessment type filter
    if (filters?.assessmentType && filters.assessmentType !== 'all') {
      query = query.eq('assessments.type', filters.assessmentType);
    }

    const { data: responses, error } = await query;

    if (error) {
      throw error;
    }

    // Calculate OCEAN scores (mock data for now)
    const oceanScores = {
      openness: 78.5,
      conscientiousness: 82.3,
      extraversion: 75.8,
      agreeableness: 79.2,
      neuroticism: 65.4
    };

    // Calculate analytics metrics
    const totalAssessments = responses?.length || 0;
    const uniqueParticipants = new Set(responses?.map((r) => r.user_id)).size;

    // Calculate average completion time (mock)
    const avgCompletionTime = 12.5; // minutes

    // Calculate engagement rate
    const { count: totalUsers } = await supabase.
    from('user_organizations').
    select('*', { count: 'exact', head: true }).
    eq('organization_id', organizationId);

    const engagementRate = totalUsers > 0 ?
    Math.round(uniqueParticipants / totalUsers * 100) :
    0;

    // Mock data for other metrics
    const repeatRate = 42.3;
    const industryRank = 3;
    const predictiveAccuracy = 94.7;

    const analytics = {
      oceanScores,
      totalAssessments,
      uniqueParticipants,
      avgCompletionTime,
      engagementRate,
      repeatRate,
      industryRank,
      predictiveAccuracy
    };

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error('Error fetching analytics insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics insights' },
      { status: 500 }
    );
  }
}