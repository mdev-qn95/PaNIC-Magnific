import { getLiturgicalDay } from './liturgical-calendar';
import { deleteLocalMass, getLocalMass, isLocalMassId, saveLocalMass } from './local-masses';
import { getResponsorialsByIds, type Responsorial } from './responsorials';
import { calendarOptions, getSettings } from './settings';
import { supabase } from './supabase';
import type {
  Mass, MassItem, MassItemOverrides, MassItemType, Prayer, PrayerSlide, Song,
} from './types';

function client() {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase — tạo .env.local theo README rồi khởi động lại.');
  }
  return supabase;
}

export interface MassListRow extends Mass {
  /** từ mass_items(count) */
  mass_items: { count: number }[];
}

export interface MassBundle {
  mass: Mass;
  items: MassItem[];
  songs: Map<string, Song>;
  prayers: Map<string, Prayer>;
  responsorials: Map<string, Responsorial>;
}

export interface MassInput {
  mass_date: string;
  title: string;
  liturgical_color: Mass['liturgical_color'];
  poster_path?: string | null;
  notes?: string | null;
}

export interface MassItemInput {
  item_type: MassItemType;
  ref_id: string | null;
  custom_slides: PrayerSlide[] | null;
  background_id?: string | null;
  /** Tùy chỉnh riêng của mục — hiện dùng cho ảnh poster riêng. */
  overrides?: MassItemOverrides;
}

export async function listMasses(month?: string): Promise<MassListRow[]> {
  let q = client()
    .from('masses')
    .select('*, mass_items(count)')
    .order('mass_date', { ascending: false });
  if (month) {
    // month dạng 'YYYY-MM'
    const [y, m] = month.split('-').map(Number);
    const from = `${month}-01`;
    const to = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    q = q.gte('mass_date', from).lt('mass_date', to);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MassListRow[];
}

export async function getMassBundle(id: string): Promise<MassBundle> {
  const c = client();
  let mass: Mass;
  let items: MassItem[];

  if (isLocalMassId(id)) {
    // Lễ lưu trên máy — nội dung (bài hát, kinh, đáp ca) vẫn lấy từ DB chung
    const local = await getLocalMass(id);
    if (!local) throw new Error('Không tìm thấy lễ này trên máy.');
    mass = local.mass;
    items = local.items;
  } else {
    const { data: m, error: e1 } = await c.from('masses').select('*').eq('id', id).single();
    if (e1) throw e1;
    const { data: rows, error: e2 } = await c
      .from('mass_items')
      .select('*')
      .eq('mass_id', id)
      .order('position');
    if (e2) throw e2;
    mass = m as Mass;
    items = (rows ?? []) as MassItem[];
  }

  const songIds = (items ?? []).filter((i) => i.item_type === 'song' && i.ref_id).map((i) => i.ref_id as string);
  const prayerIds = (items ?? []).filter((i) => i.item_type === 'prayer' && i.ref_id).map((i) => i.ref_id as string);
  const respIds = (items ?? [])
    .filter((i) => (i.item_type === 'dap_ca' || i.item_type === 'tung_ho') && i.ref_id)
    .map((i) => i.ref_id as string);

  const songs = new Map<string, Song>();
  const prayers = new Map<string, Prayer>();
  if (songIds.length) {
    const { data, error } = await c.from('songs').select('*').in('id', songIds);
    if (error) throw error;
    for (const s of data ?? []) songs.set(s.id, s as Song);
  }
  if (prayerIds.length) {
    const { data, error } = await c.from('prayers').select('*').in('id', prayerIds);
    if (error) throw error;
    for (const p of data ?? []) prayers.set(p.id, p as Prayer);
  }
  const responsorials = await getResponsorialsByIds(respIds);
  return { mass: mass as Mass, items: (items ?? []) as MassItem[], songs, prayers, responsorials };
}

/**
 * Lưu lễ. Admin → DB chung; người dùng thường → IndexedDB trên máy họ.
 * (Hàng rào thật nằm ở RLS phía database; đây là để UX không báo lỗi khó hiểu.)
 */
export async function saveMassSmart(
  massId: string | null,
  input: MassInput,
  items: MassItemInput[],
  canWriteDb: boolean,
): Promise<string> {
  if (canWriteDb && !(massId && isLocalMassId(massId))) {
    return saveMass(massId, input, items);
  }
  return saveLocalMass(massId, input, items);
}

/** Tạo/cập nhật lễ + thay toàn bộ mục theo thứ tự mới. Trả về mass id. */
export async function saveMass(
  massId: string | null,
  input: MassInput,
  items: MassItemInput[],
): Promise<string> {
  const c = client();
  let id = massId;
  if (id) {
    const { error } = await c
      .from('masses')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    const { error: eDel } = await c.from('mass_items').delete().eq('mass_id', id);
    if (eDel) throw eDel;
  } else {
    const { data, error } = await c.from('masses').insert(input).select('id').single();
    if (error) throw error;
    id = data.id as string;
  }
  if (items.length) {
    const rows = items.map((it, position) => ({
      mass_id: id,
      position,
      item_type: it.item_type,
      ref_id: it.ref_id,
      custom_slides: it.custom_slides,
      background_id: it.background_id ?? null,
      overrides: it.overrides ?? {},
    }));
    const { error } = await c.from('mass_items').insert(rows);
    if (error) throw error;
  }
  return id as string;
}

export async function deleteMass(id: string): Promise<void> {
  if (isLocalMassId(id)) {
    await deleteLocalMass(id);
    return;
  }
  const { error } = await client().from('masses').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Nhân bản lễ sang ngày mới — tự tính lại tên + màu phụng vụ theo ngày mới
 * (CLAUDE.md mục 5). Trả về id lễ mới.
 */
export async function duplicateMass(id: string, newDateISO: string): Promise<string> {
  const bundle = await getMassBundle(id);
  const day = getLiturgicalDay(
    new Date(`${newDateISO}T12:00:00`),
    calendarOptions(await getSettings()),
  );
  return saveMass(
    null,
    {
      mass_date: newDateISO,
      title: `${day.title} — Năm ${day.cycle}`,
      liturgical_color: day.color,
      poster_path: bundle.mass.poster_path,
      notes: bundle.mass.notes,
    },
    bundle.items.map((it) => ({
      item_type: it.item_type,
      ref_id: it.ref_id,
      custom_slides: it.custom_slides,
      background_id: it.background_id,
      overrides: it.overrides ?? {},
    })),
  );
}
