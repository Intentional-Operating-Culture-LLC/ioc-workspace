import { createClient } from '@supabase/supabase-js';
import { Assessment, AssessmentQuestion, AssessmentResponse, GetAssessmentOptions as AssessmentOptions } from "@ioc/shared/types";
// Initialize Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
export interface AssessmentListOptions {
    page?: number;
    limit?: number;
    respondentId?: string;
    subjectId?: string;
}
/**
 * Get assessment by ID with questions
 */
export async function getAssessmentById(id: string) {
    const { data, error } = await supabase
        .from('assessments')
        .select(`
      *,
      organization:organizations(id, name, slug),
      created_by:users!assessments_created_by_fkey(id, full_name, email),
      questions:assessment_questions(*)
    `)
        .eq('id', id)
        .single();
    if (error)
        throw error;
    // Sort questions by order
    if (data.questions) {
        data.questions.sort((a: any, b: any) => a.question_order - b.question_order);
    }
    return data;
}
/**
 * Get assessments for organization
 */
export async function getOrganizationAssessments(organizationId: string, options: AssessmentOptions = {}) {
    let query = supabase
        .from('assessments')
        .select(`
      *,
      created_by:users!assessments_created_by_fkey(id, full_name, email),
      _count:assessment_responses(count),
      questions:assessment_questions(count)
    `, { count: 'exact' })
        .eq('organization_id', organizationId);
    // Apply filters
    if (options.status) {
        query = query.eq('status', options.status);
    }
    if (options.type) {
        query = query.eq('type', options.type);
    }
    if (options.search) {
        query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
    }
    // Apply sorting
    query = query.order(options.sortBy || 'created_at', {
        ascending: options.sortOrder === 'asc'
    });
    // Apply pagination
    if (options.page && options.limit) {
        const from = (options.page - 1) * options.limit;
        const to = from + options.limit - 1;
        query = query.range(from, to);
    }
    const { data, error, count } = await query;
    if (error)
        throw error;
    return { assessments: data, total: count };
}
/**
 * Create assessment with questions
 */
export async function createAssessment(assessmentData: Assessment, questions: AssessmentQuestion[] = []) {
    // Create assessment
    const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert(assessmentData)
        .select()
        .single();
    if (assessmentError)
        throw assessmentError;
    // Create questions if provided
    if (questions.length > 0) {
        const questionsToInsert = questions.map((q, index) => ({
            assessment_id: assessment.id,
            question_text: q.question_text,
            question_type: q.question_type,
            question_order: q.question_order || index + 1,
            required: q.required ?? true,
            options: q.options || [],
            validation_rules: q.validation_rules || {},
            metadata: q.metadata || {},
        }));
        const { error: questionsError } = await supabase
            .from('assessment_questions')
            .insert(questionsToInsert);
        if (questionsError) {
            // Rollback
            await supabase.from('assessments').delete().eq('id', assessment.id);
            throw questionsError;
        }
    }
    return assessment;
}
/**
 * Update assessment
 */
