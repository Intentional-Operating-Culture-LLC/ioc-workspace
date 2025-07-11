import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createOrganizationRoute,
  validateQueryParams,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { DashboardService, dashboardSummaryQuerySchema } = api.dashboard;

// GET /api/dashboard/summary - Get dashboard summary
export const GET = createOrganizationRoute(async (request, context) => {
  const { data: params, error: validationError } = validateQueryParams(request, dashboardSummaryQuerySchema);
  if (validationError) return validationError;

  const dashboardService = new DashboardService(context.supabase);
  const result = await dashboardService.getSummary({
    organizationId: context.organizationId,
    periodDays: params.period_days || 7
  });

  return NextResponse.json(result);
});