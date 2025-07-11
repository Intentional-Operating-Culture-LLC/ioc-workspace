'use client';
import React from 'react';
// Last Updated: 2025-01-07 14:30:00 UTC - Navigation with auth buttons
// Commit: d239e0ae - Added Login/Signup functionality
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from "@ioc/shared/data-access/supabase/client";
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
export function Navigation() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = createClient();
    useEffect(() => {
        // Check current user
        const checkUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);
            }
            catch (error) {
                console.error('Error checking user:', error);
            }
            finally {
                setLoading(false);
            }
        };
        checkUser();
        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setUser(session?.user ?? null);
        });
        return () => subscription.unsubscribe();
    }, [supabase, router]);
    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    };
    return (<nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-gray-900">IOC</span>
              <span className="ml-2 text-sm text-gray-600">Assessment Platform</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {loading ? (<div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>) : user ? (<>
                <div className="relative group">
                  <Link href="/dashboard" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium inline-flex items-center">
                    Dashboard
                    <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                    </svg>
                  </Link>
                  {/* Dropdown Menu */}
                  <div className="absolute left-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Overview
                    </Link>
                    <div className="border-t border-gray-100 my-1"></div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Analytics
                    </div>
                    <Link href="/analytics/executive" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Executive Dashboard
                    </Link>
                    <Link href="/analytics/operational" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Operational Dashboard
                    </Link>
                    <Link href="/analytics/insights" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Analytics & Insights
                    </Link>
                    <Link href="/analytics/reports" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Reports & Export
                    </Link>
                    <div className="border-t border-gray-100 my-1"></div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Department Views
                    </div>
                    <Link href="/dashboard/marketing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Marketing
                    </Link>
                    <Link href="/dashboard/sales" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Sales
                    </Link>
                    <Link href="/dashboard/operations" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Operations
                    </Link>
                    <Link href="/dashboard/ceo" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Executive
                    </Link>
                  </div>
                </div>
                <Link href="/profile" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  Profile
                </Link>
                <button onClick={handleLogout} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                  Logout
                </button>
              </>) : (<>
                <Link href="/login" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  Login
                </Link>
                <Link href="/signup" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                  Sign Up
                </Link>
              </>)}
          </div>
        </div>
      </div>
    </nav>);
}
