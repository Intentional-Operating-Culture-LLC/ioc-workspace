# OCEAN Assessment Components

A comprehensive suite of React components for OCEAN-integrated personality assessments with TypeScript, accessibility features, and beautiful UI.

## Components Overview

### 1. Assessment Creation

#### NodeBasedAssessmentCreator
Visual assessment builder with competency node selection and OCEAN trait coverage preview.

```tsx
import { NodeBasedAssessmentCreator } from '@ioc/ui';

<NodeBasedAssessmentCreator
  onSave={(config) => handleSaveAssessment(config)}
  initialConfig={existingConfig}
/>
```

### 2. Question Display

#### OceanPromptDisplay
Enhanced question display with trait indicators and special context support.

```tsx
import { OceanPromptDisplay } from '@ioc/ui';

<OceanPromptDisplay
  prompt={currentQuestion}
  onAnswer={(value) => handleAnswer(value)}
  currentAnswer={savedAnswer}
  questionNumber={currentIndex + 1}
  totalQuestions={totalQuestions}
  timeRemaining={timeLeft}
/>
```

### 3. Results Visualization

#### OceanResultsDashboard
Main results dashboard with tabs for different views.

```tsx
import { OceanResultsDashboard } from '@ioc/ui';

<OceanResultsDashboard
  score={assessmentScore}
  assessmentTitle="Executive Leadership Assessment"
  assessmentDate={new Date().toISOString()}
  userName="John Doe"
  onGenerateReport={handleGenerateReport}
  onShare={handleShare}
  onPrint={handlePrint}
/>
```

#### FacetRadarChart
30-facet personality analysis with radar charts.

```tsx
import { FacetRadarChart } from '@ioc/ui';

<FacetRadarChart facets={oceanFacets} />
```

#### EmotionalRegulationSpectrum
Emotional intelligence and regulation visualization.

```tsx
import { EmotionalRegulationSpectrum } from '@ioc/ui';

<EmotionalRegulationSpectrum regulation={emotionalRegulationScore} />
```

#### ExecutiveLeadershipProfile
Executive competencies and readiness assessment.

```tsx
import { ExecutiveLeadershipProfile } from '@ioc/ui';

<ExecutiveLeadershipProfile profile={executiveProfile} />
```

#### DarkSideRiskIndicators
Leadership derailers and risk assessment.

```tsx
import { DarkSideRiskIndicators } from '@ioc/ui';

<DarkSideRiskIndicators risks={darkSideRisks} />
```

### 4. 360-Degree Feedback

#### RaterInvitation
Invite and manage 360-degree feedback raters.

```tsx
import { RaterInvitation } from '@ioc/ui';

<RaterInvitation
  assessmentId={assessmentId}
  assessmentTitle="360° Leadership Feedback"
  subjectName="Jane Smith"
  onSendInvitations={handleSendInvitations}
/>
```

#### MultiRaterComparison
Compare self-assessment with rater feedback.

```tsx
import { MultiRaterComparison } from '@ioc/ui';

<MultiRaterComparison
  selfScore={selfAssessmentScore}
  raterFeedback={raterResponses}
  userName="Jane Smith"
/>
```

### 5. Admin Configuration

#### AssessmentTypeManager
Configure assessment types, scoring, and normative data.

```tsx
import { AssessmentTypeManager } from '@ioc/ui';

<AssessmentTypeManager
  onSave={(types) => handleSaveTypes(types)}
  initialTypes={existingTypes}
/>
```

## Features

### Accessibility
- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader optimized
- High contrast mode compatible
- Focus management

### Responsive Design
- Mobile-first approach
- Tablet and desktop optimized
- Touch-friendly interfaces
- Adaptive layouts

### Performance
- Lazy loading for charts
- Memoized components
- Optimized re-renders
- Smooth animations

### Customization
- Theme support via Tailwind CSS
- Configurable colors and styles
- Extensible component props
- Custom scoring algorithms

## Usage Example

```tsx
import React, { useState } from 'react';
import {
  NodeBasedAssessmentCreator,
  OceanPromptDisplay,
  OceanResultsDashboard,
  OceanScore,
  OceanPrompt
} from '@ioc/ui';

function AssessmentFlow() {
  const [step, setStep] = useState<'create' | 'take' | 'results'>('create');
  const [assessment, setAssessment] = useState(null);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [score, setScore] = useState<OceanScore | null>(null);

  // Handle assessment creation
  const handleCreateAssessment = (config) => {
    setAssessment(config);
    setStep('take');
  };

  // Handle question responses
  const handleAnswer = (questionId: string, value: number) => {
    setResponses({ ...responses, [questionId]: value });
  };

  // Calculate and show results
  const handleComplete = () => {
    const calculatedScore = calculateOceanScore(responses);
    setScore(calculatedScore);
    setStep('results');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {step === 'create' && (
        <NodeBasedAssessmentCreator
          onSave={handleCreateAssessment}
        />
      )}

      {step === 'take' && assessment && (
        <div className="space-y-6">
          {/* Question flow implementation */}
          <OceanPromptDisplay
            prompt={currentQuestion}
            onAnswer={(value) => handleAnswer(currentQuestion.id, value)}
            questionNumber={currentIndex + 1}
            totalQuestions={assessment.questions.length}
          />
        </div>
      )}

      {step === 'results' && score && (
        <OceanResultsDashboard
          score={score}
          assessmentTitle={assessment.title}
          assessmentDate={new Date().toISOString()}
          userName="Test User"
        />
      )}
    </div>
  );
}
```

## TypeScript Types

All components are fully typed. Import types from the types file:

```tsx
import {
  OceanTraits,
  OceanScore,
  OceanPrompt,
  EmotionalRegulationScore,
  ExecutiveProfile,
  DarkSideRisks,
  RaterFeedback
} from '@ioc/ui';
```

## Styling

Components use Tailwind CSS classes and are designed to work with your existing Tailwind configuration. Custom colors can be overridden via CSS variables or Tailwind config.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## Dependencies

- React 18+
- TypeScript 5+
- Tailwind CSS 3+
- Chart.js 4+ (for charts)
- Framer Motion (for animations)
- @heroicons/react (for icons)