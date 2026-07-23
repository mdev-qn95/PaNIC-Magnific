/**
 * Auto-chia slide lời bài hát / kinh nguyện (CLAUDE.md mục 8).
 * Pure function — không phụ thuộc DOM, dùng chung client/server/test.
 */

export interface LyricSlide {
  lines: string[];
  is_chorus: boolean;
}

export interface SplitOptions {
  /** Số dòng tối đa mỗi slide (theo hướng ngang/dọc, xem mục 7). */
  maxLines: number;
  /** Tự lặp điệp khúc sau mỗi phiên khúc. Mặc định true. */
  autoRepeatChorus?: boolean;
}

interface Block {
  lines: string[];
  isChorus: boolean;
}

/** Dòng bắt đầu bằng ĐK: / ĐK. / DK: / Điệp khúc … là điệp khúc. */
const CHORUS_PREFIX = /^(?:đk|dk|điệp\s*khúc)\s*[.:]?\s*/iu;

/** Ngắt slide ưu tiên tại dòng kết thúc câu. */
const SENTENCE_END = /[.!?…]["']?\s*$/u;

function toBlocks(raw: string): Block[] {
  const lines = raw.normalize('NFC').split(/\r?\n/).map((l) => l.trim());
  const blocks: Block[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length === 0) return;
    let isChorus = false;
    const first = current[0];
    if (CHORUS_PREFIX.test(first)) {
      isChorus = true;
      const stripped = first.replace(CHORUS_PREFIX, '').trim();
      if (stripped) current[0] = stripped;
      else current.shift();
    }
    if (current.length > 0) blocks.push({ lines: current, isChorus });
    current = [];
  };

  for (const line of lines) {
    if (line === '') flush();
    else current.push(line);
  }
  flush();
  return blocks;
}

/** Chia một khối thành các trang ≤ maxLines dòng, ưu tiên ngắt tại cuối câu. */
function chunk(lines: string[], maxLines: number): string[][] {
  const out: string[][] = [];
  let rest = lines;
  while (rest.length > maxLines) {
    let cut = maxLines;
    for (let i = maxLines; i >= 1; i--) {
      if (SENTENCE_END.test(rest[i - 1])) {
        cut = i;
        break;
      }
    }
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest.length > 0) out.push(rest);
  return out;
}

function blockKey(b: Block): string {
  return b.lines.join('\n').toLowerCase();
}

export function splitLyrics(raw: string, opts: SplitOptions): LyricSlide[] {
  const { maxLines, autoRepeatChorus = true } = opts;
  if (maxLines < 1) throw new Error('maxLines phải ≥ 1');

  const blocks = toBlocks(raw);
  const slidesOf = (b: Block): LyricSlide[] =>
    chunk(b.lines, maxLines).map((lines) => ({ lines, is_chorus: b.isChorus }));

  const out: LyricSlide[] = [];
  let lastChorus: Block | null = null;

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    out.push(...slidesOf(b));
    if (b.isChorus) {
      lastChorus = b;
      continue;
    }
    // Sau phiên khúc: chèn lại điệp khúc gần nhất — trừ khi người dùng
    // đã tự dán chính điệp khúc đó ngay sau (tránh lặp đôi).
    if (autoRepeatChorus && lastChorus) {
      const next = blocks[i + 1];
      const nextIsSameChorus =
        next !== undefined && next.isChorus && blockKey(next) === blockKey(lastChorus);
      if (!nextIsSameChorus) out.push(...slidesOf(lastChorus));
    }
  }
  return out;
}
