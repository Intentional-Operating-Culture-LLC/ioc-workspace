import { memo } from 'react';
import Link from 'next/link';

// Utility functions
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getStatusColor = (status) => {
  const colors = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    archived: 'bg-yellow-100 text-yellow-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

const AssessmentItem = memo(({ assessment }) => (
  <li className="px-4 py-4 hover:bg-gray-50">
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <Link
          href={`/dashboard/assessments/${assessment.id}`}
          className="block focus:outline-none"
        >
          <p className="text-sm font-medium text-gray-900 truncate">
            {assessment.title}
          </p>
          <div className="mt-1 flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(assessment.status)}`}>
              {assessment.status}
            </span>
            <span className="text-xs text-gray-500">
              by {assessment.created_by?.full_name || 'Unknown'}
            </span>
          </div>
        </Link>
      </div>
      <div className="ml-4 flex-shrink-0">
        <p className="text-xs text-gray-500">
          {formatDate(assessment.created_at)}
        </p>
      </div>
    </div>
  </li>
));

AssessmentItem.displayName = 'AssessmentItem';

const RecentAssessments = ({ recentAssessments, currentOrganization }) => {
  const isAdminOrOwner = currentOrganization?.role === 'owner' || currentOrganization?.role === 'admin';

  return (
    <div className="bg-white shadow overflow-hidden rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Assessments</h3>
        <Link
          href={isAdminOrOwner ? "/admin/assessments" : "/assessments"}
          className="text-sm text-indigo-600 hover:text-indigo-900"
        >
          View all
        </Link>
      </div>
      <div className="border-t border-gray-200">
        {recentAssessments && recentAssessments.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {recentAssessments.map((assessment) => (
              <AssessmentItem key={assessment.id} assessment={assessment} />
            ))}
          </ul>
        ) : (
          <div className="px-4 py-5 text-sm text-gray-500">
            No assessments yet. {isAdminOrOwner ? (
              <Link href="/admin/assessments/create" className="text-indigo-600 hover:text-indigo-900">Create your first assessment</Link>
            ) : (
              <Link href="/assessment/start" className="text-indigo-600 hover:text-indigo-900">Browse available assessments</Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(RecentAssessments);