'use client';

import Link from 'next/link';

const plans = [
  {
    name: 'Starter',
    price: '$49',
    period: 'per month',
    features: [
      'Up to 50 assessments/month',
      'Basic analytics dashboard',
      'Email support',
      'Export to CSV'
    ],
    cta: 'Get Started',
    href: '/signup',
    featured: false
  },
  {
    name: 'Professional',
    price: '$149',
    period: 'per month',
    features: [
      'Unlimited assessments',
      'Advanced analytics & insights',
      'Priority support',
      'Custom branding',
      'API access'
    ],
    cta: 'Get Started',
    href: '/signup',
    featured: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'contact us',
    features: [
      'Everything in Professional',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'On-premise deployment option'
    ],
    cta: 'Contact Sales',
    href: 'mailto:sales@iocframework.com',
    featured: false
  }
];

export function PricingSection() {
  return (
    <div className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600">
            Choose the perfect plan for your organization's needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 ${
                plan.featured
                  ? 'bg-blue-600 text-white shadow-xl scale-105'
                  : 'bg-white text-gray-900 shadow-lg'
              }`}
            >
              <h3 className={`text-2xl font-bold ${
                plan.featured ? 'text-white' : 'text-gray-900'
              }`}>
                {plan.name}
              </h3>
              <div className="mt-4 flex items-baseline">
                <span className={`text-4xl font-extrabold ${
                  plan.featured ? 'text-white' : 'text-gray-900'
                }`}>
                  {plan.price}
                </span>
                <span className={`ml-2 text-sm ${
                  plan.featured ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {plan.period}
                </span>
              </div>

              <ul className="mt-8 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 100 100"
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-3 mt-0.5"
                    >
                      <path
                        d="M25 30 L50 20 L75 30 L75 60 L50 80 L25 60 Z"
                        fill={plan.featured ? '#ffffff' : '#10b981'}
                        stroke={plan.featured ? '#ffffff' : '#10b981'}
                        strokeWidth="2"
                      />
                      <text
                        x="50"
                        y="52"
                        textAnchor="middle"
                        fill={plan.featured ? '#3b82f6' : '#ffffff'}
                        fontFamily="Inter, sans-serif"
                        fontSize="20"
                        fontWeight="700"
                      >
                        IOC
                      </text>
                    </svg>
                    <span className={plan.featured ? 'text-white' : 'text-gray-600'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`mt-8 block w-full text-center py-3 px-6 rounded-lg font-medium transition-colors ${
                  plan.featured
                    ? 'bg-white text-blue-600 hover:bg-gray-100'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}