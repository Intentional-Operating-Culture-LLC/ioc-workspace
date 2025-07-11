import { NextResponse } from 'next/server';
import { createClient } from "@ioc/shared/data-access";

export async function GET() {
  try {
    // Test environment variables
    const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'];


    const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missingEnvVars.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing environment variables: ${missingEnvVars.join(', ')}`,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Test database connection
    const supabase = await createServerClient();

    // Simple query to test connection
    const { data, error } = await supabase.
    from('revenue_metrics').
    select('count').
    limit(1);

    if (error) {
      return NextResponse.json({
        success: false,
        error: `Database connection failed: ${error.message}`,
        details: error,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Test successful - return connection status
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      environment: {
        nodeEnv: process.env.NODE_ENV,
        appName: process.env.NEXT_PUBLIC_APP_NAME,
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      database: {
        connected: true,
        queryResult: data !== null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Environment test failed:', error);

    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = await createServerClient();

    // Test inserting sample data
    const testData = {
      metric_date: new Date().toISOString().split('T')[0],
      current_revenue: 1000.00,
      target_revenue: 1200.00,
      growth_rate: 5.0,
      trend: 'up'
    };

    const { data, error } = await supabase.
    from('revenue_metrics').
    insert(testData).
    select();

    if (error) {
      return NextResponse.json({
        success: false,
        error: `Insert test failed: ${error.message}`,
        details: error,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Insert test successful',
      data: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Insert test failed:', error);

    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}