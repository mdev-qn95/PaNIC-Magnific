import { supabase } from './supabase';

export type Role = 'admin' | 'user';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Chưa cấu hình Supabase.');
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    throw new Error(
      error.message === 'Invalid login credentials'
        ? 'Email hoặc mật khẩu không đúng.'
        : error.message,
    );
  }
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

/** Lấy user hiện tại kèm vai trò (đọc từ bảng profiles). */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  if (!supabase) return null;
  const { data: sess } = await supabase.auth.getUser();
  const u = sess.user;
  if (!u) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', u.id)
    .maybeSingle();
  return {
    id: u.id,
    email: u.email ?? '',
    role: profile?.role === 'admin' ? 'admin' : 'user',
  };
}
