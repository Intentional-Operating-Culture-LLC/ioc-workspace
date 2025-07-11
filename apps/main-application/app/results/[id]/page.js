'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  loadAssessmentProgress,
  calculatePillarScores,
  assessmentTypes,
  benchmarkData,
  getRecommendations } from
"@ioc/shared/data-access/engines";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement } from
'chart.js';
import { Radar, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params.id;

  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    loadResults();
  }, [assessmentId]);

  const loadResults = async () => {
    try {
      const assessmentData = await loadAssessmentProgress(assessmentId);

      if (!assessmentData || !assessmentData.completed) {
        router.push('/assessment/start');
        return;
      }

      // Calculate scores
      const scores = calculatePillarScores(
        Object.entries(assessmentData.answers).map(([id, answer]) => ({
          pillar: sampleQuestions[assessmentData.type].find((q) => q.id === id)?.pillar,
          score: normalizeScore(answer)
        })),
        assessmentData.type
      );

      const assessment = assessmentTypes[assessmentData.type];
      const recommendations = getRecommendations(scores, assessmentData.type);
      const benchmark = benchmarkData[assessmentData.type];

      setResults({
        ...assessmentData,
        scores,
        assessment,
        recommendations,
        benchmark,
        overallScore: Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Error loading results:', error);
      router.push('/assessment/start');
    }
  };

  const normalizeScore = (answer) => {
    // Normalize different answer types to 1-6 scale
    if (typeof answer === 'number') {
      if (answer <= 5) return answer;
      return answer / 10 * 5 + 1;
    }
    // For multiple choice, assign scores based on option
    const optionScores = { a: 2, b: 3, c: 4, d: 5 };
    return optionScores[answer] || 3;
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    // In a real app, this would generate and download a PDF
    await new Promise((resolve) => setTimeout(resolve, 2000));
    alert('PDF report downloaded successfully!');
    setIsDownloading(false);
  };

  const handleShare = () => {
    // In a real app, this would create a shareable link
    navigator.clipboard.writeText(`${window.location.origin}/results/${assessmentId}`);
    alert('Results link copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading your results...</p>
        </div>
      </div>);

  }

  if (!results) {
    return null;
  }

  // Prepare chart data
  const radarData = {
    labels: ['Sustainable', 'Performance', 'Potential'],
    datasets: [
    {
      label: 'Your Scores',
      data: [
      results.scores.sustainable || 0,
      results.scores.performance || 0,
      results.scores.potential || 0],

      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 2,
      pointBackgroundColor: 'rgba(59, 130, 246, 1)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
    },
    {
      label: 'Industry Average',
      data: [
      results.benchmark.sustainable.average,
      results.benchmark.performance.average,
      results.benchmark.potential.average],

      backgroundColor: 'rgba(156, 163, 175, 0.2)',
      borderColor: 'rgba(156, 163, 175, 1)',
      borderWidth: 2,
      pointBackgroundColor: 'rgba(156, 163, 175, 1)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(156, 163, 175, 1)'
    }]

  };

  const barData = {
    labels: ['Sustainable', 'Performance', 'Potential'],
    datasets: [
    {
      label: 'Your Score',
      data: [
      results.scores.sustainable || 0,
      results.scores.performance || 0,
      results.scores.potential || 0],

      backgroundColor: 'rgba(59, 130, 246, 0.8)'
    },
    {
      label: 'Average',
      data: [
      results.benchmark.sustainable.average,
      results.benchmark.performance.average,
      results.benchmark.potential.average],

      backgroundColor: 'rgba(156, 163, 175, 0.8)'
    },
    {
      label: 'Top 25%',
      data: [
      results.benchmark.sustainable.top25,
      results.benchmark.performance.top25,
      results.benchmark.potential.top25],

      backgroundColor: 'rgba(34, 197, 94, 0.8)'
    },
    {
      label: 'Top 10%',
      data: [
      results.benchmark.sustainable.top10,
      results.benchmark.performance.top10,
      results.benchmark.potential.top10],

      backgroundColor: 'rgba(168, 85, 247, 0.8)'
    }]

  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 6,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 6
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Assessment Results
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                {results.assessment.name} - Completed {new Date(results.completedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">

                Share Results
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400">

                {isDownloading ? 'Generating PDF...' : 'Download PDF'}
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Overall Score */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">

          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Overall Score
            </h2>
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-48 h-48">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700" />

                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${results.overallScore / 6 * 553} 553`}
                  strokeDashoffset="0"
                  className="text-blue-600 transform -rotate-90 origin-center" />

              </svg>
              <div className="absolute">
                <div className="text-5xl font-bold text-gray-900 dark:text-white">
                  {results.overallScore.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">out of 6.0</div>
              </div>
            </div>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              {results.overallScore >= 5 ? 'Exceptional Performance' :
              results.overallScore >= 4 ? 'Strong Performance' :
              results.overallScore >= 3 ? 'Good Performance' :
              'Areas for Improvement'}
            </p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              {['overview', 'benchmarks', 'recommendations'].map((tab) =>
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 px-6 text-center font-medium text-sm capitalize transition-colors ${
                activeTab === tab ?
                'text-blue-600 border-b-2 border-blue-600' :
                'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`
                }>

                  {tab}
                </button>
              )}
            </nav>
          </div>

          <div className="p-8">
            {/* Overview Tab */}
            {activeTab === 'overview' &&
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8">

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    Performance by Pillar
                  </h3>
                  <div className="h-96">
                    <Radar data={radarData} options={chartOptions} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  {Object.entries(results.scores).map(([pillar, score]) =>
                <div
                  key={pillar}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">

                      <h4 className="text-lg font-medium text-gray-900 dark:text-white capitalize mb-2">
                        {pillar}
                      </h4>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {score.toFixed(1)}
                      </div>
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        {score >= results.benchmark[pillar].top25 ? 'Top 25%' :
                    score >= results.benchmark[pillar].average ? 'Above Average' :
                    'Below Average'}
                      </div>
                    </div>
                )}
                </div>
              </motion.div>
            }

            {/* Benchmarks Tab */}
            {activeTab === 'benchmarks' &&
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Industry Comparison
                </h3>
                <div className="h-96">
                  <Bar data={barData} options={barOptions} />
                </div>
                <div className="mt-8 prose dark:prose-invert max-w-none">
                  <p>
                    Your performance is compared against industry benchmarks across three key pillars.
                    The chart shows how you stack up against the average, top 25%, and top 10% of professionals
                    in similar roles.
                  </p>
                </div>
              </motion.div>
            }

            {/* Recommendations Tab */}
            {activeTab === 'recommendations' &&
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6">

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Personalized Recommendations
                </h3>
                {results.recommendations.map((rec, index) =>
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`border rounded-lg p-6 ${
                rec.priority === 'high' ?
                'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' :
                rec.priority === 'medium' ?
                'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20' :
                'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'}`
                }>

                    <div className="flex items-start justify-between mb-4">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white capitalize">
                        {rec.pillar} - {rec.message}
                      </h4>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                  rec.priority === 'high' ?
                  'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200' :
                  rec.priority === 'medium' ?
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200' :
                  'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200'}`
                  }>
                        {rec.priority} priority
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {rec.actions.map((action, actionIndex) =>
                  <li key={actionIndex} className="flex items-start gap-2">
                          <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="text-gray-700 dark:text-gray-300">{action}</span>
                        </li>
                  )}
                    </ul>
                  </motion.div>
              )}
              </motion.div>
            }
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/assessment/start')}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">

            Take Another Assessment
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">

            Go to Dashboard
          </motion.button>
        </div>
      </div>
    </div>);

}

// Import sample questions for score calculation
const sampleQuestions = {
  individual: [
  { id: 'ind_001', pillar: 'sustainable' },
  { id: 'ind_002', pillar: 'performance' },
  { id: 'ind_003', pillar: 'potential' }],

  executive: [
  { id: 'exec_001', pillar: 'sustainable' },
  { id: 'exec_002', pillar: 'performance' }],

  organizational: [
  { id: 'org_001', pillar: 'sustainable' },
  { id: 'org_002', pillar: 'performance' }]

};