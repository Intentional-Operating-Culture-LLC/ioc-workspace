import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createOrganizationRoute,
  validateRequestBody,
  validateQueryParams,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { AnalyticsService, analyticsQuerySchema, trackEventSchema } = api.analytics;

// GET /api/analytics - Get analytics data
export const GET = createOrganizationRoute(async (request, context) => {
  const { data: params, error: validationError } = validateQueryParams(request, analyticsQuerySchema);
  if (validationError) return validationError;

  const analyticsService = new AnalyticsService(context.supabase);
  const result = await analyticsService.getAnalytics({
    organizationId: context.organizationId,
    ...params
  });

  return NextResponse.json(result);
});

// POST /api/analytics - Track analytics event
export const POST = createOrganizationRoute(async (request, context) => {
  const { data: body, error: validationError } = await validateRequestBody(request, trackEventSchema);
  if (validationError) return validationError;

  const analyticsService = new AnalyticsService(context.supabase);
  const result = await analyticsService.trackEvent(
    {
      ...body,
      organizationId: body.organization_id || context.organizationId
    },
    context.userId
  );

  return NextResponse.json(result);
});