'use client';

import { Bars3Icon, BellIcon } from '@heroicons/react/24/outline';
import { useRealtime } from './RealtimeProvider';

interface HeaderProps {
  currentView: string;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

const viewTitles = {
  overview: 'Dashboard Overview',
  assessments: 'Assessment Metrics',
  ocean: 'OCEAN Analytics',
  users: 'User Management', 
  organizations: 'Organizations',
  system: 'System Health',
};

export function Header({ currentView, onToggleSidebar, sidebarOpen }: HeaderProps) {
  const { isConnected, connectionStats } = useRealtime();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {!sidebarOpen && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {viewTitles[currentView as keyof typeof viewTitles] || 'Admin Dashboard'}
            </h2>
            <p className="text-sm text-gray-500">
              Real-time assessment analytics and administration
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className={`realtime-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            <div className="pulse-dot mr-2"></div>
            {isConnected ? 'Live' : 'Offline'}
          </div>

          {/* Connection Stats */}
          <div className="text-sm text-gray-500">
            {connectionStats.activeConnections} active connections
          </div>

          {/* Notifications */}
          <button className="p-2 rounded-md text-gray-500 hover:bg-gray-100 relative">
            <BellIcon className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              3
            </span>
          </button>

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">A</span>
            </div>
            <span className="text-sm text-gray-700">Admin User</span>
          </div>
        </div>
      </div>
    </header>
  );
}