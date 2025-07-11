'use client';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useCEOAuth } from "@ioc/shared/data-access";
export function CEOLogin() {
    const [email, setEmail] = useState('admin@iocframework.com');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useCEOAuth();
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const success = await login(email, password);
            if (!success) {
                setError('Invalid email or password. Please try again.');
            }
        }
        catch (error) {
            setError('Login failed. Please check your connection and try again.');
        }
        finally {
            setIsLoading(false);
        }
    };
    return (<div className="min-h-screen bg-gradient-to-br from-purple-50 via-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
            <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400"/>
          </div>
          <CardTitle className="text-2xl font-bold">CEO Dashboard Login</CardTitle>
          <CardDescription>
            Access the executive command center for IOC Framework
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@iocframework.com" required disabled={isLoading}/>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required disabled={isLoading}/>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600" disabled={isLoading}>
                  {showPassword ? (<EyeOff className="h-5 w-5"/>) : (<Eye className="h-5 w-5"/>)}
                </button>
              </div>
            </div>

            {error && (<Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>)}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (<>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                  Signing in...
                </>) : ('Sign In')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Demo credentials:
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Email: admin@iocframework.com<br />
              Password: admin123
            </div>
          </div>

          <div className="mt-4 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Secure executive access to IOC Framework metrics and analytics
            </div>
          </div>
        </CardContent>
      </Card>
    </div>);
}
