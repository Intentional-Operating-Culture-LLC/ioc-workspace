import React from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon,
  LightBulbIcon,
  UserGroupIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  BuildingOfficeIcon,
  RocketLaunchIcon,
  PresentationChartLineIcon
} from '@heroicons/react/24/outline';
import { ExecutiveProfile } from './types';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface ExecutiveLeadershipProfileProps {
  profile: ExecutiveProfile;
}

const LEADERSHIP_DIMENSIONS = [
  {
    key: 'strategicThinking' as keyof ExecutiveProfile,
    label: 'Strategic Thinking',
    icon: ChartBarIcon,
    description: 'Ability to see the big picture and plan for long-term success',
    benchmarks: { excellent: 85, good: 70, average: 50 }
  },
  {
    key: 'decisionMaking' as keyof ExecutiveProfile,
    label: 'Decision Making',
    icon: TrophyIcon,
    description: 'Making timely, well-informed decisions under pressure',
    benchmarks: { excellent: 85, good: 70, average: 50 }
  },
  {
    key: 'changeLeadership' as keyof ExecutiveProfile,
    label: 'Change Leadership',
    icon: ArrowTrendingUpIcon,
    description: 'Leading transformation and managing organizational change',
    benchmarks: { excellent: 80, good: 65, average: 45 }
  },
  {
    key: 'executivePresence' as keyof ExecutiveProfile,
    label: 'Executive Presence',
    icon: BuildingOfficeIcon,
    description: 'Commanding respect and inspiring confidence',
    benchmarks: { excellent: 85, good: 70, average: 50 }
  },
  {
    key: 'stakeholderManagement' as keyof ExecutiveProfile,
    label: 'Stakeholder Management',
    icon: UserGroupIcon,
    description: 'Building relationships and managing diverse stakeholders',
    benchmarks: { excellent: 80, good: 65, average: 45 }
  },
  {
    key: 'teamDevelopment' as keyof ExecutiveProfile,
    label: 'Team Development',
    icon: UserGroupIcon,
    description: 'Building high-performing teams and developing talent',
    benchmarks: { excellent: 85, good: 70, average: 50 }
  },
  {
    key: 'resultsOrientation' as keyof ExecutiveProfile,
    label: 'Results Orientation',
    icon: PresentationChartLineIcon,
    description: 'Driving performance and achieving business outcomes',
    benchmarks: { excellent: 90, good: 75, average: 55 }
  },
  {
    key: 'innovationDrive' as keyof ExecutiveProfile,
    label: 'Innovation Drive',
    icon: RocketLaunchIcon,
    description: 'Fostering creativity and driving innovation',
    benchmarks: { excellent: 80, good: 65, average: 45 }
  }
];

