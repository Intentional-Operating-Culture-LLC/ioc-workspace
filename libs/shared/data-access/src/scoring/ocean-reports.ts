/**
 * OCEAN Trait Reporting and Visualization
 * Generates reports and data for OCEAN assessment results
 */

import { OceanScoreDetails, OceanTraits } from './ocean-scoring';

export interface OceanReport {
  profile: OceanProfile;
  comparisons: OceanComparisons;
  insights: OceanInsights;
  recommendations: OceanRecommendations;
  visualizationData: OceanVisualizationData;
}

export interface OceanProfile {
  summary: string;
  dominantTraits: string[];
  traitDescriptions: { [trait: string]: string };
  archetype?: string;
}

export interface OceanComparisons {
  toBenchmark: { [trait: string]: ComparisonResult };
  toPeerGroup?: { [trait: string]: ComparisonResult };
  toIdealProfile?: { [trait: string]: ComparisonResult };
}

export interface ComparisonResult {
  difference: number;
  percentile: number;
  interpretation: string;
}

export interface OceanInsights {
  strengths: InsightItem[];
  developmentAreas: InsightItem[];
  hiddenPotential: InsightItem[];
  riskFactors: InsightItem[];
}

export interface InsightItem {
  trait: string;
  insight: string;
  evidence: string[];
  impact: 'high' | 'medium' | 'low';
}

export interface OceanRecommendations {
  immediate: RecommendationItem[];
  shortTerm: RecommendationItem[];
  longTerm: RecommendationItem[];
}

export interface RecommendationItem {
  action: string;
  rationale: string;
  targetTraits: string[];
  expectedOutcome: string;
  resources?: string[];
}

export interface OceanVisualizationData {
  radarChart: RadarChartData;
  barChart: BarChartData;
  lineChart?: LineChartData;
  heatmap?: HeatmapData;
}

export interface RadarChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}

export interface BarChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string[];
  }>;
}

export interface LineChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string;
    tension?: number;
  }>;
}

export interface HeatmapData {
  traits: string[];
  correlations: number[][];
}

// Trait descriptions for different score levels
const TRAIT_DESCRIPTIONS = {
  openness: {
    high: 'Highly creative, imaginative, and open to new experiences. Enjoys intellectual stimulation and abstract thinking.',
    moderate: 'Balanced between tradition and innovation. Open to new ideas while maintaining practical considerations.',
    low: 'Practical, traditional, and focused on concrete reality. Prefers proven methods and established routines.'
  },
  conscientiousness: {
    high: 'Highly organized, disciplined, and goal-oriented. Exceptional attention to detail and strong work ethic.',
    moderate: 'Balanced approach to organization and flexibility. Generally reliable while maintaining adaptability.',
    low: 'Flexible, spontaneous, and adaptable. May prefer emergent strategies over detailed planning.'
  },
  extraversion: {
    high: 'Highly sociable, energetic, and assertive. Thrives in social situations and seeks external stimulation.',
    moderate: 'Balanced social energy. Comfortable in both social and solitary situations.',
    low: 'Reserved, reflective, and independent. Prefers smaller groups and deeper connections.'
  },
  agreeableness: {
    high: 'Highly cooperative, trusting, and considerate. Strong focus on harmony and helping others.',
    moderate: 'Balanced between cooperation and assertiveness. Can collaborate while maintaining boundaries.',
    low: 'Direct, competitive, and skeptical. Values honesty and achievement over harmony.'
  },
  neuroticism: {
    high: 'Emotionally sensitive and reactive. May experience stress and mood fluctuations more intensely.',
    moderate: 'Balanced emotional responses. Experiences normal range of emotions without extreme reactions.',
    low: 'Emotionally stable and resilient. Maintains composure under pressure and stress.'
  }
};

