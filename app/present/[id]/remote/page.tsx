'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { loadSnapshotSmart } from '@/lib/offline';
import { type MassSnapshot } from '@/lib/present';
import { createPresentChannel, type PresentChannel } from '@/lib/present-transport';

/**
 * Điều khiển từ điện thoại (Phase 3) — mobile-first, nút to.
 * Gửi NEXT/PREV/BLACK qua transport (Realtime khi khác máy, BC khi cùng máy);
 * control là nguồn chân lý và re-broadcast GOTO/STATE để remote hiển thị đúng.
 */
export default function RemotePage({ params }: { params: { id: string } }) {
  const [snap, setSnap] = useState<MassSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [black, setBlack] = useState(false);
  const chanRef = useRef<PresentChannel | null>(null);

  useEffect(() => {
    loadSnapshotSmart(params.id)
      .then(({ snap }) => setSnap(snap))
      .catch((e) => setError(e instanceof Error ? e.message : 'Không tải được lễ.'));
  }, [params.id]);

  useEffect(() => {
    const ch = createPresentChannel(params.id, (msg) => {
      switch (msg.type) {
        case 'STATE':
          setIndex(msg.index);
          setBlack(msg.black);
          break;
        case 'GOTO':
          setIndex(msg.index);
          break;
        case 'BLACK':
          setBlack(msg.on);
          break;
      }
    });
    chanRef.current = ch;
    ch.send({ type: 'REQUEST_STATE' });
    return () => ch.close();
  }, [params.id]);

  const total = snap?.landscape.length ?? 0;
  const cur = snap?.landscape[index];

  const next = () => {
    setIndex((i) => Math.min(total - 1, i + 1)); // optimistic — control sẽ xác nhận bằng GOTO
    chanRef.current?.send({ type: 'NEXT' });
  };
  const prev = () => {
    setIndex((i) => Math.max(0, i - 1));
    chanRef.current?.send({ type: 'PREV' });
  };
  const toggleBlack = () => {
    const on = !black;
    setBlack(on);
    chanRef.current?.send({ type: 'BLACK', on });
  };

  return (
    <div className="fixed inset-0 flex flex-col"
      style={{ background: 'var(--pres-bg)', color: 'var(--pres-ink)' }}>
      <div className="px-4 pb-2 pt-4 text-center">
        <div className="font-display text-[15px] font-semibold text-white">
          {snap?.massTitle ?? 'Đang tải…'}
        </div>
        <div className="mt-0.5 text-xs" style={{ color: 'var(--pres-sub)' }}>
          {error ?? (total ? `Slide ${index + 1} / ${total}` : '')}
        </div>
      </div>

      {cur && (
        <div className="mx-4 rounded-token-2 px-3 py-2.5 text-center text-[13px]"
          style={{ background: 'var(--pres-surface)', border: '1px solid var(--pres-line)' }}>
          <div className="truncate font-semibold">
            {cur.kind === 'blank' ? '⬛ Slide trống' : (cur.title ?? cur.itemLabel)}
          </div>
          <div className="truncate text-[11px]" style={{ color: 'var(--pres-sub)' }}>
            {cur.lines?.[0] ?? cur.itemLabel}
          </div>
        </div>
      )}

      <div className="flex flex-1 gap-3 p-4">
        <button
          onClick={prev}
          className="flex flex-1 flex-col items-center justify-center gap-2 rounded-token text-lg font-bold active:opacity-70"
          style={{ background: 'var(--pres-surface)', border: '1px solid var(--pres-line)', color: 'var(--pres-ink)' }}
        >
          <ChevronLeft size={44} />
          Lùi
        </button>
        <button
          onClick={next}
          className="flex flex-1 flex-col items-center justify-center gap-2 rounded-token text-lg font-bold active:opacity-70"
          style={{ background: 'var(--pres-accent)', color: 'var(--pres-accent-ink)' }}
        >
          <ChevronRight size={44} />
          Tiếp
        </button>
      </div>

      <div className="px-4 pb-6">
        <button
          onClick={toggleBlack}
          className="w-full rounded-token py-4 text-[15px] font-bold active:opacity-70"
          style={{
            background: black ? '#000' : 'var(--pres-surface)',
            border: '1px solid var(--pres-line)',
            color: black ? '#fff' : 'var(--pres-ink)',
          }}
        >
          {black ? '⬛ Đèn đen ĐANG BẬT — chạm để tắt' : 'Đèn đen (khi cha giảng)'}
        </button>
      </div>
    </div>
  );
}
