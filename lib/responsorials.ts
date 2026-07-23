import { supabase } from './supabase';

export type ResponsorialSeason =
  | 'vong'
  | 'giang_sinh'
  | 'chay'
  | 'phuc_sinh'
  | 'thuong_nien'
  | 'le_trong'
  | 'cac_thanh'
  | 'phu_truong';

export const RESP_SEASON_LABEL: Record<ResponsorialSeason, string> = {
  vong: 'Mùa Vọng',
  giang_sinh: 'Mùa Giáng Sinh',
  chay: 'Mùa Chay',
  phuc_sinh: 'Mùa Phục Sinh',
  thuong_nien: 'Mùa Thường Niên',
  le_trong: 'Lễ trọng kính Chúa',
  cac_thanh: 'Kính các Thánh',
  phu_truong: 'Phụ trương',
};

export const RESP_SEASON_ORDER: ResponsorialSeason[] = [
  'vong', 'giang_sinh', 'chay', 'phuc_sinh', 'thuong_nien', 'le_trong', 'cac_thanh', 'phu_truong',
];

export type ResponsorialPart = 'dap_ca' | 'tung_ho';

export const PART_TITLE: Record<ResponsorialPart, string> = {
  dap_ca: 'Đáp ca',
  tung_ho: 'Tung hô Tin Mừng',
};

export interface ResponsorialSlide {
  title: string;
  lines: string[];
  /** Thuộc phần nào. Dữ liệu nhập lần đầu chưa có — suy từ title (xem slidesForPart). */
  part?: ResponsorialPart;
}

export interface Responsorial {
  id: string;
  season: ResponsorialSeason;
  occasion: string;
  psalm_response: string;
  gospel_acclamation: string | null;
  slides: ResponsorialSlide[];
  sort_order: number;
  created_at: string;
}

function client() {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase — tạo .env.local theo README rồi khởi động lại.');
  }
  return supabase;
}

