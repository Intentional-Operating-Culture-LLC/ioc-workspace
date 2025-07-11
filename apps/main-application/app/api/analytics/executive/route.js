import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from "@ioc/shared/data-access/supabase";

export async function POST(request) {
  try {
    const supabase = await createRouteHandlerClient();
    const { organizationId, dateRange } = await request.json();

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

    // Fetch executive metrics
    const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange?.end || new Date();

    // Get assessment metrics
    const { count: totalAssessments } = await supabase.
    from('assessments').
    select('*', { count: 'exact', head: true }).
    eq('organization_id', organizationId).
    gte('created_at', startDate.toISOString()).
    lte('created_at', endDate.toISOString());

    // Get completion metrics
    const { data: responses } = await supabase.
    from('assessment_responses').
    select('status, assessments!inner(organization_id)').
    eq('assessments.organization_id', organizationId).
    gte('created_at', startDate.toISOString()).
    lte('created_at', endDate.toISOString());

    const completedResponses = responses?.filter((r) => r.status === 'submitted').length || 0;
    const totalResponses = responses?.length || 0;
    const completionRate = totalResponses > 0 ?
    Math.round(completedResponses / totalResponses * 100) :
    0;

    // Get active users
    const { count: activeUsers } = await supabase.
    from('analytics_events').
    select('user_id', { count: 'exact', head: true }).
    eq('organization_id', organizationId).
    gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).
    not('user_id', 'is', null);

    // Calculate average score (mock data for now)
    const avgScore = 78.5;

    // AI accuracy metrics (mock data)
    const aiAccuracy = 96.3;
    const dataQuality = 98.7;

    const metrics = {
      totalAssessments: totalAssessments || 0,
      completionRate,
      avgScore,
      activeUsers: activeUsers || 0,
      aiAccuracy,
      dataQuality
    };

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error fetching executive metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch executive metrics' },
      { status: 500 }
    );
  }
}