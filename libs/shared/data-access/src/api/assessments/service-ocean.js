import { APIError } from '../errors.js';
import { 
  calculateOceanScores, 
  aggregateOceanScores,
  interpretOceanProfile,
  QuestionTraitMapping
} from '../../scoring/ocean-scoring.js';
import {
  calculateExecutiveOceanProfile,
  calculateOrganizationalOceanProfile,
  analyzeTeamComposition,
  calculateExecutiveOrgFit
} from '../../scoring/ocean-executive-org-scoring.js';
import {
  assessDarkSideRisk,
  generateDarkSideAssessment
} from '../../scoring/ocean-dark-side-mapping.js';

// OCEAN assessment types
export const OCEAN_ASSESSMENT_TYPES = {
  OCEAN_FULL: 'ocean-full',
  OCEAN_SHORT: 'ocean-short',
  EMOTIONAL_REGULATION: 'emotional-regulation',
  EXECUTIVE_OCEAN: 'executive-ocean',
  ORGANIZATIONAL_OCEAN: 'organizational-ocean',
  DARK_SIDE_ASSESSMENT: 'dark-side-assessment',
  MULTI_RATER_360: 'multi-rater-360'
};

// Assessment tiers
export const ASSESSMENT_TIERS = {
  INDIVIDUAL: 'individual',
  EXECUTIVE: 'executive',
  ORGANIZATIONAL: 'organizational'
};

// Node-based prompt selection types
export const PROMPT_NODES = {
  // Individual tier nodes
  OPENNESS_CORE: 'openness-core',
  CONSCIENTIOUSNESS_CORE: 'conscientiousness-core',
  EXTRAVERSION_CORE: 'extraversion-core',
  AGREEABLENESS_CORE: 'agreeableness-core',
  NEUROTICISM_CORE: 'neuroticism-core',
  
  // Executive tier nodes
  STRATEGIC_OPENNESS: 'strategic-openness',
  EXECUTIVE_DISCIPLINE: 'executive-discipline',
  LEADERSHIP_PRESENCE: 'leadership-presence',
  COLLABORATIVE_LEADERSHIP: 'collaborative-leadership',
  STRESS_RESILIENCE: 'stress-resilience',
  
  // Emotional regulation nodes
  EMOTIONAL_AWARENESS: 'emotional-awareness',
  EMOTIONAL_CONTROL: 'emotional-control',
  EMOTIONAL_EXPRESSION: 'emotional-expression',
  EMOTIONAL_RECOVERY: 'emotional-recovery',
  
  // Dark side indicator nodes
  OVERUSE_INDICATORS: 'overuse-indicators',
  STRESS_TRIGGERS: 'stress-triggers',
  COMPENSATORY_BEHAVIORS: 'compensatory-behaviors',
  IMPACT_AWARENESS: 'impact-awareness'
};

// Rater types for 360 assessments
export const RATER_TYPES = {
  SELF: 'self',
  MANAGER: 'manager',
  PEER: 'peer',
  DIRECT_REPORT: 'direct-report',
  EXTERNAL: 'external'
};

// Rater weights for aggregation
export const RATER_WEIGHTS = {
  [RATER_TYPES.SELF]: 0.25,
  [RATER_TYPES.MANAGER]: 0.30,
  [RATER_TYPES.PEER]: 0.20,
  [RATER_TYPES.DIRECT_REPORT]: 0.20,
  [RATER_TYPES.EXTERNAL]: 0.05
};

export class AssessmentServiceOCEAN {
  constructor(supabase) {
    this.supabase = supabase;
    this.questionMappings = new Map(); // Cache for question-trait mappings
  }

