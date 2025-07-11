import { NextResponse } from 'next/server';
import { createProtectedRoute, validateOrganizationAccess, ErrorResponses } from "@ioc/shared/api-utils";
import { generatePDF } from "@ioc/shared/data-access/pdf";

// GET /api/assessments/[id]/ocean-report - Generate comprehensive OCEAN report
export const GET = createProtectedRoute(async (request, context) => {
  const { id: assessmentId } = context.params;

  // Get query parameters
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';
  const include360 = searchParams.get('include360') === 'true';
  const includeNorms = searchParams.get('includeNorms') !== 'false';
  const language = searchParams.get('language') || 'en';

  try {
    // Get assessment details
    const { data: assessment, error: assessmentError } = await context.supabase.
    from('assessments').
    select(`
        id,
        type,
        title,
        organization_id,
        user_id,
        status,
        created_at,
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

    // Check if user can view full report
    const canViewFullReport = context.userId === assessment.user_id ||
    ['owner', 'admin'].includes(context.userRole);

    if (!canViewFullReport) {
      return ErrorResponses.forbidden('You do not have permission to view this report');
    }

    // Get user information
    const { data: userProfile } = await context.supabase.
    from('users').
    select('full_name, email, job_title, organization:organizations(name)').
    eq('id', assessment.user_id).
    single();

    // Get OCEAN results
    const { data: results } = await context.supabase.
    from('assessment_results').
    select(`
        ocean_scores,
        facet_scores,
        subfacet_scores,
        percentile_ranks,
        validity_indicators,
        interpretation_text,
        created_at
      `).
    eq('assessment_id', assessmentId).
    order('created_at', { ascending: false }).
    limit(1).
    single();

    if (!results) {
      return ErrorResponses.notFound('No results found for this assessment');
    }

    // Get 360 feedback if requested and available
    let multiRaterData = null;
    if (include360) {
      multiRaterData = await get360FeedbackData(context.supabase, assessmentId);
    }

    // Generate comprehensive report
    const report = await generateComprehensiveOceanReport({
      assessment,
      userProfile,
      results,
      multiRaterData,
      includeNorms,
      language,
      reportDate: new Date().toISOString()
    });

    // Return based on format
    if (format === 'pdf') {
      const pdfBuffer = await generateOceanReportPDF(report);

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="ocean-report-${assessmentId}.pdf"`
        }
      });
    } else {
      return NextResponse.json(report);
    }

  } catch (error) {
    console.error('Error generating OCEAN report:', error);
    return ErrorResponses.internalError('Failed to generate report');
  }
});

// Helper functions

