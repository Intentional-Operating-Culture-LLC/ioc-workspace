import React from 'react';
import { OceanScoreDetails } from "@ioc/shared/data-access/scoring";
interface OceanScoreDisplayProps {
    scores: OceanScoreDetails;
    showDetails?: boolean;
    showFacets?: boolean;
    variant?: 'compact' | 'full';
}
export const OceanScoreDisplay: React.FC<OceanScoreDisplayProps> = ({ scores, showDetails = true, showFacets = false, variant = 'full' }) => {
    const traits = [
        { key: 'openness', label: 'Openness', color: '#8b5cf6' },
        { key: 'conscientiousness', label: 'Conscientiousness', color: '#3b82f6' },
        { key: 'extraversion', label: 'Extraversion', color: '#f59e0b' },
        { key: 'agreeableness', label: 'Agreeableness', color: '#10b981' },
        { key: 'neuroticism', label: 'Neuroticism', color: '#ef4444' }
    ];
    const getStanineLabel = (stanine: number): string => {
        if (stanine >= 8)
            return 'Very High';
        if (stanine >= 7)
            return 'High';
        if (stanine >= 4)
            return 'Average';
        if (stanine >= 2)
            return 'Low';
        return 'Very Low';
    };
    const getScoreColor = (stanine: number): string => {
        if (stanine >= 7)
            return 'text-green-600';
        if (stanine >= 4)
            return 'text-blue-600';
        return 'text-red-600';
    };
    if (variant === 'compact') {
        return (<div className="flex flex-wrap gap-2">
        {traits.map(trait => (<div key={trait.key} className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full">
            <span className="text-xs font-medium text-gray-600">
              {trait.label.charAt(0)}
            </span>
            <span className="text-sm font-bold" style={{ color: trait.color }}>
              {scores.stanine[trait.key as keyof typeof scores.stanine]}
            </span>
          </div>))}
      </div>);
    }
    return (<div className="space-y-4">
      {traits.map(trait => {
            const stanine = scores.stanine[trait.key as keyof typeof scores.stanine];
            const percentile = scores.percentile[trait.key as keyof typeof scores.percentile];
            const raw = scores.raw[trait.key as keyof typeof scores.raw];
            return (<div key={trait.key} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-lg" style={{ color: trait.color }}>
                {trait.label}
              </h4>
              <div className="flex items-center gap-3">
                <span className={`font-bold text-lg ${getScoreColor(stanine)}`}>
                  {getStanineLabel(stanine)}
                </span>
                <span className="text-sm text-gray-500">
                  (Stanine: {stanine})
                </span>
              </div>
            </div>

            {showDetails && (<div className="space-y-2">
                {/* Percentile bar */}
                <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                  <div className="absolute left-0 top-0 h-full transition-all duration-500" style={{
                        width: `${percentile}%`,
                        backgroundColor: trait.color
                    }}>
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white text-sm font-medium">
                      {percentile}%
                    </span>
                  </div>
                </div>

                {/* Score details */}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Raw Score: {raw.toFixed(2)}</span>
                  <span>Percentile: {percentile}th</span>
                </div>
              </div>)}

            {showFacets && scores.facets && scores.facets[trait.key as keyof typeof scores.facets] && (<div className="mt-3 pt-3 border-t">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Facets</h5>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(scores.facets[trait.key as keyof typeof scores.facets] || {}).map(([facet, score]) => (<div key={facet} className="flex justify-between text-xs">
                        <span className="text-gray-600 capitalize">
                          {facet.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span className="font-medium">{(score as number).toFixed(1)}</span>
                      </div>))}
                </div>
              </div>)}
          </div>);
        })}

      {/* Summary statistics */}
      {showDetails && (<div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-2">Profile Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Highest Trait:</span>
              <span className="ml-2 font-medium">
                {traits.reduce((max, trait) => scores.percentile[trait.key as keyof typeof scores.percentile] >
                scores.percentile[max.key as keyof typeof scores.percentile] ? trait : max).label}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Lowest Trait:</span>
              <span className="ml-2 font-medium">
                {traits.reduce((min, trait) => scores.percentile[trait.key as keyof typeof scores.percentile] <
                scores.percentile[min.key as keyof typeof scores.percentile] ? trait : min).label}
              </span>
            </div>
          </div>
        </div>)}
    </div>);
};
