'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import SlideRenderer from '@/components/SlideRenderer';
import Checkbox from '@/components/ui/Checkbox';
import Select from '@/components/ui/Select';
import { splitLyrics, type LyricSlide } from '@/lib/slide-splitter';
import { getSettings } from '@/lib/settings';
import { createSong, updateSong, type SongInput } from '@/lib/songs';
import { SONG_CATEGORY_LABEL, type Song, type SongCategory } from '@/lib/types';

type Orientation = 'landscape' | 'portrait';

export default function SongEditor({ song }: { song?: Song }) {
  const router = useRouter();
  // Số dòng tối đa đọc từ Settings (CLAUDE.md mục 7) — mặc định 4/6 tới khi load
  const [maxLines, setMaxLines] = useState({ landscape: 4, portrait: 6 });
  useEffect(() => {
    getSettings().then((s) =>
      setMaxLines({ landscape: s.max_lines_landscape, portrait: s.max_lines_portrait }),
    );
  }, []);
  const [title, setTitle] = useState(song?.title ?? '');
  const [author, setAuthor] = useState(song?.author ?? '');
  const [category, setCategory] = useState<SongCategory>(song?.category ?? 'nhap_le');
  const [lyrics, setLyrics] = useState(song?.lyrics_raw ?? '');
  const [autoRepeat, setAutoRepeat] = useState(true);
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  // Chỉnh tay (gộp/tách) đè lên kết quả auto — reset khi lời/tùy chọn đổi
  const [manual, setManual] = useState<LyricSlide[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auto = useMemo(() => {
    if (!lyrics.trim()) return [];
    return splitLyrics(lyrics, {
      maxLines: maxLines[orientation],
      autoRepeatChorus: autoRepeat,
    });
  }, [lyrics, autoRepeat, orientation, maxLines]);

  useEffect(() => {
    setManual(null);
  }, [lyrics, autoRepeat, orientation, maxLines]);

  const slides = manual ?? auto;

  const mergeUp = (i: number) => {
    if (i === 0) return;
    const next = slides.map((s) => ({ ...s, lines: [...s.lines] }));
    next[i - 1].lines.push(...next[i].lines);
    next.splice(i, 1);
    setManual(next);
  };

  const splitHalf = (i: number) => {
    const s = slides[i];
    if (s.lines.length < 2) return;
    const at = Math.ceil(s.lines.length / 2);
    const next = slides.map((x) => ({ ...x, lines: [...x.lines] }));
    next.splice(i, 1,
      { ...s, lines: s.lines.slice(0, at) },
      { ...s, lines: s.lines.slice(at) },
    );
    setManual(next);
  };

  const save = async () => {
    const t = title.trim().normalize('NFC');
    if (!t) return setError('Nhập tên bài hát.');
    if (slides.length === 0) return setError('Dán lời bài hát trước khi lưu.');
    setSaving(true);
    setError(null);
    // Lưu bộ slide theo hướng ngang làm bản chính (schema mục 5);
    // hướng dọc tái sinh từ lyrics_raw khi tạo snapshot.
    const canonical =
      orientation === 'landscape'
        ? slides
        : splitLyrics(lyrics, { maxLines: maxLines.landscape, autoRepeatChorus: autoRepeat });
    const input: SongInput = {
      title: t,
      author: author.trim().normalize('NFC') || null,
      category,
      lyrics_raw: lyrics.normalize('NFC'),
      slides: canonical,
    };
    try {
      if (song) await updateSong(song.id, input);
      else await createSong(input);
      router.push('/songs');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại — thử lại.');
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={song ? 'Sửa bài hát' : 'Thêm bài hát'}
        sub={song?.title ?? 'Dán lời thô — slide tự sinh, chỉnh được điểm ngắt'}
      >
        <Link href="/songs" className="btn">Hủy</Link>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Đang lưu…' : 'Lưu bài hát'}
        </button>
      </PageHeader>

      <div className="flex-1 overflow-auto px-7 py-5">
        {error && (
          <div className="mb-4 rounded-token-2 border px-4 py-2.5 text-[13px]"
            style={{ borderColor: 'var(--lit-do)', color: 'var(--lit-do)', background: 'var(--surface)' }}>
            {error}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-end gap-3.5">
          <div className="min-w-[260px] flex-1">
            <label className="field-label">Tên bài</label>
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Hãy Đến Tung Hô Chúa" />
          </div>
          <div className="w-44">
            <label className="field-label">Thể loại</label>
            <Select
              value={category}
              options={Object.entries(SONG_CATEGORY_LABEL).map(([v, l]) => ({
                value: v as SongCategory, label: l,
              }))}
              onChange={setCategory}
            />
          </div>
          <div className="w-44">
            <label className="field-label">Tác giả</label>
            <input className="field" value={author} onChange={(e) => setAuthor(e.target.value)}
              placeholder="Tùy chọn" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div>
            <label className="field-label">
              Lời bài hát (mỗi khối cách nhau 1 dòng trống · dòng đầu &quot;ĐK:&quot; = điệp khúc)
            </label>
            <textarea
              className="field min-h-[340px] leading-7"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder={'Hãy đến tung hô Chúa, reo mừng Đấng cứu thoát ta.\nNào cùng đến trước thánh nhan, dâng lời cảm tạ.\n\nĐK: Vì Chúa là Thiên Chúa cao cả,\nlà Đại Vương trổi vượt chư thần.'}
            />
            <div className="mt-2.5">
              <Checkbox checked={autoRepeat} onChange={setAutoRepeat}
                label="Tự lặp điệp khúc sau mỗi phiên khúc" />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="field-label !mb-0">
                Slide tự sinh — {slides.length} slide ({orientation === 'landscape' ? `ngang, tối đa ${maxLines.landscape} dòng` : `dọc, tối đa ${maxLines.portrait} dòng`})
                {manual && <span className="ml-1.5 text-ink-3">(đã chỉnh tay)</span>}
              </label>
              <div className="flex gap-1.5">
                <button className={`chip ${orientation === 'landscape' ? 'chip-on' : ''}`}
                  onClick={() => setOrientation('landscape')}>Ngang</button>
                <button className={`chip ${orientation === 'portrait' ? 'chip-on' : ''}`}
                  onClick={() => setOrientation('portrait')}>Dọc</button>
              </div>
            </div>

            {slides.length === 0 ? (
              <div className="card px-6 py-14 text-center text-[13px] text-ink-3">
                Dán lời bên trái để xem slide tự sinh
              </div>
            ) : (
              <div className={`grid gap-3 ${orientation === 'landscape' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {slides.map((s, i) => (
                  <figure key={i}>
                    <SlideRenderer
                      orientation={orientation}
                      slide={{ lines: s.lines, isChorus: s.is_chorus }}
                    />
                    <figcaption className="mt-1 flex items-center justify-center gap-2 text-[10.5px] text-ink-2">
                      {i + 1}{s.is_chorus ? ' · ĐK' : ''}
                      {i > 0 && (
                        <button className="font-bold text-primary" onClick={() => mergeUp(i)}
                          data-tip="Gộp vào slide trước">gộp ↑</button>
                      )}
                      {s.lines.length >= 2 && (
                        <button className="font-bold text-primary" onClick={() => splitHalf(i)}
                          data-tip="Tách đôi slide">tách ↕</button>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
            {manual && (
              <button className="btn btn-sm mt-3" onClick={() => setManual(null)}>
                ↺ Chia lại tự động (bỏ chỉnh tay)
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
