'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from "@ioc/shared/data-access/supabase/client";

export default function DashboardClient({
  user,
  organizations,
  currentOrganization,
  metrics,
  recentAssessments,
  recentActivities,
  isReseller,
  clientOrganizations
}) {
  const router = useRouter();
  const [selectedOrgId, setSelectedOrgId] = useState(currentOrganization?.organization?.id);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createBrowserSupabaseClient();

  // Handle organization switch
  const handleOrgSwitch = async (orgId) => {
    if (orgId === selectedOrgId) return;

    setIsLoading(true);
    try {
      // Update user's default organization preference
      await supabase.
      from('users').
      update({
        settings: {
          ...user.settings,
          default_organization_id: orgId
        }
      }).
      eq('id', user.id);

      // Refresh the page to load new organization data
      router.refresh();
    } catch (error) {
      console.error('Error switching organization:', error);
      setIsLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time ago
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
    return formatDate(dateString);
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-700',
      active: 'bg-green-100 text-green-700',
      completed: 'bg-blue-100 text-blue-700',
      archived: 'bg-yellow-100 text-yellow-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  // Get activity icon
  const getActivityIcon = (eventType) => {
    const icons = {
      assessment_created: '📝',
      assessment_updated: '✏️',
      assessment_deleted: '🗑️',
      user_invited: '👤',
      organization_updated: '🏢',
      response_submitted: '✅'
    };
    return icons[eventType] || '📌';
  };

  // Metrics data with proper fallbacks
  const metricsData = {
    totalUsers: metrics?.total_users || 0,
    activeAssessments: metrics?.active_assessments || 0,
    completionRate: metrics?.completion_rate || 0,
    totalResponses: metrics?.total_responses || 0
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Organization Switcher */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              
              {/* Organization Switcher */}
              {organizations && organizations.length > 1 &&
              <div className="relative">
                  <select
                  value={selectedOrgId}
                  onChange={(e) => handleOrgSwitch(e.target.value)}
                  disabled={isLoading}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">

                    {organizations.map((org) =>
                  <option key={org.organization.id} value={org.organization.id}>
                        {org.organization.name} ({org.role})
                      </option>
                  )}
                  </select>
                </div>
              }
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-3">
              <Link
                href="/assessments"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">

                My Assessments
              </Link>
              
              {currentOrganization?.role === 'owner' || currentOrganization?.role === 'admin' ?
              <>
                  <Link
                  href="/admin/assessments/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">

                    Create Assessment
                  </Link>
                  <Link
                  href="/admin/assessments"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">

                    Manage Assessments
                  </Link>
                  <Link
                  href="/dashboard/team/invite"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">

                    Invite User
                  </Link>
                </> :

              <Link
                href="/assessment/start"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">

                  Browse Assessments
                </Link>
              }
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-blue-50 p-3">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-lg font-semibold text-gray-900">{metricsData.totalUsers}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-green-50 p-3">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Assessments</dt>
                    <dd className="text-lg font-semibold text-gray-900">{metricsData.activeAssessments}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-indigo-50 p-3">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Completion Rate</dt>
                    <dd className="text-lg font-semibold text-gray-900">{metricsData.completionRate}%</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-md bg-yellow-50 p-3">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Responses</dt>
                    <dd className="text-lg font-semibold text-gray-900">{metricsData.totalResponses}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reseller Client List */}
        {isReseller &&
        <div className="mb-8">
            <div className="bg-white shadow overflow-hidden rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Client Organizations</h3>
                <Link
                href="/dashboard/clients/new"
                className="text-sm text-indigo-600 hover:text-indigo-900">

                  Add Client
                </Link>
              </div>
              <div className="border-t border-gray-200">
                {clientOrganizations.length > 0 ?
              <ul className="divide-y divide-gray-200">
                    {clientOrganizations.map((client) =>
                <li key={client.id} className="px-4 py-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{client.name}</p>
                            <p className="text-sm text-gray-500">Created {formatDate(client.created_at)}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${client.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                              {client.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <Link
                        href={`/dashboard/clients/${client.id}`}
                        className="text-indigo-600 hover:text-indigo-900 text-sm">

                              Manage
                            </Link>
                          </div>
                        </div>
                      </li>
                )}
                  </ul> :

              <div className="px-4 py-5 text-sm text-gray-500">
                    No client organizations yet. <Link href="/dashboard/clients/new" className="text-indigo-600 hover:text-indigo-900">Add your first client</Link>
                  </div>
              }
              </div>
            </div>
          </div>
        }

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Assessments */}
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Assessments</h3>
              <Link
                href={currentOrganization?.role === 'owner' || currentOrganization?.role === 'admin' ? "/admin/assessments" : "/assessments"}
                className="text-sm text-indigo-600 hover:text-indigo-900">

                View all
              </Link>
            </div>
            <div className="border-t border-gray-200">
              {recentAssessments && recentAssessments.length > 0 ?
              <ul className="divide-y divide-gray-200">
                  {recentAssessments.map((assessment) =>
                <li key={assessment.id} className="px-4 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <Link
                        href={`/dashboard/assessments/${assessment.id}`}
                        className="block focus:outline-none">

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
                )}
                </ul> :

              <div className="px-4 py-5 text-sm text-gray-500">
                  No assessments yet. {currentOrganization?.role === 'owner' || currentOrganization?.role === 'admin' ?
                <Link href="/admin/assessments/create" className="text-indigo-600 hover:text-indigo-900">Create your first assessment</Link> :

                <Link href="/assessment/start" className="text-indigo-600 hover:text-indigo-900">Browse available assessments</Link>
                }
                </div>
              }
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
            </div>
            <div className="border-t border-gray-200">
              {recentActivities && recentActivities.length > 0 ?
              <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {recentActivities.map((activity) =>
                <li key={activity.id} className="px-4 py-3">
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
                )}
                </ul> :

              <div className="px-4 py-5 text-sm text-gray-500">
                  No recent activity
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>);

}