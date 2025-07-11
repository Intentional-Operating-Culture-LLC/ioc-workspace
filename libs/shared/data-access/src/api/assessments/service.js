import { APIError } from '../errors.js';
import AssessmentServiceOCEAN, { 
  OCEAN_ASSESSMENT_TYPES,
  ASSESSMENT_TIERS,
  PROMPT_NODES,
  RATER_TYPES 
} from './service-ocean.js';

export class AssessmentService extends AssessmentServiceOCEAN {
  constructor(supabase) {
    super(supabase);
    this.supabase = supabase;
  }

  /**
   * List assessments with filters
   */
  async listAssessments({ organizationId, status, userId, page = 1, limit = 20 }) {
    // Build query
    let query = this.supabase.from('assessments').select(`
      id,
      title,
      type,
      status,
      created_at,
      start_date,
      end_date,
      settings,
      created_by:users!assessments_created_by_fkey(id, full_name),
      organization:organizations(id, name)
    `, { count: 'exact' });

    // Apply filters
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    // If userId is provided, get assessments assigned to that user
    if (userId) {
      const { data: assignedAssessments } = await this.supabase
        .from('assessment_assignments')
        .select('assessment_id')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (assignedAssessments) {
        const assessmentIds = assignedAssessments.map(a => a.assessment_id);
        query = query.in('id', assessmentIds);
      }
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new APIError('Failed to fetch assessments', 400, 'FETCH_ASSESSMENTS_ERROR', error);
    }

    return {
      assessments: data || [],
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Get single assessment with details
   */
  async getAssessment(assessmentId, userId) {
    const { data: assessment, error } = await this.supabase
      .from('assessments')
      .select(`
        *,
        created_by:users!assessments_created_by_fkey(id, full_name, email),
        organization:organizations(id, name),
        questions,
        assignments:assessment_assignments(
          user:users!assessment_assignments_user_id_fkey(id, full_name, email),
          assigned_at,
          completed_at,
          score
        )
      `)
      .eq('id', assessmentId)
      .single();

    if (error) {
      throw new APIError('Assessment not found', 404, 'ASSESSMENT_NOT_FOUND', error);
    }

    // Check if user has access
    const hasAccess = await this.checkAssessmentAccess(assessmentId, userId, assessment.organization_id);
    if (!hasAccess) {
      throw new APIError('Access denied', 403, 'ACCESS_DENIED');
    }

    return assessment;
  }

  /**
   * Create new assessment
   */
  async createAssessment(data, createdBy) {
    const {
      title,
      type,
      organizationId,
      description,
      dueDate,
      questions,
      settings,
      assignments,
      // OCEAN-specific parameters
      tier,
      nodes,
      enableOceanScoring
    } = data;

    // If OCEAN assessment type or nodes provided, use OCEAN creation
    if (enableOceanScoring || nodes || Object.values(OCEAN_ASSESSMENT_TYPES).includes(type)) {
      return this.createNodeBasedAssessment(data, createdBy);
    }

    // Start transaction
    const assessment = await this.supabase.rpc('create_assessment_with_assignments', {
      p_title: title,
      p_type: type,
      p_organization_id: organizationId,
      p_description: description,
      p_due_date: dueDate,
      p_questions: questions || [],
      p_settings: settings || {},
      p_created_by: createdBy,
      p_assignments: assignments || [],
    });

    if (assessment.error) {
      throw new APIError('Failed to create assessment', 400, 'CREATE_ASSESSMENT_ERROR', assessment.error);
    }

    // Log analytics event
    await this.logAnalyticsEvent('assessment_created', organizationId, createdBy, {
      assessment_id: assessment.data.id,
      type,
      question_count: questions?.length || 0,
      assignment_count: assignments?.length || 0,
    });

    return assessment.data;
  }

  /**
   * Update assessment
   */
  async updateAssessment(assessmentId, updateData, updatedBy) {
    // Check if user can update
    const { data: assessment } = await this.supabase
      .from('assessments')
      .select('organization_id, created_by, status')
      .eq('id', assessmentId)
      .single();

    if (!assessment) {
      throw new APIError('Assessment not found', 404, 'ASSESSMENT_NOT_FOUND');
    }

    // Can't update completed assessments
    if (assessment.status === 'completed') {
      throw new APIError('Cannot update completed assessment', 400, 'ASSESSMENT_COMPLETED');
    }

    const { data: updated, error } = await this.supabase
      .from('assessments')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessmentId)
      .select()
      .single();

    if (error) {
      throw new APIError('Failed to update assessment', 400, 'UPDATE_ASSESSMENT_ERROR', error);
    }

    // Log analytics event
    await this.logAnalyticsEvent('assessment_updated', assessment.organization_id, updatedBy, {
      assessment_id: assessmentId,
      updated_fields: Object.keys(updateData),
    });

    return updated;
  }

  /**
   * Submit assessment response
   */
  async submitAssessment(assessmentId, userId, submissionData) {
    const { responses, timeSpent, metadata, raterType } = submissionData;

    // Check if this is an OCEAN assessment
    const { data: assessment } = await this.supabase
      .from('assessments')
      .select('type, settings')
      .eq('id', assessmentId)
      .single();

    if (assessment?.settings?.scoringType === 'ocean' || 
        Object.values(OCEAN_ASSESSMENT_TYPES).includes(assessment?.type)) {
      return this.submitOceanAssessment(assessmentId, userId, submissionData);
    }

    // Check if user is assigned to assessment
    const { data: assignment } = await this.supabase
      .from('assessment_assignments')
      .select('id, completed_at, attempts')
      .eq('assessment_id', assessmentId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!assignment) {
      throw new APIError('User not assigned to this assessment', 403, 'NOT_ASSIGNED');
    }

    if (assignment.completed_at) {
      throw new APIError('Assessment already completed', 400, 'ALREADY_COMPLETED');
    }

    // Get full assessment details
    const { data: fullAssessment } = await this.supabase
      .from('assessments')
      .select('settings, questions, organization_id')
      .eq('id', assessmentId)
      .single();

    // Check max attempts
    const maxAttempts = fullAssessment.settings?.maxAttempts || 1;
    if (assignment.attempts >= maxAttempts) {
      throw new APIError('Maximum attempts exceeded', 400, 'MAX_ATTEMPTS_EXCEEDED');
    }

    // Validate responses
    const score = this.calculateScore(responses, fullAssessment.questions, fullAssessment.settings);

    // Create submission
    const { data: submission, error } = await this.supabase
      .from('assessment_submissions')
      .insert({
        assessment_id: assessmentId,
        user_id: userId,
        assignment_id: assignment.id,
        responses,
        score,
        time_spent: timeSpent,
        metadata,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new APIError('Failed to submit assessment', 400, 'SUBMIT_ERROR', error);
    }

    // Update assignment
    await this.supabase
      .from('assessment_assignments')
      .update({
        completed_at: new Date().toISOString(),
        score,
        attempts: assignment.attempts + 1,
      })
      .eq('id', assignment.id);

    // Log analytics event
    await this.logAnalyticsEvent('assessment_submitted', assessment.organization_id, userId, {
      assessment_id: assessmentId,
      score,
      time_spent: timeSpent,
    });

    return {
      submission,
      score,
      message: 'Assessment submitted successfully',
    };
  }

  /**
   * Delete assessment
   */
  async deleteAssessment(assessmentId, deletedBy) {
    const { data: assessment } = await this.supabase
      .from('assessments')
      .select('organization_id, status')
      .eq('id', assessmentId)
      .single();

    if (!assessment) {
      throw new APIError('Assessment not found', 404, 'ASSESSMENT_NOT_FOUND');
    }

    // Soft delete
    const { error } = await this.supabase
      .from('assessments')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
        archived_by: deletedBy,
      })
      .eq('id', assessmentId);

    if (error) {
      throw new APIError('Failed to delete assessment', 400, 'DELETE_ERROR', error);
    }

    // Log analytics event
    await this.logAnalyticsEvent('assessment_deleted', assessment.organization_id, deletedBy, {
      assessment_id: assessmentId,
    });

    return { message: 'Assessment deleted successfully' };
  }

