import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createOrganizationRoute,
  validateRequestBody,
  validateQueryParams,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { DashboardService, dashboardMetricsQuerySchema, updateMetricSchema } = api.dashboard;

// GET /api/dashboard/metrics - Get dashboard metrics
export const GET = createOrganizationRoute(async (request, context) => {
  const { data: params, error: validationError } = validateQueryParams(request, dashboardMetricsQuerySchema);
  if (validationError) return validationError;

  const dashboardService = new DashboardService(context.supabase);
  const result = await dashboardService.getMetrics({
    organizationId: context.organizationId,
    ...params
  });

  return NextResponse.json(result);
});

// POST /api/dashboard/metrics - Create or update dashboard metric
export const POST = createOrganizationRoute(async (request, context) => {
  const { data: body, error: validationError } = await validateRequestBody(request, updateMetricSchema);
  if (validationError) return validationError;

  const dashboardService = new DashboardService(context.supabase);
  const result = await dashboardService.updateMetric({
    organizationId: context.organizationId,
    ...body
  });

  return NextResponse.json(result);
});

// PUT /api/dashboard/metrics - Calculate metrics for organization
export const PUT = createOrganizationRoute(async (request, context) => {
  const { data: body, error: validationError } = await validateRequestBody(request, {
    metric_type: { type: 'string', required: false },
    period_start: { type: 'string', required: false },
    period_end: { type: 'string', required: false }
  });
  if (validationError) return validationError;

  const dashboardService = new DashboardService(context.supabase);
  const result = await dashboardService.calculateMetrics({
    organizationId: context.organizationId,
    metricType: body.metric_type,
    periodStart: body.period_start,
    periodEnd: body.period_end
  });

  return NextResponse.json(result);
});