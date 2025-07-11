/**
 * Mock factory functions for testing
 */
import { User, Organization, Assessment, Question } from "@ioc/shared/types";
/**
 * Create a mock user
 */
export function createMockUser(overrides?: Partial<User>): User {
    return {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        organizationId: 'org-123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emailVerified: true,
        isActive: true,
        ...overrides,
    };
}
/**
 * Create a mock organization
 */
export function createMockOrganization(overrides?: Partial<Organization>): Organization {
    return {
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        description: 'A test organization',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        settings: {},
        ...overrides,
    };
}
/**
 * Create a mock assessment
 */
export function createMockAssessment(overrides?: Partial<Assessment>): Assessment {
    return {
        id: 'assessment-123',
        organizationId: 'org-123',
        title: 'Test Assessment',
        description: 'A test assessment',
        type: 'survey',
        status: 'draft',
        createdBy: 'user-123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questions: [],
        settings: {
            allowAnonymous: false,
            requireAuth: true,
            showProgress: true,
        },
        ...overrides,
    };
}
/**
 * Create a mock question
 */
export function createMockQuestion(overrides?: Partial<Question>): Question {
    return {
        id: 'question-123',
        assessmentId: 'assessment-123',
        type: 'multiple_choice',
        text: 'What is your favorite color?',
        required: true,
        order: 0,
        options: [
            { id: 'opt-1', text: 'Red', value: 'red' },
            { id: 'opt-2', text: 'Blue', value: 'blue' },
            { id: 'opt-3', text: 'Green', value: 'green' },
        ],
        validation: {},
        ...overrides,
    };
}
/**
 * Create mock API response
 */
export function createMockApiResponse<T>(data: T, overrides?: Partial<Response>): Response {
    return {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
            'content-type': 'application/json',
        }),
        json: async () => ({ success: true, data }),
        text: async () => JSON.stringify({ success: true, data }),
        blob: async () => new Blob([JSON.stringify({ success: true, data })]),
        arrayBuffer: async () => new ArrayBuffer(0),
        formData: async () => new FormData(),
        clone: () => createMockApiResponse(data, overrides),
        bodyUsed: false,
        body: null,
        type: 'basic',
        url: 'http://localhost:3000/api/test',
        redirected: false,
        ...overrides,
    } as Response;
}
/**
 * Create mock error response
 */
export function createMockErrorResponse(message: string, status = 400, code = 'ERROR'): Response {
    return createMockApiResponse(null, {
        ok: false,
        status,
        statusText: message,
        json: async () => ({
            success: false,
            error: { code, message },
        }),
    });
}
/**
 * Mock fetch function
 */
export class MockFetch {
    private responses: Map<string, () => Response> = new Map();
    /**
     * Register a mock response for a URL pattern
     */
    register(pattern: string | RegExp, response: Response | (() => Response)) {
        const key = pattern instanceof RegExp ? pattern.source : pattern;
        this.responses.set(key, typeof response === 'function' ? response : () => response);
    }
    /**
     * Create the mock fetch function
     */
    createFetch(): typeof fetch {
        return async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = input instanceof Request ? input.url : input.toString();
            // Find matching pattern
            for (const [pattern, responseFactory] of this.responses) {
                if (pattern === url ||
                    (pattern.includes('*') && new RegExp(pattern.replace(/\*/g, '.*')).test(url)) ||
                    new RegExp(pattern).test(url)) {
                    return responseFactory();
                }
            }
            // Default 404 response
            return createMockErrorResponse('Not found', 404, 'NOT_FOUND');
        };
    }
    /**
     * Clear all registered responses
     */
    clear() {
        this.responses.clear();
    }
}
/**
 * Mock localStorage
 */
export class MockLocalStorage implements Storage {
    private store: Map<string, string> = new Map();
    get length(): number {
        return this.store.size;
    }
    clear(): void {
        this.store.clear();
    }
    getItem(key: string): string | null {
        return this.store.get(key) ?? null;
    }
    key(index: number): string | null {
        return Array.from(this.store.keys())[index] ?? null;
    }
    removeItem(key: string): void {
        this.store.delete(key);
    }
    setItem(key: string, value: string): void {
        this.store.set(key, value);
    }
}
/**
 * Mock Next.js router
 */
export function createMockRouter(overrides?: Partial<any>) {
    return {
        route: '/',
        pathname: '/',
        query: {},
        asPath: '/',
        basePath: '',
        locale: 'en',
        locales: ['en'],
        defaultLocale: 'en',
        isLocaleDomain: false,
        push: jest.fn(() => Promise.resolve(true)),
        replace: jest.fn(() => Promise.resolve(true)),
        reload: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        prefetch: jest.fn(() => Promise.resolve()),
        beforePopState: jest.fn(),
        events: {
            on: jest.fn(),
            off: jest.fn(),
            emit: jest.fn(),
        },
        isFallback: false,
        isReady: true,
        isPreview: false,
        ...overrides,
    };
}
/**
 * Mock Supabase client
 */
export function createMockSupabaseClient() {
    return {
        auth: {
            getSession: jest.fn(),
            getUser: jest.fn(),
            signInWithPassword: jest.fn(),
            signUp: jest.fn(),
            signOut: jest.fn(),
            onAuthStateChange: jest.fn(),
        },
        from: jest.fn((table: string) => ({
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            data: null,
            error: null,
        })),
        storage: {
            from: jest.fn((bucket: string) => ({
                upload: jest.fn(),
                download: jest.fn(),
                remove: jest.fn(),
                list: jest.fn(),
                getPublicUrl: jest.fn(),
            })),
        },
    };
}