  /**
   * Private helper methods
   */
  async checkAssessmentAccess(assessmentId, userId, organizationId) {
    // Check if user is in the organization
    const { data: membership } = await this.supabase
      .from('user_organizations')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (!membership) return false;

    // Admins and owners have access to all assessments
    if (['owner', 'admin'].includes(membership.role)) return true;

    // Check if user is assigned to the assessment
    const { data: assignment } = await this.supabase
      .from('assessment_assignments')
      .select('id')
      .eq('assessment_id', assessmentId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    return !!assignment;
  }

  calculateScore(responses, questions, settings = {}) {
    // Check if OCEAN scoring is enabled
    if (settings.scoringType === 'ocean' && settings.traitMappings) {
      const oceanScores = this.calculateOceanScores(responses, settings.traitMappings);
      return this.calculateOverallScore(oceanScores);
    }

    // Legacy scoring logic for backward compatibility
    let correctAnswers = 0;
    let totalQuestions = questions.length;

    questions.forEach(question => {
      const response = responses.find(r => r.questionId === question.id);
      if (response && question.correctAnswer) {
        if (response.value === question.correctAnswer) {
          correctAnswers++;
        }
      }
    });

    return totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  }

  async logAnalyticsEvent(eventType, organizationId, userId, eventData) {
    try {
      await this.supabase.from('analytics_events').insert({
        organization_id: organizationId,
        user_id: userId,
        event_type: eventType,
        event_category: 'assessments',
        event_data: eventData,
      });
    } catch (error) {
      console.error('Failed to log analytics event:', error);
    }
  }

  /**
   * Create adaptive assessment flow
   */
  async createAdaptiveAssessment(data, createdBy) {
    const { purpose, organizationId } = data;
    
    // Get recommended configuration
    const config = await this.getRecommendedConfiguration({
      purpose,
      tier: data.tier || ASSESSMENT_TIERS.INDIVIDUAL,
      includeEmotionalRegulation: data.includeEmotionalRegulation,
      includeDarkSide: data.includeDarkSide,
      include360: data.include360
    });

    // Create assessment with recommended configuration
    return this.createNodeBasedAssessment({
      ...data,
      type: config.type,
      tier: config.tier,
      nodes: config.nodes,
      settings: {
        ...data.settings,
        ...config
      }
    }, createdBy);
  }

  /**
   * Get assessment results with OCEAN analysis
   */
  async getAssessmentResults(assessmentId, userId) {
    // Get submission
    const { data: submission, error } = await this.supabase
      .from('assessment_submissions')
      .select('*')
      .eq('assessment_id', assessmentId)
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !submission) {
      throw new APIError('No submission found', 404, 'NO_SUBMISSION');
    }

    // If OCEAN scores exist, return enhanced results
    if (submission.ocean_scores) {
      return {
        submission,
        oceanScores: submission.ocean_scores,
        interpretation: submission.ocean_interpretation,
        additionalAnalysis: submission.additional_analysis,
        darkSideAnalysis: submission.dark_side_analysis,
        score: submission.score
      };
    }

    // Legacy result format
    return {
      submission,
      score: submission.score
    };
  }

