import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** null khi chưa cấu hình .env.local — UI hiển thị hướng dẫn thay vì crash. */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const supabaseConfigured = Boolean(url && anonKey);