const getCompetencyLevel = (score: number, benchmarks: { excellent: number; good: number; average: number }) => {
  if (score >= benchmarks.excellent) return { level: 'Exceptional', color: 'text-green-600', bgColor: 'bg-green-100' };
  if (score >= benchmarks.good) return { level: 'Strong', color: 'text-blue-600', bgColor: 'bg-blue-100' };
  if (score >= benchmarks.average) return { level: 'Competent', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
  return { level: 'Developing', color: 'text-red-600', bgColor: 'bg-red-100' };
};

export const ExecutiveLeadershipProfile: React.FC<ExecutiveLeadershipProfileProps> = ({
  profile
}) => {
  // Calculate overall executive readiness score
  const overallScore = Object.values(profile).reduce((sum, score) => sum + score, 0) / Object.values(profile).length;
  
  // Prepare data for competency comparison chart
  const chartData = {
    labels: LEADERSHIP_DIMENSIONS.map(dim => dim.label),
    datasets: [
      {
        label: 'Your Score',
        data: LEADERSHIP_DIMENSIONS.map(dim => profile[dim.key]),
        borderColor: '#6366f1',
        backgroundColor: '#6366f1',
        tension: 0.4
      },
      {
        label: 'Executive Benchmark',
        data: LEADERSHIP_DIMENSIONS.map(dim => dim.benchmarks.good),
        borderColor: '#94a3b8',
        backgroundColor: '#94a3b8',
        borderDash: [5, 5],
        tension: 0.4
      }
    ]
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value) => value + '%'
        }
      }
    }
  };

  // Determine executive readiness level
  const readinessLevel = overallScore >= 80 ? 'Ready' : overallScore >= 65 ? 'Nearly Ready' : 'Developing';
  const readinessColor = overallScore >= 80 ? 'text-green-600' : overallScore >= 65 ? 'text-blue-600' : 'text-yellow-600';

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Executive Leadership Profile</h2>
            <p className="mt-2 text-gray-600">
              Comprehensive assessment of your executive leadership capabilities
            </p>
          </div>
          <div className="text-center">
            <div className={`text-4xl font-bold ${readinessColor}`}>
              {readinessLevel}
            </div>
            <div className="text-sm text-gray-500">Executive Readiness</div>
            <div className="text-2xl font-semibold text-gray-700 mt-1">
              {overallScore.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Competency Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LEADERSHIP_DIMENSIONS.map((dimension, index) => {
            const score = profile[dimension.key];
            const assessment = getCompetencyLevel(score, dimension.benchmarks);
            const Icon = dimension.icon;

            return (
              <motion.div
                key={dimension.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Icon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900">{dimension.label}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${assessment.bgColor} ${assessment.color}`}>
                        {assessment.level}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{dimension.description}</p>
                    
                    {/* Score Bar with Benchmarks */}
                    <div className="relative">
                      <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${score}%` }}
                          transition={{ duration: 1, delay: 0.5 + index * 0.05 }}
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                        />
                      </div>
                      
                      {/* Benchmark Markers */}
                      <div className="absolute inset-0 flex items-center">
                        <div 
                          className="absolute h-full border-l-2 border-yellow-400"
                          style={{ left: `${dimension.benchmarks.average}%` }}
                          title="Average"
                        />
                        <div 
                          className="absolute h-full border-l-2 border-blue-400"
                          style={{ left: `${dimension.benchmarks.good}%` }}
                          title="Good"
                        />
                        <div 
                          className="absolute h-full border-l-2 border-green-400"
                          style={{ left: `${dimension.benchmarks.excellent}%` }}
                          title="Excellent"
                        />
                      </div>
                      
                      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm font-bold text-gray-700">
                        {score}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Competency Comparison Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Competency Comparison</h3>
        <div className="h-80">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Executive Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Strengths */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Leadership Strengths</h3>
          <div className="space-y-3">
            {LEADERSHIP_DIMENSIONS
              .filter(dim => profile[dim.key] >= dim.benchmarks.good)
              .sort((a, b) => profile[b.key] - profile[a.key])
              .slice(0, 3)
              .map(dim => {
                const Icon = dim.icon;
                return (
                  <div key={dim.key} className="flex items-center space-x-3">
                    <Icon className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium text-gray-900">{dim.label}</div>
                      <div className="text-sm text-gray-600">{profile[dim.key]}% proficiency</div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Development Areas */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Development Priorities</h3>
          <div className="space-y-3">
            {LEADERSHIP_DIMENSIONS
              .filter(dim => profile[dim.key] < dim.benchmarks.good)
              .sort((a, b) => profile[a.key] - profile[b.key])
              .slice(0, 3)
              .map(dim => {
                const Icon = dim.icon;
                const gap = dim.benchmarks.good - profile[dim.key];
                return (
                  <div key={dim.key} className="flex items-center space-x-3">
                    <Icon className="h-5 w-5 text-yellow-600" />
                    <div>
                      <div className="font-medium text-gray-900">{dim.label}</div>
                      <div className="text-sm text-gray-600">+{gap}% to benchmark</div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Actions</h3>
          <div className="space-y-2 text-sm text-gray-600">
            {readinessLevel === 'Ready' && (
              <>
                <p>• Seek stretch assignments in weak areas</p>
                <p>• Mentor emerging leaders</p>
                <p>• Pursue board or advisory roles</p>
              </>
            )}
            {readinessLevel === 'Nearly Ready' && (
              <>
                <p>• Focus on top 2 development areas</p>
                <p>• Seek executive coaching</p>
                <p>• Take on cross-functional projects</p>
              </>
            )}
            {readinessLevel === 'Developing' && (
              <>
                <p>• Create development plan with manager</p>
                <p>• Attend leadership programs</p>
                <p>• Build foundational skills</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};