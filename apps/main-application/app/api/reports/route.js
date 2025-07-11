import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createOrganizationRoute,
  validateRequestBody,
  validateQueryParams,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { ReportsService, reportsQuerySchema, createReportSchema } = api.reports;

// GET /api/reports - Get reports for organization
export const GET = createOrganizationRoute(async (request, context) => {
  const { data: params, error: validationError } = validateQueryParams(request, reportsQuerySchema);
  if (validationError) return validationError;

  const reportsService = new ReportsService(context.supabase);
  const result = await reportsService.getReports({
    organizationId: context.organizationId,
    ...params
  });

  return NextResponse.json(result);
});

// POST /api/reports - Create new report
export const POST = createOrganizationRoute(async (request, context) => {
  const { data: body, error: validationError } = await validateRequestBody(request, createReportSchema);
  if (validationError) return validationError;

  const reportsService = new ReportsService(context.supabase);
  const result = await reportsService.createReport({
    organizationId: context.organizationId,
    userId: context.userId,
    ...body
  });

  return NextResponse.json(result);
});