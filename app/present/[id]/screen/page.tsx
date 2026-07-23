'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import SlideRenderer from '@/components/SlideRenderer';
import { loadSnapshotSmart } from '@/lib/offline';
import { type MassSnapshot } from '@/lib/present';
import { createPresentChannel } from '@/lib/present-transport';

type OrientationMode = 'auto' | 'landscape' | 'portrait';

export default function ScreenPage({ params }: { params: { id: string } }) {
  const [snap, setSnap] = useState<MassSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [black, setBlack] = useState(false);
  const [mode, setMode] = useState<OrientationMode>('auto');
  const [detected, setDetected] = useState<'landscape' | 'portrait'>('landscape');
  const [showUI, setShowUI] = useState(true);
  const totalRef = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadSnapshotSmart(params.id)
      .then(({ snap }) => {
        setSnap(snap);
        totalRef.current = snap.landscape.length;
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Không tải được lễ.'));
  }, [params.id]);

  // Tự detect hướng tivi (CLAUDE.md mục 7)
  useEffect(() => {
    const detect = () =>
      setDetected(window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait');
    detect();
    window.addEventListener('resize', detect);
    return () => window.removeEventListener('resize', detect);
  }, []);

  const clampGo = useCallback((i: number) => {
    setIndex(Math.max(0, Math.min(totalRef.current - 1, i)));
  }, []);

  // Kênh đồng bộ: screen xin state khi mở, nghe mọi lệnh (từ control hoặc remote)
  useEffect(() => {
    const ch = createPresentChannel(params.id, (msg) => {
      switch (msg.type) {
        case 'STATE':
          setIndex(msg.index);
          setBlack(msg.black);
          break;
        case 'GOTO':
          clampGo(msg.index);
          break;
        case 'NEXT':
          setIndex((i) => Math.min(totalRef.current - 1, i + 1));
          break;
        case 'PREV':
          setIndex((i) => Math.max(0, i - 1));
          break;
        case 'BLACK':
          setBlack(msg.on);
          break;
      }
    });
    ch.send({ type: 'REQUEST_STATE' });
    return () => ch.close();
  }, [params.id, clampGo]);

  // Screen cũng nhận phím (trường hợp 1 màn hình Duplicate) — control vẫn là chính
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        setIndex((i) => Math.min(totalRef.current - 1, i + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Home') setIndex(0);
      else if (e.key === 'End') setIndex(Math.max(0, totalRef.current - 1));
      else if (e.key === 'b' || e.key === 'B') setBlack((b) => !b);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Toggle ép hướng ẩn sau 3 giây không di chuột (CLAUDE.md mục 7)
  useEffect(() => {
    const poke = () => {
      setShowUI(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setShowUI(false), 3000);
    };
    poke();
    window.addEventListener('mousemove', poke);
    return () => {
      window.removeEventListener('mousemove', poke);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const orientation = mode === 'auto' ? detected : mode;
  // Render bộ landscape để đồng bộ index tuyệt đối với control;
  // hướng dọc đổi typography + auto-fit lo phần tràn (xem ghi chú lib/present.ts)
  const cur = snap?.landscape[index];

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-sm text-white">
        {error}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {snap && cur && cur.kind !== 'blank' && !black && (
        <SlideRenderer
          fullscreen
          orientation={orientation}
          color={snap.color}
          background={cur.background ?? null}
          fontScale={cur.fontScale}
          slide={{ title: cur.title, lines: cur.lines, isChorus: cur.isChorus, badge: cur.badge }}
        />
      )}

      {showUI && snap && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-lg bg-black/70 px-2.5 py-1.5 text-[11px] text-white">
          <span className="mr-1 opacity-70">
            {index + 1}/{snap.landscape.length}
          </span>
          {(['auto', 'landscape', 'portrait'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="rounded px-2 py-0.5"
              style={{
                background: mode === m ? 'var(--pres-accent)' : 'transparent',
                color: mode === m ? 'var(--pres-accent-ink)' : '#fff',
              }}
            >
              {m === 'auto' ? 'Tự động' : m === 'landscape' ? 'Ngang' : 'Dọc'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
