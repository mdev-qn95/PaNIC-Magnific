import { describe, expect, it } from 'vitest';
import { splitLyrics } from './slide-splitter';

const SONG = `Hãy đến tung hô Chúa, reo mừng Đấng cứu thoát ta.
Nào cùng đến trước thánh nhan, dâng lời cảm tạ.

ĐK: Vì Chúa là Thiên Chúa cao cả,
là Đại Vương trổi vượt chư thần.

Trong tay Ngài là vực sâu lòng đất,
là đỉnh cao muôn núi muôn đồi.`;

describe('splitLyrics — cơ bản', () => {
  it('tách khối theo dòng trống, detect ĐK, tự lặp điệp khúc sau phiên khúc cuối', () => {
    const slides = splitLyrics(SONG, { maxLines: 4 });
    expect(slides).toHaveLength(4); // PK1, ĐK, PK2, ĐK (tự lặp)
    expect(slides[0].is_chorus).toBe(false);
    expect(slides[1].is_chorus).toBe(true);
    expect(slides[1].lines[0]).toBe('Vì Chúa là Thiên Chúa cao cả,'); // prefix "ĐK:" đã bỏ
    expect(slides[2].is_chorus).toBe(false);
    expect(slides[3].is_chorus).toBe(true);
    expect(slides[3].lines).toEqual(slides[1].lines);
  });

  it('tắt tự lặp điệp khúc', () => {
    const slides = splitLyrics(SONG, { maxLines: 4, autoRepeatChorus: false });
    expect(slides).toHaveLength(3);
  });

  it('không lặp đôi khi người dùng đã tự dán điệp khúc', () => {
    const pasted = `${SONG}

ĐK: Vì Chúa là Thiên Chúa cao cả,
là Đại Vương trổi vượt chư thần.`;
    const slides = splitLyrics(pasted, { maxLines: 4 });
    // PK1, ĐK, PK2, ĐK(dán tay) — không chèn thêm bản sao thứ ba
    expect(slides).toHaveLength(4);
  });
});

describe('splitLyrics — chia theo maxLines', () => {
  it('khối dài chia thành nhiều slide, ưu tiên ngắt cuối câu', () => {
    const raw = `Dòng một chưa hết câu,
dòng hai kết thúc câu.
Dòng ba tiếp tục,
dòng bốn kết thúc.`;
    const slides = splitLyrics(raw, { maxLines: 3 });
    // Cửa sổ 3 dòng đầu: dòng 2 kết thúc bằng dấu chấm → ngắt sau dòng 2
    expect(slides).toHaveLength(2);
    expect(slides[0].lines).toHaveLength(2);
    expect(slides[1].lines).toHaveLength(2);
  });

  it('không có dấu câu thì cắt cứng tại maxLines', () => {
    const raw = ['a', 'b', 'c', 'd', 'e'].join('\n');
    const slides = splitLyrics(raw, { maxLines: 2 });
    expect(slides.map((s) => s.lines)).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
  });

  it('không bao giờ tách đôi một dòng', () => {
    const slides = splitLyrics('một dòng rất dài không có xuống dòng nào cả', { maxLines: 2 });
    expect(slides).toHaveLength(1);
    expect(slides[0].lines).toHaveLength(1);
  });
});

describe('splitLyrics — biến thể prefix điệp khúc & unicode', () => {
  it('nhận "Điệp khúc:", "ĐK.", "dk:"', () => {
    for (const prefix of ['Điệp khúc:', 'ĐK.', 'dk:', 'ĐIỆP KHÚC.']) {
      const slides = splitLyrics(`${prefix} câu hát điệp khúc`, { maxLines: 4 });
      expect(slides[0].is_chorus).toBe(true);
      expect(slides[0].lines[0]).toBe('câu hát điệp khúc');
    }
  });

  it('chuẩn hóa NFC: "ĐK" gõ dạng tổ hợp vẫn nhận ra', () => {
    // 'ĐK' với chữ K + dấu (không có thật) — thay bằng chữ có dấu tổ hợp: 'ĐK' chuẩn + nội dung NFD
    const nfd = 'ĐK: điệp khúc'.normalize('NFD');
    const slides = splitLyrics(nfd, { maxLines: 4 });
    expect(slides[0].is_chorus).toBe(true);
    expect(slides[0].lines[0]).toBe('điệp khúc'.normalize('NFC'));
  });

  it('điệp khúc nhiều dòng, prefix nằm riêng một dòng', () => {
    const slides = splitLyrics('ĐK:\ncâu một\ncâu hai', { maxLines: 4 });
    expect(slides[0].is_chorus).toBe(true);
    expect(slides[0].lines).toEqual(['câu một', 'câu hai']);
  });
});

describe('splitLyrics — bài bắt đầu bằng điệp khúc', () => {
  it('ĐK đứng đầu vẫn lặp sau từng phiên khúc', () => {
    const raw = `ĐK: điệp khúc mở đầu

phiên khúc một

phiên khúc hai`;
    const slides = splitLyrics(raw, { maxLines: 4 });
    const kinds = slides.map((s) => s.is_chorus);
    expect(kinds).toEqual([true, false, true, false, true]);
  });
});
