import { NextResponse } from 'next/server';
import { createProtectedRoute, validateOrganizationAccess, ErrorResponses } from "@ioc/shared/api-utils";

// GET /api/assessments/[id]/ocean-scores - Get OCEAN scores for an assessment
export const GET = createProtectedRoute(async (request, context) => {
  const { id: assessmentId } = context.params;

  try {
    // Get the assessment to verify access
    const { data: assessment, error: assessmentError } = await context.supabase.
    from('assessments').
    select(`
        id,
        type,
        organization_id,
        user_id,
        status,
        completed_at,
        settings
      `).
    eq('id', assessmentId).
    single();

    if (assessmentError || !assessment) {
      return ErrorResponses.notFound('Assessment not found');
    }

    // Verify organization access
    const { error: accessError } = await validateOrganizationAccess(
      context.supabase,
      context.userId,
      assessment.organization_id,
      ['owner', 'admin', 'member']
    );

    if (accessError) return accessError;

    // Check if assessment is completed
    if (assessment.status !== 'completed') {
      return NextResponse.json({
        assessment: {
          id: assessmentId,
          status: assessment.status
        },
        message: 'Assessment not yet completed',
        scores: null
      });
    }

    // Get the latest submission for this assessment
    const { data: submission, error: submissionError } = await context.supabase.
    from('assessment_submissions').
    select(`
        id,
        responses,
        score,
        time_spent,
        submitted_at,
        metadata
      `).
    eq('assessment_id', assessmentId).
    order('submitted_at', { ascending: false }).
    limit(1).
    single();

    if (submissionError || !submission) {
      return ErrorResponses.notFound('No submission found for this assessment');
    }

    // Calculate OCEAN scores from responses
    const oceanScores = await calculateOceanScores(
      submission.responses,
      assessment.settings?.questions || [],
      assessment.type
    );

    // Get percentile rankings if available
    const { data: normData } = await context.supabase.
    from('ocean_norms').
    select('trait, percentiles').
    eq('norm_group', assessment.settings?.normGroup || 'general');

    const percentileRanks = calculatePercentileRanks(oceanScores.traits, normData);

    // Get historical scores for trend analysis
    const { data: historicalScores } = await context.supabase.
    from('assessment_results').
    select('ocean_scores, created_at').
    eq('user_id', assessment.user_id).
    eq('assessment_type', 'ocean').
    order('created_at', { ascending: false }).
    limit(5);

    // Store the calculated scores
    await storeOceanScores(context.supabase, {
      assessmentId,
      submissionId: submission.id,
      userId: assessment.user_id,
      organizationId: assessment.organization_id,
      scores: oceanScores,
      percentiles: percentileRanks
    });

    // Generate interpretation
    const interpretation = generateOceanInterpretation(oceanScores, percentileRanks);

    return NextResponse.json({
      assessment: {
        id: assessmentId,
        type: assessment.type,
        completedAt: assessment.completed_at,
        timeSpent: submission.time_spent
      },
      scores: {
        raw: oceanScores,
        percentiles: percentileRanks,
        interpretation,
        confidence: oceanScores.confidence || {},
        validity: oceanScores.validity || {}
      },
      trends: historicalScores ? analyzeTrends(historicalScores, oceanScores) : null,
      metadata: {
        scoringMethod: assessment.settings?.scoring?.method || 'standard',
        normGroup: assessment.settings?.normGroup || 'general',
        calculatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching OCEAN scores:', error);
    return ErrorResponses.internalError('Failed to retrieve OCEAN scores');
  }
});

// Helper functions

async function calculateOceanScores(responses, questions, assessmentType) {
  const scores = {
    traits: {
      O: 0, C: 0, E: 0, A: 0, N: 0
    },
    facets: {},
    itemCounts: {
      O: 0, C: 0, E: 0, A: 0, N: 0
    },
    validity: {
      completeness: 0,
      consistency: 0,
      socialDesirability: 0
    }
  };

  // Process each response
  responses.forEach((response) => {
    const question = questions.find((q) => q.id === response.questionId);
    if (!question || !question.scoring) return;

    const { trait, facet, weight = 1.0, reverse = false } = question.scoring;
    let value = response.value;

    // Apply reverse scoring if needed
    if (reverse) {
      value = 6 - value; // For 5-point scale
    }

    // Add to trait score
    if (trait && scores.traits[trait] !== undefined) {
      scores.traits[trait] += value * weight;
      scores.itemCounts[trait]++;
    }

    // Add to facet score
    if (facet) {
      if (!scores.facets[facet]) {
        scores.facets[facet] = { score: 0, count: 0 };
      }
      scores.facets[facet].score += value * weight;
      scores.facets[facet].count++;
    }
  });

  // Convert to percentages
  Object.keys(scores.traits).forEach((trait) => {
    if (scores.itemCounts[trait] > 0) {
      scores.traits[trait] = Math.round(
        scores.traits[trait] / (scores.itemCounts[trait] * 5) * 100
      );
    }
  });

  // Convert facet scores to percentages
  Object.keys(scores.facets).forEach((facet) => {
    if (scores.facets[facet].count > 0) {
      scores.facets[facet] = Math.round(
        scores.facets[facet].score / (scores.facets[facet].count * 5) * 100
      );
    }
  });

  // Calculate validity metrics
  scores.validity.completeness = responses.length / questions.length * 100;
  scores.validity.consistency = calculateConsistency(responses, questions);
  scores.validity.socialDesirability = calculateSocialDesirability(responses, questions);

  // Add confidence intervals
  scores.confidence = calculateConfidenceIntervals(scores.traits, scores.itemCounts);

  return scores;
}

function calculatePercentileRanks(traitScores, normData) {
  const percentiles = {};

  Object.entries(traitScores).forEach(([trait, score]) => {
    const norm = normData?.find((n) => n.trait === trait);
    if (norm && norm.percentiles) {
      // Find the percentile rank for this score
      const percentileData = norm.percentiles;
      let percentile = 50; // Default to median

      // Simple linear interpolation
      const scores = Object.keys(percentileData).map(Number).sort((a, b) => a - b);
      for (let i = 0; i < scores.length - 1; i++) {
        if (score >= scores[i] && score <= scores[i + 1]) {
          const p1 = percentileData[scores[i]];
          const p2 = percentileData[scores[i + 1]];
          const ratio = (score - scores[i]) / (scores[i + 1] - scores[i]);
          percentile = p1 + (p2 - p1) * ratio;
          break;
        }
      }

      percentiles[trait] = Math.round(percentile);
    } else {
      // Fallback to simple percentile estimation
      percentiles[trait] = estimatePercentile(score);
    }
  });

  return percentiles;
}

function estimatePercentile(score) {
  // Simple normal distribution approximation
  // Assuming mean=50, SD=10 for normalized scores
  const mean = 50;
  const sd = 10;
  const z = (score - mean) / sd;

  // Approximate cumulative normal distribution
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const probability = 1 - d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));

  return Math.round((z < 0 ? 1 - probability : probability) * 100);
}

function calculateConsistency(responses, questions) {
  // Check for consistency among similar items
  let consistentPairs = 0;
  let totalPairs = 0;

  questions.forEach((q1, i) => {
    questions.slice(i + 1).forEach((q2) => {
      if (q1.scoring?.trait === q2.scoring?.trait && q1.scoring?.facet === q2.scoring?.facet) {
        const r1 = responses.find((r) => r.questionId === q1.id);
        const r2 = responses.find((r) => r.questionId === q2.id);

        if (r1 && r2) {
          totalPairs++;
          const diff = Math.abs(r1.value - r2.value);
          if (diff <= 1) consistentPairs++;
        }
      }
    });
  });

  return totalPairs > 0 ? consistentPairs / totalPairs * 100 : 100;
}

function calculateSocialDesirability(responses, questions) {
  // Check for overly positive responding
  const socialDesirabilityItems = questions.filter((q) =>
  q.category === 'validity' && q.scale === 'socialDesirability'
  );

  if (socialDesirabilityItems.length === 0) return 0;

  const sdResponses = responses.filter((r) =>
  socialDesirabilityItems.some((q) => q.id === r.questionId)
  );

  const avgSD = sdResponses.reduce((sum, r) => sum + r.value, 0) / sdResponses.length;
  return avgSD / 5 * 100; // Convert to percentage
}

function calculateConfidenceIntervals(traits, itemCounts) {
  const confidence = {};

  Object.entries(traits).forEach(([trait, score]) => {
    const n = itemCounts[trait];
    if (n > 0) {
      // Standard error approximation
      const se = 100 / Math.sqrt(n); // Simplified SE for percentage scores
      const marginOfError = 1.96 * se; // 95% confidence interval

      confidence[trait] = {
        lower: Math.max(0, Math.round(score - marginOfError)),
        upper: Math.min(100, Math.round(score + marginOfError)),
        standardError: Math.round(se * 10) / 10
      };
    }
  });

  return confidence;
}

function generateOceanInterpretation(scores, percentiles) {
  const interpretation = {
    summary: '',
    traits: {},
    profile: '',
    recommendations: []
  };

  // Generate trait interpretations
  Object.entries(scores.traits).forEach(([trait, score]) => {
    const level = getScoreLevel(score);
    const percentile = percentiles[trait] || 50;

    interpretation.traits[trait] = {
      level,
      percentile,
      description: getTraitInterpretation(trait, level, percentile),
      implications: getTraitImplications(trait, level)
    };
  });

  // Generate profile summary
  interpretation.profile = generateProfileSummary(scores.traits);

  // Generate overall summary
  interpretation.summary = generateOverallSummary(scores.traits, percentiles);

  // Generate recommendations
  interpretation.recommendations = generateRecommendations(scores.traits);

  return interpretation;
}

function getScoreLevel(score) {
  if (score >= 80) return 'Very High';
  if (score >= 65) return 'High';
  if (score >= 35) return 'Average';
  if (score >= 20) return 'Low';
  return 'Very Low';
}

function getTraitInterpretation(trait, level, percentile) {
  const interpretations = {
    O: {
      'Very High': `Exceptionally open to new experiences (top ${100 - percentile}%). Highly creative, imaginative, and intellectually curious.`,
      'High': `Above average openness (top ${100 - percentile}%). Enjoys novelty, abstract thinking, and creative pursuits.`,
      'Average': `Typical level of openness. Balances practicality with occasional exploration of new ideas.`,
      'Low': `Below average openness (bottom ${percentile}%). Prefers familiar routines and conventional approaches.`,
      'Very Low': `Very low openness (bottom ${percentile}%). Strongly prefers tradition and proven methods.`
    },
    C: {
      'Very High': `Exceptionally conscientious (top ${100 - percentile}%). Highly organized, disciplined, and achievement-oriented.`,
      'High': `Above average conscientiousness (top ${100 - percentile}%). Reliable, hardworking, and goal-directed.`,
      'Average': `Typical level of conscientiousness. Balances structure with flexibility.`,
      'Low': `Below average conscientiousness (bottom ${percentile}%). More spontaneous and flexible in approach.`,
      'Very Low': `Very low conscientiousness (bottom ${percentile}%). Highly spontaneous, may struggle with organization.`
    },
    E: {
      'Very High': `Exceptionally extraverted (top ${100 - percentile}%). Very energetic, socially active, and seeks excitement.`,
      'High': `Above average extraversion (top ${100 - percentile}%). Outgoing, enthusiastic, and enjoys social interaction.`,
      'Average': `Typical level of extraversion. Comfortable in both social and solitary situations.`,
      'Low': `Below average extraversion (bottom ${percentile}%). Reserved, prefers smaller groups or solitude.`,
      'Very Low': `Very introverted (bottom ${percentile}%). Strongly prefers solitary activities.`
    },
    A: {
      'Very High': `Exceptionally agreeable (top ${100 - percentile}%). Very cooperative, trusting, and helpful.`,
      'High': `Above average agreeableness (top ${100 - percentile}%). Compassionate and considerate of others.`,
      'Average': `Typical level of agreeableness. Balances cooperation with assertiveness.`,
      'Low': `Below average agreeableness (bottom ${percentile}%). More skeptical and competitive.`,
      'Very Low': `Very low agreeableness (bottom ${percentile}%). Highly competitive and skeptical.`
    },
    N: {
      'Very High': `Very high neuroticism (top ${100 - percentile}%). Experiences intense emotions and stress.`,
      'High': `Above average neuroticism (top ${100 - percentile}%). More emotionally reactive than most.`,
      'Average': `Typical level of neuroticism. Normal range of emotional responses.`,
      'Low': `Below average neuroticism (bottom ${percentile}%). Emotionally stable and resilient.`,
      'Very Low': `Very low neuroticism (bottom ${percentile}%). Exceptionally calm and stable.`
    }
  };

  return interpretations[trait]?.[level] || `${level} ${trait}`;
}

function getTraitImplications(trait, level) {
  const implications = {
    O: {
      'Very High': ['May excel in creative fields', 'Could become bored with routine', 'Strong potential for innovation'],
      'High': ['Good creative problem-solving', 'Enjoys learning new things', 'Adaptable to change'],
      'Average': ['Balanced approach to change', 'Can work in various environments', 'Moderate creativity'],
      'Low': ['Excels in structured environments', 'Reliable in routine tasks', 'May resist change'],
      'Very Low': ['Thrives on predictability', 'Very practical approach', 'May struggle with ambiguity']
    },
    C: {
      'Very High': ['Excellent project management', 'High achievement drive', 'May be perfectionistic'],
      'High': ['Strong work ethic', 'Good at meeting deadlines', 'Organized approach'],
      'Average': ['Flexible work style', 'Balances planning and spontaneity', 'Moderate organization'],
      'Low': ['Creative and flexible', 'May procrastinate', 'Prefers open-ended tasks'],
      'Very Low': ['Very spontaneous', 'May struggle with deadlines', 'Needs external structure']
    },
    E: {
      'Very High': ['Natural leader', 'Energizes teams', 'May dominate conversations'],
      'High': ['Good networker', 'Comfortable presenting', 'Team-oriented'],
      'Average': ['Versatile social style', 'Can work alone or in groups', 'Moderate energy'],
      'Low': ['Prefers independent work', 'Good listener', 'Thoughtful communicator'],
      'Very Low': ['Excels in solo work', 'Deep thinker', 'May avoid networking']
    },
    A: {
      'Very High': ['Excellent team player', 'Strong mediator', 'May avoid conflict'],
      'High': ['Builds trust easily', 'Supportive colleague', 'Customer-oriented'],
      'Average': ['Balances own and others\' needs', 'Can be firm when needed', 'Moderate empathy'],
      'Low': ['Strong negotiator', 'Direct communicator', 'Results-focused'],
      'Very Low': ['Very competitive', 'Challenges others', 'May seem insensitive']
    },
    N: {
      'Very High': ['Very emotionally aware', 'May need stress management', 'Empathetic to others\' emotions'],
      'High': ['Emotionally expressive', 'Benefits from support', 'Sensitive to environment'],
      'Average': ['Normal stress response', 'Balanced emotions', 'Typical coping ability'],
      'Low': ['Handles pressure well', 'Emotionally stable', 'Good in crisis'],
      'Very Low': ['Extremely resilient', 'Very calm under pressure', 'May seem unemotional']
    }
  };

  return implications[trait]?.[level] || [];
}

function generateProfileSummary(traits) {
  const { O, C, E, A, N } = traits;

  // Identify dominant traits
  const dominant = Object.entries(traits).
  filter(([, score]) => score >= 65).
  map(([trait]) => trait);

  // Identify low traits
  const low = Object.entries(traits).
  filter(([, score]) => score <= 35).
  map(([trait]) => trait);

  let profile = '';

  // Create profile based on combinations
  if (dominant.includes('E') && dominant.includes('A')) {
    profile = 'Socially Engaging Leader';
  } else if (dominant.includes('C') && dominant.includes('O')) {
    profile = 'Innovative Achiever';
  } else if (dominant.includes('A') && low.includes('N')) {
    profile = 'Stable Supporter';
  } else if (dominant.includes('O') && low.includes('C')) {
    profile = 'Creative Explorer';
  } else if (dominant.includes('C') && low.includes('O')) {
    profile = 'Methodical Executor';
  } else {
    profile = 'Balanced Personality';
  }

  return profile;
}

function generateOverallSummary(traits, percentiles) {
  const highTraits = Object.entries(traits).
  filter(([, score]) => score >= 65).
  map(([trait]) => getTraitName(trait));

  const lowTraits = Object.entries(traits).
  filter(([, score]) => score <= 35).
  map(([trait]) => getTraitName(trait));

  let summary = 'This personality profile shows ';

  if (highTraits.length > 0) {
    summary += `particularly high levels of ${highTraits.join(', ')}`;
  }

  if (lowTraits.length > 0) {
    if (highTraits.length > 0) summary += ', and ';
    summary += `lower levels of ${lowTraits.join(', ')}`;
  }

  if (highTraits.length === 0 && lowTraits.length === 0) {
    summary += 'a well-balanced personality across all five major traits';
  }

  summary += '. ';

  // Add percentile context
  const avgPercentile = Object.values(percentiles).reduce((a, b) => a + b, 0) / 5;
  if (avgPercentile >= 70) {
    summary += 'Overall, this profile is notably distinctive compared to the general population.';
  } else if (avgPercentile <= 30) {
    summary += 'This profile shows several traits that differ from typical patterns.';
  } else {
    summary += 'This profile falls within typical ranges for most traits.';
  }

  return summary;
}

function getTraitName(trait) {
  const names = {
    O: 'Openness',
    C: 'Conscientiousness',
    E: 'Extraversion',
    A: 'Agreeableness',
    N: 'Neuroticism'
  };
  return names[trait] || trait;
}

function generateRecommendations(traits) {
  const recommendations = [];

  Object.entries(traits).forEach(([trait, score]) => {
    if (score >= 80 || score <= 20) {
      // Extreme scores may need attention
      recommendations.push({
        trait,
        type: 'awareness',
        message: `Your ${getTraitName(trait)} score is in the extreme range. Consider how this impacts your daily life and relationships.`
      });
    }
  });

  // Specific combinations
  if (traits.N >= 65 && traits.C <= 35) {
    recommendations.push({
      type: 'development',
      message: 'Consider stress management techniques and organizational strategies to balance high emotional reactivity with lower structure.'
    });
  }

  if (traits.E <= 35 && traits.A <= 35) {
    recommendations.push({
      type: 'interpersonal',
      message: 'Your profile suggests independence. Consider developing collaborative skills for team environments.'
    });
  }

  if (traits.O >= 65 && traits.C >= 65) {
    recommendations.push({
      type: 'strength',
      message: 'Your combination of creativity and discipline is valuable. Seek roles that leverage both innovation and execution.'
    });
  }

  return recommendations;
}

async function storeOceanScores(supabase, data) {
  try {
    await supabase.from('assessment_results').insert({
      assessment_id: data.assessmentId,
      submission_id: data.submissionId,
      user_id: data.userId,
      organization_id: data.organizationId,
      assessment_type: 'ocean',
      ocean_scores: data.scores.traits,
      facet_scores: data.scores.facets,
      percentile_ranks: data.percentiles,
      validity_indicators: data.scores.validity,
      confidence_intervals: data.scores.confidence,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error storing OCEAN scores:', error);
    // Non-critical error, continue
  }
}

function analyzeTrends(historicalScores, currentScores) {
  if (!historicalScores || historicalScores.length < 2) return null;

  const trends = {
    direction: {},
    stability: {},
    significantChanges: []
  };

  Object.entries(currentScores.traits).forEach(([trait, currentScore]) => {
    const historicalTrait = historicalScores.
    map((h) => h.ocean_scores?.[trait]).
    filter((score) => score !== undefined);

    if (historicalTrait.length > 0) {
      // Calculate trend direction
      const firstScore = historicalTrait[historicalTrait.length - 1];
      const change = currentScore - firstScore;

      trends.direction[trait] = {
        change: Math.round(change),
        direction: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable'
      };

      // Calculate stability (standard deviation)
      const mean = historicalTrait.reduce((a, b) => a + b, 0) / historicalTrait.length;
      const variance = historicalTrait.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / historicalTrait.length;
      const stdDev = Math.sqrt(variance);

      trends.stability[trait] = {
        standardDeviation: Math.round(stdDev * 10) / 10,
        classification: stdDev < 5 ? 'stable' : stdDev < 10 ? 'moderate' : 'variable'
      };

      // Identify significant changes
      if (Math.abs(change) > 10) {
        trends.significantChanges.push({
          trait,
          change,
          from: firstScore,
          to: currentScore
        });
      }
    }
  });

  return trends;
}

/**
 * @swagger
 * /api/assessments/{id}/ocean-scores:
 *   get:
 *     summary: Get OCEAN personality scores for an assessment
 *     tags: [Assessments, Results, OCEAN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Assessment ID
 *     responses:
 *       200:
 *         description: OCEAN scores with interpretation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 assessment:
 *                   type: object
 *                 scores:
 *                   type: object
 *                   properties:
 *                     raw:
 *                       type: object
 *                       properties:
 *                         traits:
 *                           type: object
 *                         facets:
 *                           type: object
 *                     percentiles:
 *                       type: object
 *                     interpretation:
 *                       type: object
 *                 trends:
 *                   type: object
 *       404:
 *         description: Assessment not found
 */