import { createClient } from "@ioc/shared/data-access";
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Verify this is a Vercel cron request
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV,
      checks: {
        database: false,
        auth: false
      }
    };

    // Test database connection
    try {
      const supabase = await createServerClient();
      const { data, error } = await supabase.
      from('users').
      select('count').
      limit(1);

      health.checks.database = !error;
    } catch (error) {
      console.error('Database health check failed:', error);
      health.checks.database = false;
    }

    // Test auth service
    try {
      const supabase = await createServerClient();
      const { data, error } = await supabase.auth.getSession();
      health.checks.auth = true; // If we can call auth methods, service is up
    } catch (error) {
      console.error('Auth health check failed:', error);
      health.checks.auth = false;
    }

    // Determine overall health
    const isHealthy = Object.values(health.checks).every((check) => check === true);
    health.status = isHealthy ? 'healthy' : 'degraded';

    // Log health status
    console.log('Health check completed:', health);

    return NextResponse.json(health, {
      status: isHealthy ? 200 : 503
    });
  } catch (error) {
    console.error('Health check error:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      },
      { status: 500 }
    );
  }
}

// For manual health checks
export async function POST(request) {
  return GET(request);
}