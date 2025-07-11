import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createOrganizationRoute,
  validateRequestBody,
  validateQueryParams,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { SystemService, jobQuerySchema, executeJobSchema } = api.system;

// GET /api/system/jobs - Get scheduled job status and logs
export const GET = createOrganizationRoute(async (request, context) => {
  const { data: params, error: validationError } = validateQueryParams(request, jobQuerySchema);
  if (validationError) return validationError;

  const systemService = new SystemService(context.supabase);
  const result = await systemService.getJobStatus({
    jobName: params.job_name,
    jobType: params.job_type,
    status: params.status,
    limit: params.limit || 50
  });

  return NextResponse.json(result);
});

// POST /api/system/jobs - Execute job manually
export const POST = createOrganizationRoute(async (request, context) => {
  const { data: body, error: validationError } = await validateRequestBody(request, executeJobSchema);
  if (validationError) return validationError;

  const systemService = new SystemService(context.supabase);
  const result = await systemService.executeJob({
    jobName: body.job_name,
    parameters: body.parameters || {}
  });

  return NextResponse.json(result);
});