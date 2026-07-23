import { supabase } from './supabase';
import type { Song, SongCategory, SongSlide } from './types';

export interface SongInput {
  title: string;
  author: string | null;
  category: SongCategory;
  lyrics_raw: string;
  slides: SongSlide[];
}

function client() {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase — tạo .env.local theo README rồi khởi động lại.');
  }
  return supabase;
}

export async function listSongs(opts?: {
  search?: string;
  category?: SongCategory;
}): Promise<Song[]> {
  let q = client().from('songs').select('*').order('updated_at', { ascending: false });
  if (opts?.category) q = q.eq('category', opts.category);
  if (opts?.search?.trim()) {
    const s = opts.search.trim().normalize('NFC');
    q = q.or(`title.ilike.%${s}%,author.ilike.%${s}%,lyrics_raw.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Song[];
}

export async function getSong(id: string): Promise<Song> {
  const { data, error } = await client().from('songs').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Song;
}

export async function createSong(input: SongInput): Promise<Song> {
  const { data, error } = await client().from('songs').insert(input).select().single();
  if (error) throw error;
  return data as Song;
}

export async function updateSong(id: string, input: SongInput): Promise<Song> {
  const { data, error } = await client()
    .from('songs')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Song;
}

export async function deleteSong(id: string): Promise<void> {
  const { error } = await client().from('songs').delete().eq('id', id);
  if (error) throw error;
}
