'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { loadAssessmentProgress } from "@ioc/shared/data-access/engines";

export default function ResumeAssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const { type, id } = params;

  useEffect(() => {
    const resumeAssessment = async () => {
      try {
        // Load the assessment progress
        const progress = await loadAssessmentProgress(id);

        if (progress && progress.type === type && !progress.completed) {
          // Set the assessment ID in session storage
          sessionStorage.setItem('currentAssessmentId', id);

          // Redirect to the main assessment page
          router.push(`/assessment/${type}`);
        } else if (progress && progress.completed) {
          // If completed, go to results
          router.push(`/results/${id}`);
        } else {
          // If no valid progress found, go to start
          router.push('/assessment/start');
        }
      } catch (error) {
        console.error('Error loading assessment:', error);
        router.push('/assessment/start');
      }
    };

    resumeAssessment();
  }, [id, type, router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Loading your assessment...</p>
      </div>
    </div>);

}