# OCEAN Scoring System Documentation

## Overview

The OCEAN scoring system provides comprehensive personality trait assessment based on the Big Five (OCEAN) model. This system integrates with the IOC assessment framework to calculate, normalize, and interpret personality trait scores.

## Features

- **Trait Calculation**: Weighted scoring across five personality dimensions
- **Facet Analysis**: Detailed sub-trait scoring for deeper insights
- **Normalization**: Raw scores converted to percentiles and stanines
- **Multi-Assessment Aggregation**: Combine scores from multiple assessments (e.g., 360 feedback)
- **Interpretation Engine**: Generate actionable insights and recommendations
- **Visualization Support**: Data formatted for charts and graphs

## Architecture

### Core Components

1. **ocean-scoring.ts**: Core scoring algorithms and normalization functions
2. **ocean-mapping.ts**: Question-to-trait mapping configurations
3. **assessment-scoring-service.ts**: Integration with assessment system
4. **ocean-reports.ts**: Report generation and visualization

### Database Schema

```sql
-- OCEAN scores stored in assessment_scores table
assessment_scores:
  - dimension: 'ocean_[trait]' (e.g., 'ocean_openness')
  - score: percentile (1-99)
  - raw_score: original calculated score (1-5)
  - percentile: percentile rank
  - stanine: 1-9 scale score
  - confidence_level: scoring confidence (0-100)

-- Metadata stored in assessment_responses
assessment_responses:
  - scored_at: timestamp of scoring
  - scoring_metadata: JSON with full OCEAN details
```

## Usage

### Basic Scoring

```typescript
import { scoreAssessmentResponse } from '@ioc/lib/scoring';

// Score a single assessment response
const result = await scoreAssessmentResponse(responseId);

// Result includes:
// - OCEAN scores (raw, percentile, stanine)
// - Pillar and domain scores
// - Interpretation and recommendations
// - Confidence level
```

### 360 Feedback Aggregation

```typescript
import { scoreMultipleResponses } from '@ioc/lib/scoring';

// Aggregate multiple responses with weights
const aggregated = await scoreMultipleResponses(
  [selfId, peerId1, peerId2, managerId],
  [1.0, 0.8, 0.8, 0.9] // Optional weights
);
```

### Custom Mappings

```typescript
import { generateQuestionMappings } from '@ioc/lib/scoring';

// Generate mappings for custom questions
const mappings = generateQuestionMappings(questions);

// Use custom mappings
const scores = calculateOceanScores(responses, mappings);
```

## Trait Descriptions

### Openness to Experience
- **High (7-9)**: Creative, imaginative, open to new experiences
- **Average (4-6)**: Balanced between tradition and innovation
- **Low (1-3)**: Practical, traditional, prefers routine

### Conscientiousness
- **High (7-9)**: Organized, disciplined, goal-oriented
- **Average (4-6)**: Balanced organization and flexibility
- **Low (1-3)**: Flexible, spontaneous, adaptable

### Extraversion
- **High (7-9)**: Sociable, energetic, assertive
- **Average (4-6)**: Comfortable in varied social situations
- **Low (1-3)**: Reserved, reflective, independent

### Agreeableness
- **High (7-9)**: Cooperative, trusting, considerate
- **Average (4-6)**: Balanced cooperation and assertiveness
- **Low (1-3)**: Direct, competitive, skeptical

### Neuroticism
- **High (7-9)**: Emotionally sensitive and reactive
- **Average (4-6)**: Normal emotional responses
- **Low (1-3)**: Emotionally stable and resilient

## Scoring Algorithm

### 1. Response Normalization
- Convert all responses to 1-5 scale
- Apply reverse scoring where appropriate
- Handle different response types (Likert, multiple choice, etc.)

### 2. Weighted Aggregation
- Apply trait weights from question mappings
- Calculate weighted averages per trait
- Adjust for confidence scores if available

### 3. Percentile Conversion
- Use normative data (mean, SD) for each trait
- Calculate z-scores and convert to percentiles
- Ensure scores fall within 1-99 range

### 4. Stanine Calculation
- Convert percentiles to 9-point stanine scale
- Provides standardized interpretation levels

## API Endpoints

### Score Assessment
```
POST /api/assessments/{responseId}/score
{
  "recalculate": false  // Force recalculation if true
}
```

### Get Scores
```
GET /api/assessments/{responseId}/score
```

### Delete Scores (Admin)
```
DELETE /api/assessments/{responseId}/score
```

## Configuration

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### Customizing Norms
Update `OCEAN_NORMS` in `ocean-scoring.ts` to use population-specific normative data:

```typescript
const OCEAN_NORMS = {
  openness: {
    mean: 3.92,  // Population mean
    sd: 0.66,    // Standard deviation
    percentiles: [...] // Optional percentile lookup
  },
  // ... other traits
};
```

## Best Practices

1. **Question Design**: Ensure questions clearly map to specific traits
2. **Balanced Assessment**: Include items for all five traits
3. **Reverse Items**: Include reverse-scored items to detect response bias
4. **Confidence Tracking**: Use confidence scores to weight responses
5. **Regular Validation**: Compare results with established measures

## Troubleshooting

### Common Issues

1. **Missing Scores**: Ensure response is marked as 'submitted'
2. **Low Confidence**: Check for rushed responses or pattern answering
3. **Extreme Scores**: Validate against response time and patterns
4. **Database Errors**: Check Supabase connection and permissions

### Debugging

Enable debug logging:
```typescript
console.log('Scoring details:', {
  responses: scorableResponses,
  mappings: mappings,
  rawScores: oceanScores.raw
});
```

## Future Enhancements

- Machine learning for improved mappings
- Cultural norm adjustments
- Longitudinal tracking and change detection
- Integration with performance metrics
- Advanced facet analysis
- Personality type clustering