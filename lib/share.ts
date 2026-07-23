/**
 * Xuất/Nhập gói lễ .magnific.json (CLAUDE.md màn #13, Phase 3) — chia sẻ lễ đã
 * soạn giữa các giáo xứ. Gói chứa: lễ + mục, bài hát & kinh liên quan (nội dung
 * đầy đủ), tùy chọn ảnh nền & poster (base64). Chỉ chạy phía client.
 */

import { publicUrl } from './backgrounds';
import { getMassBundle, saveMass, type MassItemInput } from './masses';
import { supabase } from './supabase';
import type {
  Background,
  Mass,
  OverrideSlide,
  PrayerSlide,
  SongCategory,
  SongSlide,
} from './types';

function client() {
  if (!supabase) throw new Error('Chưa cấu hình Supabase.');
  return supabase;
}

/* ---------------- định dạng gói ---------------- */

export interface PackageSong {
  title: string;
  author: string | null;
  category: SongCategory;
  lyrics_raw: string;
  slides: SongSlide[];
}

export interface PackagePrayer {
  title: string;
  content_raw: string;
  slides: PrayerSlide[];
}

export interface PackageBackground {
  season: Background['season'];
  feast_tag: string | null;
  focal_x: number;
  focal_y: number;
  content_type: string | null;
  data_base64: string | null; // null nếu xuất không kèm ảnh
}

export interface PackageItem {
  item_type: 'poster' | 'song' | 'prayer' | 'dap_ca' | 'tung_ho' | 'blank' | 'custom';
  custom_slides: PrayerSlide[] | null;
  song_index: number | null;
  prayer_index: number | null;
  background_index: number | null;
  // Đáp ca: nhận diện lại theo mùa+dịp bên giáo xứ nhận (thư viện đáp ca dùng chung)
  responsorial_season: string | null;
  responsorial_occasion: string | null;
  // Ảnh poster riêng của mục này (mỗi mục Poster một ảnh)
  poster_content_type: string | null;
  poster_data_base64: string | null;
  // Hệ số cỡ chữ của mục (mục 5) — null nếu dùng mặc định
  font_scale?: number | null;
  // Điểm ngắt slide chỉnh tay (tách/gộp) của mục — null nếu dùng tự sinh
  slides_override?: OverrideSlide[] | null;
}

export interface MassPackage {
  format: 'magnific-package';
  version: 1;
  app: string;
  exported_at: string;
  mass: {
    mass_date: string;
    title: string;
    liturgical_color: Mass['liturgical_color'];
    notes: string | null;
  };
  items: PackageItem[];
  songs: PackageSong[];
  prayers: PackagePrayer[];
  backgrounds: PackageBackground[];
  poster: { content_type: string; data_base64: string } | null;
}

/* ---------------- helpers base64 ---------------- */

async function blobToBase64(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res((fr.result as string).split(',')[1] ?? '');
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(b);
  });
}

function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
}

async function fetchAsBase64(url: string): Promise<{ base64: string; type: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return { base64: await blobToBase64(blob), type: blob.type || 'image/jpeg' };
  } catch {
    return null;
  }
}

/* ---------------- xuất ---------------- */

