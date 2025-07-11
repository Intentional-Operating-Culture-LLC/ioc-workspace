import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createOrganizationRoute,
  validateQueryParams,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { DashboardService, trendAnalysisQuerySchema } = api.dashboard;

// GET /api/dashboard/trends - Get metric trends analysis
export const GET = createOrganizationRoute(async (request, context) => {
  const { data: params, error: validationError } = validateQueryParams(request, trendAnalysisQuerySchema);
  if (validationError) return validationError;

  const dashboardService = new DashboardService(context.supabase);
  const result = await dashboardService.getTrends({
    organizationId: context.organizationId,
    metricType: params.metric_type,
    metricName: params.metric_name,
    periods: params.periods || 4
  });

  return NextResponse.json(result);
});