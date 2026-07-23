'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Dropdown theo theme — danh sách do app tự vẽ.
 * (<select> mặc định để trình duyệt vẽ popup nên không style theo theme được.)
 */
export default function Select<T extends string>({
  value,
  options,
  onChange,
  placeholder = '— Chọn —',
  className = '',
  disabled,
}: {
  value: T | '';
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="field flex w-full items-center justify-between gap-2 text-left disabled:opacity-50"
        style={open ? { borderColor: 'var(--primary)' } : undefined}
      >
        <span className={current ? '' : 'text-ink-3'}>{current?.label ?? placeholder}</span>
        <ChevronDown size={15} className="shrink-0 text-ink-3" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-auto rounded-token-2 border border-line bg-surface py-1 shadow-xl"
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] hover:bg-bg"
                style={active ? { color: 'var(--primary)', fontWeight: 700 } : undefined}
              >
                {o.label}
                {active && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
