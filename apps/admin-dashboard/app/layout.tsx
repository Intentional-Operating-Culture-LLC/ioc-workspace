import { Inter } from 'next/font/google';
import { Metadata } from 'next';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'IOC Admin Dashboard',
  description: 'Real-time Assessment Metrics and Administration Portal',
  keywords: ['assessment', 'analytics', 'dashboard', 'admin', 'real-time', 'OCEAN'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-gray-50 min-h-screen`}>
        <div id="admin-root" className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}