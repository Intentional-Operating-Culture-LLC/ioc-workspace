import { NextResponse } from 'next/server';
import { createClient } from "@ioc/shared/data-access";

export async function GET() {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.NEXT_PUBLIC_APP_VERSION || '3.1.1',
    uptime: process.uptime(),
    checks: {}
  };

  try {
    // Check environment variables
    const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'];


    const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    healthCheck.checks.environment = {
      status: missingEnvVars.length === 0 ? 'healthy' : 'unhealthy',
      message: missingEnvVars.length === 0 ?
      'All required environment variables are set' :
      `Missing variables: ${missingEnvVars.join(', ')}`,
      details: {
        required: requiredEnvVars.length,
        missing: missingEnvVars.length,
        missingVars: missingEnvVars
      }
    };

    // Check database connection
    try {
      const supabase = await createServerClient();
      const { data, error } = await supabase.
      from('revenue_metrics').
      select('count').
      limit(1);

      healthCheck.checks.database = {
        status: error ? 'unhealthy' : 'healthy',
        message: error ? `Connection failed: ${error.message}` : 'Database connection successful',
        details: error ? { error: error.message } : { connected: true }
      };
    } catch (dbError) {
      healthCheck.checks.database = {
        status: 'unhealthy',
        message: `Database check failed: ${dbError.message}`,
        details: { error: dbError.message }
      };
    }

    // Check API endpoint accessibility
    healthCheck.checks.api = {
      status: 'healthy',
      message: 'API endpoint is accessible',
      details: {
        endpoint: '/api/health',
        method: 'GET',
        timestamp: new Date().toISOString()
      }
    };

    // Determine overall health
    const allChecksHealthy = Object.values(healthCheck.checks).every((check) => check.status === 'healthy');
    healthCheck.status = allChecksHealthy ? 'healthy' : 'unhealthy';

    const statusCode = allChecksHealthy ? 200 : 503;

    return NextResponse.json(healthCheck, { status: statusCode });

  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      checks: healthCheck.checks
    }, { status: 503 });
  }
}