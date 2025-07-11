/**
 * Unit Tests for OCEAN Assessment UI Components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from "@ioc/shared/data-access/src/contexts/AuthContext";
import {
  OceanAssessment,
  AssessmentProgress,
  QuestionNode,
  ScoreVisualization,
  DarkSideAlert } from
"@ioc/shared/ui/src/components/assessment/ocean";

expect.extend(toHaveNoViolations);

// Mock contexts and providers
const createWrapper = ({ user = null, assessment = null } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }) =>
  <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ user, loading: false }}>
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>;

};

describe('OCEAN Assessment Components', () => {
  describe('OceanAssessment Component', () => {
    test('should render assessment introduction', () => {
      const { container } = render(
        <OceanAssessment assessmentType="ocean_basic" />,
        { wrapper: createWrapper({ user: { id: 'user-123' } }) }
      );

      expect(screen.getByText(/OCEAN Personality Assessment/i)).toBeInTheDocument();
      expect(screen.getByText(/measures five key personality dimensions/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start assessment/i })).toBeInTheDocument();
    });

    test('should handle assessment initialization', async () => {
      const user = userEvent.setup();

      render(
        <OceanAssessment assessmentType="ocean_basic" />,
        { wrapper: createWrapper({ user: { id: 'user-123' } }) }
      );

      const startButton = screen.getByRole('button', { name: /start assessment/i });
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/Question 1 of/i)).toBeInTheDocument();
      });
    });

    test('should validate required fields before proceeding', async () => {
      const user = userEvent.setup();

      render(
        <OceanAssessment assessmentType="ocean_basic" />,
        { wrapper: createWrapper({ user: { id: 'user-123' } }) }
      );

      // Start assessment
      await user.click(screen.getByRole('button', { name: /start assessment/i }));

      // Try to proceed without answering
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      expect(screen.getByText(/Please answer the question/i)).toBeInTheDocument();
    });

    test('should save progress automatically', async () => {
      const user = userEvent.setup();
      jest.useFakeTimers();

      render(
        <OceanAssessment
          assessmentType="ocean_basic"
          autoSaveInterval={5000} />,

        { wrapper: createWrapper({ user: { id: 'user-123' } }) }
      );

      // Start assessment and answer a question
      await user.click(screen.getByRole('button', { name: /start assessment/i }));

      const option = screen.getByLabelText(/strongly agree/i);
      await user.click(option);

      // Fast forward time
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.getByText(/Progress saved/i)).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    test('should handle assessment completion', async () => {
      const user = userEvent.setup();
      const onComplete = jest.fn();

      render(
        <OceanAssessment
          assessmentType="ocean_basic"
          onComplete={onComplete}
          questions={mockQuestions} />,

        { wrapper: createWrapper({ user: { id: 'user-123' } }) }
      );

      // Complete all questions
      await completeAllQuestions(user);

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            scores: expect.objectContaining({
              openness: expect.any(Number),
              conscientiousness: expect.any(Number)
            })
          })
        );
      });
    });
  });

  describe('AssessmentProgress Component', () => {
    test('should display correct progress', () => {
      render(
        <AssessmentProgress
          current={15}
          total={50}
          dimensions={{
            openness: 3,
            conscientiousness: 4,
            extraversion: 2,
            agreeableness: 3,
            neuroticism: 3
          }} />

      );

      expect(screen.getByText('30%')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '30');
    });

    test('should show dimension coverage', () => {
      render(
        <AssessmentProgress
          current={25}
          total={50}
          showDimensionCoverage
          dimensions={{
            openness: 5,
            conscientiousness: 5,
            extraversion: 5,
            agreeableness: 5,
            neuroticism: 5
          }} />

      );

      const dimensionBars = screen.getAllByTestId(/dimension-progress/i);
      expect(dimensionBars).toHaveLength(5);
    });
  });

  describe('QuestionNode Component', () => {
    test('should render question with options', () => {
      const question = {
        id: 1,
        text: 'I enjoy trying new and different things',
        type: 'likert',
        options: [
        { value: 1, label: 'Strongly Disagree' },
        { value: 2, label: 'Disagree' },
        { value: 3, label: 'Neutral' },
        { value: 4, label: 'Agree' },
        { value: 5, label: 'Strongly Agree' }]

      };

      render(<QuestionNode question={question} onChange={jest.fn()} />);

      expect(screen.getByText(question.text)).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(5);
    });

    test('should handle option selection', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      const question = mockQuestions[0];

      render(<QuestionNode question={question} onChange={onChange} />);

      const agreeOption = screen.getByLabelText(/agree/i);
      await user.click(agreeOption);

      expect(onChange).toHaveBeenCalledWith({
        questionId: question.id,
        value: 4,
        timestamp: expect.any(String)
      });
    });

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      const question = mockQuestions[0];

      render(<QuestionNode question={question} onChange={onChange} />);

      const firstOption = screen.getAllByRole('radio')[0];
      firstOption.focus();

      await user.keyboard('{ArrowRight}');
      expect(screen.getAllByRole('radio')[1]).toHaveFocus();

      await user.keyboard('{Space}');
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('ScoreVisualization Component', () => {
    test('should render OCEAN scores correctly', () => {
      const scores = {
        openness: 75,
        conscientiousness: 82,
        extraversion: 65,
        agreeableness: 70,
        neuroticism: 45
      };

      render(<ScoreVisualization scores={scores} />);

      expect(screen.getByText(/openness: 75/i)).toBeInTheDocument();
      expect(screen.getByText(/conscientiousness: 82/i)).toBeInTheDocument();
      expect(screen.getByText(/extraversion: 65/i)).toBeInTheDocument();
      expect(screen.getByText(/agreeableness: 70/i)).toBeInTheDocument();
      expect(screen.getByText(/neuroticism: 45/i)).toBeInTheDocument();
    });

    test('should show interpretation for scores', () => {
      const scores = {
        openness: 85,
        conscientiousness: 40,
        extraversion: 65,
        agreeableness: 70,
        neuroticism: 75
      };

      render(<ScoreVisualization scores={scores} showInterpretation />);

      expect(screen.getByText(/High openness/i)).toBeInTheDocument();
      expect(screen.getByText(/Low conscientiousness/i)).toBeInTheDocument();
      expect(screen.getByText(/Moderate extraversion/i)).toBeInTheDocument();
    });

    test('should render comparison view', () => {
      const scores = {
        openness: 75,
        conscientiousness: 82,
        extraversion: 65,
        agreeableness: 70,
        neuroticism: 45
      };

      const benchmarks = {
        openness: 65,
        conscientiousness: 70,
        extraversion: 60,
        agreeableness: 72,
        neuroticism: 50
      };

      render(
        <ScoreVisualization
          scores={scores}
          comparisonData={benchmarks}
          comparisonLabel="Industry Average" />

      );

      expect(screen.getByText(/Industry Average/i)).toBeInTheDocument();
      expect(screen.getByTestId('comparison-chart')).toBeInTheDocument();
    });
  });

  describe('DarkSideAlert Component', () => {
    test('should display dark side patterns', () => {
      const patterns = [
      {
        type: 'volatility_risk',
        severity: 'high',
        description: 'High neuroticism combined with low agreeableness'
      },
      {
        type: 'perfectionism_risk',
        severity: 'moderate',
        description: 'Very high conscientiousness with elevated neuroticism'
      }];


      render(<DarkSideAlert patterns={patterns} />);

      expect(screen.getByText(/Potential Risk Areas/i)).toBeInTheDocument();
      expect(screen.getByText(/volatility risk/i)).toBeInTheDocument();
      expect(screen.getByText(/perfectionism risk/i)).toBeInTheDocument();
    });

    test('should provide intervention recommendations', () => {
      const patterns = [
      {
        type: 'burnout_risk',
        severity: 'high',
        recommendations: [
        'Consider stress management techniques',
        'Set realistic boundaries',
        'Practice self-compassion']

      }];


      render(<DarkSideAlert patterns={patterns} showRecommendations />);

      expect(screen.getByText(/stress management/i)).toBeInTheDocument();
      expect(screen.getByText(/boundaries/i)).toBeInTheDocument();
      expect(screen.getByText(/self-compassion/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have no accessibility violations', async () => {
      const { container } = render(
        <OceanAssessment assessmentType="ocean_basic" />,
        { wrapper: createWrapper({ user: { id: 'user-123' } }) }
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should announce progress updates to screen readers', async () => {
      const user = userEvent.setup();

      render(
        <OceanAssessment assessmentType="ocean_basic" />,
        { wrapper: createWrapper({ user: { id: 'user-123' } }) }
      );

      // Start assessment
      await user.click(screen.getByRole('button', { name: /start assessment/i }));

      // Answer a question
      const option = screen.getByLabelText(/agree/i);
      await user.click(option);

      // Move to next question
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Check for ARIA live region update
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent(/Question 2 of/i);
    });

    test('should support keyboard-only navigation', async () => {
      const user = userEvent.setup();

      render(
        <OceanAssessment assessmentType="ocean_basic" />,
        { wrapper: createWrapper({ user: { id: 'user-123' } }) }
      );

      // Navigate using Tab
      await user.tab();
      expect(screen.getByRole('button', { name: /start assessment/i })).toHaveFocus();

      // Activate with Enter
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/Question 1/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cross-browser Compatibility', () => {
    test('should handle different input methods', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();

      render(
        <QuestionNode
          question={mockQuestions[0]}
          onChange={onChange}
          supportTouch />

      );

      const option = screen.getByLabelText(/agree/i);

      // Test touch events
      fireEvent.touchStart(option);
      fireEvent.touchEnd(option);

      expect(onChange).toHaveBeenCalled();
    });

    test('should gracefully degrade without JavaScript', () => {
      // This would typically be tested in an E2E environment
      // Here we ensure progressive enhancement
      const { container } = render(
        <OceanAssessment
          assessmentType="ocean_basic"
          fallbackUrl="/assessments/ocean/basic" />

      );

      const form = container.querySelector('form');
      expect(form).toHaveAttribute('action', '/assessments/ocean/basic');
      expect(form).toHaveAttribute('method', 'post');
    });
  });
});

// Mock data
const mockQuestions = [
{
  id: 1,
  text: 'I enjoy trying new and different things',
  type: 'likert',
  dimension: 'openness',
  options: [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' }]

},
{
  id: 2,
  text: 'I complete tasks thoroughly and on time',
  type: 'likert',
  dimension: 'conscientiousness',
  options: [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' }]

}];


// Helper function to complete all questions
async function completeAllQuestions(user) {
  const questions = screen.getAllByRole('radiogroup');

  for (let i = 0; i < questions.length; i++) {
    const options = within(questions[i]).getAllByRole('radio');
    await user.click(options[3]); // Select "Agree"

    if (i < questions.length - 1) {
      await user.click(screen.getByRole('button', { name: /next/i }));
    }
  }

  await user.click(screen.getByRole('button', { name: /submit/i }));
}