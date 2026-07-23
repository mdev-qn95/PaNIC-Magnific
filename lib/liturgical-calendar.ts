/**
 * Lịch phụng vụ Công giáo (CLAUDE.md mục 10) — tự tính, không cần API.
 * Mọi phép toán ngày dùng UTC-noon để tránh lệch múi giờ/DST.
 *
 * Giới hạn có chủ ý (Phase 1): chỉ phủ Chúa Nhật + lễ trọng/lễ chính;
 * lễ nhớ các thánh hằng ngày không nằm trong phạm vi. Người dùng luôn
 * sửa được kết quả trong form soạn lễ (nguồn chân lý cuối cùng).
 */

export type Season = 'vong' | 'giang_sinh' | 'chay' | 'phuc_sinh' | 'thuong_nien';
export type LiturgicalColor = 'xanh' | 'tim' | 'trang' | 'do' | 'hong';
export type Rank = 'le_trong' | 'le_kinh' | 'chua_nhat' | 'thuong';
export type Cycle = 'A' | 'B' | 'C';

export interface CalendarOptions {
  /** Chúa Thăng Thiên dời sang Chúa Nhật VII PS (lệ VN). Mặc định true. */
  ascensionOnSunday?: boolean;
  /** Các Thánh Tử Đạo VN mừng vào Chúa Nhật gần 24/11. Mặc định true. */
  tuDaoOnSunday?: boolean;
}

export interface LiturgicalDay {
  title: string;
  season: Season;
  seasonTitle: string;
  /** Tuần trong mùa (Thường Niên 1..34, Vọng 1..4, Chay 1..5, PS 1..7). */
  week?: number;
  color: LiturgicalColor;
  rank: Rank;
  cycle: Cycle;
  /** Năm phụng vụ (năm dương lịch mà phần lớn năm phụng vụ rơi vào). */
  yearNumber: number;
  /**
   * Chu kỳ bài đọc ngày thường: năm lẻ (I) khi yearNumber lẻ, năm chẵn (II) khi chẵn.
   * Dùng để chọn đúng đáp ca ngày thường Mùa Thường Niên.
   */
  weekdayCycle: 'le' | 'chan';
}

export const SEASON_LABEL: Record<Season, string> = {
  vong: 'Mùa Vọng',
  giang_sinh: 'Mùa Giáng Sinh',
  chay: 'Mùa Chay',
  phuc_sinh: 'Mùa Phục Sinh',
  thuong_nien: 'Mùa Thường Niên',
};

export const COLOR_LABEL: Record<LiturgicalColor, string> = {
  xanh: 'Xanh',
  tim: 'Tím',
  trang: 'Trắng',
  do: 'Đỏ',
  hong: 'Hồng',
};

/* ---------------- helpers ngày (UTC noon) ---------------- */

function mk(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 12));
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}
/** a - b tính theo ngày */
function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}
function sameDay(a: Date, b: Date): boolean {
  return diffDays(a, b) === 0;
}
/** 0 = Chúa Nhật */
function dow(d: Date): number {
  return d.getUTCDay();
}
function sundayOnOrBefore(d: Date): Date {
  return addDays(d, -dow(d));
}

const ROMAN = [
  '', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
  'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX',
  'XXXI', 'XXXII', 'XXXIII', 'XXXIV',
];

const WEEKDAY = ['Chúa Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** Số La Mã 1..34 cho UI ("Tuần XV"). */
export function romanNumeral(n: number): string {
  return ROMAN[n] ?? String(n);
}

/* ---------------- các mốc gốc ---------------- */

/** Lễ Phục Sinh — thuật toán Meeus/Jones/Butcher. */
export function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return mk(year, month, day);
}

/** CN I Mùa Vọng = Chúa Nhật thứ 4 trước Giáng Sinh. */
export function firstSundayOfAdvent(year: number): Date {
  return addDays(sundayOnOrBefore(mk(year, 12, 24)), -21);
}

/** Hiển Linh (VN): Chúa Nhật trong khoảng 2–8/1. */
export function epiphanyDate(year: number): Date {
  return sundayOnOrBefore(mk(year, 1, 8));
}

/** Chúa Chịu Phép Rửa: CN sau Hiển Linh (nếu Hiển Linh 7-8/1 thì thứ Hai kế). */
export function baptismDate(year: number): Date {
  const e = epiphanyDate(year);
  const day = e.getUTCDate();
  return day >= 7 ? addDays(e, 1) : addDays(e, 7);
}

