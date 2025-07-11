import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createOrganizationRoute,
  validateQueryParams,
  validateRequestBody,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { DashboardService, aggregationsQuerySchema } = api.dashboard;

// GET /api/dashboard/aggregations - Get assessment aggregations
export const GET = createOrganizationRoute(async (request, context) => {
  const { data: params, error: validationError } = validateQueryParams(request, aggregationsQuerySchema);
  if (validationError) return validationError;

  const dashboardService = new DashboardService(context.supabase);
  const result = await dashboardService.getAggregations({
    organizationId: context.organizationId,
    ...params
  });

  return NextResponse.json(result);
});

// POST /api/dashboard/aggregations - Generate new aggregations
export const POST = createOrganizationRoute(async (request, context) => {
  const { data: body, error: validationError } = await validateRequestBody(request, {
    period_start: { type: 'string', required: false },
    period_end: { type: 'string', required: false }
  });
  if (validationError) return validationError;

  const dashboardService = new DashboardService(context.supabase);
  const result = await dashboardService.generateAggregations({
    organizationId: context.organizationId,
    periodStart: body.period_start,
    periodEnd: body.period_end
  });

  return NextResponse.json(result);
});