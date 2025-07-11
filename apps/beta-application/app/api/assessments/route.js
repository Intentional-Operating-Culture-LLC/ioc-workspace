import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createProtectedRoute,
  validateRequestBody,
  validateQueryParams,
  validateOrganizationAccess,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { AssessmentService, listAssessmentsQuerySchema, createAssessmentSchema } = api.assessments;

// GET /api/assessments - List assessments
export const GET = createProtectedRoute(async (request, context) => {
  const { data: params, error: validationError } = validateQueryParams(request, listAssessmentsQuerySchema);
  if (validationError) return validationError;

  const assessmentService = new AssessmentService(context.supabase);
  const result = await assessmentService.listAssessments({
    ...params,
    userId: params.userId || context.userId
  });

  return NextResponse.json(result);
});

// POST /api/assessments - Create new assessment
export const POST = createProtectedRoute(async (request, context) => {
  const { data: body, error: validationError } = await validateRequestBody(request, createAssessmentSchema);
  if (validationError) return validationError;

  // Check if user has permission to create assessments in the organization
  const { error: accessError } = await validateOrganizationAccess(
    context.supabase,
    context.userId,
    body.organizationId,
    ['owner', 'admin']
  );
  if (accessError) return accessError;

  const assessmentService = new AssessmentService(context.supabase);
  const assessment = await assessmentService.createAssessment(body, context.userId);

  return NextResponse.json({
    assessment,
    message: 'Assessment created successfully'
  }, { status: 201 });
});