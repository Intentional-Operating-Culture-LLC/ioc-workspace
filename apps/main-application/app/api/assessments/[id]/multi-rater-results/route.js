import { NextResponse } from 'next/server';
import { createProtectedRoute, validateOrganizationAccess, ErrorResponses } from "@ioc/shared/api-utils";

// GET /api/assessments/[id]/multi-rater-results
export const GET = createProtectedRoute(async (request, context) => {
  const { id: assessmentId } = context.params;

  try {
    // Get the assessment
    const { data: assessment, error: assessmentError } = await context.supabase.
    from('assessments').
    select('id, organization_id, user_id, type, status').
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

    // Check if user has permission to view multi-rater results
    const canViewFullResults = context.userId === assessment.user_id ||
    ['owner', 'admin'].includes(context.userRole);

    // Get self-assessment results
    const { data: selfResults } = await context.supabase.
    from('assessment_results').
    select('ocean_scores, facet_scores, created_at').
    eq('assessment_id', assessmentId).
    eq('assessment_type', 'ocean').
    order('created_at', { ascending: false }).
    limit(1).
    single();

    if (!selfResults) {
      return NextResponse.json({
        assessment: { id: assessmentId },
        message: 'Self-assessment not yet completed',
        multiRaterResults: null
      });
    }

    // Get 360 feedback request
    const { data: feedbackRequest } = await context.supabase.
    from('360_feedback_requests').
    select('id, status, completed_raters, requested_raters, anonymity_level').
    eq('assessment_id', assessmentId).
    single();

    if (!feedbackRequest || feedbackRequest.completed_raters === 0) {
      return NextResponse.json({
        assessment: { id: assessmentId },
        selfAssessment: {
          oceanScores: selfResults.ocean_scores,
          completedAt: selfResults.created_at
        },
        multiRaterResults: null,
        message: 'No multi-rater feedback available yet'
      });
    }

    // Get aggregated 360 feedback
    const { data: raterFeedback } = await context.supabase.
    from('360_feedback_submissions').
    select('relationship, ratings, confidence_level').
    eq('feedback_request_id', feedbackRequest.id).
    eq('status', 'completed');

    // Calculate multi-rater results
    const multiRaterResults = calculateMultiRaterResults(
      selfResults,
      raterFeedback || [],
      feedbackRequest.anonymity_level,
      canViewFullResults
    );

    // Generate comparison insights
    const comparisonInsights = generateComparisonInsights(
      selfResults.ocean_scores,
      multiRaterResults.aggregated.overall
    );

    // Get leadership effectiveness if available
    const leadershipData = await getLeadershipEffectiveness(
      context.supabase,
      assessmentId,
      raterFeedback
    );

    return NextResponse.json({
      assessment: {
        id: assessmentId,
        type: assessment.type,
        userId: assessment.user_id
      },
      selfAssessment: {
        oceanScores: selfResults.ocean_scores,
        facetScores: canViewFullResults ? selfResults.facet_scores : null,
        completedAt: selfResults.created_at
      },
      multiRaterResults,
      comparisonInsights,
      leadershipEffectiveness: leadershipData,
      metadata: {
        totalRaters: feedbackRequest.completed_raters,
        responseRate: Math.round(feedbackRequest.completed_raters / feedbackRequest.requested_raters * 100),
        anonymityLevel: feedbackRequest.anonymity_level,
        calculatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in multi-rater results:', error);
    return ErrorResponses.internalError('Failed to retrieve multi-rater results');
  }
});

// Helper functions

function calculateMultiRaterResults(selfResults, raterFeedback, anonymityLevel, fullAccess) {
  const results = {
    aggregated: {
      overall: {},
      byRelationship: {},
      byTrait: {}
    },
    comparison: {
      selfVsOthers: {},
      blindSpots: [],
      hiddenStrengths: [],
      agreement: {}
    },
    variance: {},
    reliability: {}
  };

  // Group feedback by relationship
  const byRelationship = {};
  raterFeedback.forEach((feedback) => {
    const rel = feedback.relationship;
    if (!byRelationship[rel]) {
      byRelationship[rel] = [];
    }
    byRelationship[rel].push(feedback);
  });

  // Calculate overall others' ratings
  const allOthersRatings = {};
  const traitRatings = {};

  raterFeedback.forEach((feedback) => {
    Object.entries(feedback.ratings).forEach(([trait, rating]) => {
      if (!allOthersRatings[trait]) {
        allOthersRatings[trait] = [];
      }
      allOthersRatings[trait].push(rating);

      if (!traitRatings[trait]) {
        traitRatings[trait] = {
          all: [],
          byRelationship: {}
        };
      }
      traitRatings[trait].all.push(rating);

      const rel = feedback.relationship;
      if (!traitRatings[trait].byRelationship[rel]) {
        traitRatings[trait].byRelationship[rel] = [];
      }
      traitRatings[trait].byRelationship[rel].push(rating);
    });
  });

  // Calculate aggregated scores
  Object.entries(allOthersRatings).forEach(([trait, ratings]) => {
    const oceanTrait = mapToOceanTrait(trait);
    results.aggregated.overall[oceanTrait] = {
      mean: calculateMean(ratings),
      median: calculateMedian(ratings),
      stdDev: calculateStdDev(ratings),
      range: {
        min: Math.min(...ratings),
        max: Math.max(...ratings)
      },
      n: ratings.length
    };

    // Calculate by relationship if full access
    if (fullAccess) {
      results.aggregated.byRelationship[oceanTrait] = {};
      Object.entries(traitRatings[trait].byRelationship).forEach(([rel, relRatings]) => {
        results.aggregated.byRelationship[oceanTrait][rel] = {
          mean: calculateMean(relRatings),
          n: relRatings.length
        };
      });
    }
  });

  // Calculate self vs others comparison
  Object.entries(results.aggregated.overall).forEach(([trait, othersData]) => {
    const selfScore = selfResults.ocean_scores[trait];
    const othersScore = othersData.mean;
    const gap = selfScore - othersScore;

    results.comparison.selfVsOthers[trait] = {
      self: selfScore,
      others: othersScore,
      gap: Math.round(gap * 10) / 10,
      gapCategory: categorizeGap(gap),
      agreement: calculateAgreement(selfScore, othersScore, othersData.stdDev)
    };

    // Identify blind spots and hidden strengths
    if (gap < -15 && selfScore < 50) {
      results.comparison.blindSpots.push({
        trait,
        selfScore,
        othersScore,
        gap,
        interpretation: 'Others see weakness you may not recognize'
      });
    } else if (gap > 15 && selfScore > 50) {
      results.comparison.blindSpots.push({
        trait,
        selfScore,
        othersScore,
        gap,
        interpretation: 'You may overestimate your ability in this area'
      });
    } else if (gap < -10 && selfScore > 40) {
      results.comparison.hiddenStrengths.push({
        trait,
        selfScore,
        othersScore,
        gap: Math.abs(gap),
        interpretation: 'Others see strength you may undervalue'
      });
    }
  });

  // Calculate variance and reliability metrics
  calculateVarianceMetrics(results, traitRatings, byRelationship);
  calculateReliabilityMetrics(results, raterFeedback);

  // Add 360-degree view visualization data
  results.visualization = create360Visualization(
    selfResults.ocean_scores,
    results.aggregated.overall,
    results.aggregated.byRelationship
  );

  return results;
}

function mapToOceanTrait(trait) {
  const mapping = {
    'openness': 'O',
    'conscientiousness': 'C',
    'extraversion': 'E',
    'agreeableness': 'A',
    'neuroticism': 'N'
  };
  return mapping[trait.toLowerCase()] || trait.toUpperCase();
}

function calculateMean(numbers) {
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function calculateMedian(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateStdDev(numbers) {
  const mean = calculateMean(numbers);
  const squaredDiffs = numbers.map((n) => Math.pow(n - mean, 2));
  const variance = calculateMean(squaredDiffs);
  return Math.sqrt(variance);
}

function categorizeGap(gap) {
  const absGap = Math.abs(gap);
  if (absGap < 5) return 'aligned';
  if (absGap < 10) return 'slight_difference';
  if (absGap < 15) return 'moderate_difference';
  return 'significant_difference';
}

function calculateAgreement(selfScore, othersScore, othersStdDev) {
  const gap = Math.abs(selfScore - othersScore);

  // Within 1 standard deviation = good agreement
  if (gap <= othersStdDev) {
    return { level: 'high', confidence: 0.68 };
  } else if (gap <= 2 * othersStdDev) {
    return { level: 'moderate', confidence: 0.95 };
  } else {
    return { level: 'low', confidence: 0.99 };
  }
}

function calculateVarianceMetrics(results, traitRatings, byRelationship) {
  // Inter-rater reliability (how much raters agree with each other)
  Object.entries(traitRatings).forEach(([trait, data]) => {
    const oceanTrait = mapToOceanTrait(trait);
    const icc = calculateICC(data.all);

    results.reliability[oceanTrait] = {
      interRaterReliability: icc,
      interpretation: interpretICC(icc),
      raterAgreement: calculateRaterAgreement(data.all)
    };
  });

  // Variance by relationship type
  Object.keys(byRelationship).forEach((rel) => {
    results.variance[rel] = {};

    const relFeedback = byRelationship[rel];
    const relRatings = {};

    relFeedback.forEach((feedback) => {
      Object.entries(feedback.ratings).forEach(([trait, rating]) => {
        const oceanTrait = mapToOceanTrait(trait);
        if (!relRatings[oceanTrait]) {
          relRatings[oceanTrait] = [];
        }
        relRatings[oceanTrait].push(rating);
      });
    });

    Object.entries(relRatings).forEach(([trait, ratings]) => {
      results.variance[rel][trait] = calculateStdDev(ratings);
    });
  });
}

function calculateICC(ratings) {
  // Simplified ICC calculation - in production use proper statistical methods
  const variance = calculateVariance(ratings);
  const maxVariance = 4; // For 1-5 scale
  return Math.max(0, 1 - variance / maxVariance);
}

function calculateVariance(numbers) {
  const mean = calculateMean(numbers);
  return calculateMean(numbers.map((n) => Math.pow(n - mean, 2)));
}

function interpretICC(icc) {
  if (icc >= 0.75) return 'Excellent agreement';
  if (icc >= 0.60) return 'Good agreement';
  if (icc >= 0.40) return 'Fair agreement';
  return 'Poor agreement';
}

function calculateRaterAgreement(ratings) {
  // Calculate percentage of ratings within 1 point of each other
  let agreements = 0;
  let comparisons = 0;

  for (let i = 0; i < ratings.length; i++) {
    for (let j = i + 1; j < ratings.length; j++) {
      comparisons++;
      if (Math.abs(ratings[i] - ratings[j]) <= 1) {
        agreements++;
      }
    }
  }

  return comparisons > 0 ? agreements / comparisons * 100 : 0;
}

function calculateReliabilityMetrics(results, raterFeedback) {
  // Confidence level distribution
  const confidenceLevels = raterFeedback.map((f) => f.confidence_level || 'confident');
  const confidenceCounts = {};

  confidenceLevels.forEach((level) => {
    confidenceCounts[level] = (confidenceCounts[level] || 0) + 1;
  });

  results.reliability.confidenceDistribution = confidenceCounts;
  results.reliability.overallConfidence = calculateOverallConfidence(confidenceCounts);
}

function calculateOverallConfidence(confidenceCounts) {
  const weights = {
    'very_confident': 1.0,
    'confident': 0.8,
    'somewhat_confident': 0.6,
    'not_confident': 0.4
  };

  let totalWeight = 0;
  let totalCount = 0;

  Object.entries(confidenceCounts).forEach(([level, count]) => {
    totalWeight += (weights[level] || 0.5) * count;
    totalCount += count;
  });

  return totalCount > 0 ? totalWeight / totalCount : 0.5;
}

function create360Visualization(selfScores, othersOverall, othersByRelationship) {
  const traits = ['O', 'C', 'E', 'A', 'N'];

  const visualization = {
    traits,
    series: [
    {
      name: 'Self',
      data: traits.map((t) => selfScores[t] || 0),
      type: 'self'
    },
    {
      name: 'Others (Overall)',
      data: traits.map((t) => othersOverall[t]?.mean * 20 || 0), // Convert 1-5 to 0-100
      type: 'others_overall'
    }],

    gaps: {}
  };

  // Add relationship-specific series if available
  if (othersByRelationship && Object.keys(othersByRelationship).length > 0) {
    const relationships = ['manager', 'peer', 'direct_report'];

    relationships.forEach((rel) => {
      const relData = traits.map((t) => {
        const relScore = othersByRelationship[t]?.[rel]?.mean;
        return relScore ? relScore * 20 : null;
      }).filter((s) => s !== null);

      if (relData.length === traits.length) {
        visualization.series.push({
          name: `Others (${rel})`,
          data: relData,
          type: `others_${rel}`
        });
      }
    });
  }

  // Calculate gap visualization
  traits.forEach((trait) => {
    const self = selfScores[trait] || 0;
    const others = (othersOverall[trait]?.mean || 0) * 20;
    visualization.gaps[trait] = {
      value: self - others,
      direction: self > others ? 'over' : self < others ? 'under' : 'aligned'
    };
  });

  return visualization;
}

function generateComparisonInsights(selfScores, othersScores) {
  const insights = {
    summary: '',
    keyFindings: [],
    developmentPriorities: [],
    leverageOpportunities: []
  };

  // Calculate overall self-awareness
  let totalGap = 0;
  let gapCount = 0;
  const gaps = {};

  Object.entries(selfScores).forEach(([trait, selfScore]) => {
    const othersScore = (othersScores[trait]?.mean || 0) * 20; // Convert to 0-100
    const gap = Math.abs(selfScore - othersScore);
    gaps[trait] = { self: selfScore, others: othersScore, gap };
    totalGap += gap;
    gapCount++;
  });

  const avgGap = gapCount > 0 ? totalGap / gapCount : 0;

  // Generate summary
  if (avgGap < 5) {
    insights.summary = 'Excellent self-awareness - your self-perception closely aligns with how others see you.';
  } else if (avgGap < 10) {
    insights.summary = 'Good self-awareness with minor perception gaps in some areas.';
  } else if (avgGap < 15) {
    insights.summary = 'Moderate self-awareness - consider seeking feedback to better understand perception gaps.';
  } else {
    insights.summary = 'Significant perception gaps exist - focused development on self-awareness recommended.';
  }

  // Identify key findings
  Object.entries(gaps).forEach(([trait, data]) => {
    if (data.gap > 15) {
      const overUnder = data.self > data.others ? 'overestimate' : 'underestimate';
      insights.keyFindings.push({
        trait,
        finding: `You ${overUnder} your ${getTraitName(trait)} compared to others' perceptions`,
        gap: data.gap,
        recommendation: getGapRecommendation(trait, overUnder)
      });
    }
  });

  // Identify development priorities (where both self and others see weakness)
  Object.entries(gaps).forEach(([trait, data]) => {
    if (data.self < 40 && data.others < 40) {
      insights.developmentPriorities.push({
        trait,
        urgency: 'high',
        rationale: 'Both you and others identify this as an area for improvement',
        actions: getDevelopmentActions(trait)
      });
    }
  });

  // Identify leverage opportunities (where both see strength)
  Object.entries(gaps).forEach(([trait, data]) => {
    if (data.self > 65 && data.others > 65) {
      insights.leverageOpportunities.push({
        trait,
        strength: getTraitName(trait),
        applications: getLeverageApplications(trait)
      });
    }
  });

  return insights;
}

function getTraitName(trait) {
  const names = {
    O: 'Openness to Experience',
    C: 'Conscientiousness',
    E: 'Extraversion',
    A: 'Agreeableness',
    N: 'Emotional Stability' // Reframe positively
  };
  return names[trait] || trait;
}

function getGapRecommendation(trait, overUnder) {
  const recommendations = {
    O: {
      overestimate: 'Seek feedback on your innovative ideas before implementation',
      underestimate: 'Share your creative insights more confidently'
    },
    C: {
      overestimate: 'Verify your organizational effectiveness with objective metrics',
      underestimate: 'Recognize and communicate your reliability to others'
    },
    E: {
      overestimate: 'Be mindful of dominating conversations; practice active listening',
      underestimate: 'Your social impact may be greater than you realize'
    },
    A: {
      overestimate: 'Ensure your helpfulness is genuinely beneficial to others',
      underestimate: 'Others value your collaborative approach more than you think'
    },
    N: {
      overestimate: 'Your emotional reactions may be more visible than you realize',
      underestimate: 'You may be more resilient than you give yourself credit for'
    }
  };

  return recommendations[trait]?.[overUnder] || 'Seek specific feedback to understand this perception gap';
}

function getDevelopmentActions(trait) {
  const actions = {
    O: ['Engage in creative problem-solving exercises', 'Seek diverse perspectives', 'Try new approaches'],
    C: ['Implement organizational systems', 'Set clear goals with deadlines', 'Track progress consistently'],
    E: ['Practice public speaking', 'Initiate social interactions', 'Lead team activities'],
    A: ['Practice empathy exercises', 'Seek win-win solutions', 'Build trust through consistency'],
    N: ['Develop stress management techniques', 'Practice emotional regulation', 'Build resilience skills']
  };

  return actions[trait] || ['Work with a coach to develop this area'];
}

function getLeverageApplications(trait) {
  const applications = {
    O: ['Lead innovation initiatives', 'Facilitate brainstorming sessions', 'Drive strategic planning'],
    C: ['Manage complex projects', 'Establish best practices', 'Mentor others on organization'],
    E: ['Represent the organization', 'Build key relationships', 'Energize teams'],
    A: ['Mediate conflicts', 'Build team cohesion', 'Develop partnerships'],
    N: ['Handle high-pressure situations', 'Model emotional stability', 'Support others in crisis']
  };

  return applications[trait] || ['Leverage this strength in appropriate contexts'];
}

async function getLeadershipEffectiveness(supabase, assessmentId, raterFeedback) {
  // Check if we have leadership competency ratings
  const leadershipRatings = raterFeedback.
  map((f) => f.ratings).
  filter((r) => r.strategic || r.execution || r.people || r.influence);

  if (leadershipRatings.length === 0) {
    return null;
  }

  const competencies = ['strategic', 'execution', 'people', 'influence', 'adaptability', 'integrity', 'resilience'];
  const competencyScores = {};

  competencies.forEach((comp) => {
    const ratings = leadershipRatings.
    map((r) => r[comp]).
    filter((r) => r !== undefined);

    if (ratings.length > 0) {
      competencyScores[comp] = {
        mean: calculateMean(ratings),
        n: ratings.length,
        distribution: calculateDistribution(ratings)
      };
    }
  });

  // Calculate overall leadership effectiveness
  const overallScores = Object.values(competencyScores).map((c) => c.mean);
  const overallEffectiveness = overallScores.length > 0 ?
  calculateMean(overallScores) :
  null;

  return {
    overall: overallEffectiveness ? overallEffectiveness * 20 : null, // Convert to 0-100
    competencies: Object.entries(competencyScores).reduce((acc, [comp, data]) => {
      acc[comp] = data.mean * 20; // Convert to 0-100
      return acc;
    }, {}),
    topStrengths: Object.entries(competencyScores).
    sort((a, b) => b[1].mean - a[1].mean).
    slice(0, 2).
    map(([comp]) => comp),
    developmentAreas: Object.entries(competencyScores).
    sort((a, b) => a[1].mean - b[1].mean).
    slice(0, 2).
    map(([comp]) => comp)
  };
}

function calculateDistribution(ratings) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach((r) => {
    dist[Math.round(r)]++;
  });
  return dist;
}

/**
 * @swagger
 * /api/assessments/{id}/multi-rater-results:
 *   get:
 *     summary: Get comprehensive multi-rater (360) results
 *     description: Returns detailed comparison of self vs others ratings with insights
 *     tags: [Assessments, Results, 360 Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Multi-rater results with comparison analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 selfAssessment:
 *                   type: object
 *                 multiRaterResults:
 *                   type: object
 *                   properties:
 *                     aggregated:
 *                       type: object
 *                     comparison:
 *                       type: object
 *                     visualization:
 *                       type: object
 *                 comparisonInsights:
 *                   type: object
 */