import { NextResponse } from 'next/server';
import { createProtectedRoute, validateOrganizationAccess, ErrorResponses } from "@ioc/shared/api-utils";

// GET /api/assessments/[id]/development-plan - Generate personalized development plan
export const GET = createProtectedRoute(async (request, context) => {
  const { id: assessmentId } = context.params;

  // Get query parameters
  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get('timeframe') || '12'; // months
  const focusAreas = searchParams.get('focusAreas')?.split(',') || [];
  const includeResources = searchParams.get('includeResources') !== 'false';

  try {
    // Get assessment and verify access
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

    // Get user profile for context
    const { data: userProfile } = await context.supabase.
    from('users').
    select('full_name, job_title, years_experience, career_goals').
    eq('id', assessment.user_id).
    single();

    // Get assessment results
    const { data: results } = await context.supabase.
    from('assessment_results').
    select(`
        ocean_scores,
        facet_scores,
        leadership_profile,
        emotional_spectrum
      `).
    eq('assessment_id', assessmentId).
    order('created_at', { ascending: false }).
    limit(1).
    single();

    if (!results) {
      return ErrorResponses.notFound('No results found for this assessment');
    }

    // Get 360 feedback if available
    const multiRaterData = await get360FeedbackSummary(context.supabase, assessmentId);

    // Get historical development progress if available
    const historicalProgress = await getHistoricalProgress(
      context.supabase,
      assessment.user_id
    );

    // Generate comprehensive development plan
    const developmentPlan = generateDevelopmentPlan({
      assessment,
      userProfile,
      results,
      multiRaterData,
      historicalProgress,
      timeframe: parseInt(timeframe),
      focusAreas,
      includeResources
    });

    // Store the plan for tracking
    await storeDevelopmentPlan(context.supabase, {
      assessmentId,
      userId: assessment.user_id,
      organizationId: assessment.organization_id,
      plan: developmentPlan
    });

    return NextResponse.json({
      assessment: {
        id: assessmentId,
        type: assessment.type,
        userId: assessment.user_id
      },
      developmentPlan,
      metadata: {
        generatedAt: new Date().toISOString(),
        timeframeMonths: timeframe,
        focusAreaCount: developmentPlan.focusAreas.length,
        totalActions: developmentPlan.actionItems.length
      }
    });

  } catch (error) {
    console.error('Error generating development plan:', error);
    return ErrorResponses.internalError('Failed to generate development plan');
  }
});

// Helper functions

async function get360FeedbackSummary(supabase, assessmentId) {
  const { data: feedbackRequest } = await supabase.
  from('360_feedback_requests').
  select('id').
  eq('assessment_id', assessmentId).
  single();

  if (!feedbackRequest) return null;

  const { data: aggregated } = await supabase.
  from('360_feedback_aggregated').
  select('self_others_gaps, key_themes').
  eq('assessment_id', assessmentId).
  single();

  return aggregated;
}

async function getHistoricalProgress(supabase, userId) {
  const { data: previousPlans } = await supabase.
  from('development_plans').
  select('created_at, focus_areas, progress_updates').
  eq('user_id', userId).
  order('created_at', { ascending: false }).
  limit(3);

  if (!previousPlans || previousPlans.length === 0) return null;

  return {
    plansCreated: previousPlans.length,
    lastPlanDate: previousPlans[0].created_at,
    consistentFocusAreas: findConsistentFocusAreas(previousPlans),
    progressTrends: analyzeProgressTrends(previousPlans)
  };
}

function findConsistentFocusAreas(plans) {
  const focusAreaCounts = {};

  plans.forEach((plan) => {
    plan.focus_areas?.forEach((area) => {
      focusAreaCounts[area] = (focusAreaCounts[area] || 0) + 1;
    });
  });

  return Object.entries(focusAreaCounts).
  filter(([, count]) => count >= 2).
  map(([area]) => area);
}

