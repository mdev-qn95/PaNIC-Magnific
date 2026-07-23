'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Download, FileDown, Play } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SlidePreviewGrid from '@/components/SlidePreviewGrid';
import { getOfflineSavedAt, saveOffline } from '@/lib/offline';
import { exportMassToPptx } from '@/lib/pptx';
import { buildSnapshot, type MassSnapshot } from '@/lib/present';

type Orientation = 'landscape' | 'portrait';

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${d.toLocaleDateString('vi-VN')}`;
}

export default function MassPreviewPage({ params }: { params: { id: string } }) {
  const [snap, setSnap] = useState<MassSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [pptx, setPptx] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    buildSnapshot(params.id)
      .then(setSnap)
      .catch((e) => setError(e instanceof Error ? e.message : 'Không tải được lễ.'));
    getOfflineSavedAt(params.id).then(setSavedAt);
  }, [params.id]);

  const download = async () => {
    setDownloading(true);
    setError(null);
    try {
      setSavedAt(await saveOffline(params.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tải offline thất bại.');
    } finally {
      setDownloading(false);
    }
  };

  const exportPptx = async () => {
    if (!snap) return;
    setError(null);
    setPptx({ done: 0, total: snap[orientation].length });
    try {
      await exportMassToPptx(snap, orientation, setPptx);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xuất PowerPoint thất bại.');
    } finally {
      setPptx(null);
    }
  };

  const slides = snap ? snap[orientation] : [];

  return (
    <>
      <PageHeader
        title={snap ? `Xem trước — ${snap.massTitle}` : 'Xem trước'}
        sub={snap ? `${slides.length} slide · hướng: ${orientation === 'landscape' ? 'Ngang' : 'Dọc'}` : 'Đang tải…'}
      >
        <button className={`chip ${orientation === 'landscape' ? 'chip-on' : ''}`}
          onClick={() => setOrientation('landscape')}>Ngang</button>
        <button className={`chip ${orientation === 'portrait' ? 'chip-on' : ''}`}
          onClick={() => setOrientation('portrait')}>Dọc</button>
        <button className="btn" onClick={download} disabled={downloading || !snap}>
          <Download size={15} />
          {downloading ? 'Đang tải về máy…' : savedAt ? 'Tải lại offline' : 'Tải để chiếu offline'}
        </button>
        <button className="btn" onClick={exportPptx} disabled={Boolean(pptx) || !snap}
          data-tip="Xuất file .pptx để chiếu bằng PowerPoint">
          <FileDown size={15} />
          {pptx ? `Đang xuất ${pptx.done}/${pptx.total}…` : 'Xuất PowerPoint'}
        </button>
        <Link href={`/present/${params.id}/control`} className="btn btn-primary">
          <Play size={15} /> Trình chiếu
        </Link>
      </PageHeader>

      <div className="flex-1 overflow-auto px-7 py-5">
        {error && <div className="mb-4 text-[13px]" style={{ color: 'var(--lit-do)' }}>{error}</div>}
        {savedAt && (
          <div className="mb-4 rounded-token-2 border border-line bg-primary-soft px-4 py-2 text-xs text-ink-2">
            ✓ Đã tải offline lúc {fmtTime(savedAt)} — nhà thờ mất mạng vẫn chiếu được.
            Sửa lễ xong nhớ bấm &quot;Tải lại offline&quot;.
          </div>
        )}

        {snap && (
          <SlidePreviewGrid
            orientation={orientation}
            color={snap.color}
            slides={slides.map((s, i) => ({
              blank: s.kind === 'blank',
              title: s.title,
              lines: s.lines,
              isChorus: s.isChorus,
              badge: s.badge,
              fontScale: s.fontScale,
              background: s.background ?? null,
              caption: `${i + 1} · ${s.itemLabel}`,
            }))}
          />
        )}
      </div>
    </>
  );
}