// Archetype patterns based on trait combinations
const ARCHETYPES = [
  {
    name: 'Innovator',
    pattern: { openness: 'high', conscientiousness: 'moderate', extraversion: 'moderate' },
    description: 'Creative problem-solver who brings fresh perspectives and novel solutions'
  },
  {
    name: 'Executor',
    pattern: { conscientiousness: 'high', neuroticism: 'low', agreeableness: 'moderate' },
    description: 'Reliable implementer who delivers consistent results with strong attention to detail'
  },
  {
    name: 'Leader',
    pattern: { extraversion: 'high', conscientiousness: 'high', neuroticism: 'low' },
    description: 'Natural leader who inspires others while maintaining focus on goals and results'
  },
  {
    name: 'Collaborator',
    pattern: { agreeableness: 'high', extraversion: 'moderate', openness: 'moderate' },
    description: 'Team-oriented individual who builds bridges and fosters cooperation'
  },
  {
    name: 'Analyst',
    pattern: { conscientiousness: 'high', openness: 'high', extraversion: 'low' },
    description: 'Deep thinker who excels at complex problem-solving and detailed analysis'
  },
  {
    name: 'Stabilizer',
    pattern: { neuroticism: 'low', conscientiousness: 'high', agreeableness: 'high' },
    description: 'Calm presence who provides stability and support during challenging times'
  }
];

/**
 * Generate comprehensive OCEAN report
 */
export function generateOceanReport(
  scores: OceanScoreDetails,
  benchmarks?: { [trait: string]: number },
  historicalScores?: OceanScoreDetails[]
): OceanReport {
  const profile = generateProfile(scores);
  const comparisons = generateComparisons(scores, benchmarks);
  const insights = generateInsights(scores, profile);
  const recommendations = generateRecommendations(scores, insights);
  const visualizationData = generateVisualizationData(scores, benchmarks, historicalScores);

  return {
    profile,
    comparisons,
    insights,
    recommendations,
    visualizationData
  };
}

/**
 * Generate personality profile
 */
function generateProfile(scores: OceanScoreDetails): OceanProfile {
  const dominantTraits = identifyDominantTraits(scores.stanine);
  const traitDescriptions = generateTraitDescriptions(scores.stanine);
  const archetype = identifyArchetype(scores.stanine);

  const summary = generateProfileSummary(dominantTraits, archetype);

  return {
    summary,
    dominantTraits,
    traitDescriptions,
    archetype: archetype?.name
  };
}

/**
 * Identify dominant traits (stanine >= 7)
 */
function identifyDominantTraits(stanines: OceanTraits): string[] {
  return Object.entries(stanines)
    .filter(([trait, score]) => score >= 7 || (trait === 'neuroticism' && score <= 3))
    .map(([trait]) => trait === 'neuroticism' ? 'emotional_stability' : trait);
}

/**
 * Generate trait descriptions based on scores
 */
function generateTraitDescriptions(stanines: OceanTraits): { [trait: string]: string } {
  const descriptions: { [trait: string]: string } = {};

  Object.entries(stanines).forEach(([trait, stanine]) => {
    const level = stanine >= 7 ? 'high' : stanine <= 3 ? 'low' : 'moderate';
    descriptions[trait] = TRAIT_DESCRIPTIONS[trait as keyof typeof TRAIT_DESCRIPTIONS][level];
  });

  return descriptions;
}

/**
 * Identify personality archetype
 */
function identifyArchetype(stanines: OceanTraits): typeof ARCHETYPES[0] | undefined {
  // Convert stanines to levels
  const levels: { [trait: string]: string } = {};
  Object.entries(stanines).forEach(([trait, stanine]) => {
    levels[trait] = stanine >= 7 ? 'high' : stanine <= 3 ? 'low' : 'moderate';
  });

  // Find best matching archetype
  let bestMatch: typeof ARCHETYPES[0] | undefined;
  let bestScore = 0;

  ARCHETYPES.forEach(archetype => {
    let matchScore = 0;
    Object.entries(archetype.pattern).forEach(([trait, expectedLevel]) => {
      if (levels[trait] === expectedLevel) {
        matchScore += 2;
      } else if (
        (expectedLevel === 'high' && levels[trait] === 'moderate') ||
        (expectedLevel === 'moderate' && levels[trait] !== 'low') ||
        (expectedLevel === 'low' && levels[trait] === 'moderate')
      ) {
        matchScore += 1;
      }
    });

    if (matchScore > bestScore) {
      bestScore = matchScore;
      bestMatch = archetype;
    }
  });

  return bestScore >= 4 ? bestMatch : undefined;
}

