import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createOrganizationRoute,
  validateRequestBody,
  validateQueryParams,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { SystemService, performanceQuerySchema, recordMetricSchema } = api.system;

// GET /api/system/performance - Get system performance metrics
export const GET = createOrganizationRoute(async (request, context) => {
  const { data: params, error: validationError } = validateQueryParams(request, performanceQuerySchema);
  if (validationError) return validationError;

  const systemService = new SystemService(context.supabase);
  const result = await systemService.getPerformanceMetrics({
    metricType: params.metric_type,
    serviceName: params.service_name,
    periodStart: params.period_start,
    periodEnd: params.period_end,
    limit: params.limit || 100
  });

  return NextResponse.json(result);
});

// POST /api/system/performance - Record performance metric
export const POST = createOrganizationRoute(async (request, context) => {
  const { data: body, error: validationError } = await validateRequestBody(request, recordMetricSchema);
  if (validationError) return validationError;

  const systemService = new SystemService(context.supabase);
  const result = await systemService.recordPerformanceMetric({
    ...body
  });

  return NextResponse.json(result);
});