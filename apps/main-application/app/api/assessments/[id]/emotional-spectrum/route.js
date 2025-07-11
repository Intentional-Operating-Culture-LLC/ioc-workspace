import { NextResponse } from 'next/server';
import { createProtectedRoute, validateOrganizationAccess, ErrorResponses } from "@ioc/shared/api-utils";

// Emotional spectrum mapping based on OCEAN traits
const EMOTIONAL_SPECTRUM = {
  positive: {
    joy: {
      name: 'Joy',
      oceanMapping: { E: 0.6, N: -0.3, O: 0.1 },
      facets: ['E6', 'E1', 'N3'],
      description: 'Capacity for happiness and delight'
    },
    enthusiasm: {
      name: 'Enthusiasm',
      oceanMapping: { E: 0.7, O: 0.2, C: 0.1 },
      facets: ['E6', 'E4', 'O4'],
      description: 'Energy and excitement for life'
    },
    serenity: {
      name: 'Serenity',
      oceanMapping: { N: -0.6, A: 0.3, C: 0.1 },
      facets: ['N1', 'N6', 'A1'],
      description: 'Inner peace and calmness'
    },
    gratitude: {
      name: 'Gratitude',
      oceanMapping: { A: 0.5, E: 0.3, N: -0.2 },
      facets: ['A3', 'E6', 'A6'],
      description: 'Appreciation and thankfulness'
    },
    love: {
      name: 'Love',
      oceanMapping: { A: 0.6, E: 0.3, O: 0.1 },
      facets: ['A1', 'E1', 'A6'],
      description: 'Capacity for deep affection'
    },
    pride: {
      name: 'Pride',
      oceanMapping: { C: 0.5, E: 0.3, N: -0.2 },
      facets: ['C4', 'E3', 'C1'],
      description: 'Healthy self-esteem and achievement'
    }
  },
  negative: {
    anxiety: {
      name: 'Anxiety',
      oceanMapping: { N: 0.7, E: -0.2, C: -0.1 },
      facets: ['N1', 'N6', 'N4'],
      description: 'Worry and nervous tension'
    },
    anger: {
      name: 'Anger',
      oceanMapping: { N: 0.6, A: -0.3, C: -0.1 },
      facets: ['N2', 'A4', 'A2'],
      description: 'Frustration and hostility'
    },
    sadness: {
      name: 'Sadness',
      oceanMapping: { N: 0.7, E: -0.2, O: -0.1 },
      facets: ['N3', 'E6', 'E1'],
      description: 'Sorrow and melancholy'
    },
    fear: {
      name: 'Fear',
      oceanMapping: { N: 0.6, E: -0.3, O: -0.1 },
      facets: ['N1', 'N6', 'E5'],
      description: 'Apprehension and dread'
    },
    shame: {
      name: 'Shame',
      oceanMapping: { N: 0.5, A: 0.3, E: -0.2 },
      facets: ['N4', 'A5', 'E3'],
      description: 'Self-consciousness and embarrassment'
    },
    guilt: {
      name: 'Guilt',
      oceanMapping: { N: 0.4, A: 0.4, C: 0.2 },
      facets: ['N3', 'A3', 'C3'],
      description: 'Remorse and self-blame'
    }
  },
  complex: {
    ambivalence: {
      name: 'Ambivalence',
      oceanMapping: { O: 0.4, N: 0.3, A: 0.3 },
      facets: ['O3', 'N5', 'A4'],
      description: 'Mixed or conflicting emotions'
    },
    nostalgia: {
      name: 'Nostalgia',
      oceanMapping: { O: 0.5, N: 0.3, E: -0.2 },
      facets: ['O1', 'O3', 'N3'],
      description: 'Bittersweet longing for the past'
    },
    awe: {
      name: 'Awe',
      oceanMapping: { O: 0.7, E: 0.2, A: 0.1 },
      facets: ['O2', 'O5', 'O6'],
      description: 'Wonder and reverence'
    },
    curiosity: {
      name: 'Curiosity',
      oceanMapping: { O: 0.8, E: 0.1, C: 0.1 },
      facets: ['O5', 'O4', 'O1'],
      description: 'Desire to learn and explore'
    },
    empathy: {
      name: 'Empathy',
      oceanMapping: { A: 0.6, O: 0.3, N: 0.1 },
      facets: ['A6', 'O3', 'A3'],
      description: 'Understanding others\' emotions'
    },
    flow: {
      name: 'Flow',
      oceanMapping: { C: 0.5, O: 0.3, N: -0.2 },
      facets: ['C5', 'O4', 'C1'],
      description: 'Complete absorption in activity'
    }
  }
};

