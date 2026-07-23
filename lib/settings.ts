import type { CalendarOptions } from './liturgical-calendar';
import { supabase } from './supabase';
import type { ThemeId } from './theme';

export interface AppSettings {
  parish_name: string;
  diocese: string;
  theme: ThemeId;
  max_lines_landscape: number;
  max_lines_portrait: number;
  ascension_on_sunday: boolean;
  tu_dao_on_sunday: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  parish_name: '',
  diocese: '',
  theme: 'dx',
  max_lines_landscape: 4,
  max_lines_portrait: 6,
  ascension_on_sunday: true,
  tu_dao_on_sunday: true,
};

let cache: AppSettings | null = null;

/** Bản cache đồng bộ — dùng khi cần giá trị ngay (đã load ít nhất 1 lần). */
export function cachedSettings(): AppSettings {
  return cache ?? DEFAULT_SETTINGS;
}

export async function getSettings(force = false): Promise<AppSettings> {
  if (cache && !force) return cache;
  if (!supabase) return DEFAULT_SETTINGS;
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
  if (error || !data) {
    cache = { ...DEFAULT_SETTINGS };
    return cache;
  }
  cache = {
    parish_name: data.parish_name ?? '',
    diocese: data.diocese ?? '',
    theme: data.theme === 'tl' ? 'tl' : 'dx',
    max_lines_landscape: data.max_lines_landscape ?? 4,
    max_lines_portrait: data.max_lines_portrait ?? 6,
    ascension_on_sunday: data.ascension_on_sunday ?? true,
    tu_dao_on_sunday: data.tu_dao_on_sunday ?? true,
  };
  return cache;
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  cache = { ...(cache ?? DEFAULT_SETTINGS), ...patch };
  if (supabase) {
    const { error } = await supabase
      .from('settings')
      .upsert({ id: 1, ...cache, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
  return cache;
}

export function calendarOptions(s: AppSettings): CalendarOptions {
  return { ascensionOnSunday: s.ascension_on_sunday, tuDaoOnSunday: s.tu_dao_on_sunday };
}