  /**
   * Create node-based assessment
   */
  async createNodeBasedAssessment(data, createdBy) {
    const {
      title,
      type,
      organizationId,
      description,
      tier,
      nodes,
      settings = {},
      assignments = []
    } = data;

    // Select prompts based on nodes and tier
    const questions = await this.selectPromptsFromNodes(nodes, tier);
    
    // Generate trait mappings for questions
    const mappings = this.generateTraitMappings(questions, nodes);
    
    // Enhanced settings for OCEAN assessments
    const oceanSettings = {
      ...settings,
      scoringType: 'ocean',
      tier,
      nodes,
      traitMappings: mappings,
      enableDarkSideAnalysis: nodes.includes(PROMPT_NODES.OVERUSE_INDICATORS),
      enableEmotionalRegulation: nodes.includes(PROMPT_NODES.EMOTIONAL_AWARENESS),
      enable360Feedback: type === OCEAN_ASSESSMENT_TYPES.MULTI_RATER_360
    };

    // Create assessment using base method
    const assessment = await this.supabase.rpc('create_assessment_with_assignments', {
      p_title: title,
      p_type: type,
      p_organization_id: organizationId,
      p_description: description,
      p_due_date: data.dueDate,
      p_questions: questions,
      p_settings: oceanSettings,
      p_created_by: createdBy,
      p_assignments: assignments
    });

    if (assessment.error) {
      throw new APIError('Failed to create OCEAN assessment', 400, 'CREATE_OCEAN_ASSESSMENT_ERROR', assessment.error);
    }

    // Store trait mappings separately for efficient retrieval
    await this.storeTraitMappings(assessment.data.id, mappings);

    return assessment.data;
  }

  /**
   * Select prompts from nodes based on tier
   */
  async selectPromptsFromNodes(nodes, tier) {
    const questions = [];
    
    for (const node of nodes) {
      const nodeQuestions = await this.getNodeQuestions(node, tier);
      questions.push(...nodeQuestions);
    }

    // Ensure balanced trait coverage
    return this.balanceQuestionDistribution(questions);
  }

  /**
   * Get questions for a specific node
   */
  async getNodeQuestions(node, tier) {
    const { data: questions, error } = await this.supabase
      .from('assessment_questions_bank')
      .select('*')
      .eq('node', node)
      .eq('tier', tier)
      .eq('is_active', true)
      .order('weight', { ascending: false })
      .limit(this.getNodeQuestionLimit(node, tier));

    if (error) {
      console.error('Error fetching node questions:', error);
      return [];
    }

    return questions || [];
  }

  /**
   * Generate trait mappings for questions
   */
  generateTraitMappings(questions, nodes) {
    const mappings = [];

    questions.forEach(question => {
      const mapping = {
        questionId: question.id,
        traits: this.getQuestionTraits(question),
        facets: this.getQuestionFacets(question),
        reverse: question.reverse_scored || false
      };
      mappings.push(mapping);
    });

    return mappings;
  }

