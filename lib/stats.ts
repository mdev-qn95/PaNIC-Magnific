/**
 * Thống kê bài hát hay dùng + gợi ý theo mùa (Phase 3).
 * Tính từ mass_items (item_type='song') join ngày lễ.
 */

import { supabase } from './supabase';

export interface SongUsage {
  count: number;
  lastDate: string | null; // ISO date của lễ gần nhất dùng bài này
}

interface UsageRow {
  ref_id: string;
  masses: { mass_date: string } | null;
}

async function fetchUsageRows(): Promise<UsageRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('mass_items')
    .select('ref_id, masses(mass_date)')
    .eq('item_type', 'song')
    .not('ref_id', 'is', null);
  if (error || !data) return [];
  return data as unknown as UsageRow[];
}

export async function getSongUsage(): Promise<Map<string, SongUsage>> {
  const rows = await fetchUsageRows();
  const map = new Map<string, SongUsage>();
  for (const row of rows) {
    if (!row.ref_id || !row.masses) continue;
    const u = map.get(row.ref_id) ?? { count: 0, lastDate: null };
    u.count += 1;
    if (!u.lastDate || row.masses.mass_date > u.lastDate) u.lastDate = row.masses.mass_date;
    map.set(row.ref_id, u);
  }
  return map;
}