export async function exportMassPackage(
  massId: string,
  includeImages: boolean,
): Promise<MassPackage> {
  const { mass, items, songs, prayers, responsorials } = await getMassBundle(massId);

  const songIds: string[] = [];
  const prayerIds: string[] = [];
  const bgIds: string[] = [];
  for (const it of items) {
    if (it.item_type === 'song' && it.ref_id && !songIds.includes(it.ref_id)) songIds.push(it.ref_id);
    if (it.item_type === 'prayer' && it.ref_id && !prayerIds.includes(it.ref_id)) prayerIds.push(it.ref_id);
    if (it.background_id && !bgIds.includes(it.background_id)) bgIds.push(it.background_id);
  }

  let bgRows: Background[] = [];
  if (bgIds.length) {
    const { data, error } = await client().from('backgrounds').select('*').in('id', bgIds);
    if (error) throw error;
    bgRows = (data ?? []) as Background[];
  }

  const pkgBackgrounds: PackageBackground[] = [];
  for (const id of bgIds) {
    const bg = bgRows.find((b) => b.id === id);
    if (!bg) {
      pkgBackgrounds.push({ season: null, feast_tag: null, focal_x: 0.5, focal_y: 0.5, content_type: null, data_base64: null });
      continue;
    }
    let data: { base64: string; type: string } | null = null;
    if (includeImages) data = await fetchAsBase64(publicUrl(bg.storage_path));
    pkgBackgrounds.push({
      season: bg.season,
      feast_tag: bg.feast_tag,
      focal_x: bg.focal_x,
      focal_y: bg.focal_y,
      content_type: data?.type ?? null,
      data_base64: data?.base64 ?? null,
    });
  }

  let poster: MassPackage['poster'] = null;
  if (includeImages && mass.poster_path) {
    const data = await fetchAsBase64(publicUrl(mass.poster_path));
    if (data) poster = { content_type: data.type, data_base64: data.base64 };
  }

  return {
    format: 'magnific-package',
    version: 1,
    app: 'PaNIC-Magnific',
    exported_at: new Date().toISOString(),
    mass: {
      mass_date: mass.mass_date,
      title: mass.title,
      liturgical_color: mass.liturgical_color,
      notes: mass.notes,
    },
    items: await Promise.all(items.map(async (it) => {
      const isResp = it.item_type === 'dap_ca' || it.item_type === 'tung_ho';
      const resp = isResp && it.ref_id ? responsorials.get(it.ref_id) : undefined;
      const posterPath = it.item_type === 'poster' ? it.overrides?.poster_path : null;
      const posterData = includeImages && posterPath ? await fetchAsBase64(publicUrl(posterPath)) : null;
      return {
        item_type: it.item_type,
        custom_slides: it.custom_slides,
        song_index: it.item_type === 'song' && it.ref_id ? songIds.indexOf(it.ref_id) : null,
        prayer_index: it.item_type === 'prayer' && it.ref_id ? prayerIds.indexOf(it.ref_id) : null,
        background_index: it.background_id ? bgIds.indexOf(it.background_id) : null,
        responsorial_season: resp?.season ?? null,
        responsorial_occasion: resp?.occasion ?? null,
        poster_content_type: posterData?.type ?? null,
        poster_data_base64: posterData?.base64 ?? null,
        font_scale: it.overrides?.font_scale ?? null,
        slides_override: it.overrides?.slides ?? null,
      };
    })),
    songs: songIds.map((id) => {
      const s = songs.get(id)!;
      return { title: s.title, author: s.author, category: s.category, lyrics_raw: s.lyrics_raw, slides: s.slides };
    }),
    prayers: prayerIds.map((id) => {
      const p = prayers.get(id)!;
      return { title: p.title, content_raw: p.content_raw, slides: p.slides };
    }),
    backgrounds: pkgBackgrounds,
    poster,
  };
}

