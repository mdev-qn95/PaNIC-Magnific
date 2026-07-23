/**
 * MassSnapshot + protocol trình chiếu 2 cửa sổ (CLAUDE.md mục 3, 5).
 * Snapshot resolve toàn bộ lễ thành một object — trình chiếu không phụ thuộc
 * việc ai đó sửa bài hát giữa chừng. (Phase 2 sẽ lưu snapshot vào IndexedDB.)
 */

import { listBackgrounds, publicUrl } from './backgrounds';
import { getPrayer } from './prayers';
import { getResponsorial, PART_TITLE, slidesForPart } from './responsorials';
import { getSong } from './songs';
import { getLiturgicalDay, type LiturgicalColor } from './liturgical-calendar';
import { getMassBundle } from './masses';
import { calendarOptions, getSettings } from './settings';
import { splitLyrics } from './slide-splitter';
import { SONG_CATEGORY_LABEL, type Background, type OverrideSlide, type Prayer, type Song } from './types';

/* ---------------- protocol (BroadcastChannel `magnific-{massId}`) ---------------- */

export type PresentMessage =
  | { type: 'GOTO'; index: number }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'BLACK'; on: boolean }
  | { type: 'REQUEST_STATE' } // screen mới mở xin state
  | { type: 'STATE'; index: number; black: boolean };

export function channelName(massId: string): string {
  return `magnific-${massId}`;
}

/* ---------------- snapshot ---------------- */

export interface SlideBg {
  url: string;
  focalX: number;
  focalY: number;
}

export interface SnapshotSlide {
  kind: 'poster' | 'content' | 'blank';
  title?: string;
  lines?: string[];
  isChorus?: boolean;
  /** Nhãn tag góc trên phải (như "ĐK"): "Đáp ca", "Tung hô Tin Mừng"… */
  badge?: string;
  /** Hệ số cỡ chữ do người dùng chọn cho mục (mục 5). Mặc định 1. */
  fontScale?: number;
  /** Ảnh nền đã resolve (nền riêng của mục, hoặc nền theo mùa, hoặc poster). */
  background?: SlideBg | null;
  /** Nhãn hiện trong lưới presenter: "Nhập lễ · Hãy Đến Tung Hô Chúa" */
  itemLabel: string;
}

export interface MassSnapshot {
  massId: string;
  massTitle: string;
  massDate: string;
  color: LiturgicalColor;
  /** Bộ slide chính — control & screen đồng bộ index trên bộ này. */
  landscape: SnapshotSlide[];
  /**
   * Bộ chia lại cho tivi dọc (6 dòng). Phase 1 CHƯA dùng để render vì số slide
   * hai bộ khác nhau sẽ lệch index giữa control/screen — màn dọc hiện render
   * bộ landscape với typography dọc + auto-fit. Giữ lại cho Phase 2 (map index).
   */
  portrait: SnapshotSlide[];
}

type BuildOrientation = 'landscape' | 'portrait';

function songSlides(
  song: Song,
  orientation: BuildOrientation,
  maxLandscape: number,
  maxPortrait: number,
): SnapshotSlide[] {
  const label = `${SONG_CATEGORY_LABEL[song.category]} · ${song.title}`;
  // Chia lại từ lyrics_raw cho CẢ HAI hướng (splitLyrics tự lặp điệp khúc theo từng
  // phiên khúc — biết ranh giới phiên khúc nhờ dòng trống). Bảo đảm ĐK lặp nhất quán
  // ngang lẫn dọc, khác nhau chỉ ở số dòng/slide. (Muốn ngắt tay: dùng override cấp mục.)
  const raw = splitLyrics(song.lyrics_raw, {
    maxLines: orientation === 'landscape' ? maxLandscape : maxPortrait,
  });
  // Không hiện tên bài hát trên slide — cộng đoàn hát theo lời, tên bài không cần thiết
  return raw.map((s) => ({
    kind: 'content' as const,
    lines: s.lines,
    isChorus: s.is_chorus,
    itemLabel: label,
  }));
}

function prayerSlides(prayer: Prayer, orientation: BuildOrientation, maxPortrait: number): SnapshotSlide[] {
  const raw =
    orientation === 'landscape'
      ? prayer.slides
      : splitLyrics(prayer.content_raw, { maxLines: maxPortrait, autoRepeatChorus: false });
  return raw.map((s, i) => ({
    kind: 'content' as const,
    // Tên kinh là tag góc phải ở slide đầu (giống ĐK / Đáp ca), không chiếm chỗ nội dung
    badge: i === 0 ? prayer.title : undefined,
    lines: s.lines,
    itemLabel: prayer.title,
  }));
}

