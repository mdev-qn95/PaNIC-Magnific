'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import Dialog from './Dialog';

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Nút xác nhận màu cảnh báo (xóa, bỏ thay đổi…). */
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Hộp xác nhận theo theme — thay window.confirm(). */
export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error('useConfirm phải nằm trong <ConfirmProvider>');
  return fn;
}

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const done = (v: boolean) => {
    setOpts(null);
    resolver.current?.(v);
    resolver.current = null;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={Boolean(opts)}
        title={opts?.title ?? ''}
        onClose={() => done(false)}
        footer={
          <>
            <button className="btn" onClick={() => done(false)}>
              {opts?.cancelLabel ?? 'Hủy'}
            </button>
            <button
              className="btn btn-primary"
              style={opts?.danger ? { background: 'var(--lit-do)', borderColor: 'var(--lit-do)' } : undefined}
              onClick={() => done(true)}
            >
              {opts?.confirmLabel ?? 'Đồng ý'}
            </button>
          </>
        }
      >
        {opts?.message}
      </Dialog>
    </ConfirmContext.Provider>
  );
}
