'use client';

// Force deployment - WebSocket fix applied
import { useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthWrapper } from './components/AuthWrapper';
import { RealtimeProvider } from './components/RealtimeProvider';

export default function AdminHomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading IOC Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthWrapper>
      <RealtimeProvider>
        <AdminDashboard />
      </RealtimeProvider>
    </AuthWrapper>
  );
}