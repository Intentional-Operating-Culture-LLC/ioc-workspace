import { NextResponse } from 'next/server';
import { createProtectedRoute, validateOrganizationAccess, ErrorResponses } from "@ioc/shared/api-utils";

// Comprehensive facet definitions with subfacets
const OCEAN_FACET_DETAILS = {
  O: {
    name: 'Openness to Experience',
    description: 'Appreciation for art, emotion, adventure, unusual ideas, imagination, curiosity, and variety of experience',
    facets: {
      O1: {
        name: 'Fantasy',
        description: 'Vivid imagination and fantasy life',
        subfacets: {
          'O1.1': 'Imaginative thinking',
          'O1.2': 'Daydreaming tendency',
          'O1.3': 'Creative visualization'
        },
        highScore: 'Rich inner life, creative imagination',
        lowScore: 'Practical, grounded in reality'
      },
      O2: {
        name: 'Aesthetics',
        description: 'Appreciation for art and beauty',
        subfacets: {
          'O2.1': 'Artistic appreciation',
          'O2.2': 'Sensitivity to beauty',
          'O2.3': 'Emotional response to art'
        },
        highScore: 'Deep appreciation for beauty and art',
        lowScore: 'Less moved by artistic expression'
      },
      O3: {
        name: 'Feelings',
        description: 'Openness to inner emotional states',
        subfacets: {
          'O3.1': 'Emotional awareness',
          'O3.2': 'Emotional depth',
          'O3.3': 'Emotional expression'
        },
        highScore: 'In touch with emotions, values feelings',
        lowScore: 'Less aware of emotional states'
      },
      O4: {
        name: 'Actions',
        description: 'Willingness to try new activities',
        subfacets: {
          'O4.1': 'Behavioral variety',
          'O4.2': 'Novelty seeking',
          'O4.3': 'Experimentation'
        },
        highScore: 'Seeks variety and new experiences',
        lowScore: 'Prefers familiar routines'
      },
      O5: {
        name: 'Ideas',
        description: 'Intellectual curiosity',
        subfacets: {
          'O5.1': 'Abstract thinking',
          'O5.2': 'Philosophical interest',
          'O5.3': 'Intellectual engagement'
        },
        highScore: 'Enjoys intellectual challenges',
        lowScore: 'Prefers concrete over abstract'
      },
      O6: {
        name: 'Values',
        description: 'Readiness to reexamine values',
        subfacets: {
          'O6.1': 'Social liberalism',
          'O6.2': 'Tolerance for ambiguity',
          'O6.3': 'Cultural openness'
        },
        highScore: 'Questions authority and convention',
        lowScore: 'Respects tradition and authority'
      }
    }
  },
  C: {
    name: 'Conscientiousness',
    description: 'Tendency to be organized, responsible, and hardworking',
    facets: {
      C1: {
        name: 'Competence',
        description: 'Belief in one\'s efficacy',
        subfacets: {
          'C1.1': 'Self-efficacy',
          'C1.2': 'Personal effectiveness',
          'C1.3': 'Capability confidence'
        },
        highScore: 'Feels capable and effective',
        lowScore: 'Lower confidence in abilities'
      },
      C2: {
        name: 'Order',
        description: 'Personal organization',
        subfacets: {
          'C2.1': 'Physical organization',
          'C2.2': 'Time management',
          'C2.3': 'Systematic approach'
        },
        highScore: 'Well-organized and tidy',
        lowScore: 'Unconcerned with organization'
      },
      C3: {
        name: 'Dutifulness',
        description: 'Adherence to ethical principles',
        subfacets: {
          'C3.1': 'Moral obligation',
          'C3.2': 'Reliability',
          'C3.3': 'Ethical behavior'
        },
        highScore: 'Strong sense of duty',
        lowScore: 'More casual about obligations'
      },
      C4: {
        name: 'Achievement Striving',
        description: 'Ambition and motivation',
        subfacets: {
          'C4.1': 'Goal orientation',
          'C4.2': 'Persistence',
          'C4.3': 'Work ethic'
        },
        highScore: 'Driven to achieve',
        lowScore: 'Content with current achievements'
      },
      C5: {
        name: 'Self-Discipline',
        description: 'Ability to complete tasks',
        subfacets: {
          'C5.1': 'Task persistence',
          'C5.2': 'Resistance to distractions',
          'C5.3': 'Follow-through'
        },
        highScore: 'Persistent despite obstacles',
        lowScore: 'Easily discouraged or distracted'
      },
      C6: {
        name: 'Deliberation',
        description: 'Tendency to think before acting',
        subfacets: {
          'C6.1': 'Careful planning',
          'C6.2': 'Risk assessment',
          'C6.3': 'Impulse control'
        },
        highScore: 'Cautious and deliberate',
        lowScore: 'Spontaneous and impulsive'
      }
    }
  },
  E: {
    name: 'Extraversion',
    description: 'Outgoing, energetic, and sociable behavior',
    facets: {
      E1: {
        name: 'Warmth',
        description: 'Interest in and friendliness toward others',
        subfacets: {
          'E1.1': 'Affectionate nature',
          'E1.2': 'Social warmth',
          'E1.3': 'Interpersonal closeness'
        },
        highScore: 'Affectionate and friendly',
        lowScore: 'More formal and reserved'
      },
      E2: {
        name: 'Gregariousness',
        description: 'Preference for company',
        subfacets: {
          'E2.1': 'Social preference',
          'E2.2': 'Group enjoyment',
          'E2.3': 'Crowd comfort'
        },
        highScore: 'Enjoys being with people',
        lowScore: 'Prefers solitude or small groups'
      },
      E3: {
        name: 'Assertiveness',
        description: 'Social dominance and confidence',
        subfacets: {
          'E3.1': 'Leadership tendency',
          'E3.2': 'Social dominance',
          'E3.3': 'Speaking confidence'
        },
        highScore: 'Takes charge, speaks up',
        lowScore: 'Prefers to stay in background'
      },
      E4: {
        name: 'Activity',
        description: 'Pace of living and energy level',
        subfacets: {
          'E4.1': 'Energy level',
          'E4.2': 'Busy lifestyle',
          'E4.3': 'Physical vigor'
        },
        highScore: 'Fast-paced and energetic',
        lowScore: 'Leisurely and relaxed pace'
      },
      E5: {
        name: 'Excitement-Seeking',
        description: 'Need for stimulation',
        subfacets: {
          'E5.1': 'Thrill seeking',
          'E5.2': 'Risk taking',
          'E5.3': 'Stimulation need'
        },
        highScore: 'Craves excitement and stimulation',
        lowScore: 'Low need for thrills'
      },
      E6: {
        name: 'Positive Emotions',
        description: 'Tendency to experience joy',
        subfacets: {
          'E6.1': 'Cheerfulness',
          'E6.2': 'Enthusiasm',
          'E6.3': 'Optimism'
        },
        highScore: 'Cheerful and optimistic',
        lowScore: 'Less exuberant'
      }
    }
  },
  A: {
    name: 'Agreeableness',
    description: 'Cooperative and trusting behavior',
    facets: {
      A1: {
        name: 'Trust',
        description: 'Belief in others\' sincerity',
        subfacets: {
          'A1.1': 'Interpersonal trust',
          'A1.2': 'Assumption of goodwill',
          'A1.3': 'Faith in humanity'
        },
        highScore: 'Assumes the best in others',
        lowScore: 'Skeptical of others\' motives'
      },
      A2: {
        name: 'Straightforwardness',
        description: 'Frankness and sincerity',
        subfacets: {
          'A2.1': 'Honesty',
          'A2.2': 'Directness',
          'A2.3': 'Authenticity'
        },
        highScore: 'Frank, sincere, and ingenuous',
        lowScore: 'Willing to manipulate others'
      },
      A3: {
        name: 'Altruism',
        description: 'Active concern for others',
        subfacets: {
          'A3.1': 'Helping behavior',
          'A3.2': 'Generosity',
          'A3.3': 'Selflessness'
        },
        highScore: 'Helpful and unselfish',
        lowScore: 'Reluctant to help others'
      },
      A4: {
        name: 'Compliance',
        description: 'Response to interpersonal conflict',
        subfacets: {
          'A4.1': 'Conflict avoidance',
          'A4.2': 'Deference',
          'A4.3': 'Cooperation'
        },
        highScore: 'Defers to others, avoids conflict',
        lowScore: 'Aggressive, competitive'
      },
      A5: {
        name: 'Modesty',
        description: 'Tendency to downplay achievements',
        subfacets: {
          'A5.1': 'Humility',
          'A5.2': 'Self-effacement',
          'A5.3': 'Unpretentiousness'
        },
        highScore: 'Humble and self-effacing',
        lowScore: 'Views self as superior'
      },
      A6: {
        name: 'Tender-Mindedness',
        description: 'Sympathy for others',
        subfacets: {
          'A6.1': 'Empathy',
          'A6.2': 'Compassion',
          'A6.3': 'Soft-heartedness'
        },
        highScore: 'Sympathetic and soft-hearted',
        lowScore: 'Hardheaded and rational'
      }
    }
  },
  N: {
    name: 'Neuroticism',
    description: 'Tendency to experience negative emotions',
    facets: {
      N1: {
        name: 'Anxiety',
        description: 'Level of anxiety and tension',
        subfacets: {
          'N1.1': 'Worry tendency',
          'N1.2': 'Nervous tension',
          'N1.3': 'Fearfulness'
        },
        highScore: 'Prone to worry and anxiety',
        lowScore: 'Calm and relaxed'
      },
      N2: {
        name: 'Angry Hostility',
        description: 'Tendency to experience anger',
        subfacets: {
          'N2.1': 'Irritability',
          'N2.2': 'Frustration',
          'N2.3': 'Bitterness'
        },
        highScore: 'Quick to anger',
        lowScore: 'Slow to anger'
      },
      N3: {
        name: 'Depression',
        description: 'Tendency to feel sad and discouraged',
        subfacets: {
          'N3.1': 'Sadness',
          'N3.2': 'Hopelessness',
          'N3.3': 'Loneliness'
        },
        highScore: 'Prone to sadness and dejection',
        lowScore: 'Rarely sad or depressed'
      },
      N4: {
        name: 'Self-Consciousness',
        description: 'Sensitivity to ridicule',
        subfacets: {
          'N4.1': 'Social anxiety',
          'N4.2': 'Embarrassment',
          'N4.3': 'Shame sensitivity'
        },
        highScore: 'Sensitive to what others think',
        lowScore: 'Comfortable in social situations'
      },
      N5: {
        name: 'Impulsiveness',
        description: 'Inability to control cravings',
        subfacets: {
          'N5.1': 'Urge control',
          'N5.2': 'Temptation resistance',
          'N5.3': 'Delay of gratification'
        },
        highScore: 'Unable to resist cravings',
        lowScore: 'Resists cravings and impulses'
      },
      N6: {
        name: 'Vulnerability',
        description: 'Ability to cope with stress',
        subfacets: {
          'N6.1': 'Stress tolerance',
          'N6.2': 'Panic tendency',
          'N6.3': 'Coping ability'
        },
        highScore: 'Feels unable to cope with stress',
        lowScore: 'Handles stress well'
      }
    }
  }
};

