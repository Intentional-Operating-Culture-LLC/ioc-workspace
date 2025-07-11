import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createOrganizationRoute,
  validateRequestBody,
  validateQueryParams,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { ReportsService, templateQuerySchema, createTemplateSchema } = api.reports;

// GET /api/reports/templates - Get available report templates
export const GET = createOrganizationRoute(async (request, context) => {
  const { data: params, error: validationError } = validateQueryParams(request, templateQuerySchema);
  if (validationError) return validationError;

  const reportsService = new ReportsService(context.supabase);
  const result = await reportsService.getTemplates({
    templateType: params.template_type,
    targetAudience: params.target_audience,
    isActive: params.is_active !== false
  });

  return NextResponse.json(result);
});

// POST /api/reports/templates - Create new report template
export const POST = createOrganizationRoute(async (request, context) => {
  const { data: body, error: validationError } = await validateRequestBody(request, createTemplateSchema);
  if (validationError) return validationError;

  const reportsService = new ReportsService(context.supabase);
  const result = await reportsService.createTemplate({
    userId: context.userId,
    ...body
  });

  return NextResponse.json(result);
});