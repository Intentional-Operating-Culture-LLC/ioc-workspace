'use client';

import { motion } from 'framer-motion';
import { 
  HomeIcon,
  ChartBarIcon,
  UsersIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  BeakerIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onToggleSidebar: () => void;
}

const navigationItems = [
  { id: 'overview', label: 'Overview', icon: HomeIcon },
  { id: 'assessments', label: 'Assessment Metrics', icon: ChartBarIcon },
  { id: 'ocean', label: 'OCEAN Analytics', icon: BeakerIcon },
  { id: 'users', label: 'User Management', icon: UsersIcon },
  { id: 'organizations', label: 'Organizations', icon: BuildingOfficeIcon },
  { id: 'system', label: 'System Health', icon: Cog6ToothIcon },
];

export function Navigation({ currentView, onViewChange, onToggleSidebar }: NavigationProps) {
  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h1 className="text-xl font-bold text-gray-900">IOC Admin</h1>
          <p className="text-sm text-gray-500">Real-time Dashboard</p>
        </div>
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100 lg:hidden"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onViewChange(item.id)}
              className={`nav-link w-full ${isActive ? 'active' : ''}`}
            >
              <Icon className="h-5 w-5 mr-3" />
              {item.label}
            </motion.button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          IOC Framework v3.1.1
        </div>
      </div>
    </div>
  );
}