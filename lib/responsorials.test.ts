import { describe, expect, it } from 'vitest';
import {
  matchesDay,
  parseOccasion,
  solemnityName,
  type DayContext,
  type ResponsorialSeason,
} from './responsorials';

describe('parseOccasion', () => {
  it('Chúa Nhật số Ả-rập + năm A', () => {
    const p = parseOccasion('Chúa nhật 16 năm A');
    expect(p.isSunday).toBe(true);
    expect(p.week).toBe(16);
    expect(p.cycle).toBe('A');
    expect(p.weekday).toBeNull();
  });

  it('Chúa Nhật số La Mã', () => {
    expect(parseOccasion('Chúa nhật XXXIV năm C').week).toBe(34);
    expect(parseOccasion('Chúa nhật II năm B').week).toBe(2);
  });

  it('ngày thường Thường Niên có năm lẻ / chẵn', () => {
    const le = parseOccasion('Thứ 2-1 (Năm lẻ)');
    expect(le.weekday).toBe(2);
    expect(le.week).toBe(1);
    expect(le.weekdayVariant).toBe('le');
    expect(parseOccasion('Thứ 6-15 (Năm chẵn)').weekdayVariant).toBe('chan');
  });

  it('ngày thường mùa khác — không có lẻ/chẵn', () => {
    const p = parseOccasion('Thứ 4-2');
    expect(p.weekday).toBe(4);
    expect(p.week).toBe(2);
    expect(p.weekdayVariant).toBeNull();
  });

  it('lễ kính các Thánh theo ngày cố định', () => {
    const p = parseOccasion('Ngày 25-1 — Thánh Phao-lô tông đồ trở lại — lễ kính');
    expect(p.day).toBe(25);
    expect(p.month).toBe(1);
  });

  it('không nhầm "Thứ 6 sau lễ…" thành ngày thường có tuần', () => {
    const p = parseOccasion('Thứ 6 sau lễ Mình và Máu Thánh Chúa Ki-tô — THÁNH TÂM CHÚA GIÊ-SU — lễ trọng — Năm A');
    expect(p.weekday).toBeNull();
    expect(p.cycle).toBe('A');
  });

  it('không nhầm "Chúa nhật sau lễ…" thành Chúa Nhật có tuần', () => {
    const p = parseOccasion('Chúa nhật sau lễ Chúa Thánh Thần Hiện Xuống — CHÚA BA NGÔI — Năm B');
    expect(p.isSunday).toBe(true);
    expect(p.week).toBeNull();
    expect(p.cycle).toBe('B');
  });
});

const ctx = (over: Partial<DayContext>): DayContext => ({
  month: 7, dayOfMonth: 19, dayOfWeek: 0,
  season: 'thuong_nien', week: 16, cycle: 'A', weekdayCycle: 'le',
  title: 'Chúa Nhật XVI Thường Niên',
  ...over,
});
const r = (season: ResponsorialSeason, occasion: string) => ({ season, occasion });

describe('matchesDay — Chúa Nhật', () => {
  it('khớp mùa + tuần + năm', () => {
    expect(matchesDay(r('thuong_nien', 'Chúa nhật 16 năm A'), ctx({}))).toBe(true);
  });
  it('sai năm phụng vụ → không khớp', () => {
    expect(matchesDay(r('thuong_nien', 'Chúa nhật 16 năm B'), ctx({}))).toBe(false);
  });
  it('sai tuần → không khớp', () => {
    expect(matchesDay(r('thuong_nien', 'Chúa nhật 15 năm A'), ctx({}))).toBe(false);
  });
  it('sai mùa → không khớp', () => {
    expect(matchesDay(r('chay', 'Chúa nhật 16 năm A'), ctx({}))).toBe(false);
  });
});

describe('matchesDay — ngày thường (năm lẻ/chẵn)', () => {
  // Thứ Hai (getDay=1) tuần 1 Thường Niên, năm lẻ
  const weekday = ctx({ dayOfWeek: 1, week: 1, weekdayCycle: 'le', title: 'Thứ Hai Tuần I Thường Niên' });
  it('khớp thứ + tuần + năm lẻ', () => {
    expect(matchesDay(r('thuong_nien', 'Thứ 2-1 (Năm lẻ)'), weekday)).toBe(true);
  });
  it('năm chẵn không khớp khi đang là năm lẻ', () => {
    expect(matchesDay(r('thuong_nien', 'Thứ 2-1 (Năm chẵn)'), weekday)).toBe(false);
  });
  it('đúng năm chẵn thì khớp', () => {
    expect(matchesDay(r('thuong_nien', 'Thứ 2-1 (Năm chẵn)'), { ...weekday, weekdayCycle: 'chan' })).toBe(true);
  });
  it('sai thứ → không khớp', () => {
    expect(matchesDay(r('thuong_nien', 'Thứ 3-1 (Năm lẻ)'), weekday)).toBe(false);
  });
  it('mùa khác (không có lẻ/chẵn) vẫn khớp theo thứ + tuần', () => {
    const advent = ctx({ dayOfWeek: 3, week: 2, season: 'vong', title: 'Thứ Tư Tuần II Mùa Vọng' });
    expect(matchesDay(r('vong', 'Thứ 4-2'), advent)).toBe(true);
  });
});