/**
 * Generate profile summary
 */
function generateProfileSummary(dominantTraits: string[], archetype?: typeof ARCHETYPES[0]): string {
  let summary = '';

  if (archetype) {
    summary = `${archetype.description} `;
  }

  if (dominantTraits.length > 0) {
    const traitNames = dominantTraits.map(t => 
      t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')
    );
    summary += `Key strengths include ${traitNames.join(', ')}.`;
  }

  return summary || 'Balanced personality profile across all dimensions.';
}

/**
 * Generate comparisons
 */
function generateComparisons(
  scores: OceanScoreDetails,
  benchmarks?: { [trait: string]: number }
): OceanComparisons {
  const comparisons: OceanComparisons = {
    toBenchmark: {}
  };

  if (benchmarks) {
    Object.entries(scores.percentile).forEach(([trait, percentile]) => {
      const benchmark = benchmarks[trait] || 50;
      comparisons.toBenchmark[trait] = {
        difference: percentile - benchmark,
        percentile,
        interpretation: interpretComparison(percentile - benchmark)
      };
    });
  }

  return comparisons;
}

/**
 * Interpret comparison result
 */
function interpretComparison(difference: number): string {
  if (difference > 20) return 'Significantly above average';
  if (difference > 10) return 'Above average';
  if (difference > -10) return 'Average';
  if (difference > -20) return 'Below average';
  return 'Significantly below average';
}

/**
 * Generate insights
 */
function generateInsights(scores: OceanScoreDetails, profile: OceanProfile): OceanInsights {
  const insights: OceanInsights = {
    strengths: [],
    developmentAreas: [],
    hiddenPotential: [],
    riskFactors: []
  };

  // Identify strengths (high scores)
  Object.entries(scores.stanine).forEach(([trait, stanine]) => {
    if (stanine >= 7 && trait !== 'neuroticism') {
      insights.strengths.push({
        trait,
        insight: getStrengthInsight(trait, stanine),
        evidence: [`${trait} score in top ${100 - scores.percentile[trait as keyof OceanTraits]}%`],
        impact: 'high'
      });
    } else if (trait === 'neuroticism' && stanine <= 3) {
      insights.strengths.push({
        trait: 'emotional_stability',
        insight: 'Exceptional emotional resilience and stability under pressure',
        evidence: ['Low neuroticism indicates strong stress management'],
        impact: 'high'
      });
    }
  });

  // Identify development areas (low scores)
  Object.entries(scores.stanine).forEach(([trait, stanine]) => {
    if (stanine <= 3 && trait !== 'neuroticism') {
      insights.developmentAreas.push({
        trait,
        insight: getDevelopmentInsight(trait, stanine),
        evidence: [`${trait} score in bottom ${scores.percentile[trait as keyof OceanTraits]}%`],
        impact: stanine === 1 ? 'high' : 'medium'
      });
    } else if (trait === 'neuroticism' && stanine >= 7) {
      insights.developmentAreas.push({
        trait: 'emotional_stability',
        insight: 'May benefit from stress management and emotional regulation techniques',
        evidence: ['High neuroticism suggests emotional sensitivity'],
        impact: 'high'
      });
    }
  });

  // Identify hidden potential (moderate scores with growth opportunity)
  Object.entries(scores.stanine).forEach(([trait, stanine]) => {
    if (stanine >= 4 && stanine <= 6) {
      const potential = getHiddenPotential(trait, scores);
      if (potential) {
        insights.hiddenPotential.push({
          trait,
          insight: potential,
          evidence: ['Moderate score with room for development'],
          impact: 'medium'
        });
      }
    }
  });

  return insights;
}

/**
 * Get strength insight for trait
 */
