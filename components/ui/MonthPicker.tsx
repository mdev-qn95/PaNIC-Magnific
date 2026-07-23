'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['Th 1', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7', 'Th 8', 'Th 9', 'Th 10', 'Th 11', 'Th 12'];

/** Chọn tháng theo theme — thay <input type="month">. value: 'YYYY-MM' hoặc ''. */
export default function MonthPicker({
  value,
  onChange,
  placeholder = 'Tất cả các tháng',
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() =>
    value ? parseInt(value.slice(0, 4), 10) : new Date().getFullYear(),
  );
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

  const label = value ? `Tháng ${value.slice(5)}/${value.slice(0, 4)}` : placeholder;

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="field flex w-full items-center justify-between gap-2 text-left"
        style={open ? { borderColor: 'var(--primary)' } : undefined}>
        <span className={value ? '' : 'text-ink-3'}>{label}</span>
        <CalendarRange size={15} className="shrink-0 text-ink-3" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-[240px] rounded-token border border-line bg-surface p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" className="btn btn-sm !px-2" onClick={() => setYear((y) => y - 1)}>
              <ChevronLeft size={15} />
            </button>
            <b className="font-display text-[13.5px] font-semibold text-heading">{year}</b>
            <button type="button" className="btn btn-sm !px-2" onClick={() => setYear((y) => y + 1)}>
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((m, i) => {
              const v = `${year}-${String(i + 1).padStart(2, '0')}`;
              const active = v === value;
              return (
                <button key={v} type="button"
                  onClick={() => { onChange(v); setOpen(false); }}
                  className="rounded-token-2 border py-1.5 text-[12.5px] transition-colors"
                  style={{
                    borderColor: active ? 'var(--primary)' : 'var(--line)',
                    background: active ? 'var(--primary)' : 'transparent',
                    color: active ? '#fff' : 'var(--ink)',
                    fontWeight: active ? 700 : 400,
                  }}>
                  {m}
                </button>
              );
            })}
          </div>
          {value && (
            <button type="button" className="btn btn-sm mt-2 w-full"
              onClick={() => { onChange(''); setOpen(false); }}>
              Bỏ lọc — xem tất cả
            </button>
          )}
        </div>
      )}
    </div>
  );
}