export async function listResponsorials(opts?: {
  season?: ResponsorialSeason;
  search?: string;
}): Promise<Responsorial[]> {
  let q = client()
    .from('responsorials')
    .select('*')
    .order('sort_order', { ascending: true });
  if (opts?.season) q = q.eq('season', opts.season);
  if (opts?.search?.trim()) {
    const s = opts.search.trim().normalize('NFC');
    q = q.or(`occasion.ilike.%${s}%,psalm_response.ilike.%${s}%,gospel_acclamation.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Responsorial[];
}

export async function countResponsorials(): Promise<number> {
  const { count } = await client()
    .from('responsorials')
    .select('*', { count: 'exact', head: true });
  return count ?? 0;
}

/** Slide thuộc một phần. Dữ liệu cũ chưa gắn `part` → suy từ title. */
export function slidesForPart(r: Responsorial, part: ResponsorialPart): ResponsorialSlide[] {
  return r.slides.filter(
    (s) => (s.part ?? (s.title === PART_TITLE.dap_ca ? 'dap_ca' : 'tung_ho')) === part,
  );
}

export interface ResponsorialInput {
  season: ResponsorialSeason;
  occasion: string;
  psalm_response: string;
  gospel_acclamation: string | null;
  slides: ResponsorialSlide[];
}

export async function getResponsorial(id: string): Promise<Responsorial> {
  const { data, error } = await client().from('responsorials').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Responsorial;
}

export async function createResponsorial(input: ResponsorialInput): Promise<Responsorial> {
  const { data, error } = await client()
    .from('responsorials')
    .insert({ ...input, sort_order: 9999 })
    .select()
    .single();
  if (error) throw error;
  return data as Responsorial;
}

export async function updateResponsorial(id: string, input: ResponsorialInput): Promise<void> {
  const { error } = await client().from('responsorials').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteResponsorial(id: string): Promise<void> {
  const { error } = await client().from('responsorials').delete().eq('id', id);
  if (error) throw error;
}

export async function getResponsorialsByIds(ids: string[]): Promise<Map<string, Responsorial>> {
  const map = new Map<string, Responsorial>();
  if (!ids.length) return map;
  const { data, error } = await client().from('responsorials').select('*').in('id', ids);
  if (error) throw error;
  for (const r of data ?? []) map.set(r.id, r as Responsorial);
  return map;
}

/* ---------------- gợi ý đáp ca theo ngày lễ ---------------- */

const ROMAN_MAP: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 };
function romanToInt(s: string): number | null {
  const t = s.toUpperCase();
  if (!/^[IVXL]+$/.test(t)) return null;
  let sum = 0;
  for (let i = 0; i < t.length; i++) {
    const cur = ROMAN_MAP[t[i]], next = ROMAN_MAP[t[i + 1]] ?? 0;
    sum += cur < next ? -cur : cur;
  }
  return sum || null;
}

export interface ParsedOccasion {
  isSunday: boolean;
  /** Thứ trong tuần theo cách gọi VN: 2=Thứ Hai … 7=Thứ Bảy (từ "Thứ N-W"). */
  weekday: number | null;
  week: number | null;
  cycle: 'A' | 'B' | 'C' | null;
  /** Ngày thường Thường Niên: năm lẻ (I) / năm chẵn (II). */
  weekdayVariant: 'le' | 'chan' | null;
  /** Lễ theo ngày cố định ("Ngày 25-1" → day 25, month 1). */
  day: number | null;
  month: number | null;
}

/** Trích thông tin khớp từ chuỗi dịp lễ (Chúa Nhật / ngày thường / lễ theo ngày). */
export function parseOccasion(occasion: string): ParsedOccasion {
  const o = occasion.normalize('NFC');

  // "Ngày 25-1" → ngày 25 tháng 1
  const d = o.match(/ngày\s+(\d{1,2})\s*-\s*(\d{1,2})/iu);

  // "Thứ 2-1" → Thứ Hai, tuần 1 (không nhầm với "Thứ 6 sau lễ…" vì bắt buộc có "-số")
  const w = o.match(/thứ\s*([2-7])\s*-\s*(\d{1,2})/iu);

  // "Chúa nhật II năm A" / "Chúa nhật 16 năm A" (bỏ qua "Chúa nhật sau lễ…", "Chúa nhật cuối cùng…")
  const s = o.match(/chúa\s*nhật\s+([IVXL]+|\d{1,2})\b/iu);
  let week: number | null = null;
  if (s) week = /^\d+$/.test(s[1]) ? parseInt(s[1], 10) : romanToInt(s[1]);
  else if (w) week = parseInt(w[2], 10);

  const c = o.match(/năm\s*([abc])\b/iu);
  const v = o.match(/\(\s*năm\s+(lẻ|lẽ|chẵn)\s*\)/iu);

  return {
    isSunday: /chúa\s*nhật/iu.test(o),
    weekday: w ? parseInt(w[1], 10) : null,
    week,
    cycle: c ? (c[1].toUpperCase() as 'A' | 'B' | 'C') : null,
    weekdayVariant: v ? (v[1].toLowerCase() === 'chẵn' ? 'chan' : 'le') : null,
    day: d ? parseInt(d[1], 10) : null,
    month: d ? parseInt(d[2], 10) : null,
  };
}

/**
 * Lấy đoạn TÊN LỄ (in hoa) trong chuỗi dịp lễ, bỏ phần ngữ cảnh.
 * "Chúa nhật sau lễ Chúa Ba Ngôi — MÌNH VÀ MÁU THÁNH CHÚA KI-TÔ — Năm A"
 *   → "MÌNH VÀ MÁU THÁNH CHÚA KI-TÔ"
 * Cần thiết vì phần ngữ cảnh có thể chứa tên lễ khác (dễ khớp nhầm).
 */
export function solemnityName(occasion: string): string {
  return occasion
    .split('—')
    .map((s) => s.trim())
    .filter((s) => {
      const letters = [...s].filter((c) => /\p{L}/u.test(c));
      if (letters.length < 3) return false;
      const upper = letters.filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length;
      return upper / letters.length >= 0.7;
    })
    .join(' ');
}

/** Lễ trọng kính Chúa: nhận diện qua tên lễ trong lịch ↔ tên lễ trong dịp lễ. */
const SOLEMNITY_KEYS: { inTitle: RegExp; inOccasion: RegExp }[] = [
  { inTitle: /ba\s*ngôi/iu, inOccasion: /ba\s*ngôi/iu },
  { inTitle: /mình\s*(và\s*)?máu/iu, inOccasion: /mình\s*(và\s*)?máu/iu },
  { inTitle: /thánh\s*tâm/iu, inOccasion: /thánh\s*tâm/iu },
  { inTitle: /ki-?tô\s*vua|vua\s*vũ\s*trụ/iu, inOccasion: /ki-?tô\s*vua|vua\s*vũ\s*trụ/iu },
];

export interface DayContext {
  month: number; // 1..12
  dayOfMonth: number;
  /** JS getDay(): 0 = Chúa Nhật … 6 = Thứ Bảy */
  dayOfWeek: number;
  season: ResponsorialSeason | null;
  week: number | null;
  cycle: 'A' | 'B' | 'C';
  weekdayCycle: 'le' | 'chan';
  /** Tên lễ từ lịch phụng vụ — dùng khớp lễ trọng kính Chúa. */
  title: string;
}

/** Một mục đáp ca có khớp với ngày lễ không (hàm thuần — có unit test). */
export function matchesDay(
  r: { season: ResponsorialSeason; occasion: string },
  ctx: DayContext,
): boolean {
  const p = parseOccasion(r.occasion);

  // 1. Lễ kính các Thánh: khớp theo ngày dương lịch cố định
  if (r.season === 'cac_thanh') {
    return p.day === ctx.dayOfMonth && p.month === ctx.month;
  }

  // 2. Lễ trọng kính Chúa: khớp tên lễ + năm A/B/C
  if (r.season === 'le_trong') {
    const key = SOLEMNITY_KEYS.find((k) => k.inTitle.test(ctx.title));
    if (!key || !key.inOccasion.test(solemnityName(r.occasion))) return false;
    return p.cycle === null || p.cycle === ctx.cycle;
  }

  // 3. Theo mùa: phải cùng mùa với ngày lễ
  if (!ctx.season || r.season !== ctx.season) return false;

  if (ctx.dayOfWeek === 0) {
    // Chúa Nhật: tuần + năm A/B/C
    return p.isSunday && p.week !== null && p.week === ctx.week
      && (p.cycle === null || p.cycle === ctx.cycle);
  }

  // Ngày thường: thứ + tuần + năm lẻ/chẵn (mùa khác Thường Niên không có lẻ/chẵn → null là khớp)
  return p.weekday === ctx.dayOfWeek + 1 && p.week !== null && p.week === ctx.week
    && (p.weekdayVariant === null || p.weekdayVariant === ctx.weekdayCycle);
}

/**
 * Gợi ý đáp ca cho một ngày lễ bất kỳ: Chúa Nhật, ngày thường (năm lẻ/chẵn),
 * lễ trọng kính Chúa, và lễ kính các Thánh (theo ngày cố định).
 * Mục cụ thể hơn (lễ trọng / lễ thánh) xếp trước.
 */
export async function suggestForDay(ctx: DayContext): Promise<Responsorial[]> {
  const seasons = Array.from(
    new Set([ctx.season, 'le_trong', 'cac_thanh'].filter(Boolean) as ResponsorialSeason[]),
  );
  const { data, error } = await client()
    .from('responsorials')
    .select('*')
    .in('season', seasons)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  const rows = ((data ?? []) as Responsorial[]).filter((r) => matchesDay(r, ctx));
  const rank = (r: Responsorial) => (r.season === 'cac_thanh' || r.season === 'le_trong' ? 0 : 1);
  return rows.sort((a, b) => rank(a) - rank(b) || a.sort_order - b.sort_order);
}
