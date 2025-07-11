import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { AuthenticationError, AuthorizationError } from './errors';

/**
 * JWT token payload
 */
export interface TokenPayload {
  sub: string; // user id
  email: string;
  role?: string;
  permissions?: string[];
  exp?: number;
  iat?: number;
}

/**
 * Authentication utilities
 */
export class AuthUtils {
  private static secret: Uint8Array;

  /**
   * Initialize auth utilities with secret
   */
  static init(secret: string) {
    this.secret = new TextEncoder().encode(secret);
  }

  /**
   * Generate JWT token
   */
  static async generateToken(payload: Omit<TokenPayload, 'exp' | 'iat'>, expiresIn = '7d'): Promise<string> {
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(this.secret);

    return token;
  }

  /**
   * Verify JWT token
   */
  static async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.secret);
      return payload as TokenPayload;
    } catch (error) {
      throw new AuthenticationError('Invalid or expired token');
    }
  }

  /**
   * Extract token from request
   */
  static extractToken(request: NextRequest): string | null {
    // Check Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check cookie
    const cookieToken = request.cookies.get('auth-token')?.value;
    if (cookieToken) {
      return cookieToken;
    }

    return null;
  }

  /**
   * Get authenticated user from request
   */
  static async getAuthUser(request: NextRequest): Promise<TokenPayload> {
    const token = this.extractToken(request);
    if (!token) {
      throw new AuthenticationError('No authentication token provided');
    }

    return this.verifyToken(token);
  }

  /**
   * Check if user has required role
   */
  static hasRole(user: TokenPayload, requiredRole: string): boolean {
    return user.role === requiredRole;
  }

  /**
   * Check if user has required permission
   */
  static hasPermission(user: TokenPayload, requiredPermission: string): boolean {
    return user.permissions?.includes(requiredPermission) ?? false;
  }

  /**
   * Require authentication for request
   */
  static async requireAuth(request: NextRequest): Promise<TokenPayload> {
    try {
      return await this.getAuthUser(request);
    } catch (error) {
      throw new AuthenticationError();
    }
  }

  /**
   * Require specific role for request
   */
  static async requireRole(request: NextRequest, requiredRole: string): Promise<TokenPayload> {
    const user = await this.requireAuth(request);
    
    if (!this.hasRole(user, requiredRole)) {
      throw new AuthorizationError(`Role '${requiredRole}' required`);
    }

    return user;
  }

  /**
   * Require specific permission for request
   */
  static async requirePermission(request: NextRequest, requiredPermission: string): Promise<TokenPayload> {
    const user = await this.requireAuth(request);
    
    if (!this.hasPermission(user, requiredPermission)) {
      throw new AuthorizationError(`Permission '${requiredPermission}' required`);
    }

    return user;
  }
}

/**
 * Password hashing utilities
 */
export class PasswordUtils {
  /**
   * Hash password using Web Crypto API
   */
  static async hash(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify password against hash
   */
  static async verify(password: string, hash: string): Promise<boolean> {
    const passwordHash = await this.hash(password);
    return passwordHash === hash;
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}

/**
 * Session management utilities
 */
export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  data?: Record<string, unknown>;
}

export class SessionUtils {
  /**
   * Create new session
   */
  static createSession(userId: string, expiresIn = 7 * 24 * 60 * 60 * 1000): Session {
    return {
      id: PasswordUtils.generateSecureToken(),
      userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + expiresIn),
    };
  }

  /**
   * Check if session is expired
   */
  static isExpired(session: Session): boolean {
    return session.expiresAt < new Date();
  }

  /**
   * Extend session expiration
   */
  static extendSession(session: Session, expiresIn = 7 * 24 * 60 * 60 * 1000): Session {
    return {
      ...session,
      expiresAt: new Date(Date.now() + expiresIn),
    };
  }
}