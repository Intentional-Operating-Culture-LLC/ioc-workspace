import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/auth/signup
export async function POST(request, { params }) {
  const authPath = params.auth?.[0];

  try {
    const body = await request.json();

    switch (authPath) {
      case 'signup':
        return handleSignup(body);
      case 'login':
        return handleLogin(body);
      case 'logout':
        return handleLogout(request);
      case 'refresh':
        return handleRefreshToken(body);
      case 'forgot-password':
        return handleForgotPassword(body);
      case 'reset-password':
        return handleResetPassword(body);
      case 'verify-email':
        return handleVerifyEmail(body);
      default:
        return NextResponse.json(
          { error: 'Invalid auth endpoint' },
          { status: 404 }
        );
    }
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', message: error.message },
      { status: 500 }
    );
  }
}

// GET /api/auth/session
export async function GET(request, { params }) {
  const authPath = params.auth?.[0];

  try {
    switch (authPath) {
      case 'session':
        return handleGetSession(request);
      case 'user':
        return handleGetUser(request);
      default:
        return NextResponse.json(
          { error: 'Invalid auth endpoint' },
          { status: 404 }
        );
    }
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', message: error.message },
      { status: 500 }
    );
  }
}

// Handle user signup
async function handleSignup({ email, password, fullName, organizationName }) {
  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (authError) {
    return NextResponse.json(
      { error: 'Signup failed', message: authError.message },
      { status: 400 }
    );
  }

  // Create user profile
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
    })
    .select()
    .single();

  if (profileError) {
    return NextResponse.json(
      { error: 'Profile creation failed', message: profileError.message },
      { status: 400 }
    );
  }

  // Create organization if provided
  if (organizationName) {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: organizationName,
        slug: organizationName.toLowerCase().replace(/\s+/g, '-'),
      })
      .select()
      .single();

    if (orgError) {
      return NextResponse.json(
        { error: 'Organization creation failed', message: orgError.message },
        { status: 400 }
      );
    }

    // Link user to organization as owner
    await supabase.from('user_organizations').insert({
      user_id: authData.user.id,
      organization_id: org.id,
      role: 'owner',
    });
  }

  return NextResponse.json({
    user: authData.user,
    session: authData.session,
    profile: userProfile,
  });
}

// Handle user login
async function handleLogin({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json(
      { error: 'Login failed', message: error.message },
      { status: 401 }
    );
  }

  // Update last login
  await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', data.user.id);

  // Get user profile with organizations
  const { data: profile } = await supabase
    .from('users')
    .select(`
      *,
      user_organizations(
        organization:organizations(*),
        role,
        permissions
      )
    `)
    .eq('id', data.user.id)
    .single();

  return NextResponse.json({
    user: data.user,
    session: data.session,
    profile,
  });
}

// Handle logout
async function handleLogout(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json(
      { error: 'No session found' },
      { status: 401 }
    );
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json(
      { error: 'Logout failed', message: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ message: 'Logged out successfully' });
}

// Handle token refresh
async function handleRefreshToken({ refreshToken }) {
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error) {
    return NextResponse.json(
      { error: 'Token refresh failed', message: error.message },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user: data.user,
    session: data.session,
  });
}

// Handle forgot password
async function handleForgotPassword({ email }) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  });

  if (error) {
    return NextResponse.json(
      { error: 'Password reset failed', message: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    message: 'Password reset email sent',
  });
}

// Handle password reset
async function handleResetPassword({ token, password }) {
  const { data, error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return NextResponse.json(
      { error: 'Password reset failed', message: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    message: 'Password reset successful',
    user: data.user,
  });
}

// Handle email verification
async function handleVerifyEmail({ token }) {
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: 'email',
  });

  if (error) {
    return NextResponse.json(
      { error: 'Email verification failed', message: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    message: 'Email verified successfully',
    user: data.user,
  });
}

// Get current session
async function handleGetSession(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json(
      { error: 'No session found' },
      { status: 401 }
    );
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json(
      { error: 'Invalid session' },
      { status: 401 }
    );
  }

  return NextResponse.json({ user });
}

// Get current user with profile
async function handleGetUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json(
      { error: 'No session found' },
      { status: 401 }
    );
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json(
      { error: 'Invalid session' },
      { status: 401 }
    );
  }

  // Get user profile with organizations
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select(`
      *,
      user_organizations(
        organization:organizations(*),
        role,
        permissions
      )
    `)
    .eq('id', user.id)
    .single();

  if (profileError) {
    return NextResponse.json(
      { error: 'Profile not found', message: profileError.message },
      { status: 404 }
    );
  }

  return NextResponse.json({ user, profile });
}