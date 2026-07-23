import { describe, expect, it } from 'vitest';
import {
  baptismDate,
  easterDate,
  epiphanyDate,
  firstSundayOfAdvent,
  getLiturgicalDay,
} from './liturgical-calendar';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const iso = (dt: Date) => dt.toISOString().slice(0, 10);

describe('easterDate (Computus)', () => {
  it('đúng với 2024–2028', () => {
    expect(iso(easterDate(2024))).toBe('2024-03-31');
    expect(iso(easterDate(2025))).toBe('2025-04-20');
    expect(iso(easterDate(2026))).toBe('2026-04-05');
    expect(iso(easterDate(2027))).toBe('2027-03-28');
    expect(iso(easterDate(2028))).toBe('2028-04-16');
  });
});

describe('firstSundayOfAdvent', () => {
  it('đúng với 2025–2028', () => {
    expect(iso(firstSundayOfAdvent(2025))).toBe('2025-11-30');
    expect(iso(firstSundayOfAdvent(2026))).toBe('2026-11-29');
    expect(iso(firstSundayOfAdvent(2027))).toBe('2027-11-28');
    expect(iso(firstSundayOfAdvent(2028))).toBe('2028-12-03');
  });
});

describe('Hiển Linh & Chịu Phép Rửa', () => {
  it('2026: Hiển Linh 4/1, Phép Rửa 11/1', () => {
    expect(iso(epiphanyDate(2026))).toBe('2026-01-04');
    expect(iso(baptismDate(2026))).toBe('2026-01-11');
  });
  it('2028: Hiển Linh 2/1, Phép Rửa 9/1', () => {
    expect(iso(epiphanyDate(2028))).toBe('2028-01-02');
    expect(iso(baptismDate(2028))).toBe('2028-01-09');
  });
});

describe('Chu kỳ A/B/C', () => {
  it('07/2026 là Năm A (khớp lịch Công giáo VN)', () => {
    expect(getLiturgicalDay(d(2026, 7, 19)).cycle).toBe('A');
  });
  it('sau CN I Vọng 2026 chuyển sang Năm B', () => {
    expect(getLiturgicalDay(d(2026, 12, 13)).cycle).toBe('B');
  });
  it('07/2025 là Năm C', () => {
    expect(getLiturgicalDay(d(2025, 7, 20)).cycle).toBe('C');
  });
});

describe('Chu kỳ bài đọc ngày thường (năm lẻ I / năm chẵn II)', () => {
  it('2025 là năm lẻ (I), 2026 là năm chẵn (II)', () => {
    expect(getLiturgicalDay(d(2025, 7, 14)).weekdayCycle).toBe('le');
    expect(getLiturgicalDay(d(2026, 7, 13)).weekdayCycle).toBe('chan');
  });
  it('đổi chu kỳ từ CN I Mùa Vọng, không phải 01/01', () => {
    // trước Vọng 2025 (30/11) vẫn là năm lẻ; từ Vọng trở đi thành năm chẵn (2026)
    expect(getLiturgicalDay(d(2025, 11, 25)).weekdayCycle).toBe('le');
    expect(getLiturgicalDay(d(2025, 12, 1)).weekdayCycle).toBe('chan');
    expect(getLiturgicalDay(d(2026, 1, 12)).weekdayCycle).toBe('chan');
  });
  it('yearNumber = năm dương lịch chứa phần lớn năm phụng vụ', () => {
    expect(getLiturgicalDay(d(2026, 7, 13)).yearNumber).toBe(2026);
    expect(getLiturgicalDay(d(2026, 12, 1)).yearNumber).toBe(2027);
  });
});

describe('Thường Niên', () => {
  it('CN 19/07/2026 = Chúa Nhật XVI Thường Niên, màu xanh', () => {
    const r = getLiturgicalDay(d(2026, 7, 19));
    expect(r.title).toBe('Chúa Nhật XVI Thường Niên');
    expect(r.color).toBe('xanh');
    expect(r.week).toBe(16);
    expect(r.rank).toBe('chua_nhat');
  });
  it('Thứ Tư 15/07/2026 thuộc Tuần XV (khớp mock)', () => {
    const r = getLiturgicalDay(d(2026, 7, 15));
    expect(r.title).toBe('Thứ Tư Tuần XV Thường Niên');
    expect(r.week).toBe(15);
  });
  it('CN II TN 2026 = 18/01', () => {
    const r = getLiturgicalDay(d(2026, 1, 18));
    expect(r.title).toBe('Chúa Nhật II Thường Niên');
  });
  it('Chúa Kitô Vua 2026 = 22/11, tuần 34, trắng', () => {
    const r = getLiturgicalDay(d(2026, 11, 22));
    expect(r.title).toContain('Chúa Kitô Vua');
    expect(r.week).toBe(34);
    expect(r.color).toBe('trang');
  });
});