/* ---------------- trình chiếu nhanh 1 mục (bài hát / kinh / đáp ca-tung hô) ----------------
 * Cho phép chiếu ngay một mục trong thư viện mà không cần tạo lễ. Dùng id có tiền tố
 * `quick-<kind>-<uuid>` để tái dùng nguyên bộ route /present/[id]/* (channel, control, screen).
 * Giống cách local-masses dùng tiền tố `local-`. */

export type QuickKind = 'song' | 'prayer' | 'resp';
const QUICK_PREFIX = 'quick-';

export const quickPresentId = (kind: QuickKind, id: string): string => `${QUICK_PREFIX}${kind}-${id}`;
export const isQuickId = (id: string): boolean => id.startsWith(QUICK_PREFIX);

function parseQuickId(quickId: string): { kind: string; id: string } {
  const body = quickId.slice(QUICK_PREFIX.length); // 'song-<uuid>'
  const dash = body.indexOf('-');
  return { kind: body.slice(0, dash), id: body.slice(dash + 1) };
}

/** Trang quay về khi đóng trình chiếu nhanh (không có lễ để về). */
export function quickBackHref(quickId: string): string {
  const { kind } = parseQuickId(quickId);
  return kind === 'song' ? '/songs' : kind === 'prayer' ? '/prayers' : '/responsorials';
}

async function buildQuickSnapshot(quickId: string): Promise<MassSnapshot> {
  const { kind, id } = parseQuickId(quickId);
  const settings = await getSettings();
  const maxLandscape = settings.max_lines_landscape;
  const maxPortrait = settings.max_lines_portrait;
  const base = {
    massId: quickId,
    massDate: new Date().toISOString().slice(0, 10),
    color: 'xanh' as LiturgicalColor,
  };

  if (kind === 'song') {
    const s = await getSong(id);
    return {
      ...base,
      massTitle: s.title,
      landscape: songSlides(s, 'landscape', maxLandscape, maxPortrait),
      portrait: songSlides(s, 'portrait', maxLandscape, maxPortrait),
    };
  }
  if (kind === 'prayer') {
    const p = await getPrayer(id);
    return {
      ...base,
      massTitle: p.title,
      landscape: prayerSlides(p, 'landscape', maxPortrait),
      portrait: prayerSlides(p, 'portrait', maxPortrait),
    };
  }
  if (kind === 'resp') {
    const r = await getResponsorial(id);
    const slides: SnapshotSlide[] = (['dap_ca', 'tung_ho'] as const).flatMap((part) =>
      slidesForPart(r, part).map((sl, i): SnapshotSlide => ({
        kind: 'content',
        badge: i === 0 ? PART_TITLE[part] : undefined,
        lines: sl.lines,
        itemLabel: `${PART_TITLE[part]} · ${r.occasion}`,
      })),
    );
    return { ...base, massTitle: r.occasion, landscape: slides, portrait: slides };
  }
  throw new Error(`Loại trình chiếu nhanh không hợp lệ: ${kind}`);
}

