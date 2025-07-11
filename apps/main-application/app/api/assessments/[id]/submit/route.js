import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createProtectedRoute,
  validateRequestBody,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { AssessmentService, submitAssessmentSchema } = api.assessments;

// POST /api/assessments/[id]/submit - Submit assessment response
export const POST = createProtectedRoute(async (request, context) => {
  const assessmentId = context.params.id;
  const { data: body, error: validationError } = await validateRequestBody(request, submitAssessmentSchema);
  if (validationError) return validationError;

  const assessmentService = new AssessmentService(context.supabase);
  const result = await assessmentService.submitAssessment(
    assessmentId,
    context.userId,
    body
  );

  return NextResponse.json(result, { status: 201 });
});

// GET /api/assessments/[id]/submit - Get user's response for an assessment
export const GET = createProtectedRoute(async (request, context) => {
  const assessmentId = context.params.id;
  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get('subject_id');

  // Get user's response
  let query = context.supabase.
  from('assessment_responses').
  select(`
      *,
      question_responses:assessment_question_responses(
        *,
        question:assessment_questions(*)
      )
    `).
  eq('assessment_id', assessmentId).
  eq('respondent_id', context.userId);

  if (subjectId) {
    query = query.eq('subject_id', subjectId);
  } else {
    query = query.is('subject_id', null);
  }

  const { data: response, error } = await query.single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No response found
      return NextResponse.json({
        response: null,
        message: 'No response found'
      });
    }

    return ErrorResponses.badRequest('Failed to fetch response', error);
  }

  return NextResponse.json({ response });
});