import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from "@ioc/shared/ui";
import DeploymentTracker from "@ioc/shared/ui";

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'IOC Assessment Platform',
  description: 'Transform Your Organization with Data-Driven Intelligence'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navigation />
        <main>{children}</main>
        <DeploymentTracker />
      </body>
    </html>);

}