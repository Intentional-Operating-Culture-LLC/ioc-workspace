'use client';

import React from 'react';
import { AnalyticsDashboard } from "@ioc/shared/ui/components/analytics";
import { useOrganization } from '@/contexts/OrganizationContext';

export default function AnalyticsInsightsPage() {
  const { currentOrganization } = useOrganization();

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No organization selected</p>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnalyticsDashboard organizationId={currentOrganization.id} />
      </div>
    </div>);

}