function getStrengthInsight(trait: string, stanine: number): string {
  const insights = {
    openness: 'Exceptional creativity and innovation capability',
    conscientiousness: 'Outstanding reliability and execution excellence',
    extraversion: 'Natural leadership presence and communication skills',
    agreeableness: 'Exceptional team player and relationship builder',
    neuroticism: 'Strong emotional awareness and empathy'
  };

  return insights[trait as keyof typeof insights] || `High ${trait} indicates strong capabilities`;
}

/**
 * Get development insight for trait
 */
function getDevelopmentInsight(trait: string, stanine: number): string {
  const insights = {
    openness: 'May benefit from exposure to diverse perspectives and creative exercises',
    conscientiousness: 'Could improve through structured planning and organization tools',
    extraversion: 'May benefit from communication training and networking practice',
    agreeableness: 'Could develop through empathy exercises and collaboration skills',
    neuroticism: 'Would benefit from emotional regulation techniques'
  };

  return insights[trait as keyof typeof insights] || `Low ${trait} presents development opportunity`;
}

/**
 * Get hidden potential insight
 */
function getHiddenPotential(trait: string, scores: OceanScoreDetails): string | null {
  // Logic to identify hidden potential based on trait combinations
  if (trait === 'openness' && scores.stanine.conscientiousness >= 6) {
    return 'Potential for innovative yet practical solutions';
  }
  if (trait === 'extraversion' && scores.stanine.agreeableness >= 6) {
    return 'Potential for influential leadership with team support';
  }
  return null;
}

/**
 * Generate recommendations
 */
function generateRecommendations(
  scores: OceanScoreDetails,
  insights: OceanInsights
): OceanRecommendations {
  const recommendations: OceanRecommendations = {
    immediate: [],
    shortTerm: [],
    longTerm: []
  };

  // Generate immediate actions for development areas
  insights.developmentAreas
    .filter(area => area.impact === 'high')
    .forEach(area => {
      recommendations.immediate.push({
        action: getImmediateAction(area.trait),
        rationale: `Address ${area.trait} to improve overall effectiveness`,
        targetTraits: [area.trait],
        expectedOutcome: `Improved ${area.trait} leading to better performance`
      });
    });

  // Generate short-term development plans
  insights.developmentAreas
    .filter(area => area.impact === 'medium')
    .forEach(area => {
      recommendations.shortTerm.push({
        action: getShortTermAction(area.trait),
        rationale: `Develop ${area.trait} for career growth`,
        targetTraits: [area.trait],
        expectedOutcome: `Enhanced ${area.trait} capabilities`
      });
    });

  // Generate long-term strategic recommendations
  insights.strengths.forEach(strength => {
    recommendations.longTerm.push({
      action: getLongTermAction(strength.trait, true),
      rationale: `Leverage ${strength.trait} strength for leadership roles`,
      targetTraits: [strength.trait],
      expectedOutcome: `Maximize impact through ${strength.trait} excellence`
    });
  });

  return recommendations;
}

/**
 * Get immediate action for trait
 */
function getImmediateAction(trait: string): string {
  const actions = {
    openness: 'Attend a workshop on creative thinking or innovation',
    conscientiousness: 'Implement a task management system this week',
    extraversion: 'Schedule three networking conversations this month',
    agreeableness: 'Practice active listening in all meetings this week',
    emotional_stability: 'Start daily mindfulness or meditation practice'
  };

  return actions[trait as keyof typeof actions] || `Focus on improving ${trait}`;
}

/**
 * Get short-term action for trait
 */
function getShortTermAction(trait: string): string {
  const actions = {
    openness: 'Enroll in a course outside your expertise area',
    conscientiousness: 'Complete a project management certification',
    extraversion: 'Join a public speaking group or professional association',
    agreeableness: 'Participate in team collaboration training',
    emotional_stability: 'Work with a coach on stress management techniques'
  };

  return actions[trait as keyof typeof actions] || `Develop ${trait} through structured learning`;
}

/**
 * Get long-term action for trait
 */
