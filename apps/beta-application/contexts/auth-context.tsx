'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
// import { toast } from '@/components/ui/toaster'; // TODO: Fix toaster import
import { AuthUser, AuthContextType } from "@ioc/shared/types";
const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const checkAuth = useCallback(async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                setIsLoading(false);
                return;
            }
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            const response = await axios.get('/api/auth/me');
            setUser(response.data.user);
        }
        catch (error) {
            console.error('Auth check failed:', error);
            delete axios.defaults.headers.common['Authorization'];
            localStorage.removeItem('authToken');
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);
    const login = async (email: string, password: string) => {
        try {
            const response = await axios.post('/api/auth/login', { email, password });
            const { token, user } = response.data;
            localStorage.setItem('authToken', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setUser(user);
            /*
            toast({
              title: 'Login Successful',
              description: `Welcome back, ${user.name}!`,
              type: 'success',
            });
            */
            router.push('/dashboard');
        }
        catch (error: any) {
            /*
            toast({
              title: 'Login Failed',
              description: error.response?.data?.message || 'Invalid credentials',
              type: 'error',
            });
            */
            throw error;
        }
    };
    const logout = async () => {
        try {
            await axios.post('/api/auth/logout');
        }
        catch (error) {
            console.error('Logout error:', error);
        }
        finally {
            localStorage.removeItem('authToken');
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
            router.push('/login');
            /*
            toast({
              title: 'Logged Out',
              description: 'You have been successfully logged out',
              type: 'success',
            });
            */
        }
    };
    const refreshUser = async () => {
        await checkAuth();
    };
    return (<AuthContext.Provider value={{
            user,
            isLoading,
            isAuthenticated: !!user,
            login,
            logout,
            checkAuth,
            refreshUser,
        }}>
      {children}
    </AuthContext.Provider>);
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
