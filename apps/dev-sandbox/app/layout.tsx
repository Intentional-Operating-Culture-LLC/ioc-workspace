'use client';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from "@ioc/shared/data-access/contexts/auth-context";
import { WebSocketProvider } from "@ioc/shared/data-access/contexts/websocket-context";
import { Toaster } from 'react-hot-toast';
import './globals.css';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-jetbrains-mono'
});
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
        },
    },
});
export default function RootLayout({ children, }: {
    children: React.ReactNode;
}) {
    return (<html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <title>IOC Developer Sandbox</title>
        <meta name="description" content="IOC Framework Developer Environment & Component Library"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="icon" href="/favicon.ico"/>
      </head>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <WebSocketProvider>
              <div className="min-h-screen">
                {children}
              </div>
              <Toaster position="top-right" toastOptions={{
            duration: 4000,
            style: {
                background: '#363636',
                color: '#fff',
            },
            success: {
                duration: 3000,
                iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                },
            },
            error: {
                duration: 5000,
                iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                },
            },
        }}/>
            </WebSocketProvider>
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>);
}
