import type { LiturgicalColor, Season } from './liturgical-calendar';

export type SongCategory =
  | 'nhap_le'
  | 'dap_ca'
  | 'dang_le'
  | 'hiep_le'
  | 'ket_le'
  | 'duc_me'
  | 'chau'
  | 'khac';

export const SONG_CATEGORY_LABEL: Record<SongCategory, string> = {
  nhap_le: 'Nhập lễ',
  dap_ca: 'Đáp ca',
  dang_le: 'Dâng lễ',
  hiep_le: 'Hiệp lễ',
  ket_le: 'Kết lễ',
  duc_me: 'Đức Mẹ',
  chau: 'Chầu Thánh Thể',
  khac: 'Khác',
};

export interface SongSlide {
  lines: string[];
  is_chorus: boolean;
}

export interface Song {
  id: string;
  title: string;
  author: string | null;
  category: SongCategory;
  lyrics_raw: string;
  slides: SongSlide[];
  created_at: string;
  updated_at: string;
}

export interface PrayerSlide {
  lines: string[];
}

export interface Prayer {
  id: string;
  title: string;
  content_raw: string;
  slides: PrayerSlide[];
  is_seed: boolean;
  created_at: string;
}

export interface Background {
  id: string;
  storage_path: string;
  season: Season | null;
  feast_tag: string | null;
  focal_x: number;
  focal_y: number;
  created_at: string;
}

/**
 * 'dap_ca' và 'tung_ho' cùng trỏ ref_id → responsorials.id nhưng là 2 mục riêng,
 * để chèn được bài đọc / slide khác vào giữa (Đáp ca … Bài đọc 2 … Tung hô).
 */
export type MassItemType =
  | 'poster' | 'song' | 'prayer' | 'dap_ca' | 'tung_ho' | 'blank' | 'custom';

/** Mục lễ tham chiếu tới bảng responsorials. */
export const RESPONSORIAL_ITEM_TYPES = ['dap_ca', 'tung_ho'] as const;

export interface Mass {
  id: string;
  mass_date: string; // ISO date
  title: string;
  liturgical_color: LiturgicalColor;
  poster_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Một slide đã được người dùng chỉnh tay (tách/gộp) trong trình soạn lễ. */
export interface OverrideSlide {
  lines: string[];
  is_chorus?: boolean;
  /** Nhãn tag góc phải ("ĐK", "Đáp ca", tên kinh…) — chỉ ở slide đầu của phần. */
  badge?: string;
}

/** Tùy chỉnh riêng của một mục trong lễ. */
export interface MassItemOverrides {
  /** Ảnh poster riêng của mục này (Storage path). Mỗi mục Poster một ảnh khác nhau. */
  poster_path?: string | null;
  /**
   * Hệ số cỡ chữ cho cả mục (mục 5): 0.85 = nhỏ, 1 = vừa (mặc định),
   * 1.15 = lớn, 1.3 = rất lớn. Áp cho mọi slide của mục; auto-fit vẫn chạy đè lên.
   */
  font_scale?: number;
  /**
   * Điểm ngắt slide chỉnh tay cho RIÊNG mục này trong lễ (tách/gộp). Khi có,
   * dùng nguyên danh sách này thay cho bộ tự sinh — để chọn cỡ chữ lớn mà không tràn.
   * Bài hát trong thư viện giữ nguyên; đây là override cấp mục lễ.
   */
  slides?: OverrideSlide[];
}

export interface MassItem {
  id: string;
  mass_id: string;
  position: number;
  item_type: MassItemType;
  ref_id: string | null;
  custom_slides: PrayerSlide[] | null;
  background_id: string | null;
  overrides: MassItemOverrides;
}
