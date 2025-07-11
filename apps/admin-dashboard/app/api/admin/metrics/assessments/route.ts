import { NextRequest, NextResponse } from 'next/server';

// Note: DashboardService would be imported from @ioc/lib in production
// For now, using mock data for standalone deployment

// GET /api/admin/metrics/assessments - Get comprehensive assessment metrics
export async function GET(request: NextRequest) {
  try {
    // For demo purposes, return mock data
    // In production, this would connect to your Supabase instance and DashboardService
    
    const mockMetrics = {
      totalAssessments: 1247,
      activeAssessments: 89,
      completedAssessments: 1158,
      completionRate: 87.3,
      averageCompletionTime: 34,
      participationRate: 92.1,
      avgScore: 78.5,
      improvement: 12.3,
      dailyCompletions: [
        { date: '2025-01-01', count: 45 },
        { date: '2025-01-02', count: 52 },
        { date: '2025-01-03', count: 41 },
        { date: '2025-01-04', count: 38 },
        { date: '2025-01-05', count: 49 },
        { date: '2025-01-06', count: 55 },
        { date: '2025-01-07', count: 62 },
        { date: '2025-01-08', count: 48 },
        { date: '2025-01-09', count: 51 },
        { date: '2025-01-10', count: 59 },
      ],
      tierDistribution: [
        { tier: 'Individual', count: 687, percentage: 59.3 },
        { tier: 'Executive', count: 312, percentage: 27.0 },
        { tier: 'Organizational', count: 159, percentage: 13.7 },
      ],
      oceanMetrics: {
        totalFacetsAnalyzed: 37410, // 30 facets * 1247 assessments
        avgConfidenceScore: 0.91,
        darkSideDetections: 23,
      },
    };

    // Simulate real-time variation
    const now = Date.now();
    const variation = Math.sin(now / 10000) * 0.1; // Small random variation
    
    mockMetrics.activeAssessments += Math.floor(variation * 10);
    mockMetrics.completionRate += variation * 2;
    mockMetrics.avgScore += variation * 3;

    return NextResponse.json(mockMetrics);
  } catch (error) {
    console.error('Error fetching assessment metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assessment metrics' },
      { status: 500 }
    );
  }
}

// POST /api/admin/metrics/assessments - Trigger metric recalculation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, metricType, forceRefresh } = body;

    // In production, this would trigger a background job to recalculate metrics
    // For now, return success
    
    return NextResponse.json({ 
      success: true, 
      message: 'Metric recalculation triggered',
      jobId: `job_${Date.now()}`,
    });
  } catch (error) {
    console.error('Error triggering metric recalculation:', error);
    return NextResponse.json(
      { error: 'Failed to trigger metric recalculation' },
      { status: 500 }
    );
  }
}