/* ---------------- hàm chính ---------------- */

export function getLiturgicalDay(input: Date, options: CalendarOptions = {}): LiturgicalDay {
  const { ascensionOnSunday = true, tuDaoOnSunday = true } = options;
  // chuẩn hóa theo ngày địa phương của input
  const date = mk(input.getFullYear(), input.getMonth() + 1, input.getDate());
  const y = date.getUTCFullYear();
  const dayOfWeek = dow(date);
  const isSun = dayOfWeek === 0;

  // Năm phụng vụ: bắt đầu từ CN I Vọng. Chu kỳ A/B/C theo năm kết thúc:
  // litYear % 3 == 0 → C, == 1 → A, == 2 → B (vd 2026 → A, kiểm chứng lịch VN).
  const adventThisYear = firstSundayOfAdvent(y);
  const litYear = diffDays(date, adventThisYear) >= 0 ? y + 1 : y;
  const cycle: Cycle = (['C', 'A', 'B'] as const)[litYear % 3];

  // Biên các mùa của năm phụng vụ hiện hành
  const adventStart = litYear === y + 1 ? adventThisYear : firstSundayOfAdvent(y - 1);
  const christmas = mk(adventStart.getUTCFullYear(), 12, 25);
  const baptism = baptismDate(adventStart.getUTCFullYear() + 1);
  const easter = easterDate(y);
  const ashWed = addDays(easter, -46);
  const palmSunday = addDays(easter, -7);
  const pentecost = addDays(easter, 49);
  const christKing = addDays(adventThisYear, -7);

  const day = (
    title: string,
    season: Season,
    color: LiturgicalColor,
    rank: Rank,
    week?: number
  ): LiturgicalDay => ({
    title, season, seasonTitle: SEASON_LABEL[season], color, rank, cycle, week,
    yearNumber: litYear,
    weekdayCycle: litYear % 2 === 1 ? 'le' : 'chan',
  });

  /* ---- mùa nền (dùng cho fallback + kiểm tra CN đặc quyền) ---- */
  const seasonOf = (d: Date): Season => {
    if (diffDays(d, adventStart) >= 0 && diffDays(d, christmas) < 0) return 'vong';
    if (diffDays(d, christmas) >= 0 && diffDays(d, baptism) <= 0) return 'giang_sinh';
    if (diffDays(d, ashWed) >= 0 && diffDays(d, easter) < 0) return 'chay';
    if (diffDays(d, easter) >= 0 && diffDays(d, pentecost) <= 0) return 'phuc_sinh';
    return 'thuong_nien';
  };

  /* ---- 1. Lễ trọng cố định (lệ VN quan tâm) ---- */
  const fixedFor = (d: Date): LiturgicalDay | null => {
    const m = d.getUTCMonth() + 1;
    const dd = d.getUTCDate();
    if (m === 1 && dd === 1) return day('Đức Maria, Mẹ Thiên Chúa', 'giang_sinh', 'trang', 'le_trong');
    if (m === 3 && dd === 25) return day('Lễ Truyền Tin', seasonOf(d), 'trang', 'le_trong');
    if (m === 8 && dd === 15) return day('Đức Mẹ Lên Trời', 'thuong_nien', 'trang', 'le_trong');
    if (m === 11 && dd === 1) return day('Các Thánh Nam Nữ', 'thuong_nien', 'trang', 'le_trong');
    if (m === 11 && dd === 2) return day('Các Đẳng Linh Hồn', 'thuong_nien', 'tim', 'le_trong');
    if (m === 12 && dd === 8) return day('Đức Mẹ Vô Nhiễm Nguyên Tội', seasonOf(d), 'trang', 'le_trong');
    return null;
  };

  // CN đặc quyền (Vọng/Chay/PS): lễ trọng cố định rơi vào đây phải dời sang thứ Hai
  const privilegedSunday = (d: Date): boolean =>
    dow(d) === 0 && ['vong', 'chay', 'phuc_sinh'].includes(seasonOf(d));

  const fixedToday = fixedFor(date);
  if (fixedToday && !privilegedSunday(date)) return fixedToday;
  if (!fixedToday && dayOfWeek === 1) {
    const yesterday = addDays(date, -1);
    const transferred = fixedFor(yesterday);
    if (transferred && privilegedSunday(yesterday)) return transferred;
  }

  /* ---- Các Thánh Tử Đạo Việt Nam (24/11, VN thường mừng CN) ---- */
  const tuDao = day('Các Thánh Tử Đạo Việt Nam', 'thuong_nien', 'do', 'le_trong');
  if (tuDaoOnSunday) {
    const s1 = sundayOnOrBefore(mk(y, 11, 24));
    const s2 = addDays(s1, 7);
    let target = diffDays(mk(y, 11, 24), s1) <= diffDays(s2, mk(y, 11, 24)) ? s1 : s2;
    // đụng Chúa Kitô Vua hoặc rơi vào Mùa Vọng → lùi dần về CN trước (thường là CN XXXIII TN)
    while (sameDay(target, christKing) || diffDays(target, adventThisYear) >= 0) {
      target = addDays(target, -7);
    }
    if (sameDay(date, target)) return tuDao;
  } else if (sameDay(date, mk(y, 11, 24))) {
    return tuDao;
  }

  /* ---- 2. Lễ di động (chu kỳ Phục Sinh + Giáng Sinh) ---- */
  if (sameDay(date, ashWed)) return day('Thứ Tư Lễ Tro', 'chay', 'tim', 'le_trong');
  if (sameDay(date, palmSunday)) return day('Chúa Nhật Lễ Lá', 'chay', 'do', 'chua_nhat');
  if (sameDay(date, addDays(easter, -3)))
    return day('Thứ Năm Tuần Thánh (Lễ Tiệc Ly)', 'chay', 'trang', 'le_trong');
  if (sameDay(date, addDays(easter, -2)))
    return day('Thứ Sáu Tuần Thánh (Tưởng niệm Cuộc Thương Khó)', 'chay', 'do', 'le_trong');
  if (sameDay(date, addDays(easter, -1)))
    return day('Thứ Bảy Tuần Thánh (Vọng Phục Sinh)', 'chay', 'trang', 'le_trong');
  if (sameDay(date, easter)) return day('Chúa Nhật Phục Sinh', 'phuc_sinh', 'trang', 'le_trong', 1);

  if (ascensionOnSunday) {
    if (sameDay(date, addDays(easter, 42)))
      return day('Chúa Nhật Chúa Thăng Thiên', 'phuc_sinh', 'trang', 'le_trong', 7);
  } else if (sameDay(date, addDays(easter, 39))) {
    return day('Lễ Chúa Thăng Thiên', 'phuc_sinh', 'trang', 'le_trong');
  }

  if (sameDay(date, pentecost)) return day('Chúa Nhật Hiện Xuống', 'phuc_sinh', 'do', 'le_trong', 8);
  if (sameDay(date, addDays(pentecost, 7)))
    return day('Chúa Nhật Chúa Ba Ngôi', 'thuong_nien', 'trang', 'le_trong', otWeekOf(date));
  if (sameDay(date, addDays(pentecost, 14)))
    return day('Chúa Nhật Mình và Máu Thánh Chúa Kitô', 'thuong_nien', 'trang', 'le_trong', otWeekOf(date));
  if (sameDay(date, addDays(pentecost, 19)))
    return day('Lễ Thánh Tâm Chúa Giêsu', 'thuong_nien', 'trang', 'le_trong');
  if (sameDay(date, christKing))
    return day('Chúa Nhật XXXIV Thường Niên — Chúa Kitô Vua', 'thuong_nien', 'trang', 'le_trong', 34);

  if (sameDay(date, christmas)) return day('Đại Lễ Chúa Giáng Sinh', 'giang_sinh', 'trang', 'le_trong');
  // Thánh Gia: CN trong tuần bát nhật GS (26–31/12), nếu không có thì 30/12
  const gsYear = adventStart.getUTCFullYear();
  const dec26 = mk(gsYear, 12, 26);
  const sundayInOctave = addDays(dec26, (7 - dow(dec26)) % 7);
  const holyFamily = diffDays(sundayInOctave, mk(gsYear, 12, 31)) <= 0 ? sundayInOctave : mk(gsYear, 12, 30);
  if (sameDay(date, holyFamily)) return day('Lễ Thánh Gia Thất', 'giang_sinh', 'trang', 'le_kinh');
  if (sameDay(date, epiphanyDate(adventStart.getUTCFullYear() + 1)))
    return day('Lễ Chúa Hiển Linh', 'giang_sinh', 'trang', 'le_trong');
  if (sameDay(date, baptism)) return day('Lễ Chúa Chịu Phép Rửa', 'giang_sinh', 'trang', 'le_kinh');

  /* ---- 3. Theo mùa ---- */
  const season = seasonOf(date);

  // Tuần Thường Niên: giai đoạn 1 đếm xuôi từ Chúa Chịu Phép Rửa,
  // giai đoạn 2 đếm ngược từ Chúa Kitô Vua (= CN XXXIV) để luôn khớp cuối năm.
  function otWeekOf(d: Date): number {
    const prevSunday = sundayOnOrBefore(d);
    if (diffDays(d, pentecost) > 0) {
      // giai đoạn 2: đếm ngược từ Chúa Kitô Vua (CN XXXIV)
      return 34 - Math.round(diffDays(christKing, prevSunday) / 7);
    }
    // giai đoạn 1: đếm xuôi từ Chúa Chịu Phép Rửa (CN sau Phép Rửa = tuần 2).
    // Nếu Phép Rửa rơi vào thứ Hai (Hiển Linh 7-8/1), các ngày còn lại tuần đó vẫn là tuần 1.
    const anchor = diffDays(prevSunday, baptism) < 0 ? baptism : prevSunday;
    return Math.ceil(diffDays(anchor, baptism) / 7) + 1;
  }

  if (season === 'vong') {
    const week = Math.floor(diffDays(date, adventStart) / 7) + 1;
    const color: LiturgicalColor = isSun && week === 3 ? 'hong' : 'tim';
    const title = isSun
      ? `Chúa Nhật ${ROMAN[week]} Mùa Vọng`
      : `${WEEKDAY[dayOfWeek]} Tuần ${ROMAN[week]} Mùa Vọng`;
    return day(title, 'vong', color, isSun ? 'chua_nhat' : 'thuong', week);
  }

  if (season === 'giang_sinh') {
    const title = isSun ? 'Chúa Nhật Mùa Giáng Sinh' : `${WEEKDAY[dayOfWeek]} — Mùa Giáng Sinh`;
    return day(title, 'giang_sinh', 'trang', isSun ? 'chua_nhat' : 'thuong');
  }

  if (season === 'chay') {
    const firstSundayLent = addDays(ashWed, 4);
    if (diffDays(date, firstSundayLent) < 0) {
      return day(`${WEEKDAY[dayOfWeek]} sau Lễ Tro`, 'chay', 'tim', 'thuong');
    }
    const week = Math.floor(diffDays(date, firstSundayLent) / 7) + 1;
    const color: LiturgicalColor = isSun && week === 4 ? 'hong' : 'tim';
    const title = isSun
      ? `Chúa Nhật ${ROMAN[week]} Mùa Chay`
      : `${WEEKDAY[dayOfWeek]} Tuần ${ROMAN[week]} Mùa Chay`;
    return day(title, 'chay', color, isSun ? 'chua_nhat' : 'thuong', week);
  }

  if (season === 'phuc_sinh') {
    const week = Math.floor(diffDays(date, easter) / 7) + 1;
    if (week === 1 && !isSun) {
      return day(`${WEEKDAY[dayOfWeek]} trong Tuần Bát Nhật Phục Sinh`, 'phuc_sinh', 'trang', 'le_trong', 1);
    }
    const suffix = week === 2 && isSun ? ' (Chúa Nhật Lòng Chúa Thương Xót)' : '';
    const title = isSun
      ? `Chúa Nhật ${ROMAN[week]} Phục Sinh${suffix}`
      : `${WEEKDAY[dayOfWeek]} Tuần ${ROMAN[week]} Phục Sinh`;
    return day(title, 'phuc_sinh', 'trang', isSun ? 'chua_nhat' : 'thuong', week);
  }

  // Thường Niên
  const week = otWeekOf(date);
  const title = isSun
    ? `Chúa Nhật ${ROMAN[week]} Thường Niên`
    : `${WEEKDAY[dayOfWeek]} Tuần ${ROMAN[week]} Thường Niên`;
  return day(title, 'thuong_nien', 'xanh', isSun ? 'chua_nhat' : 'thuong', week);
}