function analyzeProgressTrends(plans) {
  // Simplified - would analyze actual progress data
  return {
    overallProgress: 'moderate',
    completionRate: 0.65,
    averageTimeToComplete: 4.5 // months
  };
}

function generateDevelopmentPlan(data) {
  const {
    assessment,
    userProfile,
    results,
    multiRaterData,
    historicalProgress,
    timeframe,
    focusAreas,
    includeResources
  } = data;

  const plan = {
    summary: '',
    focusAreas: [],
    developmentGoals: [],
    actionItems: [],
    milestones: [],
    resources: includeResources ? [] : undefined,
    supportSystem: [],
    successMetrics: [],
    timeline: generateTimeline(timeframe)
  };

  // Identify development priorities
  const priorities = identifyDevelopmentPriorities(results, multiRaterData, focusAreas);

  // Generate executive summary
  plan.summary = generatePlanSummary(priorities, userProfile, timeframe);

  // Create focus areas with detailed plans
  priorities.slice(0, 3).forEach((priority, index) => {
    const focusArea = createFocusArea(priority, results, timeframe);
    plan.focusAreas.push(focusArea);

    // Add development goals
    focusArea.goals.forEach((goal) => {
      plan.developmentGoals.push({
        id: `goal-${index}-${plan.developmentGoals.length}`,
        focusArea: focusArea.name,
        goal,
        timeline: assignGoalTimeline(goal, timeframe),
        priority: focusArea.priority
      });
    });

    // Add action items
    focusArea.actions.forEach((action) => {
      plan.actionItems.push({
        id: `action-${plan.actionItems.length}`,
        focusArea: focusArea.name,
        action,
        category: categorizeAction(action),
        effort: estimateEffort(action),
        impact: estimateImpact(action, priority)
      });
    });
  });

  // Create milestones
  plan.milestones = createMilestones(plan.developmentGoals, timeframe);

  // Add resources if requested
  if (includeResources) {
    plan.resources = generateResources(priorities, results);
  }

  // Define support system
  plan.supportSystem = generateSupportSystem(priorities, userProfile);

  // Define success metrics
  plan.successMetrics = generateSuccessMetrics(priorities, results);

  // Add personalization based on historical progress
  if (historicalProgress) {
    enhancePlanWithHistory(plan, historicalProgress);
  }

  return plan;
}

function identifyDevelopmentPriorities(results, multiRaterData, requestedFocusAreas) {
  const priorities = [];

  // Analyze OCEAN scores for development needs
  Object.entries(results.ocean_scores).forEach(([trait, score]) => {
    if (score <= 35) {
      priorities.push({
        type: 'trait_development',
        trait,
        currentScore: score,
        targetScore: 50,
        gap: 50 - score,
        rationale: `Low ${getTraitName(trait)} may limit effectiveness`,
        priority: 'high'
      });
    } else if (score >= 85) {
      priorities.push({
        type: 'trait_balance',
        trait,
        currentScore: score,
        targetScore: 75,
        gap: score - 75,
        rationale: `Very high ${getTraitName(trait)} may benefit from balance`,
        priority: 'medium'
      });
    }
  });

  // Analyze facet scores for specific development areas
  if (results.facet_scores) {
    const criticalFacets = {
      C1: 'Self-Confidence',
      C4: 'Achievement Drive',
      E3: 'Assertiveness',
      A1: 'Trust',
      N1: 'Anxiety Management'
    };

    Object.entries(criticalFacets).forEach(([facet, name]) => {
      if (results.facet_scores[facet] <= 30) {
        priorities.push({
          type: 'facet_development',
          facet,
          name,
          currentScore: results.facet_scores[facet],
          targetScore: 50,
          gap: 50 - results.facet_scores[facet],
          rationale: `${name} is critical for professional success`,
          priority: 'high'
        });
      }
    });
  }

  // Add 360 feedback gaps if available
  if (multiRaterData?.self_others_gaps) {
    Object.entries(multiRaterData.self_others_gaps).forEach(([trait, gap]) => {
      if (Math.abs(gap) > 20) {
        priorities.push({
          type: 'self_awareness',
          trait,
          gap,
          direction: gap > 0 ? 'overestimation' : 'underestimation',
          rationale: 'Significant perception gap affects effectiveness',
          priority: 'medium'
        });
      }
    });
  }

  // Filter by requested focus areas if specified
  if (requestedFocusAreas.length > 0) {
    priorities = priorities.filter((p) =>
    requestedFocusAreas.includes(p.trait) ||
    requestedFocusAreas.includes(p.name)
    );
  }

  // Sort by priority and gap size
  priorities.sort((a, b) => {
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.gap - a.gap;
  });

  return priorities;
}