// GET /api/assessments/[id]/facet-breakdown
export const GET = createProtectedRoute(async (request, context) => {
  const { id: assessmentId } = context.params;

  try {
    // Get the assessment
    const { data: assessment, error: assessmentError } = await context.supabase.
    from('assessments').
    select(`
        id,
        type,
        organization_id,
        user_id,
        status,
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

    // Get assessment results with facet scores
    const { data: results, error: resultsError } = await context.supabase.
    from('assessment_results').
    select(`
        ocean_scores,
        facet_scores,
        subfacet_scores,
        percentile_ranks,
        created_at
      `).
    eq('assessment_id', assessmentId).
    order('created_at', { ascending: false }).
    limit(1).
    single();

    if (resultsError || !results) {
      return NextResponse.json({
        assessment: { id: assessmentId, status: assessment.status },
        message: 'No results available yet',
        facetBreakdown: null
      });
    }

    // Generate comprehensive facet breakdown
    const facetBreakdown = generateFacetBreakdown(
      results.ocean_scores,
      results.facet_scores,
      results.subfacet_scores,
      results.percentile_ranks
    );

    // Get comparative data for context
    const comparativeAnalysis = await getComparativeAnalysis(
      context.supabase,
      assessment.user_id,
      results.facet_scores
    );

    // Generate insights and recommendations
    const insights = generateFacetInsights(facetBreakdown, comparativeAnalysis);

    return NextResponse.json({
      assessment: {
        id: assessmentId,
        type: assessment.type,
        userId: assessment.user_id
      },
      facetBreakdown,
      comparativeAnalysis,
      insights,
      metadata: {
        totalFacets: 30,
        assessedFacets: Object.keys(results.facet_scores || {}).length,
        includesSubfacets: !!results.subfacet_scores,
        analysisDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in facet breakdown:', error);
    return ErrorResponses.internalError('Failed to generate facet breakdown');
  }
});

// Helper functions

function generateFacetBreakdown(oceanScores, facetScores, subfacetScores, percentiles) {
  const breakdown = {
    traits: {},
    summary: {
      dominantFacets: [],
      weakFacets: [],
      balancedTraits: [],
      facetVariability: {}
    }
  };

  // Process each trait
  Object.entries(OCEAN_FACET_DETAILS).forEach(([trait, traitInfo]) => {
    const traitScore = oceanScores?.[trait] || 50;
    const traitPercentile = percentiles?.[trait] || 50;

    breakdown.traits[trait] = {
      name: traitInfo.name,
      description: traitInfo.description,
      score: traitScore,
      percentile: traitPercentile,
      level: getScoreLevel(traitScore),
      facets: {}
    };

    // Process facets for this trait
    Object.entries(traitInfo.facets).forEach(([facetCode, facetInfo]) => {
      const facetScore = facetScores?.[facetCode] || 50;
      const facetLevel = getScoreLevel(facetScore);

      breakdown.traits[trait].facets[facetCode] = {
        code: facetCode,
        name: facetInfo.name,
        description: facetInfo.description,
        score: facetScore,
        level: facetLevel,
        interpretation: facetLevel === 'High' || facetLevel === 'Very High' ?
        facetInfo.highScore :
        facetLevel === 'Low' || facetLevel === 'Very Low' ?
        facetInfo.lowScore :
        'Average range',
        deviationFromTrait: facetScore - traitScore,
        subfacets: {}
      };

      // Track dominant and weak facets
      if (facetScore >= 70) {
        breakdown.summary.dominantFacets.push({
          code: facetCode,
          name: facetInfo.name,
          trait,
          score: facetScore
        });
      } else if (facetScore <= 30) {
        breakdown.summary.weakFacets.push({
          code: facetCode,
          name: facetInfo.name,
          trait,
          score: facetScore
        });
      }

      // Process subfacets if available
      if (subfacetScores) {
        Object.entries(facetInfo.subfacets).forEach(([subfacetCode, subfacetName]) => {
          const subfacetScore = subfacetScores[subfacetCode];
          if (subfacetScore !== undefined) {
            breakdown.traits[trait].facets[facetCode].subfacets[subfacetCode] = {
              code: subfacetCode,
              name: subfacetName,
              score: subfacetScore,
              level: getScoreLevel(subfacetScore)
            };
          }
        });
      }
    });

    // Calculate facet variability for this trait
    const facetScoresArray = Object.values(breakdown.traits[trait].facets).
    map((f) => f.score);
    breakdown.summary.facetVariability[trait] = calculateFacetVariability(facetScoresArray);

    // Determine if trait is balanced
    if (breakdown.summary.facetVariability[trait].isBalanced) {
      breakdown.summary.balancedTraits.push(trait);
    }
  });

  // Sort dominant and weak facets by score
  breakdown.summary.dominantFacets.sort((a, b) => b.score - a.score);
  breakdown.summary.weakFacets.sort((a, b) => a.score - b.score);

  // Add overall patterns
  breakdown.patterns = identifyFacetPatterns(breakdown);

  return breakdown;
}

function getScoreLevel(score) {
  if (score >= 70) return 'Very High';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Average';
  if (score >= 30) return 'Low';
  return 'Very Low';
}

function calculateFacetVariability(facetScores) {
  if (!facetScores || facetScores.length === 0) {
    return { mean: 0, stdDev: 0, range: 0, isBalanced: true };
  }

  const mean = facetScores.reduce((a, b) => a + b, 0) / facetScores.length;
  const variance = facetScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / facetScores.length;
  const stdDev = Math.sqrt(variance);
  const range = Math.max(...facetScores) - Math.min(...facetScores);

  return {
    mean: Math.round(mean),
    stdDev: Math.round(stdDev * 10) / 10,
    range,
    isBalanced: stdDev < 10 && range < 30
  };
}

function identifyFacetPatterns(breakdown) {
  const patterns = {
    crossTraitPatterns: [],
    compensatoryPatterns: [],
    reinforcingPatterns: []
  };

  // Look for cross-trait patterns
  // Example: High O5 (Ideas) + High C1 (Competence) = Intellectual Achievement
  if (breakdown.traits.O?.facets.O5?.score >= 65 &&
  breakdown.traits.C?.facets.C1?.score >= 65) {
    patterns.crossTraitPatterns.push({
      name: 'Intellectual Achievement',
      description: 'High intellectual curiosity combined with strong competence',
      facets: ['O5', 'C1']
    });
  }

  // Example: High E3 (Assertiveness) + Low A4 (Compliance) = Strong Leadership
  if (breakdown.traits.E?.facets.E3?.score >= 65 &&
  breakdown.traits.A?.facets.A4?.score <= 35) {
    patterns.crossTraitPatterns.push({
      name: 'Dominant Leadership',
      description: 'High assertiveness with low compliance suggests strong leadership',
      facets: ['E3', 'A4']
    });
  }

  // Look for compensatory patterns within traits
  Object.entries(breakdown.traits).forEach(([trait, traitData]) => {
    const facets = Object.values(traitData.facets);
    const highFacets = facets.filter((f) => f.score >= 65);
    const lowFacets = facets.filter((f) => f.score <= 35);

    if (highFacets.length > 0 && lowFacets.length > 0) {
      patterns.compensatoryPatterns.push({
        trait,
        highFacets: highFacets.map((f) => ({ code: f.code, name: f.name })),
        lowFacets: lowFacets.map((f) => ({ code: f.code, name: f.name })),
        implication: `Mixed profile in ${traitData.name} suggests selective expression`
      });
    }
  });

  // Look for reinforcing patterns
  // Example: All E facets high = Strong extraversion
  Object.entries(breakdown.traits).forEach(([trait, traitData]) => {
    const facets = Object.values(traitData.facets);
    const allHigh = facets.every((f) => f.score >= 60);
    const allLow = facets.every((f) => f.score <= 40);

    if (allHigh || allLow) {
      patterns.reinforcingPatterns.push({
        trait,
        direction: allHigh ? 'high' : 'low',
        strength: 'consistent',
        implication: `${allHigh ? 'Very strong' : 'Very low'} ${traitData.name} across all facets`
      });
    }
  });

  return patterns;
}

async function getComparativeAnalysis(supabase, userId, currentFacetScores) {
  try {
    // Get user's historical facet scores
    const { data: historicalData } = await supabase.
    from('assessment_results').
    select('facet_scores, created_at').
    eq('user_id', userId).
    neq('facet_scores', null).
    order('created_at', { ascending: false }).
    limit(5);

    // Get peer comparison data (anonymized)
    const { data: peerData } = await supabase.
    rpc('get_facet_peer_comparison', {
      user_id: userId,
      limit: 100
    });

    const analysis = {
      temporal: analyzeTemporalChanges(currentFacetScores, historicalData),
      peer: analyzePeerComparison(currentFacetScores, peerData),
      stability: calculateFacetStability(historicalData)
    };

    return analysis;
  } catch (error) {
    console.error('Error in comparative analysis:', error);
    return null;
  }
}

function analyzeTemporalChanges(currentScores, historicalData) {
  if (!historicalData || historicalData.length < 2) {
    return { hasHistory: false };
  }

  const changes = {
    hasHistory: true,
    increasingFacets: [],
    decreasingFacets: [],
    stableFacets: [],
    volatileFacets: []
  };

  Object.entries(currentScores).forEach(([facet, currentScore]) => {
    const historicalScores = historicalData.
    map((h) => h.facet_scores?.[facet]).
    filter((score) => score !== undefined);

    if (historicalScores.length >= 2) {
      const oldestScore = historicalScores[historicalScores.length - 1];
      const change = currentScore - oldestScore;
      const volatility = calculateVolatility(historicalScores);

      if (change > 10) {
        changes.increasingFacets.push({ facet, change, from: oldestScore, to: currentScore });
      } else if (change < -10) {
        changes.decreasingFacets.push({ facet, change, from: oldestScore, to: currentScore });
      } else {
        changes.stableFacets.push({ facet, score: currentScore });
      }

      if (volatility > 15) {
        changes.volatileFacets.push({ facet, volatility });
      }
    }
  });

  return changes;
}

function calculateVolatility(scores) {
  if (scores.length < 2) return 0;

  let sumOfChanges = 0;
  for (let i = 1; i < scores.length; i++) {
    sumOfChanges += Math.abs(scores[i] - scores[i - 1]);
  }

  return sumOfChanges / (scores.length - 1);
}

function analyzePeerComparison(currentScores, peerData) {
  if (!peerData || peerData.length === 0) {
    return { hasComparison: false };
  }

  const comparison = {
    hasComparison: true,
    abovePeerAverage: [],
    belowPeerAverage: [],
    unique: []
  };

  Object.entries(currentScores).forEach(([facet, score]) => {
    const peerScores = peerData.
    map((p) => p.facet_scores?.[facet]).
    filter((s) => s !== undefined);

    if (peerScores.length > 0) {
      const peerMean = peerScores.reduce((a, b) => a + b, 0) / peerScores.length;
      const peerStdDev = Math.sqrt(
        peerScores.reduce((sum, s) => sum + Math.pow(s - peerMean, 2), 0) / peerScores.length
      );

      const zScore = (score - peerMean) / peerStdDev;

      if (zScore > 1) {
        comparison.abovePeerAverage.push({
          facet,
          score,
          peerMean: Math.round(peerMean),
          percentile: estimatePercentileFromZ(zScore)
        });
      } else if (zScore < -1) {
        comparison.belowPeerAverage.push({
          facet,
          score,
          peerMean: Math.round(peerMean),
          percentile: estimatePercentileFromZ(zScore)
        });
      }

      if (Math.abs(zScore) > 2) {
        comparison.unique.push({
          facet,
          description: zScore > 0 ? 'Exceptionally high' : 'Exceptionally low',
          rarity: `Top ${zScore > 0 ? 100 - estimatePercentileFromZ(zScore) : estimatePercentileFromZ(zScore)}%`
        });
      }
    }
  });

  return comparison;
}

function estimatePercentileFromZ(zScore) {
  // Approximate normal CDF
  const sign = zScore < 0 ? -1 : 1;
  const z = Math.abs(zScore);
  const a1 = 0.31938153;
  const a2 = -0.356563782;
  const a3 = 1.781477937;
  const a4 = -1.821255978;
  const a5 = 1.330274429;
  const p = 0.2316419;

  const t = 1 / (1 + p * z);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);

  return Math.round((sign === 1 ? y : 1 - y) * 100);
}

function calculateFacetStability(historicalData) {
  if (!historicalData || historicalData.length < 3) {
    return { hasStabilityData: false };
  }

  const stability = {
    hasStabilityData: true,
    stableFacets: [],
    unstableFacets: [],
    overallStability: 0
  };

  const allFacets = new Set();
  historicalData.forEach((h) => {
    if (h.facet_scores) {
      Object.keys(h.facet_scores).forEach((f) => allFacets.add(f));
    }
  });

  let totalStability = 0;
  let facetCount = 0;

  allFacets.forEach((facet) => {
    const scores = historicalData.
    map((h) => h.facet_scores?.[facet]).
    filter((s) => s !== undefined);

    if (scores.length >= 3) {
      const stdDev = Math.sqrt(
        scores.reduce((sum, score, _, arr) => {
          const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
          return sum + Math.pow(score - mean, 2);
        }, 0) / scores.length
      );

      const stabilityScore = 100 - Math.min(stdDev * 2, 100);

      if (stabilityScore >= 80) {
        stability.stableFacets.push({ facet, stabilityScore });
      } else if (stabilityScore < 60) {
        stability.unstableFacets.push({ facet, stabilityScore });
      }

      totalStability += stabilityScore;
      facetCount++;
    }
  });

  stability.overallStability = facetCount > 0 ? Math.round(totalStability / facetCount) : 0;

  return stability;
}

function generateFacetInsights(breakdown, comparativeAnalysis) {
  const insights = {
    keyFindings: [],
    developmentAreas: [],
    strengths: [],
    recommendations: []
  };

  // Analyze dominant facets
  if (breakdown.summary.dominantFacets.length > 0) {
    const topFacets = breakdown.summary.dominantFacets.slice(0, 3);
    insights.keyFindings.push({
      type: 'dominant_facets',
      title: 'Dominant Personality Facets',
      description: `Your strongest facets are ${topFacets.map((f) => f.name).join(', ')}`,
      facets: topFacets
    });

    topFacets.forEach((facet) => {
      insights.strengths.push({
        facet: facet.code,
        name: facet.name,
        implication: getStrengthImplication(facet.code, facet.score)
      });
    });
  }

  // Analyze weak facets
  if (breakdown.summary.weakFacets.length > 0) {
    const bottomFacets = breakdown.summary.weakFacets.slice(0, 3);
    insights.developmentAreas.push({
      type: 'weak_facets',
      title: 'Areas for Development',
      description: 'Consider strengthening these facets',
      facets: bottomFacets,
      recommendations: bottomFacets.map((f) => getDevelopmentRecommendation(f.code))
    });
  }

  // Analyze patterns
  if (breakdown.patterns.crossTraitPatterns.length > 0) {
    insights.keyFindings.push({
      type: 'cross_trait_patterns',
      title: 'Personality Patterns',
      patterns: breakdown.patterns.crossTraitPatterns
    });
  }

  // Analyze temporal changes
  if (comparativeAnalysis?.temporal?.hasHistory) {
    if (comparativeAnalysis.temporal.increasingFacets.length > 0) {
      insights.keyFindings.push({
        type: 'growth',
        title: 'Growing Facets',
        description: 'These facets have shown significant improvement',
        facets: comparativeAnalysis.temporal.increasingFacets
      });
    }

    if (comparativeAnalysis.temporal.volatileFacets.length > 0) {
      insights.keyFindings.push({
        type: 'volatility',
        title: 'Variable Facets',
        description: 'These facets show high variability over time',
        facets: comparativeAnalysis.temporal.volatileFacets,
        recommendation: 'Focus on stabilizing these aspects of personality'
      });
    }
  }

  // Generate specific recommendations based on facet combinations
  insights.recommendations = generateSpecificRecommendations(breakdown);

  return insights;
}

function getStrengthImplication(facetCode, score) {
  const implications = {
    // Openness facets
    O1: 'Creative problem-solving and innovative thinking',
    O2: 'Appreciation for beauty enhances life satisfaction',
    O3: 'Emotional intelligence and self-awareness',
    O4: 'Adaptability and willingness to change',
    O5: 'Intellectual leadership and strategic thinking',
    O6: 'Cultural sensitivity and progressive thinking',

    // Conscientiousness facets
    C1: 'Self-confidence and effectiveness in tasks',
    C2: 'Excellent organizational skills',
    C3: 'Trustworthiness and reliability',
    C4: 'High achievement motivation',
    C5: 'Strong willpower and persistence',
    C6: 'Thoughtful decision-making',

    // Extraversion facets
    E1: 'Builds warm relationships easily',
    E2: 'Thrives in social environments',
    E3: 'Natural leadership abilities',
    E4: 'High energy and productivity',
    E5: 'Brings excitement to teams',
    E6: 'Positive influence on others',

    // Agreeableness facets
    A1: 'Builds trust in relationships',
    A2: 'Honest and authentic communication',
    A3: 'Strong helping orientation',
    A4: 'Excellent team player',
    A5: 'Humble leadership style',
    A6: 'Empathetic and caring',

    // Neuroticism facets (reframed positively for high scores)
    N1: 'Heightened awareness of risks',
    N2: 'Passionate about justice',
    N3: 'Deep emotional capacity',
    N4: 'Sensitive to social dynamics',
    N5: 'Spontaneous and expressive',
    N6: 'Seeks support and collaboration'
  };

  return implications[facetCode] || 'Distinctive personality characteristic';
}

function getDevelopmentRecommendation(facetCode) {
  const recommendations = {
    // Openness facets
    O1: 'Engage in creative activities like art, writing, or brainstorming',
    O2: 'Visit museums, attend concerts, or explore nature',
    O3: 'Practice mindfulness and emotional awareness exercises',
    O4: 'Try new activities or hobbies regularly',
    O5: 'Read widely and engage in intellectual discussions',
    O6: 'Expose yourself to different cultures and perspectives',

    // Conscientiousness facets
    C1: 'Set and achieve small goals to build confidence',
    C2: 'Use organizational tools and develop routines',
    C3: 'Practice keeping commitments, even small ones',
    C4: 'Set clear, meaningful goals with milestones',
    C5: 'Use time-blocking and remove distractions',
    C6: 'Practice decision-making frameworks',

    // Extraversion facets
    E1: 'Practice active listening and showing interest in others',
    E2: 'Join groups or clubs aligned with your interests',
    E3: 'Take on small leadership roles to build confidence',
    E4: 'Increase physical activity and energy management',
    E5: 'Safely explore new experiences',
    E6: 'Practice gratitude and positive thinking',

    // Agreeableness facets
    A1: 'Start with small acts of trust and build gradually',
    A2: 'Practice honest but tactful communication',
    A3: 'Volunteer or help others regularly',
    A4: 'Learn conflict resolution techniques',
    A5: 'Acknowledge your achievements appropriately',
    A6: 'Develop empathy through perspective-taking',

    // Neuroticism facets
    N1: 'Learn anxiety management techniques like deep breathing',
    N2: 'Practice anger management and communication skills',
    N3: 'Engage in mood-boosting activities and seek support',
    N4: 'Build confidence through gradual social exposure',
    N5: 'Develop impulse control strategies',
    N6: 'Build resilience through stress management techniques'
  };

  return recommendations[facetCode] || 'Work with a coach to develop this area';
}

function generateSpecificRecommendations(breakdown) {
  const recommendations = [];

  // Check for specific facet combinations that suggest actionable insights
  Object.entries(breakdown.traits).forEach(([trait, traitData]) => {
    const facetScores = Object.values(traitData.facets).map((f) => ({
      code: f.code,
      score: f.score,
      deviation: f.deviationFromTrait
    }));

    // Large deviations within a trait
    const largeDeviations = facetScores.filter((f) => Math.abs(f.deviation) > 20);
    if (largeDeviations.length > 0) {
      recommendations.push({
        type: 'balance',
        priority: 'medium',
        description: `Work on balancing facets within ${traitData.name}`,
        specific: largeDeviations.map((f) => ({
          facet: f.code,
          action: f.deviation > 0 ? 'Consider moderating' : 'Consider developing'
        }))
      });
    }
  });

  // Leadership development recommendations
  if (breakdown.traits.E?.facets.E3?.score >= 65 && breakdown.traits.C?.facets.C4?.score >= 65) {
    recommendations.push({
      type: 'leadership',
      priority: 'high',
      description: 'Strong leadership potential identified',
      action: 'Consider leadership development programs to maximize your assertiveness and achievement orientation'
    });
  }

  // Stress management recommendations
  if (breakdown.traits.N?.facets.N1?.score >= 65 || breakdown.traits.N?.facets.N6?.score >= 65) {
    recommendations.push({
      type: 'wellbeing',
      priority: 'high',
      description: 'Stress management may be beneficial',
      action: 'Develop stress reduction techniques and build emotional resilience'
    });
  }

  // Innovation recommendations
  if (breakdown.traits.O?.facets.O5?.score >= 65 && breakdown.traits.O?.facets.O4?.score >= 65) {
    recommendations.push({
      type: 'career',
      priority: 'medium',
      description: 'High innovation potential',
      action: 'Seek roles that leverage your intellectual curiosity and openness to new experiences'
    });
  }

  return recommendations.sort((a, b) => {
    const priority = { high: 3, medium: 2, low: 1 };
    return priority[b.priority] - priority[a.priority];
  });
}

/**
 * @swagger
 * /api/assessments/{id}/facet-breakdown:
 *   get:
 *     summary: Get detailed OCEAN facet breakdown
 *     description: Returns comprehensive analysis of all 30 OCEAN facets with subfacets, patterns, and comparative analysis
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
 *     responses:
 *       200:
 *         description: Detailed facet breakdown with insights
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 facetBreakdown:
 *                   type: object
 *                   properties:
 *                     traits:
 *                       type: object
 *                     summary:
 *                       type: object
 *                     patterns:
 *                       type: object
 *                 comparativeAnalysis:
 *                   type: object
 *                 insights:
 *                   type: object
 */