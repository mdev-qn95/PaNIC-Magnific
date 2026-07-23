'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BookOpenText, Copy, GripVertical, HardDrive, Image as ImageIcon, Music, Plus, ScrollText, Square, Type, Upload, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SlideRenderer, { type SlideBackground } from '@/components/SlideRenderer';
import LibraryPickerModal from '@/components/LibraryPickerModal';
import ResponsorialPickerModal from '@/components/ResponsorialPickerModal';
import DatePicker from '@/components/ui/DatePicker';
import UnsavedGuard from '@/components/ui/UnsavedGuard';
import { listBackgrounds, publicUrl, uploadPoster } from '@/lib/backgrounds';
import { COLOR_LABEL, SEASON_LABEL, getLiturgicalDay, type CalendarOptions } from '@/lib/liturgical-calendar';
import { useAuth } from '@/components/AuthProvider';
import { isLocalMassId } from '@/lib/local-masses';
import { saveMassSmart, type MassBundle, type MassItemInput } from '@/lib/masses';
import {
  slidesForPart,
  suggestForDay,
  type Responsorial,
  type ResponsorialSeason,
} from '@/lib/responsorials';
import { calendarOptions, getSettings } from '@/lib/settings';
import { splitLyrics } from '@/lib/slide-splitter';
import {
  SONG_CATEGORY_LABEL,
  type Background,
  type Mass,
  type MassItemType,
  type OverrideSlide,
  type Prayer,
  type PrayerSlide,
  type Song,
} from '@/lib/types';

// Mùa lịch phụng vụ → mùa của thư viện đáp ca (để lọc/gợi ý)
const LIT_TO_RESP_SEASON: Record<string, ResponsorialSeason> = {
  vong: 'vong', giang_sinh: 'giang_sinh', chay: 'chay', phuc_sinh: 'phuc_sinh', thuong_nien: 'thuong_nien',
};

const DEFAULT_ML = { landscape: 4, portrait: 6 };
type Orientation = 'landscape' | 'portrait';

// Cỡ chữ cho mục (mục 5): người dùng chọn 1 trong 4 mức, áp cho cả mục.
const FONT_SCALES: { v: number; label: string }[] = [
  { v: 0.85, label: 'Nhỏ' },
  { v: 1, label: 'Vừa' },
  { v: 1.15, label: 'Lớn' },
  { v: 1.3, label: 'Rất lớn' },
];
// Chỉ mục có chữ mới cho chỉnh cỡ (poster ảnh / slide trống không cần)
const FONT_SCALABLE = new Set<MassItemType>(['song', 'prayer', 'dap_ca', 'tung_ho', 'custom']);

interface EditorItem {
  key: string;
  item_type: MassItemType;
  ref_id: string | null;
  custom_raw: string; // với item 'custom'
  background_id: string | null; // null = nền theo mùa
  poster_path: string | null; // ảnh riêng của mục Poster này
  font_scale: number; // hệ số cỡ chữ của mục (1 = mặc định)
  slides_override: OverrideSlide[] | null; // điểm ngắt chỉnh tay; null = tự sinh
  song?: Song;
  prayer?: Prayer;
  responsorial?: Responsorial;
}

let keySeq = 0;
const nextKey = () => `it-${++keySeq}`;

