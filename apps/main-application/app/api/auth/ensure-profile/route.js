import { createServiceRoleClient } from "@ioc/shared/data-access/supabase/server";
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabase = createServiceRoleClient();

    // Get auth token
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user profile exists
    const { data: existingProfile } = await supabase.
    from('users').
    select('id').
    eq('id', user.id).
    single();

    if (!existingProfile) {
      // Create user profile
      const { error: profileError } = await supabase.
      from('users').
      insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email.split('@')[0],
        avatar_url: user.user_metadata?.avatar_url,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        return NextResponse.json(
          { error: 'Failed to create user profile', message: profileError.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}