export interface OceanDimensions {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface OceanFacet {
  dimension: keyof OceanDimensions;
  facetName: string;
  score: number;
}

export class OceanAnalyzer {
  private readonly dimensionLabels = {
    openness: 'Openness to Experience',
    conscientiousness: 'Conscientiousness',
    extraversion: 'Extraversion',
    agreeableness: 'Agreeableness',
    neuroticism: 'Neuroticism',
  };

  analyzeDimensions(dimensions: OceanDimensions): {
    dominant: string;
    insights: string[];
  } {
    const entries = Object.entries(dimensions) as [keyof OceanDimensions, number][];
    const dominant = entries.reduce((max, [key, value]) =>
      value > dimensions[max] ? key : max
    , 'openness' as keyof OceanDimensions);

    const insights = this.generateInsights(dimensions, dominant);

    return {
      dominant: this.dimensionLabels[dominant],
      insights,
    };
  }

  private generateInsights(
    dimensions: OceanDimensions,
    dominant: keyof OceanDimensions
  ): string[] {
    const insights: string[] = [];

    if (dimensions[dominant] > 70) {
      insights.push(`Very high ${this.dimensionLabels[dominant]}`);
    }

    if (dimensions.openness > 60 && dimensions.conscientiousness > 60) {
      insights.push('Balanced between creativity and structure');
    }

    if (dimensions.neuroticism < 30) {
      insights.push('High emotional stability');
    }

    return insights;
  }

  calculateFacetScores(facets: OceanFacet[]): Record<string, number> {
    const grouped = facets.reduce((acc, facet) => {
      if (!acc[facet.dimension]) {
        acc[facet.dimension] = [];
      }
      acc[facet.dimension].push(facet.score);
      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(grouped).reduce((acc, [dimension, scores]) => {
      acc[dimension] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      return acc;
    }, {} as Record<string, number>);
  }
}

export const oceanAnalyzer = new OceanAnalyzer();
