'use client';

import { Check } from 'lucide-react';

/** Checkbox theo theme — không dùng ô tick mặc định của trình duyệt. */
export default function Checkbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={`inline-flex items-center gap-2 text-[13px] ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors"
        style={{
          borderColor: checked ? 'var(--primary)' : 'var(--line)',
          background: checked ? 'var(--primary)' : 'var(--surface)',
        }}
      >
        {checked && <Check size={13} strokeWidth={3} color="#fff" />}
      </button>
      {label}
    </label>
  );
}
