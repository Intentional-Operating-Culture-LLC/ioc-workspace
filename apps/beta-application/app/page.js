import Link from 'next/link';
import { PricingSection } from "@ioc/shared/ui";

export default function HomePage() {
  // Console log deployment info on page load
  if (typeof window !== 'undefined') {
    console.log('🚀 IOC Platform Deployment Info:');
    console.log('Version: 2.0.0');
    console.log('Deployed: 2025-01-08 18:30:00 UTC');
    console.log('Features: Modern Design ✓ | Clean Layout ✓ | Professional Typography ✓');
    console.log('Last Commit: ioc-redesign');
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hidden deployment tracker */}
      <div className="hidden" data-deployment="v2.0.0-2025-01-08-18:30:00-UTC" data-commit="ioc-redesign"></div>
      
      {/* Hero Section - Clean and spacious */}
      <div className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 opacity-60"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24">
          <div className="text-center max-w-3xl mx-auto">
            {/* IOC Shield Intelligence Brand Logo */}
            <div className="mb-8">
              <div className="inline-block">
                <svg width="300" height="90" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                  {/* Shield Background */}
                  <path d="M10 15 L30 5 L50 15 L50 40 L30 55 L10 40 Z" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1" />
                  
                  {/* IOC Text inside shield */}
                  <text x="30" y="32" textAnchor="middle" fill="#ffffff" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="700">IOC</text>
                  
                  {/* Connection nodes */}
                  <circle cx="45" cy="20" r="2" fill="#60a5fa" />
                  <circle cx="45" cy="35" r="2" fill="#60a5fa" />
                  <circle cx="35" cy="12" r="2" fill="#60a5fa" />
                  
                  {/* Connection lines */}
                  <line x1="45" y1="20" x2="45" y2="35" stroke="#60a5fa" strokeWidth="1" />
                  <line x1="35" y1="12" x2="45" y2="20" stroke="#60a5fa" strokeWidth="1" />
                  
                  {/* Company name */}
                  <text x="70" y="25" fill="#1e3a8a" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="700">FRAMEWORK</text>
                  <text x="70" y="40" fill="#64748b" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="400">Intelligence Operations Center</text>
                </svg>
              </div>
            </div>
            
            {/* Clean, concise value proposition */}
            <h2 className="text-3xl lg:text-4xl font-light text-gray-900 mb-6 leading-relaxed">
              Intelligent assessments for
              <span className="block font-normal" style={{ color: 'var(--ioc-blue)' }}>modern organizations</span>
            </h2>
            
            <p className="text-lg text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto">
              Transform your team's potential with data-driven insights and collaborative assessments 
              designed for the way you work.
            </p>
            
            {/* Clean CTA buttons with better spacing */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-full text-white transition-all duration-200 shadow-md hover:shadow-lg"
                style={{ backgroundColor: 'var(--ioc-blue)', ':hover': { backgroundColor: 'var(--ioc-navy)' } }}>

                Get started free
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-full text-gray-700 bg-white border border-gray-300 hover:border-gray-400 transition-all duration-200">

                View demo
              </Link>
              <Link
                href="/dashboard/ceo"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-full text-white bg-purple-600 hover:bg-purple-700 transition-all duration-200 shadow-md hover:shadow-lg">

                CEO Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section - Simplified with better spacing */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-light text-gray-900 mb-4">
              Why teams choose IOC
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Simple, powerful tools that adapt to your organization's unique needs
            </p>
          </div>

          {/* Clean grid with improved icons and spacing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
            <div className="text-center">
              <div className="mb-6">
                <svg width="60" height="60" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                  <path d="M25 30 L50 20 L75 30 L75 60 L50 80 L25 60 Z" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2" />
                  <text x="50" y="52" textAnchor="middle" fill="#ffffff" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="700">IOC</text>
                  <circle cx="65" cy="38" r="3" fill="#60a5fa" />
                  <circle cx="65" cy="55" r="3" fill="#60a5fa" />
                  <circle cx="55" cy="27" r="3" fill="#60a5fa" />
                  <line x1="65" y1="38" x2="65" y2="55" stroke="#60a5fa" strokeWidth="1.5" />
                  <line x1="55" y1="27" x2="65" y2="38" stroke="#60a5fa" strokeWidth="1.5" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-3">
                Smart assessments
              </h3>
              <p className="text-gray-600 leading-relaxed">
                AI-powered insights that adapt to your responses, providing deeper understanding with fewer questions
              </p>
            </div>

            <div className="text-center">
              <div className="mb-6">
                <svg width="60" height="60" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                  <path d="M25 30 L50 20 L75 30 L75 60 L50 80 L25 60 Z" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2" />
                  <text x="50" y="52" textAnchor="middle" fill="#ffffff" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="700">IOC</text>
                  <circle cx="65" cy="38" r="3" fill="#60a5fa" />
                  <circle cx="65" cy="55" r="3" fill="#60a5fa" />
                  <circle cx="55" cy="27" r="3" fill="#60a5fa" />
                  <line x1="65" y1="38" x2="65" y2="55" stroke="#60a5fa" strokeWidth="1.5" />
                  <line x1="55" y1="27" x2="65" y2="38" stroke="#60a5fa" strokeWidth="1.5" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-3">
                Real-time insights
              </h3>
              <p className="text-gray-600 leading-relaxed">
                See trends as they emerge with live dashboards that help you make informed decisions faster
              </p>
            </div>

            <div className="text-center">
              <div className="mb-6">
                <svg width="60" height="60" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                  <path d="M25 30 L50 20 L75 30 L75 60 L50 80 L25 60 Z" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2" />
                  <text x="50" y="52" textAnchor="middle" fill="#ffffff" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="700">IOC</text>
                  <circle cx="65" cy="38" r="3" fill="#60a5fa" />
                  <circle cx="65" cy="55" r="3" fill="#60a5fa" />
                  <circle cx="55" cy="27" r="3" fill="#60a5fa" />
                  <line x1="65" y1="38" x2="65" y2="55" stroke="#60a5fa" strokeWidth="1.5" />
                  <line x1="55" y1="27" x2="65" y2="38" stroke="#60a5fa" strokeWidth="1.5" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-3">
                Team collaboration
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Work together seamlessly with role-based access and collaborative workflows built for teams
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Social Proof Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-8">Trusted by forward-thinking organizations</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-60">
              {/* Placeholder for logos */}
              <div className="h-12 bg-gray-300 rounded"></div>
              <div className="h-12 bg-gray-300 rounded"></div>
              <div className="h-12 bg-gray-300 rounded"></div>
              <div className="h-12 bg-gray-300 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section - Simplified */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-light text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-gray-600">
              Choose the plan that fits your team's needs
            </p>
          </div>
          <PricingSection />
        </div>
      </div>

      {/* CTA Section - Cleaner design */}
      <div className="py-20" style={{ background: 'linear-gradient(135deg, var(--ioc-blue) 0%, var(--ioc-navy) 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-light text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-xl mb-10 max-w-2xl mx-auto" style={{ color: 'var(--ioc-light-blue)' }}>
            Join thousands of teams using IOC to unlock their potential
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-full bg-white hover:bg-gray-50 transition-all duration-200 shadow-lg"
              style={{ color: 'var(--ioc-blue)' }}>

              Start free trial
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-full text-white bg-white/20 border border-white/30 hover:bg-white/30 transition-all duration-200">

              Talk to sales
            </Link>
          </div>
        </div>
      </div>

      {/* Footer - Simplified and cleaner */}
      <footer className="bg-white border-t border-gray-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4">
                <svg width="150" height="45" viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
                  {/* Shield Background */}
                  <path d="M10 15 L30 5 L50 15 L50 40 L30 55 L10 40 Z" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1" />
                  
                  {/* IOC Text inside shield */}
                  <text x="30" y="32" textAnchor="middle" fill="#ffffff" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="700">IOC</text>
                  
                  {/* Connection nodes */}
                  <circle cx="45" cy="20" r="2" fill="#60a5fa" />
                  <circle cx="45" cy="35" r="2" fill="#60a5fa" />
                  <circle cx="35" cy="12" r="2" fill="#60a5fa" />
                  
                  {/* Connection lines */}
                  <line x1="45" y1="20" x2="45" y2="35" stroke="#60a5fa" strokeWidth="1" />
                  <line x1="35" y1="12" x2="45" y2="20" stroke="#60a5fa" strokeWidth="1" />
                  
                  {/* Company name */}
                  <text x="70" y="25" fill="#1e3a8a" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="700">FRAMEWORK</text>
                  <text x="70" y="40" fill="#64748b" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="400">Intelligence Operations Center</text>
                </svg>
              </div>
              <p className="text-sm text-gray-600">
                Intelligent assessments for modern organizations
              </p>
            </div>
            
            <div>
              <h4 className="text-gray-900 font-medium mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><Link href="/features" className="hover:text-gray-900 transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link></li>
                <li><Link href="/docs" className="hover:text-gray-900 transition-colors">Documentation</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-gray-900 font-medium mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><Link href="/about" className="hover:text-gray-900 transition-colors">About</Link></li>
                <li><Link href="/blog" className="hover:text-gray-900 transition-colors">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-gray-900 transition-colors">Careers</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-gray-900 font-medium mb-4">Support</h4>
              <ul className="space-y-3 text-sm text-gray-600">
                <li><Link href="/help" className="hover:text-gray-900 transition-colors">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-gray-900 transition-colors">Contact</Link></li>
                <li><Link href="/status" className="hover:text-gray-900 transition-colors">Status</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-600">
                © 2025 IOC Framework. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm text-gray-600">
                <Link href="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-gray-900 transition-colors">Terms</Link>
                <Link href="/security" className="hover:text-gray-900 transition-colors">Security</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>);

}