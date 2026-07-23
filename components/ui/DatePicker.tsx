'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { getLiturgicalDay } from '@/lib/liturgical-calendar';

const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtVN = (s: string) => {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * Lịch chọn ngày theo theme — thay <input type="date"> (popup của trình duyệt
 * không style được). Chấm màu dưới mỗi ngày = màu phụng vụ hôm đó.
 */
export default function DatePicker({
  value,
  onChange,
  className = '',
}: {
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const d = value ? new Date(`${value}T12:00:00`) : new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !value) return;
    const d = new Date(`${value}T12:00:00`);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  }, [open, value]);

  // lưới 6 tuần, bắt đầu từ Chúa Nhật
  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [view]);

  const todayISO = iso(new Date());

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="field flex w-full items-center justify-between gap-2 text-left"
        style={open ? { borderColor: 'var(--primary)' } : undefined}
      >
        <span>{value ? fmtVN(value) : '— Chọn ngày —'}</span>
        <CalendarDays size={15} className="shrink-0 text-ink-3" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-[290px] rounded-token border border-line bg-surface p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" className="btn btn-sm !px-2"
              onClick={() => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { ...v, m: v.m - 1 }))}>
              <ChevronLeft size={15} />
            </button>
            <b className="font-display text-[13.5px] font-semibold text-heading">
              {MONTHS[view.m]} {view.y}
            </b>
            <button type="button" className="btn btn-sm !px-2"
              onClick={() => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { ...v, m: v.m + 1 }))}>
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10.5px] text-ink-3">
            {WD.map((w) => <div key={w}>{w}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d) => {
              const s = iso(d);
              const inMonth = d.getMonth() === view.m;
              const selected = s === value;
              const isToday = s === todayISO;
              const color = getLiturgicalDay(d).color;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => { onChange(s); setOpen(false); }}
                  className="relative flex h-8 flex-col items-center justify-center rounded-[8px] text-[12.5px] transition-colors"
                  style={{
                    background: selected ? 'var(--primary)' : 'transparent',
                    color: selected ? '#fff' : inMonth ? 'var(--ink)' : 'var(--ink-3)',
                    fontWeight: selected || isToday ? 700 : 400,
                    outline: isToday && !selected ? '1px solid var(--primary)' : undefined,
                  }}
                >
                  {d.getDate()}
                  <span className="absolute bottom-[3px] h-[3px] w-[3px] rounded-full"
                    style={{ background: selected ? '#fff' : `var(--lit-${color})`, opacity: inMonth ? 1 : 0.35 }} />
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex justify-between border-t border-line pt-2">
            <button type="button" className="btn btn-sm"
              onClick={() => { onChange(todayISO); setOpen(false); }}>
              Hôm nay
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}
