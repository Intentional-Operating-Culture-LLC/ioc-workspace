export interface ScoringDimension {
  name: string;
  weight: number;
  score: number;
}

export class ScoringEngine {
  calculateScore(dimensions: ScoringDimension[]): number {
    const totalWeight = dimensions.reduce((sum, dim) => sum + dim.weight, 0);
    const weightedSum = dimensions.reduce(
      (sum, dim) => sum + dim.score * dim.weight,
      0
    );
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  normalizeScore(score: number, min: number = 0, max: number = 100): number {
    return Math.max(min, Math.min(max, score));
  }

  calculatePercentile(score: number, population: number[]): number {
    const sorted = [...population].sort((a, b) => a - b);
    const index = sorted.findIndex(s => s >= score);
    
    if (index === -1) return 100;
    if (index === 0) return 0;
    
    return (index / sorted.length) * 100;
  }
}

export const scoringEngine = new ScoringEngine();