function itemMeta(
  it: EditorItem,
  mlLandscape = 4,
): { icon: React.ReactNode; name: string; sub: string; count: number } {
  switch (it.item_type) {
    case 'poster':
      return { icon: <ImageIcon size={15} />, name: 'Poster', sub: 'Trang bìa lễ', count: 1 };
    case 'blank':
      return { icon: <Square size={15} />, name: 'Slide trống', sub: 'Đèn đen mềm', count: 1 };
    case 'song':
      return {
        icon: <Music size={15} />,
        name: it.song?.title ?? '(bài hát đã xóa)',
        sub: it.song ? `${SONG_CATEGORY_LABEL[it.song.category]}${it.song.author ? ' · ' + it.song.author : ''}` : 'Bài hát',
        // đếm theo lyrics_raw (có lặp điệp khúc, giống khi chiếu); override tay thì theo số đã chỉnh
        count: it.slides_override?.length ?? (it.song
          ? splitLyrics(it.song.lyrics_raw, { maxLines: mlLandscape }).length
          : 0),
      };
    case 'prayer':
      return {
        icon: <BookOpenText size={15} />,
        name: it.prayer?.title ?? '(kinh đã xóa)',
        sub: 'Kinh nguyện',
        count: it.slides_override?.length ?? it.prayer?.slides.length ?? 0,
      };
    case 'dap_ca':
      return {
        icon: <ScrollText size={15} />,
        name: it.responsorial?.occasion ?? '(đáp ca đã xóa)',
        sub: 'Đáp ca',
        count: it.slides_override?.length ?? (it.responsorial ? slidesForPart(it.responsorial, 'dap_ca').length : 0),
      };
    case 'tung_ho':
      return {
        icon: <ScrollText size={15} />,
        name: it.responsorial?.occasion ?? '(tung hô đã xóa)',
        sub: 'Tung hô Tin Mừng',
        count: it.slides_override?.length ?? (it.responsorial ? slidesForPart(it.responsorial, 'tung_ho').length : 0),
      };
    case 'custom': {
      const n = it.custom_raw.trim()
        ? splitLyrics(it.custom_raw, { maxLines: mlLandscape, autoRepeatChorus: false }).length
        : 0;
      return {
        icon: <Type size={15} />,
        name: 'Slide tùy chỉnh',
        sub: 'Nội dung tự nhập',
        count: it.slides_override?.length ?? n,
      };
    }
  }
}

