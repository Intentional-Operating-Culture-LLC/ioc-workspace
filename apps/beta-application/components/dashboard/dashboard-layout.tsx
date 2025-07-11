'use client';
import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from "@ioc/shared/data-access/utils";
import { BarChart3, TestTube, Users, Activity, DollarSign, Shield, Menu, Moon, Sun, LogOut, Bell, Settings } from 'lucide-react';
import { useTheme } from './theme-provider';
import { useAuth } from "@ioc/shared/data-access/contexts";
import { useState } from 'react';
interface NavItem {
    title: string;
    href: string;
    icon: any;
}
const navigation: NavItem[] = [
    { title: 'Business Intelligence', href: '/dashboard/business-intelligence', icon: BarChart3 },
    { title: 'Testing & Quality', href: '/dashboard/testing', icon: TestTube },
    { title: '360 Review', href: '/dashboard/360-review', icon: Users },
    { title: 'Real-Time', href: '/dashboard/real-time', icon: Activity },
    { title: 'Marketing', href: '/dashboard/marketing', icon: DollarSign },
    { title: 'Security', href: '/dashboard/security', icon: Shield },
];
interface DashboardLayoutProps {
    children: ReactNode;
    title?: string;
    description?: string;
}
export function DashboardLayout({ children, title, description }: DashboardLayoutProps) {
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    return (<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className={cn('fixed left-0 top-0 z-40 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300', sidebarOpen ? 'w-64' : 'w-16')}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">IOC</span>
              </div>
              {sidebarOpen && (<span className="text-xl font-semibold">Dashboard</span>)}
            </Link>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
              <Menu className="w-5 h-5"/>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-2">
            {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (<Link key={item.href} href={item.href} className={cn('flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors', isActive
                    ? 'bg-gray-100 dark:bg-gray-700 text-primary'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700')}>
                  <Icon className={cn('h-5 w-5', !sidebarOpen && 'mx-auto')}/>
                  {sidebarOpen && <span className="ml-3">{item.title}</span>}
                </Link>);
        })}
          </nav>

          {/* User Menu */}
          {sidebarOpen && user && (<div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">{user.name[0]}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
              </div>
            </div>)}
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn('transition-all duration-300', sidebarOpen ? 'ml-64' : 'ml-16')}>
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
          <div>
            {title && <h1 className="text-2xl font-semibold">{title}</h1>}
            {description && (<p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>)}
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="relative p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
              <Bell className="w-5 h-5"/>
              <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Theme Toggle */}
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
              {theme === 'dark' ? (<Sun className="w-5 h-5"/>) : (<Moon className="w-5 h-5"/>)}
            </button>

            {/* Settings */}
            <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
              <Settings className="w-5 h-5"/>
            </button>

            {/* Logout */}
            <button onClick={logout} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400">
              <LogOut className="w-5 h-5"/>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>);
}
