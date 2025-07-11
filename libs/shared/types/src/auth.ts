// Authentication and Authorization Types

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  avatar_url?: string;
  email_verified?: boolean;
  phone?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
  refresh_token?: string;
  expires_at: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  organization_name?: string;
  organization_slug?: string;
}

export interface SignupResponse {
  user: AuthUser;
  token: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface ResetPasswordRequest {
  email: string;
  redirect_url?: string;
}

export interface ResetPasswordResponse {
  message: string;
  reset_token?: string;
}

export interface UpdatePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface AuthSession {
  id: string;
  user_id: string;
  token: string;
  refresh_token?: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  created_at: string;
  last_activity: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  organization_id?: string;
  granted_by?: string;
  granted_at: string;
  expires_at?: string;
  role: Role;
}

// Permission system types
export type ResourceType = 'organizations' | 'users' | 'assessments' | 'analytics' | 'billing' | 'marketing' | 'campaigns' | 'integrations';
export type ActionType = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'view' | 'export';

export interface PermissionCheck {
  resource: ResourceType;
  action: ActionType;
  organization_id?: string;
  resource_id?: string;
}

export interface PermissionResult {
  granted: boolean;
  reason?: string;
  conditions?: Record<string, any>;
}

// CEO Dashboard specific auth types
export interface CEOAuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ceo' | 'executive' | 'board_member';
  organization_id: string;
  permissions: CEOPermission[];
  last_login_at?: string;
  created_at: string;
}

export interface CEOPermission {
  resource: 'dashboard' | 'metrics' | 'reports' | 'alerts' | 'settings' | 'users' | 'organizations';
  actions: string[];
  restrictions?: Record<string, any>;
}

export interface CEOAuthContextType {
  user: CEOAuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
}

// Multi-factor authentication types
export interface MFASetup {
  secret: string;
  qr_code: string;
  backup_codes: string[];
}

export interface MFAVerification {
  token: string;
  backup_code?: string;
}

export interface MFASettings {
  enabled: boolean;
  methods: ('totp' | 'sms' | 'email')[];
  backup_codes_generated: boolean;
  last_used?: string;
  created_at: string;
  updated_at: string;
}

// OAuth / SSO types
export interface OAuthProvider {
  id: string;
  name: string;
  client_id: string;
  auth_url: string;
  token_url: string;
  user_info_url: string;
  scopes: string[];
  enabled: boolean;
}

export interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_at: string;
  token_type: string;
  scope: string;
}

export interface OAuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  provider: string;
  provider_id: string;
}

// Invitation system types
export interface UserInvitation {
  id: string;
  email: string;
  organization_id: string;
  role: string;
  invited_by: string;
  invitation_token: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

export interface InvitationRequest {
  email: string;
  role: string;
  organization_id: string;
  message?: string;
}

export interface InvitationResponse {
  invitation: UserInvitation;
  message: string;
}

export interface AcceptInvitationRequest {
  invitation_token: string;
  full_name: string;
  password: string;
}

// Audit log types
export interface AuthAuditLog {
  id: string;
  user_id?: string;
  action: 'login' | 'logout' | 'password_change' | 'permission_change' | 'role_change' | 'invitation_sent' | 'invitation_accepted';
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  organization_id?: string;
  created_at: string;
}

// Security settings
export interface SecuritySettings {
  password_requirements: {
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_special_chars: boolean;
  };
  session_timeout: number;
  max_login_attempts: number;
  lockout_duration: number;
  mfa_required: boolean;
  password_expiry_days?: number;
  allowed_domains?: string[];
}