describe('Mùa Vọng & Giáng Sinh', () => {
  it('CN III Vọng (Gaudete) 13/12/2026 màu hồng', () => {
    const r = getLiturgicalDay(d(2026, 12, 13));
    expect(r.title).toBe('Chúa Nhật III Mùa Vọng');
    expect(r.color).toBe('hong');
  });
  it('CN I Vọng 29/11/2026 màu tím', () => {
    const r = getLiturgicalDay(d(2026, 11, 29));
    expect(r.title).toBe('Chúa Nhật I Mùa Vọng');
    expect(r.color).toBe('tim');
  });
  it('Giáng Sinh 25/12/2026 lễ trọng trắng', () => {
    const r = getLiturgicalDay(d(2026, 12, 25));
    expect(r.title).toBe('Đại Lễ Chúa Giáng Sinh');
    expect(r.rank).toBe('le_trong');
  });
  it('Thánh Gia 27/12/2026 (CN trong bát nhật GS)', () => {
    expect(getLiturgicalDay(d(2026, 12, 27)).title).toBe('Lễ Thánh Gia Thất');
  });
  it('Mẹ Thiên Chúa 01/01/2027', () => {
    expect(getLiturgicalDay(d(2027, 1, 1)).title).toBe('Đức Maria, Mẹ Thiên Chúa');
  });
});

describe('Mùa Chay & Phục Sinh', () => {
  it('Thứ Tư Lễ Tro 18/02/2026, tím', () => {
    const r = getLiturgicalDay(d(2026, 2, 18));
    expect(r.title).toBe('Thứ Tư Lễ Tro');
    expect(r.color).toBe('tim');
  });
  it('CN IV Chay (Laetare) 15/03/2026 màu hồng', () => {
    const r = getLiturgicalDay(d(2026, 3, 15));
    expect(r.title).toBe('Chúa Nhật IV Mùa Chay');
    expect(r.color).toBe('hong');
  });
  it('Lễ Lá 29/03/2026 màu đỏ', () => {
    const r = getLiturgicalDay(d(2026, 3, 29));
    expect(r.title).toBe('Chúa Nhật Lễ Lá');
    expect(r.color).toBe('do');
  });
  it('Phục Sinh 05/04/2026 trắng', () => {
    expect(getLiturgicalDay(d(2026, 4, 5)).title).toBe('Chúa Nhật Phục Sinh');
  });
  it('CN II PS 12/04/2026 = Lòng Chúa Thương Xót', () => {
    expect(getLiturgicalDay(d(2026, 4, 12)).title).toContain('Lòng Chúa Thương Xót');
  });
  it('Hiện Xuống 24/05/2026 màu đỏ', () => {
    const r = getLiturgicalDay(d(2026, 5, 24));
    expect(r.title).toBe('Chúa Nhật Hiện Xuống');
    expect(r.color).toBe('do');
  });
});

describe('Tùy chọn lệ Việt Nam', () => {
  it('Thăng Thiên mặc định dời sang CN 17/05/2026', () => {
    expect(getLiturgicalDay(d(2026, 5, 17)).title).toBe('Chúa Nhật Chúa Thăng Thiên');
  });
  it('Thăng Thiên thứ Năm 14/05/2026 khi tắt tùy chọn', () => {
    const opts = { ascensionOnSunday: false };
    expect(getLiturgicalDay(d(2026, 5, 14), opts).title).toBe('Lễ Chúa Thăng Thiên');
    expect(getLiturgicalDay(d(2026, 5, 17), opts).title).toBe('Chúa Nhật VII Phục Sinh');
  });
  it('Tử Đạo VN 2026: mừng CN 15/11 (tránh Chúa Kitô Vua 22/11)', () => {
    expect(getLiturgicalDay(d(2026, 11, 15)).title).toBe('Các Thánh Tử Đạo Việt Nam');
    expect(getLiturgicalDay(d(2026, 11, 15)).color).toBe('do');
  });
  it('Tử Đạo VN đúng ngày 24/11 khi tắt tùy chọn', () => {
    const opts = { tuDaoOnSunday: false };
    expect(getLiturgicalDay(d(2026, 11, 24), opts).title).toBe('Các Thánh Tử Đạo Việt Nam');
    expect(getLiturgicalDay(d(2026, 11, 15), opts).title).toBe('Chúa Nhật XXXIII Thường Niên');
  });
});

describe('Lễ Ba Ngôi / Mình Máu Thánh', () => {
  it('2026: Ba Ngôi 31/05, Mình Máu Thánh 07/06', () => {
    expect(getLiturgicalDay(d(2026, 5, 31)).title).toBe('Chúa Nhật Chúa Ba Ngôi');
    expect(getLiturgicalDay(d(2026, 6, 7)).title).toBe('Chúa Nhật Mình và Máu Thánh Chúa Kitô');
  });
});

describe('Dời lễ trọng rơi vào CN đặc quyền', () => {
  it('Vô Nhiễm 08/12/2024 (CN II Vọng) dời sang 09/12', () => {
    expect(getLiturgicalDay(d(2024, 12, 8)).title).toBe('Chúa Nhật II Mùa Vọng');
    expect(getLiturgicalDay(d(2024, 12, 9)).title).toBe('Đức Mẹ Vô Nhiễm Nguyên Tội');
  });
});

describe('Tính bền vững: mọi Chúa Nhật 2025–2028 đều có kết quả hợp lệ', () => {
  it('không ném lỗi, title khác rỗng, màu hợp lệ', () => {
    const colors = ['xanh', 'tim', 'trang', 'do', 'hong'];
    const start = new Date(2025, 0, 5);
    for (let i = 0; i < 209; i++) {
      const sunday = new Date(start.getTime() + i * 7 * 86400000);
      const r = getLiturgicalDay(sunday);
      expect(r.title.length).toBeGreaterThan(0);
      expect(colors).toContain(r.color);
    }
  });
});