export async function updateAssessment(id: string, updates: Partial<Assessment>) {
    const { data, error } = await supabase
        .from('assessments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
/**
 * Delete assessment
 */
export async function deleteAssessment(id: string) {
    const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', id);
    if (error)
        throw error;
    return true;
}
/**
 * Add questions to assessment
 */
export async function addAssessmentQuestions(assessmentId: string, questions: AssessmentQuestion[]) {
    // Get current max order
    const { data: existingQuestions } = await supabase
        .from('assessment_questions')
        .select('question_order')
        .eq('assessment_id', assessmentId)
        .order('question_order', { ascending: false })
        .limit(1);
    const startOrder = existingQuestions?.[0]?.question_order || 0;
    const questionsToInsert = questions.map((q, index) => ({
        assessment_id: assessmentId,
        question_text: q.question_text,
        question_type: q.question_type,
        question_order: q.question_order || startOrder + index + 1,
        required: q.required ?? true,
        options: q.options || [],
        validation_rules: q.validation_rules || {},
        metadata: q.metadata || {},
    }));
    const { data, error } = await supabase
        .from('assessment_questions')
        .insert(questionsToInsert)
        .select();
    if (error)
        throw error;
    return data;
}
/**
 * Update assessment question
 */
export async function updateAssessmentQuestion(questionId: string, updates: Partial<AssessmentQuestion>) {
    const { data, error } = await supabase
        .from('assessment_questions')
        .update(updates)
        .eq('id', questionId)
        .select()
        .single();
    if (error)
        throw error;
    return data;
}
/**
 * Delete assessment question
 */
export async function deleteAssessmentQuestion(questionId: string) {
    const { error } = await supabase
        .from('assessment_questions')
        .delete()
        .eq('id', questionId);
    if (error)
        throw error;
    return true;
}
/**
 * Reorder assessment questions
 */
export async function reorderAssessmentQuestions(assessmentId: string, questionOrders: {
    id: string;
    order: number;
}[]) {
    // questionOrders should be an array of { id, order } objects
    const updates = questionOrders.map(({ id, order }) => supabase
        .from('assessment_questions')
        .update({ question_order: order })
        .eq('id', id));
    const results = await Promise.all(updates);
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
        throw new Error('Failed to reorder some questions');
    }
    return true;
}
/**
 * Get assessment responses
 */
export async function getAssessmentResponses(assessmentId: string, options: AssessmentOptions = {}) {
    let query = supabase
        .from('assessment_responses')
        .select(`
      *,
      respondent:users!assessment_responses_respondent_id_fkey(id, full_name, email),
      subject:users!assessment_responses_subject_id_fkey(id, full_name, email)
    `, { count: 'exact' })
        .eq('assessment_id', assessmentId);
    // Apply filters
    if (options.status) {
        query = query.eq('status', options.status);
    }
    if (options.respondentId) {
        query = query.eq('respondent_id', options.respondentId);
    }
    if (options.subjectId) {
        query = query.eq('subject_id', options.subjectId);
    }
    // Apply sorting
    query = query.order(options.sortBy || 'created_at', {
        ascending: options.sortOrder === 'asc'
    });
    // Apply pagination
    if (options.page && options.limit) {
        const from = (options.page - 1) * options.limit;
        const to = from + options.limit - 1;
        query = query.range(from, to);
    }
    const { data, error, count } = await query;
    if (error)
        throw error;
    return { responses: data, total: count };
}
/**
 * Get single response with answers
 */
export async function getAssessmentResponse(responseId: string) {
    const { data, error } = await supabase
        .from('assessment_responses')
        .select(`
      *,
      respondent:users!assessment_responses_respondent_id_fkey(*),
      subject:users!assessment_responses_subject_id_fkey(*),
      question_responses:assessment_question_responses(
        *,
        question:assessment_questions(*)
      )
    `)
        .eq('id', responseId)
        .single();
    if (error)
        throw error;
    return data;
}
/**
 * Submit assessment response
 */
export async function submitAssessmentResponse(assessmentId: string, respondentId: string, responses: any[], options: {
    responseId?: string;
    subjectId?: string;
    timeSpent?: number;
} = {}) {
    // Create or update response record
    let responseId: string;
    if (options.responseId) {
        // Update existing response
        const { error: updateError } = await supabase
            .from('assessment_responses')
            .update({
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            time_spent_seconds: options.timeSpent || 0,
        })
            .eq('id', options.responseId);
        if (updateError)
            throw updateError;
        responseId = options.responseId;
        // Delete existing answers
        await supabase
            .from('assessment_question_responses')
            .delete()
            .eq('response_id', responseId);
    }
    else {
        // Create new response
        const { data: newResponse, error: createError } = await supabase
            .from('assessment_responses')
            .insert({
            assessment_id: assessmentId,
            respondent_id: respondentId,
            subject_id: options.subjectId,
            status: 'submitted',
            submitted_at: new Date().toISOString(),
            time_spent_seconds: options.timeSpent || 0,
        })
            .select()
            .single();
        if (createError)
            throw createError;
        responseId = newResponse.id;
    }
    // Insert question responses
    const questionResponses = responses.map(response => ({
        response_id: responseId,
        question_id: response.question_id,
        answer_value: response.answer_value,
        answer_data: response.answer_data || {},
        confidence_score: response.confidence_score,
        time_spent_seconds: response.time_spent_seconds || 0,
    }));
    const { error: insertError } = await supabase
        .from('assessment_question_responses')
        .insert(questionResponses);
    if (insertError)
        throw insertError;
    return responseId;
}
/**
 * Get assessment statistics
 */
export async function getAssessmentStatistics(assessmentId: string) {
    // Get response statistics
    const { data: responses } = await supabase
        .from('assessment_responses')
        .select('status, submitted_at')
        .eq('assessment_id', assessmentId);
    const stats = {
        total_responses: responses?.length || 0,
        submitted: responses?.filter(r => r.status === 'submitted').length || 0,
        in_progress: responses?.filter(r => r.status === 'in_progress').length || 0,
        completion_rate: 0,
        avg_completion_time: 0,
    };
    if (stats.total_responses > 0) {
        stats.completion_rate = (stats.submitted / stats.total_responses) * 100;
    }
    // Calculate average completion time
    const completedResponses = responses?.filter(r => r.status === 'submitted' && r.submitted_at);
    if (completedResponses && completedResponses.length > 0) {
        // This would need more data to calculate actual completion time
        // For now, return a placeholder
        stats.avg_completion_time = 900; // 15 minutes in seconds
    }
    // Get score distribution
    const { data: scores } = await supabase
        .from('assessment_scores')
        .select('dimension, score')
        .eq('assessment_id', assessmentId);
    const scoreDistribution: Record<string, any> = {};
    scores?.forEach(score => {
        if (!scoreDistribution[score.dimension]) {
            scoreDistribution[score.dimension] = {
                scores: [],
                average: 0,
                min: 0,
                max: 0,
            };
        }
        scoreDistribution[score.dimension].scores.push(score.score);
    });
    // Calculate statistics for each dimension
    Object.keys(scoreDistribution).forEach(dimension => {
        const scores = scoreDistribution[dimension].scores;
        scoreDistribution[dimension].average = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
        scoreDistribution[dimension].min = Math.min(...scores);
        scoreDistribution[dimension].max = Math.max(...scores);
    });
    return {
        response_stats: stats,
        score_distribution: scoreDistribution,
    };
}
/**
 * Duplicate assessment
 */
export async function duplicateAssessment(assessmentId: string, newTitle: string) {
    // Get original assessment with questions
    const original = await getAssessmentById(assessmentId);
    if (!original) {
        throw new Error('Assessment not found');
    }
    // Create new assessment
    const { questions, ...assessmentData } = original;
    const newAssessment = await createAssessment({
        ...assessmentData,
        title: newTitle || `${assessmentData.title} (Copy)`,
        status: 'draft',
        created_at: undefined,
        updated_at: undefined,
    }, questions);
    return newAssessment;
}