describe('matchesDay — lễ kính các Thánh (ngày cố định)', () => {
  const jan25 = ctx({ month: 1, dayOfMonth: 25, dayOfWeek: 6, season: 'thuong_nien', week: 3 });
  it('khớp đúng ngày 25-1', () => {
    expect(matchesDay(r('cac_thanh', 'Ngày 25-1 — Thánh Phao-lô tông đồ trở lại — lễ kính'), jan25)).toBe(true);
  });
  it('ngày khác không khớp', () => {
    expect(matchesDay(r('cac_thanh', 'Ngày 26-1 — Thánh Ti-mô-thê và thánh Ti-tô, giám mục — lễ nhớ'), jan25)).toBe(false);
  });
});

describe('matchesDay — lễ trọng kính Chúa', () => {
  it('Chúa Ba Ngôi năm A', () => {
    const c = ctx({ title: 'Chúa Nhật Chúa Ba Ngôi', cycle: 'A', week: 9, month: 5, dayOfMonth: 31 });
    expect(matchesDay(r('le_trong', 'Chúa nhật sau lễ Chúa Thánh Thần Hiện Xuống — CHÚA BA NGÔI — Năm A'), c)).toBe(true);
    expect(matchesDay(r('le_trong', 'Chúa nhật sau lễ Chúa Thánh Thần Hiện Xuống — CHÚA BA NGÔI — Năm B'), c)).toBe(false);
  });
  it('Chúa Kitô Vua khớp "VUA VŨ TRỤ"', () => {
    const c = ctx({ title: 'Chúa Nhật XXXIV Thường Niên — Chúa Kitô Vua', cycle: 'C', week: 34 });
    expect(matchesDay(r('le_trong', 'Chúa nhật cuối cùng Mùa Thường Niên — ĐỨC GIÊ-SU KI-TÔ VUA VŨ TRỤ — lễ trọng — Năm C'), c)).toBe(true);
  });
  it('Mình và Máu Thánh Chúa', () => {
    const c = ctx({ title: 'Chúa Nhật Mình và Máu Thánh Chúa Kitô', cycle: 'B' });
    expect(matchesDay(r('le_trong', 'Chúa nhật sau lễ Chúa Ba Ngôi — MÌNH VÀ MÁU THÁNH CHÚA KI-TÔ — Năm B'), c)).toBe(true);
  });
  it('Chúa Nhật thường không khớp lễ trọng', () => {
    expect(matchesDay(r('le_trong', 'Chúa nhật sau lễ Chúa Ba Ngôi — MÌNH VÀ MÁU THÁNH CHÚA KI-TÔ — Năm A'), ctx({}))).toBe(false);
  });

  // Hồi quy: phần ngữ cảnh "sau lễ Chúa Ba Ngôi" từng làm lễ Mình Máu Thánh khớp nhầm
  // vào Chúa Nhật Chúa Ba Ngôi. Chỉ được đối chiếu đoạn TÊN LỄ in hoa.
  it('lễ Chúa Ba Ngôi KHÔNG gợi ý nhầm lễ Mình và Máu Thánh', () => {
    const c = ctx({ title: 'Chúa Nhật Chúa Ba Ngôi', cycle: 'A' });
    expect(matchesDay(r('le_trong', 'Chúa nhật sau lễ Chúa Ba Ngôi — MÌNH VÀ MÁU THÁNH CHÚA KI-TÔ — Năm A'), c)).toBe(false);
    expect(matchesDay(r('le_trong', 'Chúa nhật sau lễ Chúa Thánh Thần Hiện Xuống — CHÚA BA NGÔI — Năm A'), c)).toBe(true);
  });

  it('lễ Thánh Tâm không khớp nhầm qua ngữ cảnh "sau lễ Mình và Máu Thánh"', () => {
    const c = ctx({ title: 'Chúa Nhật Mình và Máu Thánh Chúa Kitô', cycle: 'A' });
    expect(matchesDay(r('le_trong', 'Thứ 6 sau lễ Mình và Máu Thánh Chúa Ki-tô — THÁNH TÂM CHÚA GIÊ-SU — lễ trọng — Năm A'), c)).toBe(false);
  });
});

describe('solemnityName — tách tên lễ khỏi ngữ cảnh', () => {
  it('chỉ giữ đoạn in hoa', () => {
    expect(solemnityName('Chúa nhật sau lễ Chúa Ba Ngôi — MÌNH VÀ MÁU THÁNH CHÚA KI-TÔ — Năm A'))
      .toBe('MÌNH VÀ MÁU THÁNH CHÚA KI-TÔ');
    expect(solemnityName('Thứ 6 sau lễ Mình và Máu Thánh Chúa Ki-tô — THÁNH TÂM CHÚA GIÊ-SU — lễ trọng — Năm B'))
      .toBe('THÁNH TÂM CHÚA GIÊ-SU');
  });
});
