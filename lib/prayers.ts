import { supabase } from './supabase';
import type { Prayer, PrayerSlide } from './types';

export interface PrayerInput {
  title: string;
  content_raw: string;
  slides: PrayerSlide[];
}

function client() {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase — tạo .env.local theo README rồi khởi động lại.');
  }
  return supabase;
}

export async function listPrayers(search?: string): Promise<Prayer[]> {
  let q = client()
    .from('prayers')
    .select('*')
    .order('is_seed', { ascending: false })
    .order('title');
  if (search?.trim()) {
    const s = search.trim().normalize('NFC');
    q = q.or(`title.ilike.%${s}%,content_raw.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Prayer[];
}

export async function getPrayer(id: string): Promise<Prayer> {
  const { data, error } = await client().from('prayers').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Prayer;
}

export async function createPrayer(input: PrayerInput): Promise<Prayer> {
  const { data, error } = await client()
    .from('prayers')
    .insert({ ...input, is_seed: false })
    .select()
    .single();
  if (error) throw error;
  return data as Prayer;
}

export async function updatePrayer(id: string, input: PrayerInput): Promise<Prayer> {
  const { data, error } = await client()
    .from('prayers')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Prayer;
}

export async function deletePrayer(id: string): Promise<void> {
  const { error } = await client().from('prayers').delete().eq('id', id);
  if (error) throw error;
}

/** Kinh có sẵn (is_seed) không sửa trực tiếp — nhân bản thành bản riêng để sửa. */
export async function duplicatePrayer(p: Prayer): Promise<Prayer> {
  return createPrayer({
    title: `${p.title} (bản của giáo xứ)`,
    content_raw: p.content_raw,
    slides: p.slides,
  });
}
