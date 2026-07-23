'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import SlideRenderer from '@/components/SlideRenderer';
import Select from '@/components/ui/Select';
import {
  createResponsorial,
  PART_TITLE,
  RESP_SEASON_LABEL,
  RESP_SEASON_ORDER,
  slidesForPart,
  updateResponsorial,
  type Responsorial,
  type ResponsorialInput,
  type ResponsorialPart,
  type ResponsorialSeason,
  type ResponsorialSlide,
} from '@/lib/responsorials';
import { getSettings } from '@/lib/settings';
import { splitLyrics } from '@/lib/slide-splitter';

type Orientation = 'landscape' | 'portrait';

/** Text của một phần: mỗi dòng = 1 dòng slide, dòng trống = tách slide mới. */
function partToText(r: Responsorial | undefined, part: ResponsorialPart): string {
  if (!r) return '';
  return slidesForPart(r, part).map((s) => s.lines.join('\n')).join('\n\n');
}

export default function ResponsorialEditor({ item }: { item?: Responsorial }) {
  const router = useRouter();
  const [season, setSeason] = useState<ResponsorialSeason>(item?.season ?? 'thuong_nien');
  const [occasion, setOccasion] = useState(item?.occasion ?? '');
  const [dapCa, setDapCa] = useState(() => partToText(item, 'dap_ca'));
  const [tungHo, setTungHo] = useState(() => partToText(item, 'tung_ho'));
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [ml, setMl] = useState({ landscape: 4, portrait: 6 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // chỉnh tay: gộp/tách theo từng phần
  const [manual, setManual] = useState<Record<ResponsorialPart, string[][] | null>>({
    dap_ca: null, tung_ho: null,
  });

  useEffect(() => {
    getSettings().then((s) =>
      setMl({ landscape: s.max_lines_landscape, portrait: s.max_lines_portrait }),
    );
  }, []);

  const auto = (text: string): string[][] =>
    text.trim()
      ? splitLyrics(text, { maxLines: ml[orientation], autoRepeatChorus: false }).map((s) => s.lines)
      : [];

  const autoDapCa = useMemo(() => auto(dapCa), [dapCa, ml, orientation]);
  const autoTungHo = useMemo(() => auto(tungHo), [tungHo, ml, orientation]);
  useEffect(() => {
    setManual({ dap_ca: null, tung_ho: null });
  }, [dapCa, tungHo, ml, orientation]);

  const slidesOf = (part: ResponsorialPart) =>
    manual[part] ?? (part === 'dap_ca' ? autoDapCa : autoTungHo);

  const mergeUp = (part: ResponsorialPart, i: number) => {
    if (i === 0) return;
    const next = slidesOf(part).map((l) => [...l]);
    next[i - 1].push(...next[i]);
    next.splice(i, 1);
    setManual((m) => ({ ...m, [part]: next }));
  };
  const splitHalf = (part: ResponsorialPart, i: number) => {
    const cur = slidesOf(part);
    if (cur[i].length < 2) return;
    const at = Math.ceil(cur[i].length / 2);
    const next = cur.map((l) => [...l]);
    next.splice(i, 1, cur[i].slice(0, at), cur[i].slice(at));
    setManual((m) => ({ ...m, [part]: next }));
  };

  const save = async () => {
    const occ = occasion.trim().normalize('NFC');
    if (!occ) return setError('Nhập tên dịp lễ (ví dụ: Chúa nhật 16 năm A).');
    if (!dapCa.trim()) return setError('Nhập câu đáp ca.');
    setSaving(true);
    setError(null);
    // Bộ slide chuẩn lưu theo hướng ngang (hướng dọc tự chia lại khi chiếu)
    const build = (text: string, part: ResponsorialPart): ResponsorialSlide[] => {
      const lines =
        manual[part] && orientation === 'landscape'
          ? manual[part]!
          : text.trim()
            ? splitLyrics(text, { maxLines: ml.landscape, autoRepeatChorus: false }).map((s) => s.lines)
            : [];
      return lines.map((l) => ({ title: PART_TITLE[part], lines: l, part }));
    };
    const input: ResponsorialInput = {
      season,
      occasion: occ,
      psalm_response: dapCa.replace(/\s+/g, ' ').trim().normalize('NFC'),
      gospel_acclamation: tungHo.trim() ? tungHo.replace(/\s+/g, ' ').trim().normalize('NFC') : null,
      slides: [...build(dapCa, 'dap_ca'), ...build(tungHo, 'tung_ho')],
    };
    try {
      if (item) await updateResponsorial(item.id, input);
      else await createResponsorial(input);
      router.push('/responsorials');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại — thử lại.');
      setSaving(false);
    }
  };

  const partBlock = (part: ResponsorialPart, text: string, setText: (v: string) => void, hint: string) => {
    const slides = slidesOf(part);
    return (
      <div>
        <label className="field-label">
          {PART_TITLE[part]} <span className="font-normal text-ink-3">{hint}</span>
        </label>
        <textarea className="field min-h-[130px] leading-7" value={text}
          onChange={(e) => setText(e.target.value)} />
        <div className="mb-1.5 mt-2.5 text-[11px] uppercase tracking-wider text-ink-3">
          {slides.length} slide{manual[part] ? ' · đã chỉnh tay' : ''}
        </div>
        {slides.length === 0 ? (
          <div className="card px-4 py-6 text-center text-[13px] text-ink-3">Chưa có nội dung</div>
        ) : (
          <div className={`grid gap-3 ${orientation === 'landscape' ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {slides.map((lines, i) => (
              <figure key={i}>
                <SlideRenderer orientation={orientation} color="xanh"
                  slide={{ badge: i === 0 ? PART_TITLE[part] : undefined, lines }} />
                <figcaption className="mt-1 flex items-center justify-center gap-2 text-[10.5px] text-ink-2">
                  {i + 1}
                  {i > 0 && (
                    <button className="font-bold text-primary" onClick={() => mergeUp(part, i)}>gộp ↑</button>
                  )}
                  {lines.length >= 2 && (
                    <button className="font-bold text-primary" onClick={() => splitHalf(part, i)}>tách ↕</button>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title={item ? 'Sửa Đáp ca / Tung hô' : 'Thêm Đáp ca / Tung hô'}
        sub={item?.occasion ?? 'Mỗi dòng = 1 dòng trên slide · dòng trống = tách slide mới'}
      >
        <Link href="/responsorials" className="btn">Hủy</Link>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Đang lưu…' : 'Lưu'}
        </button>
      </PageHeader>

      <div className="flex-1 overflow-auto px-7 py-5">
        {error && (
          <div className="mb-4 rounded-token-2 border px-4 py-2.5 text-[13px]"
            style={{ borderColor: 'var(--lit-do)', color: 'var(--lit-do)' }}>
            {error}
          </div>
        )}

        <div className="mb-5 flex flex-wrap items-end gap-3.5">
          <div className="min-w-[320px] flex-1">
            <label className="field-label">Dịp lễ</label>
            <input className="field" value={occasion} onChange={(e) => setOccasion(e.target.value)}
              placeholder="Ví dụ: Chúa nhật 16 năm A / Thứ 2-15 (Năm lẻ) / Ngày 25-1 — Thánh Phao-lô" />
          </div>
          <div className="w-52">
            <label className="field-label">Mùa</label>
            <Select
              value={season}
              options={RESP_SEASON_ORDER.map((s) => ({ value: s, label: RESP_SEASON_LABEL[s] }))}
              onChange={setSeason}
            />
          </div>
          <div className="flex gap-1.5">
            <button className={`chip ${orientation === 'landscape' ? 'chip-on' : ''}`}
              onClick={() => setOrientation('landscape')}>Ngang</button>
            <button className={`chip ${orientation === 'portrait' ? 'chip-on' : ''}`}
              onClick={() => setOrientation('portrait')}>Dọc</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {partBlock('dap_ca', dapCa, setDapCa, '(câu đáp cộng đoàn thưa)')}
          {partBlock('tung_ho', tungHo, setTungHo, '(câu Alleluia trước Tin Mừng)')}
        </div>
      </div>
    </>
  );
}
