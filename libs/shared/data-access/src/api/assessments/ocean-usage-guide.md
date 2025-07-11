# OCEAN Assessment Service Usage Guide

## Overview

The enhanced AssessmentService now includes comprehensive OCEAN (Big Five) personality assessment capabilities with support for Individual, Executive, and Organizational tiers.

## Key Features

1. **OCEAN Trait Scoring**: Full Big Five personality trait calculation with facet-level analysis
2. **Node-Based Assessment Creation**: Flexible prompt selection based on assessment purpose
3. **Executive Profile Analysis**: Leadership styles, influence tactics, and team predictions
4. **Dark Side Assessment**: Identify trait extremes and stress-induced behavioral changes
5. **360-Degree Feedback**: Multi-rater support with weighted aggregation
6. **Organizational Analysis**: Team composition and culture assessment

## Usage Examples

### 1. Create a Basic OCEAN Assessment

```javascript
import { AssessmentService, OCEAN_ASSESSMENT_TYPES, ASSESSMENT_TIERS } from '@ioc/lib';

const assessmentService = new AssessmentService(supabase);

// Create individual OCEAN assessment
const assessment = await assessmentService.createAssessment({
  title: "Employee OCEAN Profile Assessment",
  type: OCEAN_ASSESSMENT_TYPES.OCEAN_FULL,
  organizationId: "org_123",
  description: "Comprehensive personality assessment for team members",
  tier: ASSESSMENT_TIERS.INDIVIDUAL,
  enableOceanScoring: true,
  nodes: [
    'openness-core',
    'conscientiousness-core',
    'extraversion-core',
    'agreeableness-core',
    'neuroticism-core'
  ],
  assignments: [
    { userId: "user_123" }
  ]
}, currentUserId);
```

### 2. Create Executive Assessment with Dark Side Analysis

```javascript
const executiveAssessment = await assessmentService.createNodeBasedAssessment({
  title: "Executive Leadership Profile",
  type: OCEAN_ASSESSMENT_TYPES.EXECUTIVE_OCEAN,
  organizationId: "org_123",
  tier: ASSESSMENT_TIERS.EXECUTIVE,
  nodes: [
    'strategic-openness',
    'executive-discipline',
    'leadership-presence',
    'collaborative-leadership',
    'stress-resilience',
    'overuse-indicators',
    'stress-triggers'
  ],
  settings: {
    enableDarkSideAnalysis: true,
    enableEmotionalRegulation: true
  },
  assignments: [
    { userId: "exec_123" }
  ]
}, currentUserId);
```

### 3. Create 360-Degree Feedback Assessment

```javascript
const multi360Assessment = await assessmentService.createNodeBasedAssessment({
  title: "360 Leadership Feedback",
  type: OCEAN_ASSESSMENT_TYPES.MULTI_RATER_360,
  organizationId: "org_123",
  tier: ASSESSMENT_TIERS.EXECUTIVE,
  nodes: [
    'leadership-presence',
    'collaborative-leadership',
    'emotional-awareness'
  ],
  settings: {
    enable360Feedback: true
  },
  assignments: [
    { userId: "exec_123", raterType: "self" },
    { userId: "manager_123", raterType: "manager", subjectUserId: "exec_123" },
    { userId: "peer_123", raterType: "peer", subjectUserId: "exec_123" },
    { userId: "peer_456", raterType: "peer", subjectUserId: "exec_123" },
    { userId: "report_123", raterType: "direct-report", subjectUserId: "exec_123" }
  ]
}, currentUserId);
```

### 4. Submit Assessment with OCEAN Scoring

```javascript
const submission = await assessmentService.submitAssessment(
  assessmentId,
  userId,
  {
    responses: [
      { questionId: "q1", answer: 4 },
      { questionId: "q2", answer: "strongly_agree" },
      { questionId: "q3", answer: { value: 3, confidence: 0.8 } }
    ],
    timeSpent: 2400, // seconds
    metadata: {
      currentStressLevel: 6,
      completedLocation: "office"
    },
    raterType: "self"
  }
);

// Returns:
{
  submission: { ... },
  oceanScores: {
    raw: { openness: 3.8, conscientiousness: 4.2, ... },
    percentile: { openness: 72, conscientiousness: 85, ... },
    stanine: { openness: 6, conscientiousness: 7, ... },
    facets: { ... }
  },
  interpretation: {
    strengths: ["Exceptional reliability and attention to detail"],
    challenges: ["May resist change and new approaches"],
    recommendations: ["Develop comfort with ambiguity through structured experimentation"]
  },
  darkSideAnalysis: {
    overallRisk: "moderate",
    traitRisks: { ... }
  }
}
```

### 5. Get Adaptive Assessment Recommendation

