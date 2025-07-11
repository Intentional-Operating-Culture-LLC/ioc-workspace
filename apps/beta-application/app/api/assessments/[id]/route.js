import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createProtectedRoute,
  validateRequestBody,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { AssessmentService, updateAssessmentSchema } = api.assessments;

// GET /api/assessments/[id] - Get single assessment
export const GET = createProtectedRoute(async (request, context) => {
  const assessmentId = context.params.id;

  const assessmentService = new AssessmentService(context.supabase);
  const assessment = await assessmentService.getAssessment(assessmentId, context.userId);

  return NextResponse.json({ assessment });
});

// PUT /api/assessments/[id] - Update assessment
export const PUT = createProtectedRoute(async (request, context) => {
  const assessmentId = context.params.id;
  const { data: body, error: validationError } = await validateRequestBody(request, updateAssessmentSchema);
  if (validationError) return validationError;

  const assessmentService = new AssessmentService(context.supabase);
  const updated = await assessmentService.updateAssessment(assessmentId, body, context.userId);

  return NextResponse.json({
    assessment: updated,
    message: 'Assessment updated successfully'
  });
});

// DELETE /api/assessments/[id] - Delete assessment
export const DELETE = createProtectedRoute(async (request, context) => {
  const assessmentId = context.params.id;

  const assessmentService = new AssessmentService(context.supabase);
  const result = await assessmentService.deleteAssessment(assessmentId, context.userId);

  return NextResponse.json(result);
});