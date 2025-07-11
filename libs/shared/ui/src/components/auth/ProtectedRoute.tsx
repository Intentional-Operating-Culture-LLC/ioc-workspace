'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from "@ioc/shared/data-access/supabase/client";
import { User } from '@supabase/supabase-js';
interface ProtectedRouteProps {
    children: React.ReactNode;
    loginPath?: string;
    fallback?: React.ReactNode;
    onAuthStateChange?: (user: User | null) => void;
}
export function ProtectedRoute({ children, loginPath = '/login', fallback, onAuthStateChange }: ProtectedRouteProps) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = createClient();
    useEffect(() => {
        const checkUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push(loginPath);
                    return;
                }
                setUser(user);
                if (onAuthStateChange) {
                    onAuthStateChange(user);
                }
            }
            catch (error) {
                console.error('Error checking authentication:', error);
                router.push(loginPath);
            }
            finally {
                setLoading(false);
            }
        };
        checkUser();
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
            if (event === 'SIGNED_OUT' || !session) {
                setUser(null);
                if (onAuthStateChange) {
                    onAuthStateChange(null);
                }
                router.push(loginPath);
            }
            else if (session?.user) {
                setUser(session.user);
                if (onAuthStateChange) {
                    onAuthStateChange(session.user);
                }
            }
        });
        return () => {
            subscription.unsubscribe();
        };
    }, [router, supabase, loginPath, onAuthStateChange]);
    if (loading) {
        return fallback || (<div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>);
    }
    if (!user) {
        return null;
    }
    return <>{children}</>;
}
