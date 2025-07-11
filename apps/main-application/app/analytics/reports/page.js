'use client';

import React from 'react';
import { ReportingInterface } from "@ioc/shared/ui/components/analytics";
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';

export default function ReportsPage() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No organization selected</p>
        </div>
      </div>);

  }

  // Determine user role (you may need to adjust this based on your auth system)
  const userRole = user?.role || 'viewer';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ReportingInterface
          organizationId={currentOrganization.id}
          userRole={userRole} />

      </div>
    </div>);

}