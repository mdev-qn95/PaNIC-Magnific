'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MonitorPlay, X } from 'lucide-react';
import SlideRenderer from '@/components/SlideRenderer';
import { getOfflineSavedAt, loadSnapshotSmart } from '@/lib/offline';
import { isQuickId, quickBackHref, type MassSnapshot, type SnapshotSlide } from '@/lib/present';
import { createPresentChannel, type PresentChannel } from '@/lib/present-transport';

function Thumb({
  slide,
  color,
  size,
}: {
  slide: SnapshotSlide;
  color: MassSnapshot['color'];
  size: 'lg' | 'sm';
}) {
  if (slide.kind === 'blank') {
    return <div className="w-full rounded-[10px] bg-black" style={{ aspectRatio: '16 / 9' }} />;
  }
  return (
    <SlideRenderer
      orientation="landscape"
      color={color}
      background={slide.background ?? null}
      fontScale={slide.fontScale}
      slide={{
        title: slide.title,
        lines: slide.lines,
        isChorus: size === 'lg' ? slide.isChorus : undefined,
        badge: size === 'lg' ? slide.badge : undefined,
      }}
    />
  );
}

export default function ControlPage({ params }: { params: { id: string } }) {
  const [snap, setSnap] = useState<MassSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [black, setBlack] = useState(false);
  const [connected, setConnected] = useState(false);
  const [numBuf, setNumBuf] = useState('');
  const [clock, setClock] = useState('');
  const chanRef = useRef<PresentChannel | null>(null);
  const stateRef = useRef({ index: 0, black: false });
  stateRef.current = { index, black };
  const goRef = useRef<(i: number) => void>(() => {});
  const [remoteUrl, setRemoteUrl] = useState('');
  const [showRemote, setShowRemote] = useState(false);

  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineSavedAt, setOfflineSavedAt] = useState<number | null>(null);
  useEffect(() => {
    loadSnapshotSmart(params.id)
      .then(({ snap, offline }) => {
        setSnap(snap);
        setOfflineMode(offline);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Không tải được lễ.'));
    getOfflineSavedAt(params.id).then(setOfflineSavedAt);
  }, [params.id]);

  useEffect(() => {
    setRemoteUrl(`${window.location.origin}/present/${params.id}/remote`);
    const ch = createPresentChannel(params.id, (msg) => {
      switch (msg.type) {
        case 'REQUEST_STATE': // screen hoặc remote mới mở
          setConnected(true);
          ch.send({ type: 'STATE', ...stateRef.current });
          break;
        case 'NEXT': // lệnh từ điện thoại — control là nguồn chân lý, re-broadcast GOTO
          goRef.current(stateRef.current.index + 1);
          break;
        case 'PREV':
          goRef.current(stateRef.current.index - 1);
          break;
        case 'GOTO': // từ control khác — áp mà không re-broadcast (tránh vòng lặp)
          setIndex(msg.index);
          break;
        case 'BLACK':
          setBlack(msg.on);
          break;
      }
    });
    chanRef.current = ch;
    return () => ch.close();
  }, [params.id]);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('vi-VN'));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const total = snap?.landscape.length ?? 0;

  const go = useCallback(
    (i: number) => {
      if (total === 0) return;
      const c = Math.max(0, Math.min(total - 1, i));
      setIndex(c);
      chanRef.current?.send({ type: 'GOTO', index: c });
    },
    [total],
  );
  useEffect(() => {
    goRef.current = go;
  }, [go]);

  const toggleBlack = useCallback(() => {
    setBlack((b) => {
      const on = !b;
      chanRef.current?.send({ type: 'BLACK', on });
      return on;
    });
  }, []);

  // Phím tắt (CLAUDE.md mục 3): → Space PgDn / ← PgUp / B / Home End / số + Enter
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) {
        setNumBuf((b) => (b + e.key).slice(-3));
        return;
      }
      if (e.key === 'Enter') {
        setNumBuf((b) => {
          const n = parseInt(b, 10);
          if (b && !Number.isNaN(n) && n >= 1) go(n - 1);
          return '';
        });
        return;
      }
      const i = stateRef.current.index;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        go(i + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        go(i - 1);
      } else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(total - 1);
      else if (e.key === 'b' || e.key === 'B') toggleBlack();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [go, toggleBlack, total]);

  const openScreen = () => {
    window.open(`/present/${params.id}/screen`, `magnific-screen-${params.id}`);
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center"
        style={{ background: 'var(--pres-bg)', color: 'var(--pres-ink)' }}>
        <div className="text-center text-[13px]">
          {error}
          <div className="mt-3"><Link href="/masses" className="btn btn-sm">← Về danh sách lễ</Link></div>
        </div>
      </div>
    );
  }

  const quick = isQuickId(params.id);
  const closeHref = quick ? quickBackHref(params.id) : `/masses/${params.id}/edit`;
  const cur = snap?.landscape[index];
  const next = snap?.landscape[index + 1];
  const prev = snap?.landscape[index - 1];
  const kbd = (k: string) => (
    <span className="rounded-md border px-1.5 py-0.5 text-[11px]"
      style={{ borderColor: 'var(--pres-line)', background: 'var(--pres-surface)', color: 'var(--pres-sub)' }}>
      {k}
    </span>
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden"
      style={{ background: 'var(--pres-bg)', color: 'var(--pres-ink)' }}>
      <div className="flex shrink-0 items-center justify-between px-6 py-4"
        style={{ background: 'var(--pres-surface)', borderBottom: '1px solid var(--pres-line)' }}>
        <div>
          <h1 className="font-display text-lg font-semibold text-white">
            {snap?.massTitle ?? 'Đang tải lễ…'}
          </h1>
          <div className="text-xs" style={{ color: 'var(--pres-sub)' }}>
            Slide {total ? index + 1 : 0} / {total} · {clock}
            {numBuf && <span className="ml-2 font-bold" style={{ color: 'var(--pres-accent)' }}>→ {numBuf}␍</span>}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          {!quick && (
            <span className="text-xs" style={{ color: 'var(--pres-sub)' }}>
              {offlineMode
                ? '📴 Đang chiếu bản offline'
                : offlineSavedAt
                  ? '✓ Đã tải offline'
                  : '⚠ Chưa tải offline'}
            </span>
          )}
          <span className="text-xs" style={{ color: connected ? 'var(--pres-accent)' : 'var(--pres-sub)' }}>
            ● {connected ? 'Tivi đã kết nối' : 'Tivi chưa mở'}
          </span>
          <button className="btn btn-sm" onClick={openScreen}
            style={{ background: 'var(--pres-accent)', borderColor: 'var(--pres-accent)', color: 'var(--pres-accent-ink)' }}>
            <MonitorPlay size={14} /> Mở màn hình tivi
          </button>
          <div className="relative">
            <button className="btn btn-sm" onClick={() => setShowRemote((v) => !v)}
              style={{ background: 'var(--pres-surface)', borderColor: 'var(--pres-line)', color: 'var(--pres-ink)' }}>
              📱 Remote
            </button>
            {showRemote && (
              <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-token-2 border p-3 text-xs"
                style={{ background: 'var(--pres-surface)', borderColor: 'var(--pres-line)', color: 'var(--pres-ink)' }}>
                <div className="mb-1.5 font-bold">Điều khiển từ điện thoại</div>
                <div className="mb-2 break-all rounded px-2 py-1.5"
                  style={{ background: 'var(--pres-bg)', color: 'var(--pres-sub)' }}>
                  {remoteUrl}
                </div>
                <button className="btn btn-sm mb-2"
                  style={{ background: 'var(--pres-accent)', borderColor: 'var(--pres-accent)', color: 'var(--pres-accent-ink)' }}
                  onClick={() => navigator.clipboard?.writeText(remoteUrl)}>
                  Copy link
                </button>
                <div style={{ color: 'var(--pres-sub)' }}>
                  Mở link này trên điện thoại. Cần app đã deploy (Vercel) và có mạng —
                  trong mạng nội bộ dùng địa chỉ LAN của máy này.
                </div>
              </div>
            )}
          </div>
          <button className="btn btn-sm" onClick={toggleBlack}
            style={{ background: black ? '#000' : 'var(--pres-surface)', borderColor: 'var(--pres-line)', color: 'var(--pres-ink)' }}>
            B · Đèn đen {black ? 'BẬT' : 'tắt'}
          </button>
          <Link href={closeHref} className="btn btn-sm"
            style={{ background: 'var(--pres-surface)', borderColor: 'var(--pres-line)', color: 'var(--pres-ink)' }}>
            <X size={14} />
          </Link>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        <div className="mb-2 text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--pres-sub)' }}>
          Lần đầu dùng: bấm &quot;Mở màn hình tivi&quot; → kéo cửa sổ mới sang tivi → bấm F11
        </div>
        {snap && cur && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
            <div>
              <div className="mb-1.5 text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--pres-sub)' }}>
                Đang chiếu {black ? '— màn hình đen' : ''}
              </div>
              <div className="relative">
                <Thumb slide={cur} color={snap.color} size="lg" />
                {black && <div className="absolute inset-0 rounded-[10px] bg-black" />}
              </div>
              <div className="mt-3 flex items-center justify-center gap-2">
                <button className="btn" onClick={() => go(index - 1)}
                  style={{ background: 'var(--pres-surface)', borderColor: 'var(--pres-line)', color: 'var(--pres-ink)' }}>
                  ← Lùi
                </button>
                <button className="btn" onClick={() => go(index + 1)}
                  style={{ background: 'var(--pres-accent)', borderColor: 'var(--pres-accent)', color: 'var(--pres-accent-ink)' }}>
                  Tiếp →
                </button>
                <span className="ml-2 flex gap-1">{kbd('Space')}{kbd('←')}{kbd('→')}{kbd('B')}{kbd('số + ↵')}</span>
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--pres-sub)' }}>
                Tiếp theo
              </div>
              {next ? <Thumb slide={next} color={snap.color} size="sm" /> : (
                <div className="card flex items-center justify-center py-8 text-xs"
                  style={{ background: 'var(--pres-surface)', borderColor: 'var(--pres-line)', color: 'var(--pres-sub)' }}>
                  — Hết lễ —
                </div>
              )}
              <div className="mb-1.5 mt-4 text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--pres-sub)' }}>
                Trước đó
              </div>
              <div className="opacity-60">
                {prev ? <Thumb slide={prev} color={snap.color} size="sm" /> : (
                  <div className="card flex items-center justify-center py-8 text-xs"
                    style={{ background: 'var(--pres-surface)', borderColor: 'var(--pres-line)', color: 'var(--pres-sub)' }}>
                    — Đầu lễ —
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {snap && (
          <>
            <div className="mb-2 mt-6 text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--pres-sub)' }}>
              Tất cả slide — click để nhảy nhanh
            </div>
            <div className="grid grid-cols-3 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {snap.landscape.map((s, i) => (
                <figure key={i} className="cursor-pointer" onClick={() => go(i)}>
                  <div className="rounded-[10px]"
                    style={{ outline: i === index ? '2px solid var(--pres-accent)' : '2px solid transparent', outlineOffset: 2 }}>
                    <Thumb slide={s} color={snap.color} size="sm" />
                  </div>
                  <figcaption className="mt-1 truncate text-center text-[10.5px]" style={{ color: 'var(--pres-sub)' }}>
                    {i + 1} · {s.itemLabel}
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