function getLongTermAction(trait: string, isStrength: boolean): string {
  if (isStrength) {
    const actions = {
      openness: 'Seek roles in innovation, strategy, or R&D',
      conscientiousness: 'Target operational excellence or quality assurance leadership',
      extraversion: 'Pursue people leadership or business development roles',
      agreeableness: 'Excel in team leadership or organizational development',
      emotional_stability: 'Lead high-pressure initiatives or crisis management'
    };
    return actions[trait as keyof typeof actions] || `Leverage ${trait} in leadership roles`;
  }

  return `Continue developing ${trait} for long-term success`;
}

/**
 * Generate visualization data
 */
function generateVisualizationData(
  scores: OceanScoreDetails,
  benchmarks?: { [trait: string]: number },
  historicalScores?: OceanScoreDetails[]
): OceanVisualizationData {
  // Radar chart for current profile
  const radarChart = generateRadarChartData(scores, benchmarks);
  
  // Bar chart for percentiles
  const barChart = generateBarChartData(scores);
  
  // Line chart for historical trends if available
  const lineChart = historicalScores ? generateLineChartData(historicalScores) : undefined;

  return {
    radarChart,
    barChart,
    lineChart
  };
}

/**
 * Generate radar chart data
 */
function generateRadarChartData(
  scores: OceanScoreDetails,
  benchmarks?: { [trait: string]: number }
): RadarChartData {
  const labels = ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Emotional Stability'];
  const datasets = [
    {
      label: 'Your Profile',
      data: [
        scores.percentile.openness,
        scores.percentile.conscientiousness,
        scores.percentile.extraversion,
        scores.percentile.agreeableness,
        100 - scores.percentile.neuroticism // Convert to emotional stability
      ],
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      borderColor: 'rgb(54, 162, 235)'
    }
  ];

  if (benchmarks) {
    datasets.push({
      label: 'Benchmark',
      data: [
        benchmarks.openness || 50,
        benchmarks.conscientiousness || 50,
        benchmarks.extraversion || 50,
        benchmarks.agreeableness || 50,
        benchmarks.neuroticism ? 100 - benchmarks.neuroticism : 50
      ],
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      borderColor: 'rgb(255, 99, 132)'
    });
  }

  return { labels, datasets };
}

/**
 * Generate bar chart data
 */
function generateBarChartData(scores: OceanScoreDetails): BarChartData {
  const labels = ['Openness', 'Conscientiousness', 'Extraversion', 'Agreeableness', 'Neuroticism'];
  const data = [
    scores.stanine.openness,
    scores.stanine.conscientiousness,
    scores.stanine.extraversion,
    scores.stanine.agreeableness,
    scores.stanine.neuroticism
  ];

  const colors = data.map(stanine => {
    if (stanine >= 7) return '#4ade80'; // Green for high
    if (stanine <= 3) return '#f87171'; // Red for low
    return '#60a5fa'; // Blue for moderate
  });

  return {
    labels,
    datasets: [
      {
        label: 'Stanine Score (1-9)',
        data,
        backgroundColor: colors
      }
    ]
  };
}

/**
 * Generate line chart data for trends
 */
function generateLineChartData(historicalScores: OceanScoreDetails[]): LineChartData {
  const labels = historicalScores.map((_, index) => `Assessment ${index + 1}`);
  
  return {
    labels,
    datasets: [
      {
        label: 'Openness',
        data: historicalScores.map(s => s.percentile.openness),
        borderColor: '#8b5cf6'
      },
      {
        label: 'Conscientiousness',
        data: historicalScores.map(s => s.percentile.conscientiousness),
        borderColor: '#3b82f6'
      },
      {
        label: 'Extraversion',
        data: historicalScores.map(s => s.percentile.extraversion),
        borderColor: '#f59e0b'
      },
      {
        label: 'Agreeableness',
        data: historicalScores.map(s => s.percentile.agreeableness),
        borderColor: '#10b981'
      },
      {
        label: 'Emotional Stability',
        data: historicalScores.map(s => 100 - s.percentile.neuroticism),
        borderColor: '#ef4444'
      }
    ]
  };
}