function generatePlanSummary(priorities, userProfile, timeframe) {
  const topPriorities = priorities.slice(0, 3);
  const priorityNames = topPriorities.map((p) =>
  p.type === 'trait_development' ? getTraitName(p.trait) :
  p.type === 'facet_development' ? p.name :
  `${getTraitName(p.trait)} self-awareness`
  );

  let summary = `This ${timeframe}-month development plan focuses on enhancing `;
  summary += priorityNames.join(', ');

  if (userProfile?.career_goals) {
    summary += ` to support your career goal of ${userProfile.career_goals}`;
  }

  summary += '. The plan includes specific actions, milestones, and success metrics to ensure measurable progress.';

  return summary;
}

function createFocusArea(priority, results, timeframe) {
  const focusArea = {
    name: getFocusAreaName(priority),
    type: priority.type,
    description: getFocusAreaDescription(priority),
    currentState: {
      score: priority.currentScore,
      level: categorizeScore(priority.currentScore),
      challenges: identifyChallenges(priority, results)
    },
    desiredState: {
      score: priority.targetScore,
      level: categorizeScore(priority.targetScore),
      benefits: identifyBenefits(priority)
    },
    priority: priority.priority,
    goals: generateGoals(priority, timeframe),
    actions: generateActions(priority),
    strategies: generateStrategies(priority, results)
  };

  return focusArea;
}

function getFocusAreaName(priority) {
  if (priority.type === 'trait_development') {
    return `Developing ${getTraitName(priority.trait)}`;
  } else if (priority.type === 'trait_balance') {
    return `Balancing ${getTraitName(priority.trait)}`;
  } else if (priority.type === 'facet_development') {
    return `Strengthening ${priority.name}`;
  } else {
    return `Improving ${getTraitName(priority.trait)} Self-Awareness`;
  }
}

function getFocusAreaDescription(priority) {
  const descriptions = {
    trait_development: `Build stronger ${getTraitName(priority.trait)} capabilities to enhance overall effectiveness`,
    trait_balance: `Moderate high ${getTraitName(priority.trait)} to avoid potential downsides`,
    facet_development: `Develop ${priority.name} as a critical professional competency`,
    self_awareness: `Align self-perception with others' observations for better leadership`
  };

  return descriptions[priority.type] || 'Enhance this area for professional growth';
}

function identifyChallenges(priority, results) {
  const challenges = [];

  if (priority.type === 'trait_development' && priority.currentScore <= 30) {
    challenges.push('May struggle in situations requiring this trait');
    challenges.push('Could be perceived as lacking in this area');
  }

  if (priority.type === 'trait_balance' && priority.currentScore >= 85) {
    challenges.push('Overuse may alienate others');
    challenges.push('Could overshadow other important traits');
  }

  return challenges;
}

function identifyBenefits(priority) {
  const benefits = [];

  if (priority.type === 'trait_development') {
    benefits.push('Expanded behavioral repertoire');
    benefits.push('Increased effectiveness in diverse situations');
    benefits.push('Better balance across personality dimensions');
  }

  if (priority.type === 'self_awareness') {
    benefits.push('More accurate self-assessment');
    benefits.push('Improved leadership effectiveness');
    benefits.push('Better relationships');
  }

  return benefits;
}

