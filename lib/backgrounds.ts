import type { Season } from './liturgical-calendar';
import { supabase } from './supabase';
import type { Background } from './types';

const BUCKET = 'magnific';

function client() {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase — tạo .env.local theo README rồi khởi động lại.');
  }
  return supabase;
}

export function publicUrl(path: string): string {
  if (!supabase) return '';
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function listBackgrounds(season?: Season): Promise<Background[]> {
  let q = client().from('backgrounds').select('*').order('created_at');
  if (season) q = q.eq('season', season);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Background[];
}

export async function uploadBackground(
  file: File,
  season: Season | null,
): Promise<Background> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `bg/${crypto.randomUUID()}.${ext}`;
  const { error: eUp } = await client()
    .storage.from(BUCKET)
    .upload(path, file, { contentType: file.type || 'image/jpeg' });
  if (eUp) throw eUp;
  const { data, error } = await client()
    .from('backgrounds')
    .insert({ storage_path: path, season })
    .select()
    .single();
  if (error) throw error;
  return data as Background;
}

export async function updateBackground(
  id: string,
  patch: Partial<Pick<Background, 'season' | 'feast_tag' | 'focal_x' | 'focal_y'>>,
): Promise<void> {
  const { error } = await client().from('backgrounds').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteBackground(bg: Background): Promise<void> {
  await client().storage.from(BUCKET).remove([bg.storage_path]);
  const { error } = await client().from('backgrounds').delete().eq('id', bg.id);
  if (error) throw error;
}

/** Upload poster riêng cho lễ — trả về storage path. */
export async function uploadPoster(file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `posters/${crypto.randomUUID()}.${ext}`;
  const { error } = await client()
    .storage.from(BUCKET)
    .upload(path, file, { contentType: file.type || 'image/jpeg' });
  if (error) throw error;
  return path;
}
