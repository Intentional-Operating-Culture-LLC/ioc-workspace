import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createOrganizationRoute,
  validateRequestBody,
  validateQueryParams,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { DashboardService, activityQuerySchema, trackActivitySchema } = api.dashboard;

// GET /api/dashboard/activity - Get user activity data
export const GET = createOrganizationRoute(async (request, context) => {
  const { data: params, error: validationError } = validateQueryParams(request, activityQuerySchema);
  if (validationError) return validationError;

  const dashboardService = new DashboardService(context.supabase);
  const result = await dashboardService.getActivity({
    organizationId: context.organizationId,
    userId: params.user_id,
    activityType: params.activity_type,
    periodStart: params.period_start,
    periodEnd: params.period_end,
    limit: params.limit || 50
  });

  return NextResponse.json(result);
});

// POST /api/dashboard/activity - Track user activity
export const POST = createOrganizationRoute(async (request, context) => {
  const { data: body, error: validationError } = await validateRequestBody(request, trackActivitySchema);
  if (validationError) return validationError;

  const dashboardService = new DashboardService(context.supabase);
  const result = await dashboardService.trackActivity({
    userId: context.userId,
    organizationId: context.organizationId,
    ...body
  });

  return NextResponse.json(result);
});