  /**
   * Get 360 feedback results
   */
  async get360Results(assessmentId, subjectUserId) {
    const { data: results, error } = await this.supabase
      .from('assessment_360_results')
      .select('*')
      .eq('assessment_id', assessmentId)
      .eq('subject_user_id', subjectUserId)
      .single();

    if (error || !results) {
      throw new APIError('No 360 results available', 404, 'NO_360_RESULTS');
    }

    return results;
  }

  /**
   * Get team composition analysis
   */
  async getTeamCompositionAnalysis(organizationId, teamId = null) {
    // Get team profiles
    const profiles = await this.getTeamOceanProfiles(organizationId);
    
    if (profiles.length === 0) {
      throw new APIError('No team profiles available', 404, 'NO_TEAM_PROFILES');
    }

    // Analyze composition
    const { analyzeTeamComposition } = await import('../../scoring/ocean-executive-org-scoring.js');
    return analyzeTeamComposition(profiles);
  }

  /**
   * Calculate executive-organization fit
   */
  async calculateExecutiveOrgFit(executiveUserId, organizationId) {
    // Get executive's latest OCEAN profile
    const { data: executiveSubmission } = await this.supabase
      .from('assessment_submissions')
      .select('ocean_scores')
      .eq('user_id', executiveUserId)
      .not('ocean_scores', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    if (!executiveSubmission?.ocean_scores) {
      throw new APIError('No executive OCEAN profile found', 404, 'NO_EXECUTIVE_PROFILE');
    }

    // Get organizational profile
    const teamProfiles = await this.getTeamOceanProfiles(organizationId);
    const { calculateOrganizationalOceanProfile, calculateExecutiveOrgFit } = 
      await import('../../scoring/ocean-executive-org-scoring.js');
    
    const orgProfile = calculateOrganizationalOceanProfile(teamProfiles);
    
    return calculateExecutiveOrgFit(
      executiveSubmission.ocean_scores.raw,
      orgProfile.collectiveTraits
    );
  }
}

// Export assessment types and constants
export {
  OCEAN_ASSESSMENT_TYPES,
  ASSESSMENT_TIERS,
  PROMPT_NODES,
  RATER_TYPES
};