function generateGoals(priority, timeframe) {
  const goals = [];
  const monthlyIncrement = priority.gap / timeframe;

  // Short-term goal (3 months)
  goals.push({
    timeframe: '3 months',
    target: `Increase awareness and practice basic ${getFocusAreaName(priority)} behaviors`,
    measurable: `Achieve ${Math.round(priority.currentScore + monthlyIncrement * 3)} score through consistent practice`
  });

  // Mid-term goal (6 months)
  goals.push({
    timeframe: '6 months',
    target: `Integrate ${getFocusAreaName(priority)} into daily work`,
    measurable: `Reach ${Math.round(priority.currentScore + monthlyIncrement * 6)} score with natural application`
  });

  // Long-term goal
  if (timeframe >= 12) {
    goals.push({
      timeframe: '12 months',
      target: `Master ${getFocusAreaName(priority)} as a core strength`,
      measurable: `Achieve target score of ${priority.targetScore} with consistent demonstration`
    });
  }

  return goals;
}

function generateActions(priority) {
  const actions = [];

  // Type-specific actions
  if (priority.type === 'trait_development') {
    actions.push(...getTraitDevelopmentActions(priority.trait));
  } else if (priority.type === 'facet_development') {
    actions.push(...getFacetDevelopmentActions(priority.facet));
  } else if (priority.type === 'self_awareness') {
    actions.push(...getSelfAwarenessActions(priority.trait));
  } else if (priority.type === 'trait_balance') {
    actions.push(...getBalancingActions(priority.trait));
  }

  return actions;
}

function getTraitDevelopmentActions(trait) {
  const actions = {
    O: [
    'Attend creative workshops or innovation seminars',
    'Read books outside your usual genres',
    'Practice brainstorming without judgment',
    'Travel to new places or try new cuisines',
    'Engage in artistic activities'],

    C: [
    'Implement a task management system',
    'Set SMART goals for each quarter',
    'Create and follow daily routines',
    'Practice breaking large projects into steps',
    'Track progress metrics regularly'],

    E: [
    'Join professional networking groups',
    'Volunteer to lead team meetings',
    'Practice public speaking at Toastmasters',
    'Schedule regular social activities',
    'Initiate conversations with new people'],

    A: [
    'Practice active listening techniques',
    'Volunteer for community service',
    'Seek win-win solutions in conflicts',
    'Express appreciation to others daily',
    'Study different perspectives before judging'],

    N: [
    'Practice mindfulness meditation',
    'Develop a stress management routine',
    'Keep a gratitude journal',
    'Learn cognitive reframing techniques',
    'Build emotional regulation skills']

  };

  return actions[trait] || [];
}

function getFacetDevelopmentActions(facet) {
  const actions = {
    C1: [// Competence
    'Take on stretch assignments',
    'Seek feedback on performance',
    'Document and celebrate achievements',
    'Build expertise in key areas'],

    C4: [// Achievement Striving
    'Set ambitious but achievable goals',
    'Create accountability partnerships',
    'Track progress visually',
    'Celebrate milestone achievements'],

    E3: [// Assertiveness
    'Practice stating opinions in meetings',
    'Learn negotiation techniques',
    'Set and communicate boundaries',
    'Take leadership roles in projects'],

    A1: [// Trust
    'Start with small acts of trust',
    'Practice assuming positive intent',
    'Build relationships gradually',
    'Learn from trust successes'],

    N1: [// Anxiety (reducing)
    'Learn relaxation techniques',
    'Practice systematic desensitization',
    'Build confidence through preparation',
    'Develop coping strategies']

  };

  return actions[facet] || ['Work with a coach on this specific area'];
}

function getSelfAwarenessActions(trait) {
  return [
  `Seek specific feedback on ${getTraitName(trait)} behaviors`,
  'Keep a behavior journal for self-reflection',
  'Ask trusted colleagues for honest observations',
  'Compare self-ratings with others\' perceptions',
  'Practice mindful observation of your impact'];

}

