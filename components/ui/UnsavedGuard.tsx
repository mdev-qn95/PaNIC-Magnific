'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Dialog from './Dialog';

/**
 * Chặn rời trang khi còn thay đổi chưa lưu.
 * Next.js App Router chưa có API chặn điều hướng, nên bắt click trên <a> nội bộ
 * (sidebar, link trong trang) ở giai đoạn capture rồi tự điều hướng sau khi người dùng chọn.
 */
export default function UnsavedGuard({
  dirty,
  title = 'Thay đổi chưa được lưu',
  message = 'Bạn có thay đổi chưa lưu. Lưu lại trước khi rời trang?',
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  title?: string;
  message?: React.ReactNode;
  /** Lưu rồi mới điều hướng. Trả về false nếu lưu lỗi (sẽ ở lại trang). */
  onSave: () => Promise<boolean>;
  /** Hoàn tác thay đổi tạm (ví dụ trả theme về như cũ). */
  onDiscard: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Cảnh báo khi đóng tab / F5
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // Chặn click vào link nội bộ
  useEffect(() => {
    if (!dirty) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.('a');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || a.target === '_blank') return;
      if (href === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setPending(href);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [dirty]);

  const go = (href: string) => {
    setPending(null);
    router.push(href);
  };

  return (
    <Dialog
      open={Boolean(pending)}
      title={title}
      onClose={() => setPending(null)}
      footer={
        <>
          <button className="btn" onClick={() => setPending(null)} disabled={saving}>
            Ở lại trang
          </button>
          <button
            className="btn"
            disabled={saving}
            onClick={() => {
              onDiscard();
              if (pending) go(pending);
            }}
          >
            Bỏ thay đổi
          </button>
          <button
            className="btn btn-primary"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              const ok = await onSave();
              setSaving(false);
              if (ok && pending) go(pending);
              else if (!ok) setPending(null);
            }}
          >
            {saving ? 'Đang lưu…' : 'Lưu và rời trang'}
          </button>
        </>
      }
    >
      {message}
    </Dialog>
  );
}
