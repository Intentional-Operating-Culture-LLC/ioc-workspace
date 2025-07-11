'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export interface CEOUser {
  id: string;
  email: string;
  role: 'ceo' | 'admin';
  permissions: string[];
  name: string;
}

export interface CEOAuthContextType {
  user: CEOUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const CEOAuthContext = createContext<CEOAuthContextType | undefined>(undefined);

export function CEOAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CEOUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/ceo');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/ceo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/ceo', {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    hasPermission,
  };

  return (
    <CEOAuthContext.Provider value={value}>
      {children}
    </CEOAuthContext.Provider>
  );
}

export function useCEOAuth() {
  const context = useContext(CEOAuthContext);
  if (context === undefined) {
    throw new Error('useCEOAuth must be used within a CEOAuthProvider');
  }
  return context;
}

export default CEOAuthContext;