export async function buildSnapshot(massId: string): Promise<MassSnapshot> {
  if (isQuickId(massId)) return buildQuickSnapshot(massId);
  const { mass, items, songs, prayers, responsorials } = await getMassBundle(massId);
  const settings = await getSettings();
  const maxLandscape = settings.max_lines_landscape;
  const maxPortrait = settings.max_lines_portrait;

  // Resolve nền: background_id của mục → ảnh đó; null → ảnh đầu tiên tag đúng mùa
  const day = getLiturgicalDay(new Date(`${mass.mass_date}T12:00:00`), calendarOptions(settings));
  let allBgs: Background[] = [];
  try {
    allBgs = await listBackgrounds();
  } catch {
    /* chưa chạy storage.sql — trình chiếu vẫn hoạt động với nền theme */
  }
  const bgById = new Map(allBgs.map((b) => [b.id, b]));
  const seasonBg = allBgs.find((b) => b.season === day.season) ?? null;
  const toSlideBg = (b: Background | null): SlideBg | null =>
    b ? { url: publicUrl(b.storage_path), focalX: b.focal_x, focalY: b.focal_y } : null;
  const itemBg = (backgroundId: string | null): SlideBg | null =>
    toSlideBg(backgroundId ? (bgById.get(backgroundId) ?? null) : seasonBg);
  /** Ảnh poster theo TỪNG mục; dữ liệu cũ lưu ở cấp lễ nên vẫn đọc làm dự phòng. */
  const posterBgOf = (it: { overrides?: { poster_path?: string | null } }): SlideBg | null => {
    const path = it.overrides?.poster_path ?? mass.poster_path;
    return path ? { url: publicUrl(path), focalX: 0.5, focalY: 0.5 } : null;
  };

  /** Bộ slide người dùng đã chỉnh tay (tách/gộp) cho riêng mục lễ này. */
  const fromOverride = (ov: OverrideSlide[], label: string, bg: SlideBg | null): SnapshotSlide[] =>
    ov.map((sl) => ({
      kind: 'content' as const,
      lines: sl.lines,
      isChorus: sl.is_chorus,
      badge: sl.badge,
      itemLabel: label,
      background: bg,
    }));

  const build = (orientation: BuildOrientation): SnapshotSlide[] => {
    const out: SnapshotSlide[] = [];
    for (const it of items) {
      const before = out.length;
      const ov = it.overrides?.slides;
      switch (it.item_type) {
        case 'poster': {
          // Poster có ảnh riêng: ảnh đã thiết kế sẵn chữ → chiếu nguyên ảnh, không overlay text
          const pb = posterBgOf(it);
          out.push(
            pb
              ? { kind: 'poster', background: pb, itemLabel: 'Poster' }
              : { kind: 'poster', title: mass.title, background: itemBg(it.background_id), itemLabel: 'Poster' },
          );
          break;
        }
        case 'blank':
          out.push({ kind: 'blank', itemLabel: 'Trống' });
          break;
        case 'song': {
          const s = it.ref_id ? songs.get(it.ref_id) : undefined;
          if (s) {
            const bg = itemBg(it.background_id);
            const label = `${SONG_CATEGORY_LABEL[s.category]} · ${s.title}`;
            out.push(
              ...(ov?.length
                ? fromOverride(ov, label, bg)
                : songSlides(s, orientation, maxLandscape, maxPortrait).map((sl) => ({ ...sl, background: bg }))),
            );
          }
          break;
        }
        case 'prayer': {
          const p = it.ref_id ? prayers.get(it.ref_id) : undefined;
          if (p) {
            const bg = itemBg(it.background_id);
            out.push(
              ...(ov?.length
                ? fromOverride(ov, p.title, bg)
                : prayerSlides(p, orientation, maxPortrait).map((sl) => ({ ...sl, background: bg }))),
            );
          }
          break;
        }
        case 'dap_ca':
        case 'tung_ho': {
          const r = it.ref_id ? responsorials.get(it.ref_id) : undefined;
          if (r) {
            const bg = itemBg(it.background_id);
            if (ov?.length) {
              out.push(...fromOverride(ov, `${PART_TITLE[it.item_type]} · ${r.occasion}`, bg));
            } else {
              // Nhãn phần ("Đáp ca"/"Tung hô Tin Mừng") là tag góc phải ở slide đầu,
              // không phải tiêu đề chiếm chỗ trong nội dung (giống nhãn ĐK của bài hát)
              slidesForPart(r, it.item_type).forEach((sl, idx) => {
                out.push({
                  kind: 'content',
                  badge: idx === 0 ? sl.title : undefined,
                  lines: sl.lines,
                  background: bg,
                  itemLabel: `${sl.title} · ${r.occasion}`,
                });
              });
            }
          }
          break;
        }
        case 'custom': {
          const slides = it.custom_slides ?? [];
          const bg = itemBg(it.background_id);
          if (ov?.length) {
            out.push(...fromOverride(ov, 'Tùy chỉnh', bg));
          } else if (orientation === 'landscape') {
            out.push(
              ...slides.map((s) => ({
                kind: 'content' as const,
                lines: s.lines,
                background: bg,
                itemLabel: 'Tùy chỉnh',
              })),
            );
          } else {
            const joined = slides.map((s) => s.lines.join('\n')).join('\n\n');
            if (joined.trim()) {
              out.push(
                ...splitLyrics(joined, { maxLines: maxPortrait, autoRepeatChorus: false }).map((s) => ({
                  kind: 'content' as const,
                  lines: s.lines,
                  background: bg,
                  itemLabel: 'Tùy chỉnh',
                })),
              );
            }
          }
          break;
        }
      }
      // Áp hệ số cỡ chữ của mục (mục 5) cho mọi slide vừa sinh của mục này
      const fs = it.overrides?.font_scale;
      if (fs && fs !== 1) {
        for (let i = before; i < out.length; i++) out[i].fontScale = fs;
      }
    }
    return out;
  };

  return {
    massId,
    massTitle: mass.title,
    massDate: mass.mass_date,
    color: mass.liturgical_color,
    landscape: build('landscape'),
    portrait: build('portrait'),
  };
}