function getBalancingActions(trait) {
  return [
  `Identify situations where less ${getTraitName(trait)} is beneficial`,
  'Practice the opposite behavior in safe settings',
  'Seek feedback on when the trait is overwhelming',
  'Develop complementary skills',
  'Partner with those who balance your style'];

}

function generateStrategies(priority, results) {
  const strategies = [];

  // Learning strategies based on personality
  if (results.ocean_scores.O >= 60) {
    strategies.push({
      type: 'experiential',
      description: 'Learn through experimentation and exploration'
    });
  }

  if (results.ocean_scores.C >= 60) {
    strategies.push({
      type: 'structured',
      description: 'Follow systematic development programs'
    });
  }

  if (results.ocean_scores.E >= 60) {
    strategies.push({
      type: 'social',
      description: 'Learn through group activities and collaboration'
    });
  }

  // Add specific strategies for the priority
  if (priority.type === 'trait_development') {
    strategies.push({
      type: 'gradual_exposure',
      description: 'Start with low-risk situations and gradually increase challenge'
    });
  }

  return strategies;
}

function categorizeScore(score) {
  if (score >= 70) return 'Very High';
  if (score >= 60) return 'High';
  if (score >= 40) return 'Average';
  if (score >= 30) return 'Low';
  return 'Very Low';
}

function assignGoalTimeline(goal, totalTimeframe) {
  const timeframeMatch = goal.timeframe.match(/(\d+) months?/);
  if (timeframeMatch) {
    const months = parseInt(timeframeMatch[1]);
    const startMonth = months === 3 ? 1 : months === 6 ? 4 : 7;
    const endMonth = Math.min(months, totalTimeframe);

    return {
      start: `Month ${startMonth}`,
      end: `Month ${endMonth}`,
      duration: `${endMonth - startMonth + 1} months`
    };
  }

  return { start: 'Month 1', end: `Month ${totalTimeframe}`, duration: `${totalTimeframe} months` };
}

function categorizeAction(action) {
  if (action.includes('workshop') || action.includes('course')) return 'training';
  if (action.includes('practice') || action.includes('implement')) return 'practice';
  if (action.includes('feedback') || action.includes('coach')) return 'coaching';
  if (action.includes('read') || action.includes('study')) return 'self-study';
  return 'experiential';
}

function estimateEffort(action) {
  if (action.includes('daily')) return 'high';
  if (action.includes('workshop') || action.includes('course')) return 'medium';
  if (action.includes('read') || action.includes('reflect')) return 'low';
  return 'medium';
}

function estimateImpact(action, priority) {
  // High priority items have higher potential impact
  if (priority.priority === 'high') {
    if (action.includes('practice') || action.includes('implement')) return 'high';
    return 'medium';
  }
  return 'medium';
}

function createMilestones(goals, timeframe) {
  const milestones = [];

  // 30-day milestone
  milestones.push({
    timing: '30 days',
    title: 'Foundation Established',
    criteria: [
    'Development plan reviewed and committed',
    'Initial actions started',
    'Support system engaged',
    'Baseline measurements recorded']

  });

  // Quarterly milestones
  const quarters = Math.floor(timeframe / 3);
  for (let q = 1; q <= quarters; q++) {
    milestones.push({
      timing: `Quarter ${q} (Month ${q * 3})`,
      title: `Progress Checkpoint ${q}`,
      criteria: [
      `Complete Quarter ${q} goals`,
      'Measure progress against baseline',
      'Gather feedback from others',
      'Adjust plan based on learnings']

    });
  }

  // Final milestone
  milestones.push({
    timing: `Month ${timeframe}`,
    title: 'Development Cycle Complete',
    criteria: [
    'All goals achieved or attempted',
    'Final assessment completed',
    'Success metrics evaluated',
    'Next development cycle planned']

  });

  return milestones;
}

