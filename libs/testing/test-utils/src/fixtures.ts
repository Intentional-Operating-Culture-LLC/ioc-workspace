/**
 * Test data fixtures
 */

import { 
  createMockUser, 
  createMockOrganization, 
  createMockAssessment,
  createMockQuestion 
} from './mocks';

/**
 * User fixtures
 */
export const userFixtures = {
  admin: createMockUser({
    id: 'admin-user',
    email: 'admin@iocframework.com',
    name: 'Admin User',
    role: 'admin',
    permissions: ['*'],
  }),
  
  orgAdmin: createMockUser({
    id: 'org-admin',
    email: 'org.admin@example.com',
    name: 'Organization Admin',
    role: 'org_admin',
    permissions: ['manage_organization', 'manage_users', 'manage_assessments'],
  }),
  
  regularUser: createMockUser({
    id: 'regular-user',
    email: 'user@example.com',
    name: 'Regular User',
    role: 'user',
    permissions: ['view_assessments', 'submit_assessments'],
  }),
  
  pendingUser: createMockUser({
    id: 'pending-user',
    email: 'pending@example.com',
    name: 'Pending User',
    emailVerified: false,
    isActive: false,
  }),
};

/**
 * Organization fixtures
 */
export const organizationFixtures = {
  techCorp: createMockOrganization({
    id: 'tech-corp',
    name: 'Tech Corp',
    slug: 'tech-corp',
    description: 'A technology company',
    settings: {
      theme: 'dark',
      features: ['assessments', 'analytics', 'automation'],
    },
  }),
  
  startupInc: createMockOrganization({
    id: 'startup-inc',
    name: 'Startup Inc',
    slug: 'startup-inc',
    description: 'A small startup',
    settings: {
      theme: 'light',
      features: ['assessments'],
    },
  }),
  
  inactiveOrg: createMockOrganization({
    id: 'inactive-org',
    name: 'Inactive Organization',
    slug: 'inactive-org',
    isActive: false,
  }),
};

/**
 * Assessment fixtures
 */
export const assessmentFixtures = {
  employeeSurvey: createMockAssessment({
    id: 'employee-survey',
    title: 'Employee Satisfaction Survey',
    description: 'Annual employee satisfaction and engagement survey',
    type: 'survey',
    status: 'published',
    questions: [
      createMockQuestion({
        id: 'q1',
        text: 'How satisfied are you with your current role?',
        type: 'rating',
        required: true,
        order: 0,
        validation: { min: 1, max: 5 },
      }),
      createMockQuestion({
        id: 'q2',
        text: 'What aspects of your job do you enjoy most?',
        type: 'text',
        required: false,
        order: 1,
        validation: { maxLength: 500 },
      }),
    ],
  }),
  
  securityAudit: createMockAssessment({
    id: 'security-audit',
    title: 'Security Compliance Audit',
    description: 'Quarterly security compliance assessment',
    type: 'audit',
    status: 'draft',
    questions: [
      createMockQuestion({
        id: 'sec-q1',
        text: 'Are all systems updated with latest security patches?',
        type: 'boolean',
        required: true,
        order: 0,
      }),
      createMockQuestion({
        id: 'sec-q2',
        text: 'Select all security measures in place',
        type: 'checkbox',
        required: true,
        order: 1,
        options: [
          { id: 'opt-1', text: 'Firewall', value: 'firewall' },
          { id: 'opt-2', text: 'Antivirus', value: 'antivirus' },
          { id: 'opt-3', text: 'VPN', value: 'vpn' },
          { id: 'opt-4', text: 'MFA', value: 'mfa' },
        ],
      }),
    ],
  }),
  
  customerFeedback: createMockAssessment({
    id: 'customer-feedback',
    title: 'Customer Feedback Form',
    description: 'Collect customer feedback on products and services',
    type: 'form',
    status: 'published',
    settings: {
      allowAnonymous: true,
      requireAuth: false,
      showProgress: false,
    },
  }),
};

/**
 * API response fixtures
 */
export const apiResponseFixtures = {
  success: {
    users: {
      success: true,
      data: Object.values(userFixtures),
      meta: {
        timestamp: new Date().toISOString(),
        total: Object.keys(userFixtures).length,
      },
    },
    
    organizations: {
      success: true,
      data: Object.values(organizationFixtures),
      meta: {
        timestamp: new Date().toISOString(),
        total: Object.keys(organizationFixtures).length,
      },
    },
    
    assessments: {
      success: true,
      data: Object.values(assessmentFixtures),
      meta: {
        timestamp: new Date().toISOString(),
        total: Object.keys(assessmentFixtures).length,
      },
    },
  },
  
  errors: {
    unauthorized: {
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication required',
      },
    },
    
    forbidden: {
      success: false,
      error: {
        code: 'AUTHORIZATION_ERROR',
        message: 'Insufficient permissions',
      },
    },
    
    notFound: {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      },
    },
    
    validation: {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: {
          errors: [
            {
              path: ['email'],
              message: 'Invalid email format',
            },
          ],
        },
      },
    },
  },
};

/**
 * Form data fixtures
 */
export const formDataFixtures = {
  loginForm: {
    valid: {
      email: 'user@example.com',
      password: 'SecurePassword123!',
    },
    invalid: {
      email: 'invalid-email',
      password: '123',
    },
  },
  
  signupForm: {
    valid: {
      email: 'new.user@example.com',
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!',
      name: 'New User',
      organizationId: 'org-123',
    },
    invalid: {
      email: 'invalid-email',
      password: 'weak',
      confirmPassword: 'different',
      name: '',
    },
  },
  
  assessmentSubmission: {
    valid: {
      assessmentId: 'assessment-123',
      answers: [
        { questionId: 'q1', value: 4 },
        { questionId: 'q2', value: 'Great work environment' },
      ],
    },
    invalid: {
      assessmentId: '',
      answers: [],
    },
  },
};

/**
 * Date fixtures
 */
export const dateFixtures = {
  past: {
    yesterday: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    lastWeek: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    lastMonth: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastYear: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  
  future: {
    tomorrow: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    nextWeek: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    nextMonth: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    nextYear: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  
  current: {
    now: new Date().toISOString(),
    today: new Date().toISOString().split('T')[0],
    thisMonth: new Date().toISOString().substring(0, 7),
    thisYear: new Date().getFullYear().toString(),
  },
};