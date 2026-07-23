'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight, Play } from 'lucide-react';
import AdminOnly from '@/components/ui/AdminOnly';

/** Class ô/tiêu đề dùng chung cho mọi bảng thư viện — đảm bảo header, row, icon đồng bộ. */
export const TH = 'border-b border-line px-4 py-3 font-semibold';
export const THEAD_TR = 'text-left text-[11px] uppercase tracking-wider text-ink-3';
export const TD = 'border-b border-line px-4 py-3';

/** Ô "Tên" có mũi tên gập + câu đầu bên dưới (dùng ở cả 3 trang thư viện). */
export function TitleCell({
  title,
  firstLine,
  open,
  prefix,
}: {
  title: string;
  firstLine?: string;
  open: boolean;
  prefix?: ReactNode;
}) {
  return (
    <td className={TD}>
      <div className="flex items-start gap-1.5">
        <ChevronRight
          size={14}
          className={`mt-0.5 shrink-0 text-ink-3 transition-transform ${open ? 'rotate-90' : ''}`}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-semibold">
            {prefix}
            <span className="truncate">{title}</span>
          </div>
          {firstLine && <div className="truncate text-[12px] font-normal text-ink-2">{firstLine}</div>}
        </div>
      </div>
    </td>
  );
}

/** Nút trình chiếu nhanh (▶) — hiện cho mọi người, không chỉ admin. */
export function PresentButton({ href }: { href: string }) {
  return (
    <Link href={href} className="btn btn-sm mr-1.5" data-tip="Trình chiếu ngay" aria-label="Trình chiếu ngay">
      <Play size={13} />
    </Link>
  );
}

/** Ô hành động: ▶ Trình chiếu (mọi người) + Sửa / Xóa (chỉ admin) — đồng bộ trên mọi trang. */
export function ActionsCell({
  presentHref,
  editHref,
  onDelete,
}: {
  presentHref?: string;
  editHref: string;
  onDelete: () => void;
}) {
  return (
    <td className={`${TD} whitespace-nowrap text-right`} onClick={(e) => e.stopPropagation()}>
      {presentHref && <PresentButton href={presentHref} />}
      <AdminOnly>
        <Link href={editHref} className="btn btn-sm mr-1.5">Sửa</Link>
        <button className="btn btn-sm" style={{ color: 'var(--lit-do)' }} onClick={onDelete}>✕</button>
      </AdminOnly>
    </td>
  );
}