function generateResources(priorities, results) {
  const resources = [];

  // Books
  resources.push({
    category: 'books',
    items: getRecommendedBooks(priorities)
  });

  // Online courses
  resources.push({
    category: 'courses',
    items: getRecommendedCourses(priorities)
  });

  // Tools and assessments
  resources.push({
    category: 'tools',
    items: getRecommendedTools(priorities)
  });

  // Professional support
  resources.push({
    category: 'professional',
    items: getProfessionalSupport(priorities)
  });

  return resources;
}

function getRecommendedBooks(priorities) {
  const books = [];

  priorities.forEach((priority) => {
    if (priority.trait === 'O') {
      books.push({
        title: 'Creative Confidence',
        author: 'Tom & David Kelley',
        relevance: 'Builds creative thinking skills'
      });
    } else if (priority.trait === 'C') {
      books.push({
        title: 'Getting Things Done',
        author: 'David Allen',
        relevance: 'Systematic approach to organization'
      });
    } else if (priority.trait === 'E') {
      books.push({
        title: 'How to Win Friends and Influence People',
        author: 'Dale Carnegie',
        relevance: 'Classic guide to social skills'
      });
    }
    // Add more based on priorities
  });

  return books.slice(0, 3);
}

function getRecommendedCourses(priorities) {
  const courses = [];

  priorities.forEach((priority) => {
    if (priority.type === 'trait_development') {
      courses.push({
        title: `Developing ${getTraitName(priority.trait)}`,
        platform: 'Coursera/LinkedIn Learning',
        duration: '4-6 weeks',
        format: 'Online, self-paced'
      });
    }
  });

  return courses;
}

function getRecommendedTools(priorities) {
  return [
  {
    name: 'Development Journal',
    purpose: 'Track daily progress and reflections',
    type: 'Physical or digital'
  },
  {
    name: 'Feedback App',
    purpose: 'Gather regular feedback from colleagues',
    type: 'Mobile application'
  },
  {
    name: 'Progress Tracker',
    purpose: 'Visualize development progress',
    type: 'Spreadsheet or app'
  }];

}

function getProfessionalSupport(priorities) {
  const support = [];

  if (priorities.some((p) => p.priority === 'high')) {
    support.push({
      type: 'Executive Coach',
      purpose: 'Personalized guidance and accountability',
      frequency: 'Bi-weekly sessions'
    });
  }

  support.push({
    type: 'Mentor',
    purpose: 'Role model and advice',
    frequency: 'Monthly meetings'
  });

  if (priorities.some((p) => p.type === 'self_awareness')) {
    support.push({
      type: '360 Feedback Facilitator',
      purpose: 'Structured feedback process',
      frequency: 'Quarterly'
    });
  }

  return support;
}

function generateSupportSystem(priorities, userProfile) {
  const support = [];

  // Manager support
  support.push({
    role: 'Manager/Supervisor',
    contribution: 'Regular development discussions and feedback',
    engagement: 'Monthly 1:1 development check-ins'
  });

  // Peer support
  support.push({
    role: 'Accountability Partner',
    contribution: 'Mutual support and progress tracking',
    engagement: 'Weekly check-ins'
  });

  // Organizational support
  support.push({
    role: 'HR/L&D Team',
    contribution: 'Resources and development opportunities',
    engagement: 'Quarterly development planning'
  });

  // External support
  if (priorities.some((p) => p.priority === 'high')) {
    support.push({
      role: 'Professional Coach',
      contribution: 'Expert guidance and skill development',
      engagement: 'Bi-weekly coaching sessions'
    });
  }

  return support;
}