```javascript
const config = await assessmentService.getRecommendedConfiguration({
  purpose: "leadership_development",
  tier: ASSESSMENT_TIERS.EXECUTIVE,
  includeEmotionalRegulation: true,
  includeDarkSide: true,
  include360: false
});

// Use configuration to create assessment
const adaptiveAssessment = await assessmentService.createAdaptiveAssessment({
  ...config,
  title: "Adaptive Leadership Assessment",
  organizationId: "org_123"
}, currentUserId);
```

### 6. Analyze Team Composition

```javascript
const teamAnalysis = await assessmentService.getTeamCompositionAnalysis("org_123");

// Returns:
{
  meanTraits: { openness: 3.6, conscientiousness: 3.9, ... },
  traitDiversity: { openness: 0.8, conscientiousness: 0.5, ... },
  roleFitScores: { leader: 0.85, analyst: 0.72, creative: 0.68 },
  dynamicPredictions: {
    collaborationPotential: 78,
    innovationCapacity: 65,
    executionReliability: 82,
    conflictRisk: 22
  },
  optimalAdditions: { openness: 4.5, ... } // Ideal profile for next hire
}
```

### 7. Calculate Executive-Organization Fit

```javascript
const fitAnalysis = await assessmentService.calculateExecutiveOrgFit(
  "exec_123",
  "org_123"
);

// Returns:
{
  traitAlignment: {
    openness: 0.85,
    conscientiousness: 0.92,
    extraversion: 0.78,
    agreeableness: 0.88,
    neuroticism: 0.95
  },
  complementaryFit: {
    leadershipGapFill: 0.75,
    diversityContribution: 0.82,
    balancePotential: 0.88
  },
  overallFitScore: 0.86,
  recommendations: [
    "Strong potential to fill organizational capability gaps.",
    "Well-balanced profile can stabilize organizational extremes."
  ]
}
```

### 8. Get 360 Feedback Results

```javascript
const results360 = await assessmentService.get360Results(assessmentId, "exec_123");

// Returns:
{
  aggregatedScores: { ... },
  observerAgreement: {
    overall: 0.82,
    byTrait: { openness: 0.78, conscientiousness: 0.91, ... }
  },
  blindSpots: {
    traits: {
      extraversion: {
        selfScore: 4.2,
        observerScore: 3.4,
        difference: 0.8,
        direction: "overestimated"
      }
    },
    insights: [
      "You rate yourself 0.8 points higher on extraversion than others perceive you"
    ]
  },
  raterCounts: { self: 1, manager: 1, peer: 3, "direct-report": 2 }
}
```

## Assessment Types

- `ocean-full`: Complete 50-75 question OCEAN assessment
- `ocean-short`: Brief 25-30 question version
- `emotional-regulation`: Focus on emotional awareness and control
- `executive-ocean`: Leadership-focused with strategic elements
- `organizational-ocean`: Team and culture assessment
- `dark-side-assessment`: Identify trait extremes and derailers
- `multi-rater-360`: 360-degree feedback with OCEAN framework

## Node Types

### Individual Tier
- `openness-core`: Creativity, curiosity, openness to experience
- `conscientiousness-core`: Organization, dependability, achievement
- `extraversion-core`: Social energy, assertiveness, enthusiasm
- `agreeableness-core`: Cooperation, trust, empathy
- `neuroticism-core`: Emotional stability, stress response

### Executive Tier
- `strategic-openness`: Vision, innovation, change leadership
- `executive-discipline`: Execution, accountability, results focus
- `leadership-presence`: Influence, communication, charisma
- `collaborative-leadership`: Team building, empowerment
- `stress-resilience`: Pressure management, recovery

### Emotional Regulation
- `emotional-awareness`: Self and other awareness
- `emotional-control`: Regulation strategies
- `emotional-expression`: Appropriate expression
- `emotional-recovery`: Bounce-back ability

### Dark Side Indicators
- `overuse-indicators`: When strengths become weaknesses
- `stress-triggers`: What causes derailment
- `compensatory-behaviors`: Coping mechanisms
- `impact-awareness`: Effect on others

## Best Practices

1. **Start with Basic OCEAN**: Begin with core trait assessment before adding specialized nodes
2. **Use Appropriate Tier**: Match assessment tier to role level
3. **Consider Context**: Add emotional regulation for high-stress roles
4. **Include Dark Side for Executives**: Critical for senior leadership assessment
5. **Use 360 for Development**: Multi-rater provides richer insights
6. **Regular Reassessment**: Track changes over time (6-12 months)
7. **Combine with Other Data**: Use alongside performance and engagement metrics

## Data Privacy and Ethics

- Ensure participant consent for personality assessment
- Store OCEAN data securely with appropriate access controls
- Use results for development, not selection decisions
- Provide participants with their own results
- Train interpreters on proper use of personality data