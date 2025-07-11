'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from "@ioc/shared/data-access/supabase/client";
interface LoginFormProps {
    onSuccess?: (data: any) => void;
    redirectTo?: string;
}
export function LoginForm({ onSuccess, redirectTo = '/dashboard' }: LoginFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();
    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                setError(error.message);
                return;
            }
            if (onSuccess) {
                onSuccess(data);
            }
            // Get redirect URL from query params or use provided redirectTo
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get('redirect') || redirectTo;
            router.push(redirect);
            router.refresh();
        }
        catch (err) {
            setError('An unexpected error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{
            background: 'linear-gradient(135deg, #0f1419 0%, #1a1f2e 100%)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 bottom-0" style={{
            background: 'radial-gradient(ellipse at center, rgba(74, 158, 255, 0.1) 0%, transparent 70%)'
        }}></div>
      </div>
      
      <div className="relative z-10 max-w-md w-full space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #4a9eff, #0066cc)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'white'
        }}>
              iOC
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-2">
            Sign in to your account
          </h2>
          <p className="text-sm" style={{ color: '#9ca3af' }}>
            Or{' '}
            <a href="/signup" className="font-medium hover:underline" style={{ color: '#4a9eff' }}>
              create a new account
            </a>
          </p>
        </div>

        {/* Form Container */}
        <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            backdropFilter: 'blur(10px)'
        }}>
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-white mb-2">
                  Email address
                </label>
                <input id="email-address" name="email" type="email" autoComplete="email" required style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '12px 16px',
            width: '100%',
            color: 'white',
            fontSize: '14px',
            transition: 'all 0.3s ease'
        }} className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} onFocus={(e) => {
            const target = e.target as HTMLInputElement;
            target.style.borderColor = '#4a9eff';
            target.style.boxShadow = '0 0 0 2px rgba(74, 158, 255, 0.2)';
        }} onBlur={(e) => {
            const target = e.target as HTMLInputElement;
            target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            target.style.boxShadow = 'none';
        }}/>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                  Password
                </label>
                <input id="password" name="password" type="password" autoComplete="current-password" required style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '12px 16px',
            width: '100%',
            color: 'white',
            fontSize: '14px',
            transition: 'all 0.3s ease'
        }} className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} onFocus={(e) => {
            const target = e.target as HTMLInputElement;
            target.style.borderColor = '#4a9eff';
            target.style.boxShadow = '0 0 0 2px rgba(74, 158, 255, 0.2)';
        }} onBlur={(e) => {
            const target = e.target as HTMLInputElement;
            target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            target.style.boxShadow = 'none';
        }}/>
              </div>
            </div>

            {error && (<div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '16px'
            }}>
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium" style={{ color: '#fca5a5' }}>
                      Login failed
                    </h3>
                    <div className="mt-2 text-sm" style={{ color: '#fecaca' }}>
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>)}

            <div>
              <button type="submit" disabled={loading} style={{
            background: loading ? '#6b7280' : 'linear-gradient(135deg, #4a9eff, #0066cc)',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            width: '100%',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: loading ? 'none' : '0 4px 15px rgba(74, 158, 255, 0.3)'
        }} onMouseEnter={(e) => {
            if (!loading) {
                const target = e.target as HTMLButtonElement;
                target.style.transform = 'translateY(-2px)';
                target.style.boxShadow = '0 8px 25px rgba(74, 158, 255, 0.4)';
            }
        }} onMouseLeave={(e) => {
            if (!loading) {
                const target = e.target as HTMLButtonElement;
                target.style.transform = 'translateY(0)';
                target.style.boxShadow = '0 4px 15px rgba(74, 158, 255, 0.3)';
            }
        }}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm" style={{ color: '#9ca3af' }}>
            Forgot your password?{' '}
            <a href="/reset-password" className="hover:underline" style={{ color: '#4a9eff' }}>
              Reset it here
            </a>
          </p>
        </div>
      </div>
    </div>);
}
