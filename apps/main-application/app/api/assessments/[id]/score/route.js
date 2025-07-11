import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scoreAssessmentResponse, getAssessmentScores } from "@ioc/shared/data-access/scoring";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/assessments/[id]/score
 * Get scores for an assessment response
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;

    // Get existing scores
    const scores = await getAssessmentScores(id);

    if (!scores) {
      return NextResponse.json(
        { error: 'No scores found for this response' },
        { status: 404 }
      );
    }

    return NextResponse.json(scores);
  } catch (error) {
    console.error('Error getting assessment scores:', error);
    return NextResponse.json(
      { error: 'Failed to get assessment scores' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assessments/[id]/score
 * Calculate scores for an assessment response
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { recalculate = false } = await request.json();

    // Check if response exists
    const { data: response, error: responseError } = await supabase.
    from('assessment_responses').
    select('id, status, scored_at').
    eq('id', id).
    single();

    if (responseError || !response) {
      return NextResponse.json(
        { error: 'Assessment response not found' },
        { status: 404 }
      );
    }

    // Check if already scored and not forcing recalculation
    if (response.scored_at && !recalculate) {
      const existingScores = await getAssessmentScores(id);
      if (existingScores) {
        return NextResponse.json(existingScores);
      }
    }

    // Check if response is submitted
    if (response.status !== 'submitted') {
      return NextResponse.json(
        { error: 'Assessment must be submitted before scoring' },
        { status: 400 }
      );
    }

    // Calculate scores
    const scores = await scoreAssessmentResponse(id);

    return NextResponse.json(scores);
  } catch (error) {
    console.error('Error scoring assessment:', error);
    return NextResponse.json(
      { error: 'Failed to score assessment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/assessments/[id]/score
 * Delete scores for an assessment response (admin only)
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    // Delete scores
    const { error } = await supabase.
    from('assessment_scores').
    delete().
    eq('response_id', id);

    if (error) throw error;

    // Update response to remove scored_at
    await supabase.
    from('assessment_responses').
    update({
      scored_at: null,
      scoring_metadata: {}
    }).
    eq('id', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting assessment scores:', error);
    return NextResponse.json(
      { error: 'Failed to delete assessment scores' },
      { status: 500 }
    );
  }
}