// Emotional regulation strategies
const REGULATION_STRATEGIES = {
  cognitive: {
    name: 'Cognitive Strategies',
    techniques: ['reframing', 'perspective-taking', 'problem-solving'],
    oceanProfile: { O: 'high', C: 'high', N: 'moderate' }
  },
  behavioral: {
    name: 'Behavioral Strategies',
    techniques: ['exercise', 'relaxation', 'social-support'],
    oceanProfile: { E: 'high', C: 'moderate', A: 'high' }
  },
  experiential: {
    name: 'Experiential Strategies',
    techniques: ['mindfulness', 'acceptance', 'emotional-expression'],
    oceanProfile: { O: 'high', A: 'moderate', N: 'low' }
  },
  interpersonal: {
    name: 'Interpersonal Strategies',
    techniques: ['communication', 'boundary-setting', 'conflict-resolution'],
    oceanProfile: { E: 'moderate', A: 'high', C: 'moderate' }
  }
};

// GET /api/assessments/[id]/emotional-spectrum
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
        status
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

    // Get OCEAN scores and facet scores
    const { data: results, error: resultsError } = await context.supabase.
    from('assessment_results').
    select(`
        ocean_scores,
        facet_scores,
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
        emotionalSpectrum: null
      });
    }

    // Calculate emotional spectrum
    const emotionalSpectrum = calculateEmotionalSpectrum(
      results.ocean_scores,
      results.facet_scores
    );

    // Get emotional regulation assessment if available
    const { data: emotionalRegulation } = await context.supabase.
    from('assessment_results').
    select('dimension_scores, strategy_effectiveness').
    eq('assessment_id', assessmentId).
    eq('assessment_type', 'emotional_regulation').
    single();

    // Generate emotional profile
    const emotionalProfile = generateEmotionalProfile(
      emotionalSpectrum,
      results.ocean_scores,
      emotionalRegulation
    );

    // Get historical emotional data for trends
    const { data: historicalData } = await context.supabase.
    from('emotional_spectrum_history').
    select('spectrum_scores, recorded_at').
    eq('user_id', assessment.user_id).
    order('recorded_at', { ascending: false }).
    limit(10);

    // Calculate emotional trends
    const emotionalTrends = calculateEmotionalTrends(
      emotionalSpectrum,
      historicalData
    );

    // Store current emotional spectrum
    await storeEmotionalSpectrum(context.supabase, {
      assessmentId,
      userId: assessment.user_id,
      organizationId: assessment.organization_id,
      spectrum: emotionalSpectrum
    });

    return NextResponse.json({
      assessment: {
        id: assessmentId,
        type: assessment.type,
        userId: assessment.user_id
      },
      emotionalSpectrum,
      emotionalProfile,
      emotionalTrends,
      recommendations: generateEmotionalRecommendations(
        emotionalSpectrum,
        emotionalProfile,
        results.ocean_scores
      ),
      metadata: {
        totalEmotions: Object.keys(emotionalSpectrum.scores).length,
        dominantValence: emotionalSpectrum.dominantValence,
        emotionalRange: emotionalSpectrum.range,
        calculatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in emotional spectrum analysis:', error);
    return ErrorResponses.internalError('Failed to analyze emotional spectrum');
  }
});

// Helper functions

function calculateEmotionalSpectrum(oceanScores, facetScores) {
  const spectrum = {
    scores: {},
    dominantEmotions: [],
    emotionalBalance: {},
    range: 0,
    complexity: 0,
    dominantValence: 'balanced'
  };

  // Calculate scores for each emotion
  Object.entries(EMOTIONAL_SPECTRUM).forEach(([category, emotions]) => {
    spectrum.scores[category] = {};

    Object.entries(emotions).forEach(([emotionKey, emotion]) => {
      let score = 50; // Base score

      // Apply OCEAN trait influences
      Object.entries(emotion.oceanMapping).forEach(([trait, weight]) => {
        const traitScore = oceanScores[trait] || 50;
        score += (traitScore - 50) * weight;
      });

      // Apply facet influences if available
      if (facetScores && emotion.facets) {
        let facetInfluence = 0;
        let facetCount = 0;

        emotion.facets.forEach((facetCode) => {
          if (facetScores[facetCode]) {
            facetInfluence += facetScores[facetCode];
            facetCount++;
          }
        });

        if (facetCount > 0) {
          const avgFacetScore = facetInfluence / facetCount;
          score = score * 0.7 + avgFacetScore * 0.3; // 30% facet influence
        }
      }

      // Normalize score to 0-100
      score = Math.max(0, Math.min(100, score));

      spectrum.scores[category][emotionKey] = {
        score: Math.round(score),
        name: emotion.name,
        description: emotion.description
      };

      // Track dominant emotions
      if (score >= 70) {
        spectrum.dominantEmotions.push({
          emotion: emotion.name,
          category,
          score: Math.round(score)
        });
      }
    });
  });

  // Calculate emotional balance
  const positiveScores = Object.values(spectrum.scores.positive).map((e) => e.score);
  const negativeScores = Object.values(spectrum.scores.negative).map((e) => e.score);
  const complexScores = Object.values(spectrum.scores.complex).map((e) => e.score);

  spectrum.emotionalBalance = {
    positive: Math.round(average(positiveScores)),
    negative: Math.round(average(negativeScores)),
    complex: Math.round(average(complexScores)),
    ratio: (average(positiveScores) / (average(negativeScores) || 1)).toFixed(2)
  };

  // Determine dominant valence
  if (spectrum.emotionalBalance.ratio > 1.5) {
    spectrum.dominantValence = 'positive';
  } else if (spectrum.emotionalBalance.ratio < 0.67) {
    spectrum.dominantValence = 'negative';
  } else {
    spectrum.dominantValence = 'balanced';
  }

  // Calculate emotional range (variability)
  const allScores = [...positiveScores, ...negativeScores, ...complexScores];
  spectrum.range = Math.round(standardDeviation(allScores));

  // Calculate emotional complexity
  const highEmotions = allScores.filter((s) => s >= 60).length;
  const emotionTypes = allScores.length;
  spectrum.complexity = Math.round(highEmotions / emotionTypes * 100);

  // Sort dominant emotions by score
  spectrum.dominantEmotions.sort((a, b) => b.score - a.score);

  return spectrum;
}

function generateEmotionalProfile(spectrum, oceanScores, emotionalRegulation) {
  const profile = {
    type: '',
    description: '',
    strengths: [],
    challenges: [],
    regulationStyle: '',
    emotionalIntelligence: {}
  };

  // Determine emotional profile type
  if (spectrum.dominantValence === 'positive' && spectrum.complexity > 60) {
    profile.type = 'Emotionally Rich Optimist';
    profile.description = 'You experience a wide range of emotions with a positive bias, suggesting high emotional intelligence and resilience.';
  } else if (spectrum.dominantValence === 'positive' && spectrum.complexity <= 60) {
    profile.type = 'Stable Optimist';
    profile.description = 'You maintain a consistently positive emotional state with good emotional stability.';
  } else if (spectrum.dominantValence === 'negative' && spectrum.complexity > 60) {
    profile.type = 'Emotionally Intense';
    profile.description = 'You experience emotions deeply and intensely, which can be both a source of insight and challenge.';
  } else if (spectrum.dominantValence === 'negative' && spectrum.complexity <= 60) {
    profile.type = 'Emotionally Challenged';
    profile.description = 'You may benefit from developing emotional regulation strategies to improve wellbeing.';
  } else if (spectrum.complexity > 70) {
    profile.type = 'Emotionally Complex';
    profile.description = 'You have a rich and nuanced emotional life with the ability to experience subtle emotions.';
  } else {
    profile.type = 'Emotionally Balanced';
    profile.description = 'You maintain good emotional equilibrium with moderate emotional experiences.';
  }

  // Identify emotional strengths
  const topPositive = Object.entries(spectrum.scores.positive).
  sort((a, b) => b[1].score - a[1].score).
  slice(0, 2);

  topPositive.forEach(([key, emotion]) => {
    if (emotion.score >= 65) {
      profile.strengths.push({
        emotion: emotion.name,
        score: emotion.score,
        benefit: getEmotionalStrength(key)
      });
    }
  });

  // Complex emotions as strengths
  const topComplex = Object.entries(spectrum.scores.complex).
  filter(([, e]) => e.score >= 70).
  map(([key, emotion]) => ({
    emotion: emotion.name,
    score: emotion.score,
    benefit: getEmotionalStrength(key)
  }));

  profile.strengths.push(...topComplex);

  // Identify emotional challenges
  const topNegative = Object.entries(spectrum.scores.negative).
  filter(([, e]) => e.score >= 65).
  map(([key, emotion]) => ({
    emotion: emotion.name,
    score: emotion.score,
    impact: getEmotionalChallenge(key)
  }));

  profile.challenges = topNegative;

  // Determine regulation style based on OCEAN
  profile.regulationStyle = determineRegulationStyle(oceanScores);

  // Calculate emotional intelligence components
  profile.emotionalIntelligence = {
    awareness: calculateEmotionalAwareness(spectrum, oceanScores),
    understanding: calculateEmotionalUnderstanding(oceanScores, spectrum.complexity),
    regulation: emotionalRegulation?.dimension_scores?.strategies || 50,
    expression: calculateEmotionalExpression(oceanScores, spectrum)
  };

  return profile;
}

function calculateEmotionalTrends(currentSpectrum, historicalData) {
  if (!historicalData || historicalData.length < 2) {
    return { hasTrends: false };
  }

  const trends = {
    hasTrends: true,
    valenceShift: '',
    increasingEmotions: [],
    decreasingEmotions: [],
    stabilityTrend: '',
    insights: []
  };

  // Compare with oldest data point
  const oldestData = historicalData[historicalData.length - 1];
  if (oldestData.spectrum_scores) {
    // Valence shift
    const oldBalance = oldestData.spectrum_scores.emotionalBalance;
    const currentBalance = currentSpectrum.emotionalBalance;

    if (currentBalance.ratio > oldBalance.ratio * 1.2) {
      trends.valenceShift = 'becoming more positive';
    } else if (currentBalance.ratio < oldBalance.ratio * 0.8) {
      trends.valenceShift = 'becoming more negative';
    } else {
      trends.valenceShift = 'stable';
    }

    // Individual emotion trends
    ['positive', 'negative', 'complex'].forEach((category) => {
      Object.entries(currentSpectrum.scores[category]).forEach(([emotionKey, emotion]) => {
        const oldScore = oldestData.spectrum_scores.scores?.[category]?.[emotionKey]?.score;
        if (oldScore) {
          const change = emotion.score - oldScore;
          if (change > 15) {
            trends.increasingEmotions.push({
              emotion: emotion.name,
              change,
              from: oldScore,
              to: emotion.score
            });
          } else if (change < -15) {
            trends.decreasingEmotions.push({
              emotion: emotion.name,
              change,
              from: oldScore,
              to: emotion.score
            });
          }
        }
      });
    });

    // Stability trend
    const rangeChange = currentSpectrum.range - (oldestData.spectrum_scores.range || 0);
    if (rangeChange > 10) {
      trends.stabilityTrend = 'increasing emotional variability';
    } else if (rangeChange < -10) {
      trends.stabilityTrend = 'increasing emotional stability';
    } else {
      trends.stabilityTrend = 'stable emotional range';
    }
  }

  // Generate insights
  if (trends.valenceShift === 'becoming more positive') {
    trends.insights.push({
      type: 'positive',
      message: 'Your emotional state has been shifting in a positive direction'
    });
  }

  if (trends.increasingEmotions.some((e) => ['Anxiety', 'Anger', 'Sadness'].includes(e.emotion))) {
    trends.insights.push({
      type: 'warning',
      message: 'Some negative emotions have been increasing - consider stress management'
    });
  }

  if (trends.stabilityTrend === 'increasing emotional stability') {
    trends.insights.push({
      type: 'positive',
      message: 'Your emotional regulation appears to be improving'
    });
  }

  return trends;
}

function generateEmotionalRecommendations(spectrum, profile, oceanScores) {
  const recommendations = [];

  // Recommendations based on dominant valence
  if (spectrum.dominantValence === 'negative') {
    recommendations.push({
      category: 'wellbeing',
      priority: 'high',
      title: 'Emotional Balance',
      actions: [
      'Practice gratitude exercises daily',
      'Engage in activities that bring joy',
      'Consider mindfulness meditation',
      'Seek social support when needed']

    });
  }

  // Recommendations for high anxiety
  if (spectrum.scores.negative.anxiety.score >= 70) {
    recommendations.push({
      category: 'stress-management',
      priority: 'high',
      title: 'Anxiety Management',
      actions: [
      'Learn breathing techniques',
      'Practice progressive muscle relaxation',
      'Consider cognitive restructuring',
      'Maintain regular exercise routine']

    });
  }

  // Recommendations based on regulation style
  const regulationRecs = getRegulationRecommendations(profile.regulationStyle, oceanScores);
  if (regulationRecs) {
    recommendations.push(regulationRecs);
  }

  // Recommendations for emotional complexity
  if (spectrum.complexity > 80) {
    recommendations.push({
      category: 'emotional-intelligence',
      priority: 'medium',
      title: 'Channel Emotional Complexity',
      actions: [
      'Use journaling to process complex emotions',
      'Engage in creative expression',
      'Practice emotional labeling',
      'Consider emotion-focused therapy']

    });
  }

  // Recommendations for low positive emotions
  if (spectrum.emotionalBalance.positive < 40) {
    recommendations.push({
      category: 'positive-psychology',
      priority: 'high',
      title: 'Cultivate Positive Emotions',
      actions: [
      'Practice acts of kindness',
      'Engage in meaningful activities',
      'Build positive relationships',
      'Celebrate small achievements']

    });
  }

  // Sort by priority
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

  return recommendations;
}

// Utility functions

function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr) {
  const mean = average(arr);
  const squaredDiffs = arr.map((x) => Math.pow(x - mean, 2));
  return Math.sqrt(average(squaredDiffs));
}

function getEmotionalStrength(emotionKey) {
  const strengths = {
    joy: 'Enhances resilience and social connections',
    enthusiasm: 'Drives motivation and inspires others',
    serenity: 'Promotes clear thinking and stress reduction',
    gratitude: 'Improves relationships and life satisfaction',
    love: 'Builds deep connections and meaning',
    pride: 'Fuels achievement and self-confidence',
    awe: 'Expands perspective and creativity',
    curiosity: 'Drives learning and innovation',
    empathy: 'Strengthens relationships and leadership',
    flow: 'Maximizes performance and satisfaction'
  };

  return strengths[emotionKey] || 'Positive emotional capacity';
}

function getEmotionalChallenge(emotionKey) {
  const challenges = {
    anxiety: 'May interfere with decision-making and wellbeing',
    anger: 'Can damage relationships and cloud judgment',
    sadness: 'May reduce motivation and energy',
    fear: 'Can limit opportunities and growth',
    shame: 'May harm self-esteem and social connections',
    guilt: 'Can lead to rumination and self-punishment'
  };

  return challenges[emotionKey] || 'May impact emotional wellbeing';
}

function determineRegulationStyle(oceanScores) {
  const { O, C, E, A, N } = oceanScores;

  if (O >= 60 && C >= 60) return 'cognitive';
  if (E >= 60 && A >= 60) return 'interpersonal';
  if (O >= 60 && N <= 40) return 'experiential';
  if (C >= 60 && E >= 50) return 'behavioral';

  return 'mixed';
}

function calculateEmotionalAwareness(spectrum, oceanScores) {
  // Higher O and moderate N suggest better emotional awareness
  const awarenessScore = oceanScores.O * 0.5 +
  Math.abs(oceanScores.N - 50) * 0.3 +
  spectrum.complexity * 0.2;

  return Math.min(100, Math.round(awarenessScore));
}

function calculateEmotionalUnderstanding(oceanScores, complexity) {
  // O and A contribute to understanding emotions
  const understandingScore = oceanScores.O * 0.4 +
  oceanScores.A * 0.3 +
  complexity * 0.3;

  return Math.min(100, Math.round(understandingScore));
}

function calculateEmotionalExpression(oceanScores, spectrum) {
  // E and emotional balance affect expression
  const expressionScore = oceanScores.E * 0.5 +
  spectrum.emotionalBalance.positive * 0.3 +
  oceanScores.A * 0.2;

  return Math.min(100, Math.round(expressionScore));
}

function getRegulationRecommendations(style, oceanScores) {
  const recommendations = {
    cognitive: {
      category: 'regulation',
      priority: 'medium',
      title: 'Cognitive Regulation Strategies',
      actions: [
      'Practice cognitive reframing techniques',
      'Use thought challenging for negative emotions',
      'Develop problem-solving skills',
      'Learn perspective-taking exercises']

    },
    behavioral: {
      category: 'regulation',
      priority: 'medium',
      title: 'Behavioral Regulation Strategies',
      actions: [
      'Engage in regular physical exercise',
      'Practice relaxation techniques',
      'Build healthy routines',
      'Use behavioral activation for low mood']

    },
    experiential: {
      category: 'regulation',
      priority: 'medium',
      title: 'Experiential Regulation Strategies',
      actions: [
      'Practice mindfulness meditation',
      'Learn acceptance techniques',
      'Engage with emotions non-judgmentally',
      'Use body-based awareness practices']

    },
    interpersonal: {
      category: 'regulation',
      priority: 'medium',
      title: 'Interpersonal Regulation Strategies',
      actions: [
      'Build supportive relationships',
      'Practice assertive communication',
      'Learn conflict resolution skills',
      'Seek support when overwhelmed']

    },
    mixed: {
      category: 'regulation',
      priority: 'medium',
      title: 'Diverse Regulation Strategies',
      actions: [
      'Experiment with different techniques',
      'Build a regulation toolkit',
      'Match strategies to situations',
      'Seek professional guidance if needed']

    }
  };

  return recommendations[style] || recommendations.mixed;
}

async function storeEmotionalSpectrum(supabase, data) {
  try {
    await supabase.from('emotional_spectrum_history').insert({
      assessment_id: data.assessmentId,
      user_id: data.userId,
      organization_id: data.organizationId,
      spectrum_scores: data.spectrum,
      recorded_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error storing emotional spectrum:', error);
  }
}

/**
 * @swagger
 * /api/assessments/{id}/emotional-spectrum:
 *   get:
 *     summary: Get emotional spectrum analysis
 *     description: Analyzes emotional tendencies based on OCEAN scores
 *     tags: [Assessments, Results, Emotions]
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
 *         description: Emotional spectrum analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 emotionalSpectrum:
 *                   type: object
 *                 emotionalProfile:
 *                   type: object
 *                 emotionalTrends:
 *                   type: object
 *                 recommendations:
 *                   type: array
 */