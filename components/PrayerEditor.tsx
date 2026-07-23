'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import SlideRenderer from '@/components/SlideRenderer';
import { createPrayer, updatePrayer, type PrayerInput } from '@/lib/prayers';
import { getSettings } from '@/lib/settings';
import { splitLyrics } from '@/lib/slide-splitter';
import type { Prayer, PrayerSlide } from '@/lib/types';

type Orientation = 'landscape' | 'portrait';

export default function PrayerEditor({ prayer }: { prayer?: Prayer }) {
  const router = useRouter();
  const [maxLines, setMaxLines] = useState({ landscape: 4, portrait: 6 });
  useEffect(() => {
    getSettings().then((s) =>
      setMaxLines({ landscape: s.max_lines_landscape, portrait: s.max_lines_portrait }),
    );
  }, []);
  const [title, setTitle] = useState(prayer?.title ?? '');
  const [content, setContent] = useState(prayer?.content_raw ?? '');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [manual, setManual] = useState<PrayerSlide[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kinh không có điệp khúc (CLAUDE.md màn #8) — tắt lặp, bỏ cờ is_chorus
  const auto = useMemo<PrayerSlide[]>(() => {
    if (!content.trim()) return [];
    return splitLyrics(content, {
      maxLines: maxLines[orientation],
      autoRepeatChorus: false,
    }).map((s) => ({ lines: s.lines }));
  }, [content, orientation, maxLines]);

  useEffect(() => {
    setManual(null);
  }, [content, orientation, maxLines]);

  const slides = manual ?? auto;

  const mergeUp = (i: number) => {
    if (i === 0) return;
    const next = slides.map((s) => ({ lines: [...s.lines] }));
    next[i - 1].lines.push(...next[i].lines);
    next.splice(i, 1);
    setManual(next);
  };

  const splitHalf = (i: number) => {
    const s = slides[i];
    if (s.lines.length < 2) return;
    const at = Math.ceil(s.lines.length / 2);
    const next = slides.map((x) => ({ lines: [...x.lines] }));
    next.splice(i, 1, { lines: s.lines.slice(0, at) }, { lines: s.lines.slice(at) });
    setManual(next);
  };

  const save = async () => {
    const t = title.trim().normalize('NFC');
    if (!t) return setError('Nhập tên kinh.');
    if (slides.length === 0) return setError('Nhập nội dung kinh trước khi lưu.');
    setSaving(true);
    setError(null);
    const canonical =
      orientation === 'landscape'
        ? slides
        : splitLyrics(content, { maxLines: maxLines.landscape, autoRepeatChorus: false }).map(
            (s) => ({ lines: s.lines }),
          );
    const input: PrayerInput = {
      title: t,
      content_raw: content.normalize('NFC'),
      slides: canonical,
    };
    try {
      if (prayer) await updatePrayer(prayer.id, input);
      else await createPrayer(input);
      router.push('/prayers');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại — thử lại.');
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={prayer ? 'Sửa kinh' : 'Thêm kinh'}
        sub={prayer?.title ?? 'Giống soạn bài hát nhưng không có điệp khúc'}
      >
        <Link href="/prayers" className="btn">Hủy</Link>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Đang lưu…' : 'Lưu kinh'}
        </button>
      </PageHeader>

      <div className="flex-1 overflow-auto px-7 py-5">
        {error && (
          <div className="mb-4 rounded-token-2 border px-4 py-2.5 text-[13px]"
            style={{ borderColor: 'var(--lit-do)', color: 'var(--lit-do)', background: 'var(--surface)' }}>
            {error}
          </div>
        )}

        <div className="mb-4 max-w-xl">
          <label className="field-label">Tên kinh</label>
          <input className="field" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Kinh Cầu Các Thánh Tử Đạo Việt Nam" />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div>
            <label className="field-label">Nội dung kinh (mỗi đoạn cách nhau 1 dòng trống)</label>
            <textarea
              className="field min-h-[340px] leading-7"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={'Lạy Chúa...\ncâu tiếp theo...\n\nĐoạn thứ hai...'}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="field-label !mb-0">
                Slide tự sinh — {slides.length} slide
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
                Nhập nội dung bên trái để xem slide tự sinh
              </div>
            ) : (
              <div className={`grid gap-3 ${orientation === 'landscape' ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {slides.map((s, i) => (
                  <figure key={i}>
                    <SlideRenderer
                      orientation={orientation}
                      slide={{ badge: i === 0 ? title || undefined : undefined, lines: s.lines }}
                    />
                    <figcaption className="mt-1 flex items-center justify-center gap-2 text-[10.5px] text-ink-2">
                      {i + 1}
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
