import { memo } from 'react';

// Utility functions
const timeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getActivityIcon = (eventType) => {
  const icons = {
    assessment_created: '📝',
    assessment_updated: '✏️',
    assessment_deleted: '🗑️',
    user_invited: '👤',
    organization_updated: '🏢',
    response_submitted: '✅',
  };
  return icons[eventType] || '📌';
};

const ActivityItem = memo(({ activity }) => (
  <li className="px-4 py-3">
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 text-2xl">
        {getActivityIcon(activity.event_type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">
          <span className="font-medium">{activity.user?.full_name || 'System'}</span>
          {' '}
          {activity.event_type.replace(/_/g, ' ')}
        </p>
        <p className="text-xs text-gray-500">
          {timeAgo(activity.created_at)}
        </p>
      </div>
    </div>
  </li>
));

ActivityItem.displayName = 'ActivityItem';

const RecentActivity = ({ recentActivities }) => {
  return (
    <div className="bg-white shadow overflow-hidden rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
      </div>
      <div className="border-t border-gray-200">
        {recentActivities && recentActivities.length > 0 ? (
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {recentActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </ul>
        ) : (
          <div className="px-4 py-5 text-sm text-gray-500">
            No recent activity
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(RecentActivity);