async function get360FeedbackData(supabase, assessmentId) {
  // Get 360 feedback request
  const { data: feedbackRequest } = await supabase.
  from('360_feedback_requests').
  select('id, completed_raters, requested_raters').
  eq('assessment_id', assessmentId).
  single();

  if (!feedbackRequest || feedbackRequest.completed_raters === 0) {
    return null;
  }

  // Get aggregated 360 results
  const { data: submissions } = await supabase.
  from('360_feedback_submissions').
  select('relationship, ratings, confidence_level').
  eq('feedback_request_id', feedbackRequest.id).
  eq('status', 'completed');

  if (!submissions || submissions.length === 0) {
    return null;
  }

  // Aggregate by relationship
  const byRelationship = {};
  const overall = { ratings: {}, count: 0 };

  submissions.forEach((sub) => {
    // Overall aggregation
    Object.entries(sub.ratings).forEach(([trait, rating]) => {
      if (!overall.ratings[trait]) {
        overall.ratings[trait] = [];
      }
      overall.ratings[trait].push(rating);
    });
    overall.count++;

    // By relationship aggregation
    if (!byRelationship[sub.relationship]) {
      byRelationship[sub.relationship] = { ratings: {}, count: 0 };
    }

    Object.entries(sub.ratings).forEach(([trait, rating]) => {
      if (!byRelationship[sub.relationship].ratings[trait]) {
        byRelationship[sub.relationship].ratings[trait] = [];
      }
      byRelationship[sub.relationship].ratings[trait].push(rating);
    });
    byRelationship[sub.relationship].count++;
  });

  // Calculate averages
  const calculateAverages = (ratingsObj) => {
    const averages = {};
    Object.entries(ratingsObj.ratings).forEach(([trait, ratings]) => {
      averages[mapToOceanTrait(trait)] = {
        mean: ratings.reduce((a, b) => a + b, 0) / ratings.length * 20, // Convert to 0-100
        n: ratings.length
      };
    });
    return averages;
  };

  return {
    overall: calculateAverages(overall),
    byRelationship: Object.entries(byRelationship).reduce((acc, [rel, data]) => {
      acc[rel] = calculateAverages(data);
      return acc;
    }, {}),
    responseRate: Math.round(feedbackRequest.completed_raters / feedbackRequest.requested_raters * 100)
  };
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

async function generateComprehensiveOceanReport(data) {
  const { assessment, userProfile, results, multiRaterData, includeNorms, language } = data;

  const report = {
    metadata: {
      reportId: `${assessment.id}-${Date.now()}`,
      assessmentId: assessment.id,
      assessmentType: assessment.type,
      generatedAt: new Date().toISOString(),
      language,
      version: '2.0'
    },
    subject: {
      name: userProfile?.full_name || 'Anonymous',
      email: userProfile?.email,
      jobTitle: userProfile?.job_title,
      organization: userProfile?.organization?.name,
      assessmentDate: assessment.completed_at || assessment.created_at
    },
    validity: {
      isValid: checkValidity(results.validity_indicators),
      indicators: results.validity_indicators,
      warnings: getValidityWarnings(results.validity_indicators)
    },
    oceanProfile: generateOceanProfile(results),
    facetAnalysis: generateFacetAnalysis(results),
    interpretation: generateInterpretation(results, language),
    comparisons: {},
    insights: [],
    recommendations: []
  };

  // Add norm comparisons if requested
  if (includeNorms && results.percentile_ranks) {
    report.comparisons.normative = {
      group: assessment.settings?.normGroup || 'general',
      percentiles: results.percentile_ranks,
      interpretation: interpretPercentiles(results.percentile_ranks)
    };
  }

  // Add 360 comparison if available
  if (multiRaterData) {
    report.comparisons.multiRater = {
      selfVsOthers: generateSelfVsOthersComparison(results.ocean_scores, multiRaterData.overall),
      byRelationship: multiRaterData.byRelationship,
      responseRate: multiRaterData.responseRate,
      insights: generate360Insights(results.ocean_scores, multiRaterData)
    };
  }

  // Generate insights
  report.insights = generateReportInsights(results, multiRaterData);

  // Generate recommendations
  report.recommendations = generateReportRecommendations(results, report.insights);

  // Add visualizations data
  report.visualizations = {
    oceanProfile: createOceanProfileVisualization(results.ocean_scores, results.percentile_ranks),
    facetHeatmap: createFacetHeatmap(results.facet_scores),
    strengthsWeaknesses: identifyStrengthsWeaknesses(results),
    developmentPriorities: identifyDevelopmentPriorities(results)
  };

  return report;
}

function checkValidity(indicators) {
  if (!indicators) return true;

  const issues = [];
  if (indicators.completeness < 80) issues.push('incomplete');
  if (indicators.consistency < 70) issues.push('inconsistent');
  if (indicators.socialDesirability > 80) issues.push('social_desirability');

  return issues.length === 0;
}

function getValidityWarnings(indicators) {
  const warnings = [];

  if (indicators?.completeness < 80) {
    warnings.push({
      type: 'completeness',
      severity: 'medium',
      message: 'Some questions were not answered, which may affect accuracy'
    });
  }

  if (indicators?.consistency < 70) {
    warnings.push({
      type: 'consistency',
      severity: 'high',
      message: 'Responses show inconsistency, suggesting random or careless responding'
    });
  }

  if (indicators?.socialDesirability > 80) {
    warnings.push({
      type: 'social_desirability',
      severity: 'medium',
      message: 'Responses may be influenced by desire to present favorably'
    });
  }

  return warnings;
}

function generateOceanProfile(results) {
  const traits = ['O', 'C', 'E', 'A', 'N'];
  const profile = {};

  traits.forEach((trait) => {
    const score = results.ocean_scores[trait] || 0;
    const percentile = results.percentile_ranks?.[trait] || 50;

    profile[trait] = {
      score,
      percentile,
      level: categorizeScore(score),
      description: getTraitDescription(trait, score),
      facets: {}
    };

    // Add facet details
    const facetCodes = getFacetCodesForTrait(trait);
    facetCodes.forEach((facetCode) => {
      if (results.facet_scores?.[facetCode] !== undefined) {
        profile[trait].facets[facetCode] = {
          score: results.facet_scores[facetCode],
          level: categorizeScore(results.facet_scores[facetCode]),
          name: getFacetName(facetCode)
        };
      }
    });
  });

  return profile;
}

function categorizeScore(score) {
  if (score >= 70) return 'Very High';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Average';
  if (score >= 30) return 'Low';
  return 'Very Low';
}

function getTraitDescription(trait, score) {
  const descriptions = {
    O: {
      'Very High': 'Exceptionally creative, curious, and open to new experiences',
      'High': 'Creative and intellectually curious',
      'Average': 'Balanced between tradition and innovation',
      'Low': 'Practical and conventional',
      'Very Low': 'Strongly prefers routine and tradition'
    },
    C: {
      'Very High': 'Extremely organized, disciplined, and goal-oriented',
      'High': 'Well-organized and reliable',
      'Average': 'Moderately organized',
      'Low': 'Flexible and spontaneous',
      'Very Low': 'Very spontaneous and adaptable'
    },
    E: {
      'Very High': 'Highly sociable and energetic',
      'High': 'Outgoing and enthusiastic',
      'Average': 'Balanced social energy',
      'Low': 'Reserved and introspective',
      'Very Low': 'Strongly prefers solitude'
    },
    A: {
      'Very High': 'Extremely cooperative and trusting',
      'High': 'Cooperative and compassionate',
      'Average': 'Balanced cooperation',
      'Low': 'Independent and skeptical',
      'Very Low': 'Highly competitive and skeptical'
    },
    N: {
      'Very High': 'Experiences intense emotions',
      'High': 'Emotionally reactive',
      'Average': 'Typical emotional responses',
      'Low': 'Emotionally stable',
      'Very Low': 'Exceptionally calm and stable'
    }
  };

  const level = categorizeScore(score);
  return descriptions[trait]?.[level] || `${level} ${trait}`;
}

function getFacetCodesForTrait(trait) {
  const facetMap = {
    O: ['O1', 'O2', 'O3', 'O4', 'O5', 'O6'],
    C: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'],
    E: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'],
    A: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
    N: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6']
  };
  return facetMap[trait] || [];
}

function getFacetName(facetCode) {
  const facetNames = {
    O1: 'Fantasy', O2: 'Aesthetics', O3: 'Feelings', O4: 'Actions', O5: 'Ideas', O6: 'Values',
    C1: 'Competence', C2: 'Order', C3: 'Dutifulness', C4: 'Achievement Striving', C5: 'Self-Discipline', C6: 'Deliberation',
    E1: 'Warmth', E2: 'Gregariousness', E3: 'Assertiveness', E4: 'Activity', E5: 'Excitement-Seeking', E6: 'Positive Emotions',
    A1: 'Trust', A2: 'Straightforwardness', A3: 'Altruism', A4: 'Compliance', A5: 'Modesty', A6: 'Tender-Mindedness',
    N1: 'Anxiety', N2: 'Angry Hostility', N3: 'Depression', N4: 'Self-Consciousness', N5: 'Impulsiveness', N6: 'Vulnerability'
  };
  return facetNames[facetCode] || facetCode;
}

function generateFacetAnalysis(results) {
  if (!results.facet_scores) return null;

  const analysis = {
    overview: '',
    patterns: [],
    variability: {}
  };

  // Analyze by trait
  const traits = ['O', 'C', 'E', 'A', 'N'];

  traits.forEach((trait) => {
    const facets = getFacetCodesForTrait(trait);
    const facetScores = facets.
    map((f) => results.facet_scores[f]).
    filter((s) => s !== undefined);

    if (facetScores.length > 0) {
      const mean = facetScores.reduce((a, b) => a + b, 0) / facetScores.length;
      const variance = facetScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / facetScores.length;
      const stdDev = Math.sqrt(variance);

      analysis.variability[trait] = {
        mean: Math.round(mean),
        stdDev: Math.round(stdDev),
        range: Math.max(...facetScores) - Math.min(...facetScores),
        interpretation: stdDev > 15 ? 'High variability' : stdDev > 10 ? 'Moderate variability' : 'Consistent'
      };

      // Identify patterns
      if (stdDev > 15) {
        const highest = facets.find((f) => results.facet_scores[f] === Math.max(...facetScores));
        const lowest = facets.find((f) => results.facet_scores[f] === Math.min(...facetScores));

        analysis.patterns.push({
          trait,
          pattern: 'high_variability',
          details: `${getFacetName(highest)} is much higher than ${getFacetName(lowest)}`,
          implication: getVariabilityImplication(trait, highest, lowest)
        });
      }
    }
  });

  analysis.overview = generateFacetOverview(analysis);

  return analysis;
}

function getVariabilityImplication(trait, highFacet, lowFacet) {
  // Context-specific implications
  const implications = {
    O: 'Selective openness - open in some areas but not others',
    C: 'Situational conscientiousness - organized in some areas but not others',
    E: 'Contextual extraversion - social energy varies by situation',
    A: 'Selective agreeableness - cooperation depends on context',
    N: 'Variable emotional responses - some triggers more impactful than others'
  };

  return implications[trait] || 'Trait expression varies by context';
}

function generateFacetOverview(analysis) {
  const highVariability = Object.entries(analysis.variability).
  filter(([, data]) => data.stdDev > 15).
  map(([trait]) => trait);

  if (highVariability.length === 0) {
    return 'Facet scores show consistency within traits, suggesting stable personality expression across different contexts.';
  } else {
    return `Significant variability observed in ${highVariability.join(', ')}, suggesting context-dependent expression of these traits.`;
  }
}

function generateInterpretation(results, language) {
  // For now, English only - extend for other languages
  const interpretation = {
    summary: generatePersonalitySummary(results.ocean_scores),
    strengths: identifyStrengths(results.ocean_scores, results.facet_scores),
    challenges: identifyChallenges(results.ocean_scores, results.facet_scores),
    workStyle: deriveWorkStyle(results.ocean_scores),
    interpersonalStyle: deriveInterpersonalStyle(results.ocean_scores),
    stressResponse: predictStressResponse(results.ocean_scores),
    developmentAreas: suggestDevelopmentAreas(results.ocean_scores, results.facet_scores)
  };

  return interpretation;
}

function generatePersonalitySummary(oceanScores) {
  const highTraits = Object.entries(oceanScores).
  filter(([, score]) => score >= 65).
  map(([trait]) => getTraitName(trait));

  const lowTraits = Object.entries(oceanScores).
  filter(([, score]) => score <= 35).
  map(([trait]) => getTraitName(trait));

  let summary = 'This personality profile reveals ';

  if (highTraits.length > 0) {
    summary += `notably high ${highTraits.join(', ')}`;
  }

  if (lowTraits.length > 0) {
    if (highTraits.length > 0) summary += ' combined with ';
    summary += `lower ${lowTraits.join(', ')}`;
  }

  if (highTraits.length === 0 && lowTraits.length === 0) {
    summary += 'a balanced personality across all major dimensions';
  }

  summary += '. This combination suggests a person who ';

  // Add specific implications
  if (oceanScores.O >= 65 && oceanScores.C >= 65) {
    summary += 'balances creativity with discipline, ';
  }
  if (oceanScores.E >= 65 && oceanScores.A >= 65) {
    summary += 'builds strong relationships while maintaining energy, ';
  }
  if (oceanScores.N <= 35) {
    summary += 'maintains emotional stability under pressure, ';
  }

  return summary.replace(/, $/, '.');
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

function identifyStrengths(oceanScores, facetScores) {
  const strengths = [];

  // Trait-based strengths
  Object.entries(oceanScores).forEach(([trait, score]) => {
    if (score >= 65) {
      strengths.push({
        area: getTraitName(trait),
        score,
        implications: getStrengthImplications(trait, score)
      });
    }
  });

  // Low neuroticism as a strength
  if (oceanScores.N <= 35) {
    strengths.push({
      area: 'Emotional Stability',
      score: 100 - oceanScores.N,
      implications: ['Handles stress well', 'Maintains composure', 'Resilient']
    });
  }

  // Facet-based strengths
  if (facetScores) {
    const topFacets = Object.entries(facetScores).
    filter(([, score]) => score >= 75).
    sort(([, a], [, b]) => b - a).
    slice(0, 3);

    topFacets.forEach(([facet, score]) => {
      strengths.push({
        area: getFacetName(facet),
        score,
        implications: getFacetStrengthImplications(facet)
      });
    });
  }

  return strengths;
}

function getStrengthImplications(trait, score) {
  const implications = {
    O: ['Creative problem-solving', 'Adaptable to change', 'Innovative thinking'],
    C: ['Reliable execution', 'Strong work ethic', 'Goal achievement'],
    E: ['Team energizer', 'Strong networker', 'Leadership presence'],
    A: ['Team collaboration', 'Conflict resolution', 'Trust building'],
    N: ['Emotional awareness', 'Empathy', 'Sensitivity to others'] // For high N
  };

  return implications[trait] || [];
}

function getFacetStrengthImplications(facet) {
  const implications = {
    O5: ['Strategic thinking', 'Intellectual leadership'],
    C4: ['High achievement drive', 'Goal-oriented'],
    E3: ['Natural leadership', 'Decisive'],
    A3: ['Helping others', 'Team support']
    // Add more as needed
  };

  return implications[facet] || ['Distinctive strength'];
}

function identifyChallenges(oceanScores, facetScores) {
  const challenges = [];

  // Extreme scores can be challenges
  Object.entries(oceanScores).forEach(([trait, score]) => {
    if (score >= 85 || score <= 15) {
      challenges.push({
        area: getTraitName(trait),
        score,
        type: score >= 85 ? 'extreme_high' : 'extreme_low',
        implications: getExtremeScoreImplications(trait, score)
      });
    }
  });

  // Specific challenging combinations
  if (oceanScores.C <= 35 && oceanScores.N >= 65) {
    challenges.push({
      area: 'Stress Management',
      type: 'combination',
      description: 'Low organization combined with high stress sensitivity',
      implications: ['May struggle with deadlines', 'Stress may impair performance']
    });
  }

  return challenges;
}

function getExtremeScoreImplications(trait, score) {
  if (score >= 85) {
    const implications = {
      O: ['May overlook practical considerations', 'Could be seen as impractical'],
      C: ['May be inflexible', 'Could micromanage'],
      E: ['May dominate conversations', 'Could burn out'],
      A: ['May avoid necessary conflict', 'Could be taken advantage of'],
      N: ['High stress levels', 'May need support']
    };
    return implications[trait] || ['May benefit from balance'];
  } else {
    const implications = {
      O: ['May resist necessary change', 'Could miss opportunities'],
      C: ['May struggle with structure', 'Could miss deadlines'],
      E: ['May be overlooked', 'Could miss networking opportunities'],
      A: ['May seem harsh', 'Could struggle with teamwork'],
      N: ['May lack emotional awareness', 'Could miss important cues']
    };
    return implications[trait] || ['May benefit from development'];
  }
}

function deriveWorkStyle(oceanScores) {
  return {
    preferredEnvironment: oceanScores.E >= 50 ? 'Collaborative' : 'Independent',
    organizationalApproach: oceanScores.C >= 50 ? 'Structured' : 'Flexible',
    innovationOrientation: oceanScores.O >= 50 ? 'Innovation-focused' : 'Stability-focused',
    teamOrientation: oceanScores.A >= 50 ? 'Team-oriented' : 'Task-oriented',
    stressManagement: oceanScores.N <= 50 ? 'Resilient' : 'Needs support'
  };
}

function deriveInterpersonalStyle(oceanScores) {
  return {
    communicationStyle: oceanScores.E >= 50 ? 'Expressive' : 'Reserved',
    conflictApproach: oceanScores.A >= 50 ? 'Collaborative' : 'Competitive',
    trustOrientation: oceanScores.A >= 60 ? 'Trusting' : 'Cautious',
    emotionalExpression: oceanScores.N >= 50 ? 'Open' : 'Controlled',
    socialEnergy: oceanScores.E >= 60 ? 'Energized by others' : 'Needs alone time'
  };
}

function predictStressResponse(oceanScores) {
  return {
    stressReactivity: oceanScores.N >= 50 ? 'High' : 'Low',
    copingStyle: oceanScores.C >= 50 ? 'Problem-focused' : 'Emotion-focused',
    resilience: (100 - oceanScores.N + oceanScores.C) / 2,
    supportNeeds: oceanScores.E >= 50 ? 'Social support' : 'Private processing'
  };
}

function suggestDevelopmentAreas(oceanScores, facetScores) {
  const suggestions = [];

  Object.entries(oceanScores).forEach(([trait, score]) => {
    if (score <= 35 || score >= 85) {
      suggestions.push({
        trait: getTraitName(trait),
        currentLevel: categorizeScore(score),
        suggestion: getDevelopmentSuggestion(trait, score),
        priority: score <= 20 || score >= 90 ? 'high' : 'medium'
      });
    }
  });

  return suggestions;
}

function getDevelopmentSuggestion(trait, score) {
  if (score <= 35) {
    const suggestions = {
      O: 'Consider exploring new perspectives and creative activities',
      C: 'Work on organizational systems and goal-setting',
      E: 'Practice social skills in comfortable settings',
      A: 'Develop empathy and collaborative approaches',
      N: 'Continue building on your emotional stability'
    };
    return suggestions[trait];
  } else {
    const suggestions = {
      O: 'Balance innovation with practical implementation',
      C: 'Allow for flexibility and spontaneity',
      E: 'Create space for reflection and deep work',
      A: 'Practice assertiveness when needed',
      N: 'Develop stress management and coping strategies'
    };
    return suggestions[trait];
  }
}

function interpretPercentiles(percentiles) {
  const interpretation = [];

  Object.entries(percentiles).forEach(([trait, percentile]) => {
    let category;
    if (percentile >= 85) category = 'Very High';else
    if (percentile >= 70) category = 'High';else
    if (percentile >= 30) category = 'Average';else
    if (percentile >= 15) category = 'Low';else
    category = 'Very Low';

    interpretation.push({
      trait,
      percentile,
      category,
      meaning: `Higher than ${percentile}% of the comparison group`
    });
  });

  return interpretation;
}

function generateSelfVsOthersComparison(selfScores, othersScores) {
  const comparison = {};

  Object.entries(selfScores).forEach(([trait, selfScore]) => {
    const othersScore = othersScores[trait]?.mean || selfScore;
    const gap = selfScore - othersScore;

    comparison[trait] = {
      self: selfScore,
      others: Math.round(othersScore),
      gap: Math.round(gap),
      agreement: Math.abs(gap) <= 10 ? 'High' : Math.abs(gap) <= 20 ? 'Moderate' : 'Low',
      interpretation: interpretGap(trait, gap)
    };
  });

  return comparison;
}

function interpretGap(trait, gap) {
  if (Math.abs(gap) <= 10) return 'Good self-awareness';

  if (gap > 0) {
    return `You rate yourself higher than others do in ${getTraitName(trait)}`;
  } else {
    return `Others see more ${getTraitName(trait)} in you than you do`;
  }
}

function generate360Insights(selfScores, multiRaterData) {
  const insights = [];

  // Overall self-awareness
  const gaps = Object.entries(selfScores).map(([trait, self]) => {
    const others = multiRaterData.overall[trait]?.mean || self;
    return Math.abs(self - others);
  });

  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

  insights.push({
    type: 'self_awareness',
    level: avgGap <= 10 ? 'High' : avgGap <= 20 ? 'Moderate' : 'Low',
    message: avgGap <= 10 ?
    'Excellent self-awareness - your self-perception aligns well with others' :
    'Consider seeking more feedback to improve self-awareness'
  });

  // Blind spots
  Object.entries(selfScores).forEach(([trait, self]) => {
    const others = multiRaterData.overall[trait]?.mean || self;
    const gap = self - others;

    if (gap < -15) {
      insights.push({
        type: 'hidden_strength',
        trait,
        message: `Others see more ${getTraitName(trait)} in you than you recognize`
      });
    } else if (gap > 15) {
      insights.push({
        type: 'blind_spot',
        trait,
        message: `You may overestimate your ${getTraitName(trait)}`
      });
    }
  });

  return insights;
}

function generateReportInsights(results, multiRaterData) {
  const insights = [];

  // Profile type insight
  const profileType = determineProfileType(results.ocean_scores);
  insights.push({
    category: 'profile',
    title: 'Personality Profile Type',
    content: profileType.description,
    significance: 'high'
  });

  // Strengths combination
  const topTraits = Object.entries(results.ocean_scores).
  filter(([, score]) => score >= 65).
  map(([trait]) => trait);

  if (topTraits.length >= 2) {
    insights.push({
      category: 'strengths',
      title: 'Unique Strength Combination',
      content: getStrengthCombinationInsight(topTraits),
      significance: 'high'
    });
  }

  // Development opportunities
  const lowTraits = Object.entries(results.ocean_scores).
  filter(([, score]) => score <= 35).
  map(([trait]) => trait);

  if (lowTraits.length > 0) {
    insights.push({
      category: 'development',
      title: 'Development Opportunities',
      content: getDevelopmentInsight(lowTraits),
      significance: 'medium'
    });
  }

  // 360 insights if available
  if (multiRaterData) {
    const selfAwarenessInsight = generate360SelfAwarenessInsight(results.ocean_scores, multiRaterData);
    if (selfAwarenessInsight) {
      insights.push(selfAwarenessInsight);
    }
  }

  return insights;
}

function determineProfileType(oceanScores) {
  // Simplified profile typing - extend with more sophisticated logic
  const profiles = [
  {
    name: 'Creative Achiever',
    criteria: { O: 65, C: 65 },
    description: 'Combines creativity with discipline for innovative execution'
  },
  {
    name: 'People Leader',
    criteria: { E: 65, A: 65 },
    description: 'Natural leader who builds strong, collaborative teams'
  },
  {
    name: 'Steady Performer',
    criteria: { C: 65, N: 35 },
    description: 'Reliable and stable, excels under pressure'
  },
  {
    name: 'Innovative Thinker',
    criteria: { O: 70 },
    description: 'Highly creative and open to new ideas and experiences'
  },
  {
    name: 'Organized Executor',
    criteria: { C: 70 },
    description: 'Exceptionally organized and goal-oriented'
  }];


  for (const profile of profiles) {
    let matches = true;
    for (const [trait, threshold] of Object.entries(profile.criteria)) {
      if (trait === 'N') {
        if (oceanScores[trait] > threshold) matches = false;
      } else {
        if (oceanScores[trait] < threshold) matches = false;
      }
    }
    if (matches) return profile;
  }

  return {
    name: 'Balanced Profile',
    description: 'Well-rounded personality with balanced traits'
  };
}

function getStrengthCombinationInsight(traits) {
  const combinations = {
    'OC': 'Your combination of creativity and conscientiousness enables innovative yet practical solutions',
    'EA': 'Your social energy and agreeableness make you a natural team builder and collaborator',
    'CE': 'Your discipline and extraversion position you well for leadership roles',
    'OE': 'Your openness and extraversion make you an inspiring innovator and communicator'
  };

  const key = traits.slice(0, 2).sort().join('');
  return combinations[key] || 'Your unique combination of strengths provides distinctive value';
}

function getDevelopmentInsight(traits) {
  if (traits.length === 1) {
    return `Developing ${getTraitName(traits[0])} could enhance your overall effectiveness`;
  } else {
    return `Focusing on ${traits.map((t) => getTraitName(t)).join(' and ')} could broaden your capabilities`;
  }
}

function generate360SelfAwarenessInsight(selfScores, multiRaterData) {
  const gaps = Object.entries(selfScores).map(([trait, self]) => {
    const others = multiRaterData.overall[trait]?.mean || self;
    return { trait, gap: Math.abs(self - others) };
  });

  const largestGap = gaps.sort((a, b) => b.gap - a.gap)[0];

  if (largestGap.gap > 20) {
    return {
      category: 'self_awareness',
      title: 'Self-Perception Gap',
      content: `The largest perception gap is in ${getTraitName(largestGap.trait)}. Consider seeking specific feedback in this area.`,
      significance: 'high'
    };
  }

  return null;
}

function generateReportRecommendations(results, insights) {
  const recommendations = [];

  // Based on profile type
  const profileInsight = insights.find((i) => i.category === 'profile');
  if (profileInsight) {
    recommendations.push({
      category: 'career',
      priority: 'high',
      title: 'Leverage Your Profile',
      actions: getProfileLeverageActions(profileInsight.title)
    });
  }

  // Based on low traits
  Object.entries(results.ocean_scores).forEach(([trait, score]) => {
    if (score <= 30) {
      recommendations.push({
        category: 'development',
        priority: 'medium',
        title: `Develop ${getTraitName(trait)}`,
        actions: getTraitDevelopmentActions(trait)
      });
    }
  });

  // Based on extreme scores
  Object.entries(results.ocean_scores).forEach(([trait, score]) => {
    if (score >= 85) {
      recommendations.push({
        category: 'balance',
        priority: 'low',
        title: `Balance High ${getTraitName(trait)}`,
        actions: getBalanceActions(trait)
      });
    }
  });

  return recommendations.sort((a, b) => {
    const priority = { high: 3, medium: 2, low: 1 };
    return priority[b.priority] - priority[a.priority];
  });
}

function getProfileLeverageActions(profileType) {
  const actions = {
    'Creative Achiever': [
    'Seek roles combining innovation and execution',
    'Lead creative projects with clear deliverables',
    'Mentor others in balancing creativity with discipline'],

    'People Leader': [
    'Pursue leadership opportunities',
    'Focus on team development and culture building',
    'Leverage relationship skills for stakeholder management']

    // Add more profile-specific actions
  };

  return actions[profileType] || ['Identify roles that leverage your unique strengths'];
}

function getTraitDevelopmentActions(trait) {
  const actions = {
    O: [
    'Engage in creative hobbies or courses',
    'Practice brainstorming and ideation techniques',
    'Expose yourself to diverse perspectives'],

    C: [
    'Implement time management systems',
    'Set SMART goals and track progress',
    'Practice breaking large tasks into smaller steps'],

    E: [
    'Join professional networking groups',
    'Practice public speaking in safe environments',
    'Schedule regular social activities'],

    A: [
    'Practice active listening techniques',
    'Volunteer for collaborative projects',
    'Study conflict resolution strategies'],

    N: [
    'Maintain current stress management practices',
    'Continue building resilience',
    'Share your calmness strategies with others']

  };

  return actions[trait] || ['Work with a coach to develop this area'];
}

function getBalanceActions(trait) {
  const actions = {
    O: [
    'Ground ideas with practical implementation plans',
    'Seek feedback on feasibility',
    'Partner with detail-oriented colleagues'],

    C: [
    'Schedule flexibility and spontaneity',
    'Practice delegating tasks',
    'Focus on progress over perfection'],

    E: [
    'Build in quiet reflection time',
    'Practice listening more than speaking',
    'Respect introverts\' work styles'],

    A: [
    'Practice assertiveness techniques',
    'Set healthy boundaries',
    'Balance others\' needs with your own'],

    N: [
    'Develop coping strategies for intense emotions',
    'Practice emotional regulation techniques',
    'Build support systems']

  };

  return actions[trait] || ['Seek balance to avoid overuse of strengths'];
}

function createOceanProfileVisualization(oceanScores, percentiles) {
  return {
    type: 'radar',
    data: {
      labels: ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'],
      datasets: [
      {
        label: 'Your Scores',
        data: ['O', 'C', 'E', 'A', 'N'].map((t) => oceanScores[t] || 0)
      },
      {
        label: 'Population Average',
        data: [50, 50, 50, 50, 50]
      }]

    },
    options: {
      scale: {
        min: 0,
        max: 100
      }
    }
  };
}

function createFacetHeatmap(facetScores) {
  if (!facetScores) return null;

  const traits = ['O', 'C', 'E', 'A', 'N'];
  const data = [];

  traits.forEach((trait) => {
    const facets = getFacetCodesForTrait(trait);
    facets.forEach((facet) => {
      if (facetScores[facet] !== undefined) {
        data.push({
          trait,
          facet: getFacetName(facet),
          score: facetScores[facet],
          color: getHeatmapColor(facetScores[facet])
        });
      }
    });
  });

  return {
    type: 'heatmap',
    data,
    legend: [
    { range: '0-20', color: '#d73027', label: 'Very Low' },
    { range: '21-40', color: '#fc8d59', label: 'Low' },
    { range: '41-60', color: '#fee08b', label: 'Average' },
    { range: '61-80', color: '#91cf60', label: 'High' },
    { range: '81-100', color: '#1a9850', label: 'Very High' }]

  };
}

function getHeatmapColor(score) {
  if (score <= 20) return '#d73027';
  if (score <= 40) return '#fc8d59';
  if (score <= 60) return '#fee08b';
  if (score <= 80) return '#91cf60';
  return '#1a9850';
}

function identifyStrengthsWeaknesses(results) {
  const allScores = [];

  // Collect all trait and facet scores
  Object.entries(results.ocean_scores).forEach(([trait, score]) => {
    allScores.push({ type: 'trait', code: trait, name: getTraitName(trait), score });
  });

  if (results.facet_scores) {
    Object.entries(results.facet_scores).forEach(([facet, score]) => {
      allScores.push({ type: 'facet', code: facet, name: getFacetName(facet), score });
    });
  }

  // Sort and identify top/bottom
  allScores.sort((a, b) => b.score - a.score);

  return {
    topStrengths: allScores.slice(0, 5),
    bottomAreas: allScores.slice(-5).reverse()
  };
}

function identifyDevelopmentPriorities(results) {
  const priorities = [];

  // Low core traits
  Object.entries(results.ocean_scores).forEach(([trait, score]) => {
    if (score <= 30) {
      priorities.push({
        area: getTraitName(trait),
        currentScore: score,
        targetScore: 50,
        impact: 'high',
        timeframe: '6-12 months'
      });
    }
  });

  // Extreme scores needing balance
  Object.entries(results.ocean_scores).forEach(([trait, score]) => {
    if (score >= 90) {
      priorities.push({
        area: `Balance ${getTraitName(trait)}`,
        currentScore: score,
        targetScore: 75,
        impact: 'medium',
        timeframe: '3-6 months'
      });
    }
  });

  // High-impact facets
  if (results.facet_scores) {
    const criticalFacets = ['C1', 'C4', 'E3', 'A1', 'N1'];
    criticalFacets.forEach((facet) => {
      if (results.facet_scores[facet] <= 30) {
        priorities.push({
          area: getFacetName(facet),
          currentScore: results.facet_scores[facet],
          targetScore: 50,
          impact: 'medium',
          timeframe: '3-6 months'
        });
      }
    });
  }

  return priorities.sort((a, b) => {
    const impact = { high: 3, medium: 2, low: 1 };
    return impact[b.impact] - impact[a.impact];
  });
}

async function generateOceanReportPDF(report) {
  // This would use a PDF generation library like puppeteer or pdfkit
  // For now, return a placeholder
  const pdfContent = `
    OCEAN Personality Assessment Report
    ==================================
    
    Subject: ${report.subject.name}
    Date: ${report.subject.assessmentDate}
    
    Executive Summary
    -----------------
    ${report.interpretation.summary}
    
    OCEAN Profile
    ------------
    Openness: ${report.oceanProfile.O.score} (${report.oceanProfile.O.level})
    Conscientiousness: ${report.oceanProfile.C.score} (${report.oceanProfile.C.level})
    Extraversion: ${report.oceanProfile.E.score} (${report.oceanProfile.E.level})
    Agreeableness: ${report.oceanProfile.A.score} (${report.oceanProfile.A.level})
    Neuroticism: ${report.oceanProfile.N.score} (${report.oceanProfile.N.level})
    
    Key Insights
    -----------
    ${report.insights.map((i) => `- ${i.content}`).join('\n')}
    
    Recommendations
    --------------
    ${report.recommendations.map((r) => `- ${r.title}: ${r.actions[0]}`).join('\n')}
  `;

  // Convert to buffer (simplified - real implementation would use proper PDF library)
  return Buffer.from(pdfContent, 'utf-8');
}

/**
 * @swagger
 * /api/assessments/{id}/ocean-report:
 *   get:
 *     summary: Generate comprehensive OCEAN assessment report
 *     description: Returns detailed personality report with insights and recommendations
 *     tags: [Assessments, Reports, OCEAN]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, pdf]
 *           default: json
 *       - in: query
 *         name: include360
 *         schema:
 *           type: boolean
 *           default: false
 *       - in: query
 *         name: includeNorms
 *         schema:
 *           type: boolean
 *           default: true
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           default: en
 *     responses:
 *       200:
 *         description: Comprehensive OCEAN report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */