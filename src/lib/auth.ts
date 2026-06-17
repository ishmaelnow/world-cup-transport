import { supabase } from './supabase';
import type { UserRole } from './database.types';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  jwtRole: UserRole | null;
}

export async function signUp(email: string, password: string, role: UserRole, fullName?: string) {
  // SECURITY: Prevent admin signup - admins must be created manually
  if (role === 'admin') {
    throw new Error('Admin accounts cannot be created through signup. Please contact support.');
  }

  // Pass role and full_name in metadata so trigger can use it
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/`,
      data: {
        role,
        full_name: fullName || null,
      },
    },
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('User creation failed');

  return authData;
}

function isUserRole(role: string): role is UserRole {
  return role === 'rider' || role === 'driver' || role === 'admin';
}

function normalizeUserRole(role: unknown): UserRole | null {
  return typeof role === 'string' && isUserRole(role) ? role : null;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  });

  if (error) throw error;
  return data;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUser = sessionData.session?.user ?? null;
  const sessionJwtRole = normalizeUserRole(sessionUser?.app_metadata?.role);

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error('[auth] getUser error', userError);
    return null;
  }

  if (!user) {
    console.log('[auth] no authenticated user');
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('[auth] profile load error', {
      userId: user.id,
      email: user.email,
      jwtRole: sessionJwtRole,
      error: profileError,
    });
    return null;
  }

  if (!profile) {
    console.warn('[auth] missing profile for authenticated user', {
      userId: user.id,
      email: user.email,
      jwtRole: sessionJwtRole,
      appMetadata: user.app_metadata,
    });
    return null;
  }

  const profileRole = normalizeUserRole(profile.role) ?? 'rider';
  let jwtRole = normalizeUserRole(user.app_metadata?.role) ?? sessionJwtRole;

  console.log('[auth] loaded user roles', {
    userId: user.id,
    email: user.email,
    profileRole,
    jwtRole,
    appMetadata: user.app_metadata,
  });

  if (profileRole !== jwtRole) {
    console.warn('[auth] profile role and JWT role differ; refreshing session', {
      userId: user.id,
      email: user.email,
      profileRole,
      jwtRole,
    });

    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.error('[auth] session refresh failed after role mismatch', refreshError);
    } else {
      jwtRole = normalizeUserRole(refreshed.session?.user.app_metadata?.role);
      console.log('[auth] session refreshed after role mismatch', {
        userId: refreshed.session?.user.id,
        email: refreshed.session?.user.email,
        jwtRole,
        appMetadata: refreshed.session?.user.app_metadata,
      });
    }
  }

  return {
    id: user.id,
    email: user.email!,
    role: profileRole,
    full_name: profile.full_name,
    phone: profile.phone,
    jwtRole,
  };
}

export async function updateProfile(userId: string, updates: { full_name?: string; phone?: string }) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}
