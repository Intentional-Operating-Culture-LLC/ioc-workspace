'use client';

import { useState, useEffect, lazy, Suspense, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from "@ioc/shared/data-access/supabase/client";

// Lazy load heavy components
const MetricsGrid = lazy(() => import('./components/MetricsGrid'));
const RecentAssessments = lazy(() => import('./components/RecentAssessments'));
const RecentActivity = lazy(() => import('./components/RecentActivity'));
const ClientOrganizations = lazy(() => import('./components/ClientOrganizations'));

// Loading component
const LoadingSpinner = () =>
<div className="flex justify-center items-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>;


// Memoized header component
const DashboardHeader = memo(({
  organizations,
  selectedOrgId,
  currentOrganization,
  onOrgSwitch,
  isLoading
}) => {
  return (
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
                onChange={(e) => onOrgSwitch(e.target.value)}
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
    </div>);

});

DashboardHeader.displayName = 'DashboardHeader';

export default function DashboardClientOptimized({
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
      <DashboardHeader
        organizations={organizations}
        selectedOrgId={selectedOrgId}
        currentOrganization={currentOrganization}
        onOrgSwitch={handleOrgSwitch}
        isLoading={isLoading} />


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Grid */}
        <Suspense fallback={<LoadingSpinner />}>
          <MetricsGrid metrics={metricsData} />
        </Suspense>

        {/* Reseller Client List */}
        {isReseller &&
        <Suspense fallback={<LoadingSpinner />}>
            <ClientOrganizations clientOrganizations={clientOrganizations} />
          </Suspense>
        }

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Assessments */}
          <Suspense fallback={<LoadingSpinner />}>
            <RecentAssessments
              recentAssessments={recentAssessments}
              currentOrganization={currentOrganization} />

          </Suspense>

          {/* Recent Activity */}
          <Suspense fallback={<LoadingSpinner />}>
            <RecentActivity recentActivities={recentActivities} />
          </Suspense>
        </div>
      </div>
    </div>);

}