function SortableRow({
  item,
  mlLandscape,
  selected,
  onSelect,
  onDuplicate,
  onRemove,
}: {
  item: EditorItem;
  mlLandscape: number;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.key,
  });
  const meta = itemMeta(item, mlLandscape);
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        borderColor: selected ? 'var(--primary)' : 'var(--line)',
        boxShadow: selected ? '0 0 0 3px var(--primary-soft)' : 'none',
      }}
      className="mb-2 flex cursor-pointer items-center gap-2.5 rounded-[14px] border bg-surface px-3 py-2.5"
      onClick={onSelect}
    >
      <button
        className="cursor-grab touch-none text-ink-3 hover:text-ink"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        data-tip="Kéo để sắp xếp"
      >
        <GripVertical size={16} />
      </button>
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-surface-2 text-ink-2">
        {meta.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold">{meta.name}</div>
        <div className="truncate text-[11px] text-ink-2">{meta.sub}</div>
      </div>
      <span className="text-[11px] text-ink-3">{meta.count} slide</span>
      <button
        className="text-ink-3 hover:text-primary"
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
        data-tip="Nhân bản mục này"
      >
        <Copy size={14} />
      </button>
      <button
        className="text-ink-3 hover:text-[var(--lit-do)]"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        data-tip="Bỏ mục này"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export default function MassEditor({
  bundle,
  draftFrom,
  draftDate,
}: {
  bundle?: MassBundle;
  /** Nhân bản: nội dung nguồn để tạo lễ MỚI (chưa lưu) — không ghi DB tới khi bấm Lưu. */
  draftFrom?: MassBundle;
  draftDate?: string;
}) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const mass: Mass | undefined = bundle?.mass;
  const isDraft = Boolean(draftFrom) && !mass;
  // Nguồn nội dung: lễ đang sửa, hoặc lễ nguồn khi nhân bản
  const src = bundle ?? draftFrom;
  /** Lễ này sẽ lưu ở đâu: DB chung (admin) hay trên máy (người dùng thường). */
  const savesLocally = !isAdmin || (mass ? isLocalMassId(mass.id) : false);

  const todayISO = new Date().toISOString().slice(0, 10);
  const [dateISO, setDateISO] = useState(mass?.mass_date ?? draftDate ?? todayISO);
  const [title, setTitle] = useState(mass?.title ?? '');
  // Nhân bản: để trống titleTouched → tên + màu tự tính lại theo ngày mới (như nhân bản cũ)
  const [titleTouched, setTitleTouched] = useState(Boolean(mass));
  const [color, setColor] = useState<Mass['liturgical_color']>(mass?.liturgical_color ?? 'xanh');
  const [items, setItems] = useState<EditorItem[]>(() =>
    (src?.items ?? []).map((it) => ({
      key: nextKey(),
      item_type: it.item_type,
      ref_id: it.ref_id,
      custom_raw: (it.custom_slides ?? []).map((s) => s.lines.join('\n')).join('\n\n'),
      background_id: it.background_id,
      // dữ liệu cũ lưu poster ở cấp lễ → gán cho mục Poster để không mất ảnh
      poster_path: it.overrides?.poster_path ?? (it.item_type === 'poster' ? (bundle?.mass.poster_path ?? null) : null),
      font_scale: it.overrides?.font_scale ?? 1,
      slides_override: it.overrides?.slides ?? null,
      song: it.ref_id ? src?.songs.get(it.ref_id) : undefined,
      prayer: it.ref_id ? src?.prayers.get(it.ref_id) : undefined,
      responsorial: it.ref_id ? src?.responsorials.get(it.ref_id) : undefined,
    })),
  );
  // Còn thay đổi chưa lưu? Bản nhân bản coi như bẩn ngay từ đầu (chưa được lưu).
  const [dirty, setDirty] = useState(isDraft);
  const mutateItems = (updater: (arr: EditorItem[]) => EditorItem[]) => {
    setDirty(true);
    setItems(updater);
  };
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const posterFileRef = useRef<HTMLInputElement>(null);
  const [bgs, setBgs] = useState<Background[]>([]);
  const [bgPickerOpen, setBgPickerOpen] = useState(false);
  useEffect(() => {
    listBackgrounds()
      .then(setBgs)
      .catch(() => setBgs([]));
  }, []);
  const [selectedKey, setSelectedKey] = useState<string | null>(items[0]?.key ?? null);
  const [picker, setPicker] = useState<'song' | 'prayer' | null>(null);
  // Đáp ca và Tung hô là 2 mục riêng — picker biết đang chọn phần nào
  const [respPicker, setRespPicker] = useState<'dap_ca' | 'tung_ho' | null>(null);
  const [suggestedResp, setSuggestedResp] = useState<Responsorial[]>([]);
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ml, setMl] = useState(DEFAULT_ML);
  const [calOpts, setCalOpts] = useState<CalendarOptions>({});
  useEffect(() => {
    getSettings().then((s) => {
      setMl({ landscape: s.max_lines_landscape, portrait: s.max_lines_portrait });
      setCalOpts(calendarOptions(s));
    });
  }, []);

  // Chọn ngày → tự điền tên + màu từ lịch (người dùng sửa được — không ghi đè khi đã sửa tay)
  const dayInfo = useMemo(
    () => getLiturgicalDay(new Date(`${dateISO}T12:00:00`), calOpts),
    [dateISO, calOpts],
  );
  useEffect(() => {
    if (!titleTouched) setTitle(`${dayInfo.title} — Năm ${dayInfo.cycle}`);
    setColor(dayInfo.color);
  }, [dayInfo, titleTouched]);

  // Gợi ý đáp ca theo ngày lễ: Chúa Nhật (tuần + năm A/B/C), ngày thường (thứ + tuần
  // + năm lẻ/chẵn), lễ trọng kính Chúa (theo tên lễ), lễ các Thánh (theo ngày cố định).
  const respSeason = LIT_TO_RESP_SEASON[dayInfo.season];
  useEffect(() => {
    const d = new Date(`${dateISO}T12:00:00`);
    let alive = true;
    suggestForDay({
      month: d.getMonth() + 1,
      dayOfMonth: d.getDate(),
      dayOfWeek: d.getDay(),
      season: respSeason ?? null,
      week: dayInfo.week ?? null,
      cycle: dayInfo.cycle,
      weekdayCycle: dayInfo.weekdayCycle,
      title: dayInfo.title,
    })
      .then((rs) => alive && setSuggestedResp(rs))
      .catch(() => alive && setSuggestedResp([]));
    return () => { alive = false; };
  }, [dateISO, dayInfo, respSeason]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    mutateItems((arr) => {
      const from = arr.findIndex((i) => i.key === active.id);
      const to = arr.findIndex((i) => i.key === over.id);
      return arrayMove(arr, from, to);
    });
  };

  const addItem = (partial: Omit<EditorItem, 'key' | 'background_id' | 'poster_path' | 'font_scale' | 'slides_override'>) => {
    const it: EditorItem = { background_id: null, poster_path: null, font_scale: 1, slides_override: null, ...partial, key: nextKey() };
    mutateItems((arr) => [...arr, it]);
    setSelectedKey(it.key);
  };

  /** Nhân bản mục: chèn bản sao ngay sau mục gốc, giữ nguyên mọi tùy chỉnh. */
  const duplicateItem = (key: string) => {
    mutateItems((arr) => {
      const i = arr.findIndex((x) => x.key === key);
      if (i < 0) return arr;
      const copy: EditorItem = { ...arr[i], key: nextKey() };
      const next = [...arr];
      next.splice(i + 1, 0, copy);
      setSelectedKey(copy.key);
      return next;
    });
  };

  const selected = items.find((i) => i.key === selectedKey) ?? null;

  // Nền của mục: background_id → ảnh đó; null → ảnh đầu tiên tag đúng mùa của lễ
  const seasonBg = useMemo(
    () => bgs.find((b) => b.season === dayInfo.season) ?? null,
    [bgs, dayInfo.season],
  );
  const toSlideBg = (b: Background | null): SlideBackground | null =>
    b ? { url: publicUrl(b.storage_path), focalX: b.focal_x, focalY: b.focal_y } : null;
  const selectedBg: SlideBackground | null = selected
    ? selected.item_type === 'poster' && selected.poster_path
      ? { url: publicUrl(selected.poster_path), focalX: 0.5, focalY: 0.5 }
      : selected.item_type === 'blank'
        ? null
        : toSlideBg(selected.background_id ? (bgs.find((b) => b.id === selected.background_id) ?? null) : seasonBg)
    : null;
  const posterHasImage = Boolean(selected?.poster_path);

  const setPosterOnSelected = (path: string | null) => {
    if (!selected) return;
    mutateItems((arr) => arr.map((x) => (x.key === selected.key ? { ...x, poster_path: path } : x)));
  };

  /** Upload ảnh cho ĐÚNG mục Poster đang chọn (mỗi poster một ảnh riêng). */
  const onPosterFile = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f || !selected) return;
    setUploadingPoster(true);
    setError(null);
    try {
      const path = await uploadPoster(f);
      mutateItems((arr) => arr.map((x) => (x.key === selected.key ? { ...x, poster_path: path } : x)));
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : 'Upload thất bại.') +
          ' — đã chạy supabase/storage.sql chưa?',
      );
    } finally {
      setUploadingPoster(false);
      if (posterFileRef.current) posterFileRef.current.value = '';
    }
  };

  // Slide preview của mục đang chọn theo hướng
  const previewSlides = useMemo((): {
    title?: string; lines?: string[]; isChorus?: boolean; badge?: string;
  }[] => {
    if (!selected) return [];
    // Đã chỉnh tay (tách/gộp) → dùng nguyên danh sách, không tự chia lại theo hướng
    if (selected.slides_override) {
      return selected.slides_override.map((s) => ({
        lines: s.lines, isChorus: s.is_chorus, badge: s.badge,
      }));
    }
    const max = ml[orientation];
    switch (selected.item_type) {
      case 'poster':
        return [{ title, lines: [COLOR_LABEL[color] + ' · ' + dayInfo.seasonTitle] }];
      case 'blank':
        return [{}];
      case 'song': {
        const s = selected.song;
        if (!s) return [];
        // Chia lại từ lyrics_raw (tự lặp điệp khúc) — khớp đúng khi chiếu (present.ts)
        return splitLyrics(s.lyrics_raw, { maxLines: max }).map((sl) => ({
          lines: sl.lines,
          isChorus: sl.is_chorus,
        }));
      }
      case 'prayer': {
        const p = selected.prayer;
        if (!p) return [];
        const raw = orientation === 'landscape'
          ? p.slides
          : splitLyrics(p.content_raw, { maxLines: max, autoRepeatChorus: false });
        return raw.map((sl, i) => ({ badge: i === 0 ? p.title : undefined, lines: sl.lines }));
      }
      case 'dap_ca':
      case 'tung_ho': {
        const r = selected.responsorial;
        if (!r) return [];
        return slidesForPart(r, selected.item_type).map((sl, idx) => ({
          badge: idx === 0 ? sl.title : undefined,
          lines: sl.lines,
        }));
      }
      case 'custom':
        if (!selected.custom_raw.trim()) return [];
        return splitLyrics(selected.custom_raw, { maxLines: max, autoRepeatChorus: false }).map(
          (sl) => ({ lines: sl.lines }),
        );
    }
  }, [selected, orientation, title, color, dayInfo, ml]);

  // Tách/gộp slide cho riêng mục lễ (chọn cỡ chữ lớn mà vẫn vừa khung — góp ý người dùng).
  // Lần đầu chỉnh: "đóng băng" bộ đang xem thành override rồi thao tác trên đó.
  const canEditBreaks = selected != null && FONT_SCALABLE.has(selected.item_type);
  const seedBreaks = (): OverrideSlide[] =>
    selected!.slides_override ??
    previewSlides.map((s) => ({ lines: s.lines ?? [], is_chorus: s.isChorus, badge: s.badge }));
  const setBreaks = (next: OverrideSlide[]) =>
    mutateItems((arr) => arr.map((x) => (x.key === selected!.key ? { ...x, slides_override: next } : x)));

  const mergeSlideUp = (i: number) => {
    if (i === 0) return;
    const cur = seedBreaks().map((s) => ({ ...s, lines: [...s.lines] }));
    cur[i - 1].lines.push(...cur[i].lines);
    cur.splice(i, 1);
    setBreaks(cur);
  };
  const splitSlide = (i: number) => {
    const cur = seedBreaks();
    const s = cur[i];
    if (s.lines.length < 2) return;
    const at = Math.ceil(s.lines.length / 2);
    const next = cur.map((x) => ({ ...x, lines: [...x.lines] }));
    // Nửa sau bỏ badge (nhãn "ĐK"/"Đáp ca"/tên kinh chỉ ở slide đầu của phần)
    next.splice(i, 1,
      { ...s, lines: s.lines.slice(0, at) },
      { ...s, lines: s.lines.slice(at), badge: undefined },
    );
    setBreaks(next);
  };
  const resetBreaks = () =>
    mutateItems((arr) => arr.map((x) => (x.key === selected!.key ? { ...x, slides_override: null } : x)));

  // Lưu (không điều hướng) — trả về true nếu thành công. Dùng cho nút Lưu và UnsavedGuard.
  const persist = async (): Promise<boolean> => {
    const t = title.trim().normalize('NFC');
    if (!t) { setError('Nhập tên lễ.'); return false; }
    setSaving(true);
    setError(null);
    const rows: MassItemInput[] = items.map((it) => ({
      item_type: it.item_type,
      ref_id:
        it.item_type === 'song' || it.item_type === 'prayer'
          || it.item_type === 'dap_ca' || it.item_type === 'tung_ho'
          ? it.ref_id
          : null,
      background_id: it.background_id,
      overrides: {
        ...(it.item_type === 'poster' ? { poster_path: it.poster_path } : {}),
        ...(it.font_scale !== 1 ? { font_scale: it.font_scale } : {}),
        ...(it.slides_override ? { slides: it.slides_override } : {}),
      },
      custom_slides:
        it.item_type === 'custom' && it.custom_raw.trim()
          ? splitLyrics(it.custom_raw, { maxLines: ml.landscape, autoRepeatChorus: false }).map(
              (s): PrayerSlide => ({ lines: s.lines }),
            )
          : null,
    }));
    try {
      await saveMassSmart(mass?.id ?? null, {
        mass_date: dateISO,
        title: t,
        liturgical_color: color,
        // poster giờ lưu theo từng mục (overrides) — giữ null ở cấp lễ
        poster_path: null,
      }, rows, isAdmin);
      setDirty(false);
      setSaving(false);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại — thử lại.');
      setSaving(false);
      return false;
    }
  };

  // Nút Lưu: lưu xong về danh sách lễ
  const save = async () => {
    if (await persist()) {
      router.push('/masses');
      router.refresh();
    }
  };

  const totalSlides = items.reduce((n, it) => n + itemMeta(it, ml.landscape).count, 0);

  return (
    <>
      <UnsavedGuard
        dirty={dirty}
        title="Lễ chưa được lưu"
        message={
          isDraft
            ? 'Bản nhân bản này chưa được lưu. Lưu lại trước khi rời trang?'
            : 'Bạn có thay đổi chưa lưu trong lễ này. Lưu lại trước khi rời trang?'
        }
        onSave={persist}
        onDiscard={() => {}}
      />
      <PageHeader title={mass ? 'Sửa lễ' : (isDraft ? 'Nhân bản lễ' : 'Soạn lễ mới')} sub={title || '—'}>
        <Link href="/masses" className="btn">Hủy</Link>
        {mass && (
          <>
            <Link href={`/masses/${mass.id}/preview`} className="btn">Xem trước</Link>
            <Link href={`/present/${mass.id}/control`} className="btn"
              data-tip="Trình chiếu bản đã lưu — nhớ Lưu lễ trước nếu vừa sửa">
              ▶ Trình chiếu
            </Link>
          </>
        )}
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Đang lưu…' : savesLocally ? 'Lưu vào máy' : 'Lưu lễ'}
        </button>
      </PageHeader>

      <div className="flex-1 overflow-auto px-7 py-5">
        {error && (
          <div className="mb-4 rounded-token-2 border px-4 py-2.5 text-[13px]"
            style={{ borderColor: 'var(--lit-do)', color: 'var(--lit-do)', background: 'var(--surface)' }}>
            {error}
          </div>
        )}

        {savesLocally && (
          <div className="mb-4 flex items-center gap-2 rounded-token-2 border border-line bg-surface-2 px-4 py-2.5 text-[12.5px] text-ink-2">
            <HardDrive size={15} className="shrink-0" />
            <span>
              <b>Lễ này lưu trên máy bạn</b>, không lưu lên hệ thống chung — chiếu, xuất
              PowerPoint và dùng offline vẫn đầy đủ. Muốn lưu chung cho cả giáo xứ,
              hãy <Link href="/login" className="font-bold text-primary">đăng nhập quản trị</Link>.
            </span>
          </div>
        )}

        <div className="mb-5 flex flex-wrap items-end gap-3.5">
          <div className="w-44">
            <label className="field-label">Ngày lễ</label>
            <DatePicker value={dateISO} onChange={(v) => { setDirty(true); setDateISO(v); }} />
          </div>
          <div className="min-w-[280px] flex-1">
            <label className="field-label">
              Tên lễ <span className="font-normal text-ink-3">(tự điền từ lịch phụng vụ — sửa được)</span>
            </label>
            <input className="field" value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleTouched(true); setDirty(true); }} />
          </div>
          <div>
            <label className="field-label">Màu phụng vụ</label>
            <span className="inline-flex items-center gap-2 rounded-token-2 border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--lit-${color})` }} />
              {COLOR_LABEL[color]} — {dayInfo.seasonTitle}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[400px_1fr]">
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <b className="font-display text-[13px] font-semibold text-heading">
                Cấu trúc lễ · {items.length} mục · {totalSlides} slide
              </b>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <button className="btn btn-sm" onClick={() => setPicker('song')}>
                <Plus size={13} /> Bài hát
              </button>
              <button className="btn btn-sm" onClick={() => setPicker('prayer')}>
                <Plus size={13} /> Kinh
              </button>
              <button className="btn btn-sm" onClick={() => setRespPicker('dap_ca')}
                data-tip={suggestedResp.length ? `Có ${suggestedResp.length} gợi ý cho ngày lễ này` : undefined}>
                <Plus size={13} /> Đáp ca{suggestedResp.length ? ' ⭐' : ''}
              </button>
              <button className="btn btn-sm" onClick={() => setRespPicker('tung_ho')}
                data-tip={suggestedResp.length ? `Có ${suggestedResp.length} gợi ý cho ngày lễ này` : undefined}>
                <Plus size={13} /> Tung hô{suggestedResp.length ? ' ⭐' : ''}
              </button>
              <button className="btn btn-sm"
                onClick={() => addItem({ item_type: 'poster', ref_id: null, custom_raw: '' })}>
                <Plus size={13} /> Poster
              </button>
              <button className="btn btn-sm"
                onClick={() => addItem({ item_type: 'blank', ref_id: null, custom_raw: '' })}>
                <Plus size={13} /> Trống
              </button>
              <button className="btn btn-sm"
                onClick={() => addItem({ item_type: 'custom', ref_id: null, custom_raw: '' })}>
                <Plus size={13} /> Tùy chỉnh
              </button>
            </div>

            {items.length === 0 ? (
              <div className="card px-5 py-10 text-center text-[13px] text-ink-3">
                Thêm mục đầu tiên — thường là Poster hoặc bài Ca nhập lễ
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={items.map((i) => i.key)} strategy={verticalListSortingStrategy}>
                  {items.map((it) => (
                    <SortableRow
                      key={it.key}
                      item={it}
                      mlLandscape={ml.landscape}
                      selected={it.key === selectedKey}
                      onSelect={() => setSelectedKey(it.key)}
                      onDuplicate={() => duplicateItem(it.key)}
                      onRemove={() => {
                        mutateItems((arr) => arr.filter((x) => x.key !== it.key));
                        if (selectedKey === it.key) setSelectedKey(null);
                      }}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <b className="font-display text-[13px] font-semibold text-heading">
                {selected ? `Preview: ${itemMeta(selected).name}` : 'Chọn một mục để xem preview'}
              </b>
              <div className="flex gap-1.5">
                <button className={`chip ${orientation === 'landscape' ? 'chip-on' : ''}`}
                  onClick={() => setOrientation('landscape')}>Ngang</button>
                <button className={`chip ${orientation === 'portrait' ? 'chip-on' : ''}`}
                  onClick={() => setOrientation('portrait')}>Dọc</button>
              </div>
            </div>

            {selected && selected.item_type !== 'blank' && (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px] text-ink-2">
                {selected.item_type === 'poster' ? (
                  <>
                    <input ref={posterFileRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => onPosterFile(e.target.files)} />
                    <button className="btn btn-sm" disabled={uploadingPoster}
                      onClick={() => posterFileRef.current?.click()}>
                      <Upload size={13} />{' '}
                      {uploadingPoster ? 'Đang tải…' : posterHasImage ? 'Đổi ảnh poster' : 'Upload ảnh poster riêng'}
                    </button>
                    {posterHasImage && (
                      <button className="btn btn-sm" onClick={() => setPosterOnSelected(null)}>
                        ✕ Bỏ ảnh (dùng nền + tên lễ)
                      </button>
                    )}
                    <span className="text-ink-3">Ảnh riêng của mục này. Nhớ bấm Lưu lễ sau khi đổi.</span>
                  </>
                ) : (
                  <>
                    <span>Nền:</span>
                    <button className="btn btn-sm" onClick={() => setBgPickerOpen(true)}>
                      {selected.background_id
                        ? '🖼 Nền riêng'
                        : seasonBg
                          ? `🖼 Theo mùa (${dayInfo.seasonTitle})`
                          : 'Theo theme — chưa có ảnh cho mùa này'}
                    </button>
                    {selected.background_id && (
                      <button className="btn btn-sm"
                        onClick={() =>
                          mutateItems((arr) =>
                            arr.map((x) => (x.key === selected.key ? { ...x, background_id: null } : x)),
                          )
                        }>
                        ↺ Theo mùa
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {selected && FONT_SCALABLE.has(selected.item_type) && (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px] text-ink-2">
                <span>Cỡ chữ:</span>
                {FONT_SCALES.map((fsz) => (
                  <button
                    key={fsz.v}
                    className={`chip ${selected.font_scale === fsz.v ? 'chip-on' : ''}`}
                    onClick={() =>
                      mutateItems((arr) =>
                        arr.map((x) => (x.key === selected.key ? { ...x, font_scale: fsz.v } : x)),
                      )
                    }
                  >
                    {fsz.label}
                  </button>
                ))}
                {selected.slides_override ? (
                  <button className="btn btn-sm" onClick={resetBreaks}
                    data-tip="Bỏ tách/gộp tay, quay lại chia tự động">
                    ↺ Chia lại tự động
                  </button>
                ) : (
                  <span className="text-ink-3">Chữ to mà tràn? Bấm &quot;tách ↕&quot; dưới slide để bớt dòng.</span>
                )}
              </div>
            )}

            {selected?.item_type === 'custom' && (
              <textarea
                className="field mb-3 min-h-[120px] leading-6"
                placeholder="Nội dung slide tùy chỉnh — mỗi khối cách nhau 1 dòng trống (thông báo, lời chúc…)"
                value={selected.custom_raw}
                onChange={(e) =>
                  mutateItems((arr) =>
                    arr.map((x) => (x.key === selected.key ? { ...x, custom_raw: e.target.value } : x)),
                  )
                }
              />
            )}

            {selected && previewSlides.length > 0 ? (
              <div className={`grid gap-3 ${orientation === 'landscape' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {previewSlides.map((s, i) => (
                  <figure key={i}>
                    {selected.item_type === 'blank' ? (
                      <div className="w-full rounded-[10px] bg-black"
                        style={{ aspectRatio: orientation === 'portrait' ? '9 / 16' : '16 / 9' }} />
                    ) : (
                      <SlideRenderer orientation={orientation} color={color}
                        background={selectedBg}
                        fontScale={selected.font_scale}
                        slide={
                          selected.item_type === 'poster' && posterHasImage
                            ? {} // ảnh poster đã thiết kế sẵn chữ — chiếu nguyên ảnh
                            : { title: s.title, lines: s.lines, isChorus: s.isChorus, badge: s.badge }
                        } />
                    )}
                    <figcaption className="mt-1 flex items-center justify-center gap-2 text-[10.5px] text-ink-2">
                      {i + 1}{s.isChorus ? ' · ĐK' : ''}
                      {canEditBreaks && i > 0 && (
                        <button className="font-bold text-primary" onClick={() => mergeSlideUp(i)}
                          data-tip="Gộp vào slide trước">gộp ↑</button>
                      )}
                      {canEditBreaks && (s.lines?.length ?? 0) >= 2 && (
                        <button className="font-bold text-primary" onClick={() => splitSlide(i)}
                          data-tip="Tách đôi slide">tách ↕</button>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : selected ? (
              <div className="card px-6 py-12 text-center text-[13px] text-ink-3">
                {selected.item_type === 'custom' ? 'Nhập nội dung phía trên để sinh slide' : 'Mục này không có slide'}
              </div>
            ) : null}

          </div>
        </div>
      </div>

      {picker && (
        <LibraryPickerModal
          kind={picker}
          onClose={() => setPicker(null)}
          onPick={(item) => {
            if (picker === 'song') {
              addItem({ item_type: 'song', ref_id: item.id, custom_raw: '', song: item as Song });
            } else {
              addItem({ item_type: 'prayer', ref_id: item.id, custom_raw: '', prayer: item as Prayer });
            }
            setPicker(null);
          }}
        />
      )}

      {respPicker && (
        <ResponsorialPickerModal
          part={respPicker}
          defaultSeason={respSeason}
          suggestedItems={suggestedResp}
          onClose={() => setRespPicker(null)}
          onPick={(r) => {
            addItem({ item_type: respPicker, ref_id: r.id, custom_raw: '', responsorial: r });
            setRespPicker(null);
          }}
        />
      )}

      {bgPickerOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[10vh]"
          onClick={() => setBgPickerOpen(false)}>
          <div className="card w-[560px] max-w-[92vw] overflow-hidden p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <b className="font-display text-[14px] font-semibold text-heading">Chọn nền cho mục này</b>
              <button onClick={() => setBgPickerOpen(false)} className="text-ink-3 hover:text-ink">
                <X size={16} />
              </button>
            </div>
            {bgs.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-ink-3">
                Chưa có ảnh nền nào — upload trong Thư viện ảnh nền trước.
              </p>
            ) : (
              <div className="grid max-h-[50vh] grid-cols-3 gap-2.5 overflow-auto">
                <button
                  className="flex h-24 items-center justify-center rounded-token-2 border border-line px-2 text-center text-xs text-ink-2 hover:border-primary"
                  onClick={() => {
                    mutateItems((arr) =>
                      arr.map((x) => (x.key === selected.key ? { ...x, background_id: null } : x)),
                    );
                    setBgPickerOpen(false);
                  }}>
                  Theo mùa (tự động)
                </button>
                {bgs.map((b) => (
                  <button key={b.id}
                    className="relative h-24 overflow-hidden rounded-token-2 border hover:border-primary"
                    style={{ borderColor: selected.background_id === b.id ? 'var(--primary)' : 'var(--line)' }}
                    onClick={() => {
                      mutateItems((arr) =>
                        arr.map((x) => (x.key === selected.key ? { ...x, background_id: b.id } : x)),
                      );
                      setBgPickerOpen(false);
                    }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={publicUrl(b.storage_path)} alt="" className="h-full w-full object-cover"
                      style={{ objectPosition: `${b.focal_x * 100}% ${b.focal_y * 100}%` }} />
                    {b.season && (
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                        {SEASON_LABEL[b.season].replace('Mùa ', '')}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
