'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** Hộp thoại theo design token — thay cho dialog mặc định của trình duyệt. */
export default function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  width = 460,
  allowOverflow = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
  /** Cho phép nội dung tràn ra ngoài card (ví dụ popup lịch của DatePicker). */
  allowOverflow?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 pt-[14vh]"
      onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`card mx-4 shadow-2xl ${allowOverflow ? '' : 'overflow-hidden'}`}
        style={{ width, maxWidth: '92vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <b className="font-display text-[14.5px] font-semibold text-heading">{title}</b>
          <button onClick={onClose} className="text-ink-3 hover:text-ink" aria-label="Đóng">
            <X size={17} />
          </button>
        </div>
        {children && <div className="px-4 py-3.5 text-[13px] text-ink-2">{children}</div>}
        {footer && (
          <div className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</div>
        )}
      </div>
    </div>
  );
}
