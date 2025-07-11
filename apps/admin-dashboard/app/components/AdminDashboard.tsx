'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navigation } from './Navigation';
import { Header } from './Header';
import { AssessmentMetricsOverview } from './AssessmentMetricsOverview';
import { RealTimeAssessmentFeed } from './RealTimeAssessmentFeed';
import { OceanAnalyticsDashboard } from './OceanAnalyticsDashboard';
import { SystemHealthMonitor } from './SystemHealthMonitor';
import { UserManagement } from './UserManagement';
import { OrganizationManagement } from './OrganizationManagement';

type DashboardView = 'overview' | 'assessments' | 'ocean' | 'users' | 'organizations' | 'system';

export function AdminDashboard() {
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'overview':
        return (
          <div className="space-y-6">
            <AssessmentMetricsOverview />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RealTimeAssessmentFeed />
              <SystemHealthMonitor />
            </div>
          </div>
        );
      case 'assessments':
        return <RealTimeAssessmentFeed detailed />;
      case 'ocean':
        return <OceanAnalyticsDashboard />;
      case 'users':
        return <UserManagement />;
      case 'organizations':
        return <OrganizationManagement />;
      case 'system':
        return <SystemHealthMonitor detailed />;
      default:
        return <AssessmentMetricsOverview />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: sidebarOpen ? 0 : -280 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-lg"
      >
        <Navigation
          currentView={currentView}
          onViewChange={setCurrentView}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      </motion.div>

      {/* Main content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-80' : 'ml-4'}`}>
        <Header
          currentView={currentView}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {renderCurrentView()}
          </motion.div>
        </main>
      </div>
    </div>
  );
}