'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
    
    // Check for existing auth token
    const token = localStorage.getItem('admin_token');
    const tokenExpiry = localStorage.getItem('admin_token_expiry');
    
    if (token && tokenExpiry) {
      const isExpired = new Date().getTime() > parseInt(tokenExpiry);
      if (!isExpired) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_token_expiry');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      // In production, replace with your actual auth endpoint
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (response.ok) {
        const { token, expiresIn } = await response.json();
        const expiry = new Date().getTime() + (expiresIn * 1000);
        
        localStorage.setItem('admin_token', token);
        localStorage.setItem('admin_token_expiry', expiry.toString());
        setIsAuthenticated(true);
      } else {
        // Demo fallback for now
        if (credentials.username === 'admin' && credentials.password === 'admin123') {
          const token = 'demo_admin_token_' + Date.now();
          const expiry = new Date().getTime() + (24 * 60 * 60 * 1000); // 24 hours
          
          localStorage.setItem('admin_token', token);
          localStorage.setItem('admin_token_expiry', expiry.toString());
          setIsAuthenticated(true);
        } else {
          setError('Invalid credentials. Use admin/admin123 for demo.');
        }
      }
    } catch (error) {
      setError('Authentication failed. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                IOC Admin Dashboard
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Sign in to access real-time assessment analytics
              </p>
              {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
              <div>
                <label htmlFor="username" className="sr-only">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Username"
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
              <div>
                <button
                  type="submit"
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sign in
                </button>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  Demo credentials: admin / admin123
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}