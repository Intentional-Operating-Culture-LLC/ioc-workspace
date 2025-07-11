import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from "@ioc/shared/data-access/supabase";

export async function POST(request) {
  try {
    const supabase = await createRouteHandlerClient();
    const { organizationId } = await request.json();

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

    // Fetch operational metrics
    // These would typically come from monitoring systems, for now using mock data
    const metrics = {
      systemUptime: 99.95,
      responseTime: 142, // milliseconds
      errorRate: 0.02, // percentage
      throughput: 1325, // requests per second
      activeProcesses: 14,
      queueDepth: 5,
      dataProcessed: 15420, // MB
      anonymizationCompliance: 100 // percentage
    };

    // Get recent error logs
    const { data: errorLogs } = await supabase.
    from('system_logs').
    select('level, message, created_at').
    eq('organization_id', organizationId).
    eq('level', 'error').
    gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).
    order('created_at', { ascending: false }).
    limit(10);

    // Calculate error trends
    const errorTrend = errorLogs?.length > 0 ?
    Math.round(errorLogs.length / 1000 * 100) / 100 :
    0.02;

    metrics.errorRate = errorTrend;

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error fetching operational metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch operational metrics' },
      { status: 500 }
    );
  }
}