  /**
   * Submit assessment with OCEAN scoring
   */
  async submitOceanAssessment(assessmentId, userId, submissionData) {
    const { responses, timeSpent, metadata, raterType = RATER_TYPES.SELF } = submissionData;

    // Validate submission
    const validation = await this.validateSubmission(assessmentId, userId, raterType);
    if (!validation.isValid) {
      throw new APIError(validation.error, 400, 'VALIDATION_ERROR');
    }

    // Get assessment details and mappings
    const { assessment, mappings } = await this.getAssessmentWithMappings(assessmentId);

    // Calculate OCEAN scores
    const oceanScores = calculateOceanScores(responses, mappings);

    // Calculate tier-specific enhancements
    let enhancedScores = oceanScores;
    let additionalAnalysis = {};

    switch (assessment.settings.tier) {
      case ASSESSMENT_TIERS.EXECUTIVE:
        const executiveProfile = calculateExecutiveOceanProfile(
          this.convertToQuestionResponses(responses, mappings),
          { level: metadata.level, function: metadata.function }
        );
        enhancedScores = executiveProfile.traits;
        additionalAnalysis = {
          leadershipStyles: executiveProfile.leadershipStyles,
          influenceTactics: executiveProfile.influenceTactics,
          teamPredictions: executiveProfile.teamPredictions,
          stressResponse: executiveProfile.stressResponse
        };
        break;

      case ASSESSMENT_TIERS.ORGANIZATIONAL:
        // For org assessments, aggregate team profiles
        const teamProfiles = await this.getTeamOceanProfiles(assessment.organization_id);
        const orgProfile = calculateOrganizationalOceanProfile(teamProfiles);
        additionalAnalysis = {
          collectiveTraits: orgProfile.collectiveTraits,
          cultureType: orgProfile.cultureType,
          emergentProperties: orgProfile.emergentProperties,
          healthMetrics: orgProfile.healthMetrics
        };
        break;
    }

    // Dark side analysis if enabled
    let darkSideAnalysis = null;
    if (assessment.settings.enableDarkSideAnalysis) {
      const stressLevel = metadata.currentStressLevel || 5;
      darkSideAnalysis = assessDarkSideRisk(oceanScores.raw, stressLevel);
    }

    // Generate interpretation
    const interpretation = interpretOceanProfile(oceanScores);

    // Store submission with OCEAN scores
    const { data: submission, error } = await this.supabase
      .from('assessment_submissions')
      .insert({
        assessment_id: assessmentId,
        user_id: userId,
        assignment_id: validation.assignment.id,
        responses,
        score: this.calculateOverallScore(oceanScores),
        ocean_scores: oceanScores,
        ocean_interpretation: interpretation,
        additional_analysis: additionalAnalysis,
        dark_side_analysis: darkSideAnalysis,
        time_spent: timeSpent,
        metadata: {
          ...metadata,
          raterType,
          scoringVersion: '2.0'
        },
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new APIError('Failed to submit assessment', 400, 'SUBMIT_ERROR', error);
    }

    // Update assignment
    await this.updateAssignmentCompletion(validation.assignment.id, oceanScores);

    // Handle 360 feedback aggregation if this is a multi-rater assessment
    if (assessment.settings.enable360Feedback) {
      await this.check360CompletionAndAggregate(assessmentId, userId);
    }

    // Store facet scores separately for detailed analysis
    if (oceanScores.facets) {
      await this.storeFacetScores(submission.id, oceanScores.facets);
    }

    return {
      submission,
      oceanScores,
      interpretation,
      additionalAnalysis,
      darkSideAnalysis,
      message: 'OCEAN assessment submitted successfully'
    };
  }

  /**
   * Aggregate 360-degree feedback
   */
  async aggregate360Feedback(assessmentId, subjectUserId) {
    // Get all submissions for this assessment and subject
    const { data: submissions, error } = await this.supabase
      .from('assessment_submissions')
      .select('*, user:users!assessment_submissions_user_id_fkey(id, full_name)')
      .eq('assessment_id', assessmentId)
      .eq('metadata->subjectUserId', subjectUserId);

    if (error || !submissions || submissions.length === 0) {
      throw new APIError('No 360 feedback found', 404, 'NO_360_FEEDBACK');
    }

    // Group submissions by rater type
    const raterGroups = this.groupSubmissionsByRaterType(submissions);

    // Calculate weighted OCEAN scores
    const aggregatedScores = this.calculateWeighted360Scores(raterGroups);

    // Calculate observer agreement
    const observerAgreement = this.calculateObserverAgreement(raterGroups);

    // Identify blind spots (self vs others)
    const blindSpots = this.identifyBlindSpots(
      raterGroups[RATER_TYPES.SELF]?.[0]?.ocean_scores,
      aggregatedScores
    );

    // Store aggregated results
    const { data: aggregatedResult, error: storeError } = await this.supabase
      .from('assessment_360_results')
      .insert({
        assessment_id: assessmentId,
        subject_user_id: subjectUserId,
        aggregated_scores: aggregatedScores,
        observer_agreement: observerAgreement,
        blind_spots: blindSpots,
        rater_counts: this.getRaterCounts(raterGroups),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (storeError) {
      throw new APIError('Failed to store 360 results', 400, 'STORE_360_ERROR', storeError);
    }

    return aggregatedResult;
  }

  /**
   * Calculate weighted 360 scores
   */
  calculateWeighted360Scores(raterGroups) {
    const weightedScores = {
      raw: { openness: 0, conscientiousness: 0, extraversion: 0, agreeableness: 0, neuroticism: 0 },
      percentile: { openness: 0, conscientiousness: 0, extraversion: 0, agreeableness: 0, neuroticism: 0 },
      stanine: { openness: 0, conscientiousness: 0, extraversion: 0, agreeableness: 0, neuroticism: 0 }
    };

    let totalWeight = 0;

    // Calculate weighted average for each rater type
    Object.entries(raterGroups).forEach(([raterType, submissions]) => {
      if (submissions.length > 0) {
        const weight = RATER_WEIGHTS[raterType] || 0.1;
        totalWeight += weight;

        // Average scores within rater type
        const raterTypeScores = aggregateOceanScores(
          submissions.map(s => s.ocean_scores)
        );

        // Add weighted scores
        Object.keys(weightedScores.raw).forEach(trait => {
          weightedScores.raw[trait] += raterTypeScores.raw[trait] * weight;
          weightedScores.percentile[trait] += raterTypeScores.percentile[trait] * weight;
          weightedScores.stanine[trait] += raterTypeScores.stanine[trait] * weight;
        });
      }
    });

    // Normalize by total weight
    if (totalWeight > 0) {
      Object.keys(weightedScores.raw).forEach(trait => {
        weightedScores.raw[trait] /= totalWeight;
        weightedScores.percentile[trait] /= totalWeight;
        weightedScores.stanine[trait] /= totalWeight;
      });
    }

    return weightedScores;
  }

  /**
   * Calculate observer agreement
   */
  calculateObserverAgreement(raterGroups) {
    const agreement = {};
    const allObservers = [];

    // Collect all non-self ratings
    Object.entries(raterGroups).forEach(([raterType, submissions]) => {
      if (raterType !== RATER_TYPES.SELF) {
        allObservers.push(...submissions.map(s => s.ocean_scores.raw));
      }
    });

    if (allObservers.length < 2) {
      return { overall: 1.0, byTrait: {} };
    }

    // Calculate agreement for each trait
    const traits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
    let totalAgreement = 0;

    traits.forEach(trait => {
      const traitScores = allObservers.map(o => o[trait]);
      const variance = this.calculateVariance(traitScores);
      // Convert variance to agreement score (lower variance = higher agreement)
      const agreementScore = Math.max(0, 1 - (variance / 2.5));
      agreement[trait] = agreementScore;
      totalAgreement += agreementScore;
    });

    return {
      overall: totalAgreement / traits.length,
      byTrait: agreement
    };
  }

  /**
   * Identify blind spots between self and observer ratings
   */
  identifyBlindSpots(selfScores, observerScores) {
    if (!selfScores || !observerScores) {
      return { traits: {}, insights: [] };
    }

    const blindSpots = { traits: {}, insights: [] };
    const significantDifference = 0.5; // Threshold for meaningful difference

    Object.keys(selfScores.raw).forEach(trait => {
      const difference = selfScores.raw[trait] - observerScores.raw[trait];
      
      if (Math.abs(difference) >= significantDifference) {
        blindSpots.traits[trait] = {
          selfScore: selfScores.raw[trait],
          observerScore: observerScores.raw[trait],
          difference,
          direction: difference > 0 ? 'overestimated' : 'underestimated'
        };

        // Generate insight
        if (difference > 0) {
          blindSpots.insights.push(
            `You rate yourself ${Math.abs(difference).toFixed(1)} points higher on ${trait} than others perceive you`
          );
        } else {
          blindSpots.insights.push(
            `Others see you as ${Math.abs(difference).toFixed(1)} points stronger on ${trait} than you rate yourself`
          );
        }
      }
    });

    return blindSpots;
  }

  /**
   * Get team OCEAN profiles for organizational assessment
   */
  async getTeamOceanProfiles(organizationId) {
    const { data: submissions, error } = await this.supabase
      .from('assessment_submissions')
      .select(`
        ocean_scores,
        user:users!assessment_submissions_user_id_fkey(
          id,
          user_organizations!inner(
            organization_id,
            role
          )
        )
      `)
      .eq('user.user_organizations.organization_id', organizationId)
      .not('ocean_scores', 'is', null)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching team profiles:', error);
      return [];
    }

    // Extract unique user profiles (latest submission per user)
    const userProfiles = new Map();
    submissions.forEach(submission => {
      const userId = submission.user.id;
      if (!userProfiles.has(userId)) {
        userProfiles.set(userId, submission.ocean_scores.raw);
      }
    });

    return Array.from(userProfiles.values());
  }

  /**
   * Helper methods
   */

  getNodeQuestionLimit(node, tier) {
    // Determine how many questions to select per node
    const limits = {
      [ASSESSMENT_TIERS.INDIVIDUAL]: {
        core: 10,
        emotional: 5,
        darkSide: 3
      },
      [ASSESSMENT_TIERS.EXECUTIVE]: {
        core: 8,
        strategic: 12,
        emotional: 6,
        darkSide: 5
      },
      [ASSESSMENT_TIERS.ORGANIZATIONAL]: {
        core: 5,
        strategic: 8,
        culture: 10
      }
    };

    const nodeType = this.getNodeType(node);
    return limits[tier]?.[nodeType] || 5;
  }

  getNodeType(node) {
    if (node.includes('CORE')) return 'core';
    if (node.includes('STRATEGIC') || node.includes('EXECUTIVE')) return 'strategic';
    if (node.includes('EMOTIONAL')) return 'emotional';
    if (node.includes('DARK') || node.includes('OVERUSE')) return 'darkSide';
    if (node.includes('CULTURE')) return 'culture';
    return 'core';
  }

  getQuestionTraits(question) {
    // Map question to OCEAN traits based on metadata
    const traits = {};
    
    if (question.primary_trait) {
      traits[question.primary_trait] = question.primary_weight || 1.0;
    }
    
    if (question.secondary_trait) {
      traits[question.secondary_trait] = question.secondary_weight || 0.5;
    }

    return traits;
  }

  getQuestionFacets(question) {
    // Map question to OCEAN facets if available
    if (!question.facets) return undefined;
    
    try {
      return JSON.parse(question.facets);
    } catch (e) {
      return undefined;
    }
  }

  async storeTraitMappings(assessmentId, mappings) {
    const { error } = await this.supabase
      .from('assessment_trait_mappings')
      .insert({
        assessment_id: assessmentId,
        mappings: mappings,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error storing trait mappings:', error);
    }
  }

  async getAssessmentWithMappings(assessmentId) {
    // Get assessment
    const { data: assessment, error: assessmentError } = await this.supabase
      .from('assessments')
      .select('*')
      .eq('id', assessmentId)
      .single();

    if (assessmentError) {
      throw new APIError('Assessment not found', 404, 'ASSESSMENT_NOT_FOUND');
    }

    // Get mappings
    let mappings = assessment.settings?.traitMappings;
    
    if (!mappings) {
      // Try to fetch from separate table
      const { data: mappingData } = await this.supabase
        .from('assessment_trait_mappings')
        .select('mappings')
        .eq('assessment_id', assessmentId)
        .single();
      
      mappings = mappingData?.mappings || [];
    }

    return { assessment, mappings };
  }

  convertToQuestionResponses(responses, mappings) {
    // Convert submission format to OCEAN scoring format
    return responses.map(response => {
      const mapping = mappings.find(m => m.questionId === response.questionId);
      const primaryTrait = Object.keys(mapping?.traits || {})[0] || 'openness';
      
      return {
        questionId: response.questionId,
        response: this.normalizeResponseValue(response.answer),
        trait: primaryTrait,
        reversed: mapping?.reverse || false
      };
    });
  }

  normalizeResponseValue(answer) {
    if (typeof answer === 'number') return answer;
    if (typeof answer === 'string') {
      const numericValue = parseInt(answer);
      if (!isNaN(numericValue)) return numericValue;
      
      // Map letter answers to numeric
      const letterMap = { a: 1, b: 2, c: 3, d: 4, e: 5 };
      return letterMap[answer.toLowerCase()] || 3;
    }
    if (answer && typeof answer === 'object') {
      return answer.value || answer.score || 3;
    }
    return 3;
  }

  calculateOverallScore(oceanScores) {
    // Calculate composite score (0-100)
    const weights = {
      openness: 0.2,
      conscientiousness: 0.25,
      extraversion: 0.15,
      agreeableness: 0.2,
      neuroticism: 0.2 // Inverted for emotional stability
    };

    let weightedSum = 0;
    Object.entries(weights).forEach(([trait, weight]) => {
      let traitScore = oceanScores.percentile[trait];
      if (trait === 'neuroticism') {
        traitScore = 100 - traitScore; // Convert to emotional stability
      }
      weightedSum += traitScore * weight;
    });

    return Math.round(weightedSum);
  }

  balanceQuestionDistribution(questions) {
    // Ensure balanced representation of traits
    const traitCounts = {};
    
    questions.forEach(q => {
      const trait = q.primary_trait || 'unknown';
      traitCounts[trait] = (traitCounts[trait] || 0) + 1;
    });

    // If significantly imbalanced, adjust
    const avgCount = questions.length / 5;
    const tolerance = 0.2; // 20% tolerance

    // Log imbalances for monitoring
    Object.entries(traitCounts).forEach(([trait, count]) => {
      if (Math.abs(count - avgCount) > avgCount * tolerance) {
        console.warn(`Trait ${trait} has ${count} questions (expected ~${avgCount})`);
      }
    });

    return questions;
  }

  async validateSubmission(assessmentId, userId, raterType) {
    // Check assignment
    const { data: assignment } = await this.supabase
      .from('assessment_assignments')
      .select('*')
      .eq('assessment_id', assessmentId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!assignment) {
      return { isValid: false, error: 'User not assigned to this assessment' };
    }

    if (assignment.completed_at && raterType === RATER_TYPES.SELF) {
      return { isValid: false, error: 'Assessment already completed' };
    }

    return { isValid: true, assignment };
  }

  async updateAssignmentCompletion(assignmentId, oceanScores) {
    await this.supabase
      .from('assessment_assignments')
      .update({
        completed_at: new Date().toISOString(),
        score: this.calculateOverallScore(oceanScores),
        ocean_summary: {
          openness: oceanScores.percentile.openness,
          conscientiousness: oceanScores.percentile.conscientiousness,
          extraversion: oceanScores.percentile.extraversion,
          agreeableness: oceanScores.percentile.agreeableness,
          neuroticism: oceanScores.percentile.neuroticism
        }
      })
      .eq('id', assignmentId);
  }

  async check360CompletionAndAggregate(assessmentId, userId) {
    // Check if all expected raters have completed
    const { data: assignments } = await this.supabase
      .from('assessment_assignments')
      .select('*')
      .eq('assessment_id', assessmentId)
      .eq('metadata->subjectUserId', userId);

    const totalAssigned = assignments?.length || 0;
    const totalCompleted = assignments?.filter(a => a.completed_at).length || 0;

    if (totalCompleted >= totalAssigned * 0.8) { // 80% completion threshold
      await this.aggregate360Feedback(assessmentId, userId);
    }
  }

  async storeFacetScores(submissionId, facets) {
    const facetRecords = [];
    
    Object.entries(facets).forEach(([trait, traitFacets]) => {
      Object.entries(traitFacets).forEach(([facet, score]) => {
        facetRecords.push({
          submission_id: submissionId,
          trait,
          facet,
          score,
          created_at: new Date().toISOString()
        });
      });
    });

    if (facetRecords.length > 0) {
      await this.supabase
        .from('assessment_facet_scores')
        .insert(facetRecords);
    }
  }

  groupSubmissionsByRaterType(submissions) {
    const groups = {};
    
    submissions.forEach(submission => {
      const raterType = submission.metadata?.raterType || RATER_TYPES.SELF;
      if (!groups[raterType]) {
        groups[raterType] = [];
      }
      groups[raterType].push(submission);
    });

    return groups;
  }

  getRaterCounts(raterGroups) {
    const counts = {};
    Object.entries(raterGroups).forEach(([type, submissions]) => {
      counts[type] = submissions.length;
    });
    return counts;
  }

  calculateVariance(scores) {
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length;
  }

  /**
   * Get recommended assessment configuration based on requirements
   */
  async getRecommendedConfiguration(requirements) {
    const { purpose, tier, includeEmotionalRegulation, includeDarkSide, include360 } = requirements;
    
    const config = {
      type: OCEAN_ASSESSMENT_TYPES.OCEAN_FULL,
      tier: tier || ASSESSMENT_TIERS.INDIVIDUAL,
      nodes: [],
      estimatedQuestions: 0,
      estimatedTime: 0
    };

    // Base trait nodes
    if (tier === ASSESSMENT_TIERS.INDIVIDUAL) {
      config.nodes.push(
        PROMPT_NODES.OPENNESS_CORE,
        PROMPT_NODES.CONSCIENTIOUSNESS_CORE,
        PROMPT_NODES.EXTRAVERSION_CORE,
        PROMPT_NODES.AGREEABLENESS_CORE,
        PROMPT_NODES.NEUROTICISM_CORE
      );
      config.estimatedQuestions += 50;
      config.estimatedTime += 20;
    } else if (tier === ASSESSMENT_TIERS.EXECUTIVE) {
      config.type = OCEAN_ASSESSMENT_TYPES.EXECUTIVE_OCEAN;
      config.nodes.push(
        PROMPT_NODES.STRATEGIC_OPENNESS,
        PROMPT_NODES.EXECUTIVE_DISCIPLINE,
        PROMPT_NODES.LEADERSHIP_PRESENCE,
        PROMPT_NODES.COLLABORATIVE_LEADERSHIP,
        PROMPT_NODES.STRESS_RESILIENCE
      );
      config.estimatedQuestions += 60;
      config.estimatedTime += 30;
    }

    // Add emotional regulation if requested
    if (includeEmotionalRegulation) {
      config.nodes.push(
        PROMPT_NODES.EMOTIONAL_AWARENESS,
        PROMPT_NODES.EMOTIONAL_CONTROL,
        PROMPT_NODES.EMOTIONAL_EXPRESSION,
        PROMPT_NODES.EMOTIONAL_RECOVERY
      );
      config.estimatedQuestions += 20;
      config.estimatedTime += 10;
    }

    // Add dark side assessment if requested
    if (includeDarkSide) {
      config.nodes.push(
        PROMPT_NODES.OVERUSE_INDICATORS,
        PROMPT_NODES.STRESS_TRIGGERS,
        PROMPT_NODES.COMPENSATORY_BEHAVIORS,
        PROMPT_NODES.IMPACT_AWARENESS
      );
      config.estimatedQuestions += 20;
      config.estimatedTime += 10;
    }

    // Enable 360 if requested
    if (include360) {
      config.type = OCEAN_ASSESSMENT_TYPES.MULTI_RATER_360;
      config.enable360 = true;
      config.raterTypes = [
        RATER_TYPES.SELF,
        RATER_TYPES.MANAGER,
        RATER_TYPES.PEER,
        RATER_TYPES.DIRECT_REPORT
      ];
    }

    return config;
  }
}

// Export enhanced service as default
export default AssessmentServiceOCEAN;