export function downloadPackage(pkg: MassPackage): number {
  const json = JSON.stringify(pkg);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const safe = pkg.mass.title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').toLowerCase();
  a.download = `${pkg.mass.mass_date}-${safe}.magnific.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  return blob.size;
}

/* ---------------- nhập ---------------- */

export function parsePackage(text: string): MassPackage {
  let pkg: MassPackage;
  try {
    pkg = JSON.parse(text) as MassPackage;
  } catch {
    throw new Error('File không phải JSON hợp lệ.');
  }
  if (pkg.format !== 'magnific-package' || !Array.isArray(pkg.items)) {
    throw new Error('File không phải gói lễ .magnific.json.');
  }
  return pkg;
}

export type ConflictDecision = 'keep' | 'overwrite' | 'both';

export interface ImportConflict {
  index: number;
  title: string;
  existingId: string;
}

export interface ImportAnalysis {
  songConflicts: ImportConflict[];
  prayerConflicts: ImportConflict[];
}

/** Tìm bài hát/kinh trùng tên với nội dung trong gói. */
export async function analyzePackage(pkg: MassPackage): Promise<ImportAnalysis> {
  const c = client();
  const songConflicts: ImportConflict[] = [];
  const prayerConflicts: ImportConflict[] = [];
  for (let i = 0; i < pkg.songs.length; i++) {
    const { data } = await c.from('songs').select('id').eq('title', pkg.songs[i].title).limit(1);
    if (data?.length) songConflicts.push({ index: i, title: pkg.songs[i].title, existingId: data[0].id });
  }
  for (let i = 0; i < pkg.prayers.length; i++) {
    const { data } = await c.from('prayers').select('id').eq('title', pkg.prayers[i].title).limit(1);
    if (data?.length) prayerConflicts.push({ index: i, title: pkg.prayers[i].title, existingId: data[0].id });
  }
  return { songConflicts, prayerConflicts };
}

export interface ImportDecisions {
  songs: Record<number, ConflictDecision>;
  prayers: Record<number, ConflictDecision>;
}

/** Nhập gói: tạo bài hát/kinh/ảnh theo quyết định trùng tên, rồi tạo lễ. Trả về massId mới. */
export async function importPackage(
  pkg: MassPackage,
  analysis: ImportAnalysis,
  decisions: ImportDecisions,
): Promise<string> {
  const c = client();

  // 1. Bài hát
  const songIdByIndex = new Map<number, string>();
  for (let i = 0; i < pkg.songs.length; i++) {
    const s = pkg.songs[i];
    const conflict = analysis.songConflicts.find((x) => x.index === i);
    const decision = conflict ? (decisions.songs[i] ?? 'keep') : null;
    if (conflict && decision === 'keep') {
      songIdByIndex.set(i, conflict.existingId);
    } else if (conflict && decision === 'overwrite') {
      const { error } = await c.from('songs')
        .update({ author: s.author, category: s.category, lyrics_raw: s.lyrics_raw, slides: s.slides, updated_at: new Date().toISOString() })
        .eq('id', conflict.existingId);
      if (error) throw error;
      songIdByIndex.set(i, conflict.existingId);
    } else {
      const title = conflict ? `${s.title} (nhập)` : s.title;
      const { data, error } = await c.from('songs')
        .insert({ title, author: s.author, category: s.category, lyrics_raw: s.lyrics_raw, slides: s.slides })
        .select('id').single();
      if (error) throw error;
      songIdByIndex.set(i, data.id);
    }
  }

  // 2. Kinh
  const prayerIdByIndex = new Map<number, string>();
  for (let i = 0; i < pkg.prayers.length; i++) {
    const p = pkg.prayers[i];
    const conflict = analysis.prayerConflicts.find((x) => x.index === i);
    const decision = conflict ? (decisions.prayers[i] ?? 'keep') : null;
    if (conflict && decision === 'keep') {
      prayerIdByIndex.set(i, conflict.existingId);
    } else if (conflict && decision === 'overwrite') {
      const { error } = await c.from('prayers')
        .update({ content_raw: p.content_raw, slides: p.slides })
        .eq('id', conflict.existingId);
      if (error) throw error;
      prayerIdByIndex.set(i, conflict.existingId);
    } else {
      const title = conflict ? `${p.title} (nhập)` : p.title;
      const { data, error } = await c.from('prayers')
        .insert({ title, content_raw: p.content_raw, slides: p.slides, is_seed: false })
        .select('id').single();
      if (error) throw error;
      prayerIdByIndex.set(i, data.id);
    }
  }

  // 3. Ảnh nền (chỉ khi gói kèm ảnh)
  const bgIdByIndex = new Map<number, string>();
  for (let i = 0; i < pkg.backgrounds.length; i++) {
    const b = pkg.backgrounds[i];
    if (!b.data_base64 || !b.content_type) continue;
    const ext = b.content_type.split('/')[1] ?? 'jpg';
    const path = `bg/${crypto.randomUUID()}.${ext}`;
    const { error: eUp } = await c.storage.from('magnific')
      .upload(path, base64ToBlob(b.data_base64, b.content_type), { contentType: b.content_type });
    if (eUp) throw eUp;
    const { data, error } = await c.from('backgrounds')
      .insert({ storage_path: path, season: b.season, feast_tag: b.feast_tag, focal_x: b.focal_x, focal_y: b.focal_y })
      .select('id').single();
    if (error) throw error;
    bgIdByIndex.set(i, data.id);
  }

  // 4. Poster
  let posterPath: string | null = null;
  if (pkg.poster) {
    const ext = pkg.poster.content_type.split('/')[1] ?? 'jpg';
    posterPath = `posters/${crypto.randomUUID()}.${ext}`;
    const { error } = await c.storage.from('magnific')
      .upload(posterPath, base64ToBlob(pkg.poster.data_base64, pkg.poster.content_type), { contentType: pkg.poster.content_type });
    if (error) throw error;
  }

  // 5. Đáp ca: nối lại theo mùa + dịp trong thư viện của giáo xứ nhận (không kèm nội dung trong gói)
  const respIdByKey = new Map<string, string>();
  const respKeys = pkg.items
    .filter((it) => (it.item_type === 'dap_ca' || it.item_type === 'tung_ho') && it.responsorial_occasion)
    .map((it) => it.responsorial_occasion as string);
  if (respKeys.length) {
    const { data } = await c
      .from('responsorials')
      .select('id, season, occasion')
      .in('occasion', respKeys);
    for (const r of data ?? []) respIdByKey.set(`${r.season}||${r.occasion}`, r.id);
  }

  // 6. Ảnh poster riêng của từng mục
  const itemPosterPaths = new Map<number, string>();
  for (let i = 0; i < pkg.items.length; i++) {
    const it = pkg.items[i];
    if (!it.poster_data_base64 || !it.poster_content_type) continue;
    const ext = it.poster_content_type.split('/')[1] ?? 'jpg';
    const path = `posters/${crypto.randomUUID()}.${ext}`;
    const { error } = await c.storage.from('magnific')
      .upload(path, base64ToBlob(it.poster_data_base64, it.poster_content_type), {
        contentType: it.poster_content_type,
      });
    if (error) throw error;
    itemPosterPaths.set(i, path);
  }

  // 7. Lễ + mục
  const items: MassItemInput[] = pkg.items.map((it, idx) => ({
    overrides: {
      ...(it.item_type === 'poster' ? { poster_path: itemPosterPaths.get(idx) ?? null } : {}),
      ...(it.font_scale ? { font_scale: it.font_scale } : {}),
      ...(it.slides_override?.length ? { slides: it.slides_override } : {}),
    },
    item_type: it.item_type,
    ref_id:
      it.item_type === 'song' && it.song_index !== null
        ? (songIdByIndex.get(it.song_index) ?? null)
        : it.item_type === 'prayer' && it.prayer_index !== null
          ? (prayerIdByIndex.get(it.prayer_index) ?? null)
          : (it.item_type === 'dap_ca' || it.item_type === 'tung_ho') && it.responsorial_occasion
            ? (respIdByKey.get(`${it.responsorial_season}||${it.responsorial_occasion}`) ?? null)
            : null,
    custom_slides: it.custom_slides,
    background_id: it.background_index !== null ? (bgIdByIndex.get(it.background_index) ?? null) : null,
  }));

  return saveMass(null, {
    mass_date: pkg.mass.mass_date,
    title: pkg.mass.title,
    liturgical_color: pkg.mass.liturgical_color,
    poster_path: posterPath,
    notes: pkg.mass.notes,
  }, items);
}