function generateSuccessMetrics(priorities, results) {
  const metrics = [];

  // Quantitative metrics
  priorities.forEach((priority) => {
    metrics.push({
      type: 'quantitative',
      metric: `${getFocusAreaName(priority)} Score`,
      baseline: priority.currentScore,
      target: priority.targetScore,
      measurement: 'Quarterly reassessment'
    });
  });

  // Behavioral metrics
  metrics.push({
    type: 'behavioral',
    metric: 'Observed behavior changes',
    baseline: 'Current behaviors documented',
    target: 'Consistent demonstration of new behaviors',
    measurement: '360 feedback or manager observation'
  });

  // Performance metrics
  metrics.push({
    type: 'performance',
    metric: 'Job performance indicators',
    baseline: 'Current performance level',
    target: 'Improved performance in relevant areas',
    measurement: 'Performance reviews'
  });

  // Feedback metrics
  metrics.push({
    type: 'feedback',
    metric: 'Stakeholder perceptions',
    baseline: 'Initial feedback gathered',
    target: 'Positive feedback on development areas',
    measurement: 'Informal and formal feedback'
  });

  return metrics;
}

function generateTimeline(timeframeMonths) {
  const phases = [];

  // Foundation phase (Month 1)
  phases.push({
    phase: 'Foundation',
    months: '1',
    focus: 'Setup and awareness building',
    keyActivities: [
    'Review and commit to plan',
    'Engage support system',
    'Begin initial actions',
    'Establish tracking methods']

  });

  // Development phase
  const developmentMonths = Math.floor(timeframeMonths * 0.7);
  phases.push({
    phase: 'Active Development',
    months: `2-${developmentMonths + 1}`,
    focus: 'Skill building and practice',
    keyActivities: [
    'Execute development actions',
    'Regular practice and application',
    'Gather ongoing feedback',
    'Adjust approach as needed']

  });

  // Integration phase
  const integrationStart = developmentMonths + 2;
  phases.push({
    phase: 'Integration',
    months: `${integrationStart}-${timeframeMonths}`,
    focus: 'Embedding new behaviors',
    keyActivities: [
    'Apply skills in challenging situations',
    'Mentor others in development areas',
    'Solidify behavior changes',
    'Plan next development cycle']

  });

  return phases;
}

function enhancePlanWithHistory(plan, historicalProgress) {
  // Add insights from previous development efforts
  if (historicalProgress.consistentFocusAreas.length > 0) {
    plan.historicalContext = {
      recurringThemes: historicalProgress.consistentFocusAreas,
      insight: 'These areas have been ongoing development focuses. Consider deeper interventions or different approaches.',
      recommendation: 'Focus on breakthrough strategies rather than incremental improvement'
    };
  }

  // Adjust timeline based on historical completion rates
  if (historicalProgress.progressTrends.completionRate < 0.5) {
    plan.realityCheck = {
      historicalCompletion: `${Math.round(historicalProgress.progressTrends.completionRate * 100)}%`,
      adjustment: 'Consider reducing scope or extending timeline based on past completion rates'
    };
  }
}

function getTraitName(trait) {
  const names = {
    O: 'Openness',
    C: 'Conscientiousness',
    E: 'Extraversion',
    A: 'Agreeableness',
    N: 'Emotional Stability'
  };
  return names[trait] || trait;
}

async function storeDevelopmentPlan(supabase, data) {
  try {
    await supabase.from('development_plans').insert({
      assessment_id: data.assessmentId,
      user_id: data.userId,
      organization_id: data.organizationId,
      plan_data: data.plan,
      focus_areas: data.plan.focusAreas.map((fa) => fa.name),
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error storing development plan:', error);
    // Non-critical error, continue
  }
}

/**
 * @swagger
 * /api/assessments/{id}/development-plan:
 *   get:
 *     summary: Generate personalized development plan
 *     description: Creates comprehensive development plan based on assessment results
 *     tags: [Assessments, Development, Reports]
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
 *         name: timeframe
 *         schema:
 *           type: string
 *           default: '12'
 *         description: Development timeframe in months
 *       - in: query
 *         name: focusAreas
 *         schema:
 *           type: string
 *         description: Comma-separated list of focus areas
 *       - in: query
 *         name: includeResources
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Personalized development plan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 developmentPlan:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: string
 *                     focusAreas:
 *                       type: array
 *                     actionItems:
 *                       type: array
 *                     milestones:
 *                       type: array
 *                     resources:
 *                       type: array
 */