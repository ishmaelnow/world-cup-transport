import { supabase } from './supabase';
import type { UserRole } from './database.types';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
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
      data: {
        role,
        full_name: fullName || null,
      },
    },
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('User creation failed');

  // Create profile directly (RLS policy allows users to insert own profile)
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      role: role, // Already validated above - cannot be 'admin'
      full_name: fullName || null,
    });

  if (profileError) {
    console.error('Failed to create profile:', profileError);
    throw new Error('Profile creation failed. Please try again.');
  }

  return authData;
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

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email!,
    role: profile.role,
    full_name: profile.full_name,
    phone: profile.phone,
  };
}

export async function updateProfile(userId: string, updates: { full_name?: string; phone?: string }) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}
