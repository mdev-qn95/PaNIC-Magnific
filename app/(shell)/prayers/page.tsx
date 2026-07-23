'use client';

import Link from 'next/link';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { Copy, Lock, Plus, Search } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SlidePreviewGrid from '@/components/SlidePreviewGrid';
import AdminOnly from '@/components/ui/AdminOnly';
import { ActionsCell, PresentButton, TD, TH, THEAD_TR, TitleCell } from '@/components/ui/LibraryTable';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { deletePrayer, duplicatePrayer, listPrayers } from '@/lib/prayers';
import { supabaseConfigured } from '@/lib/supabase';
import type { Prayer } from '@/lib/types';

export default function PrayersPage() {
  const [prayers, setPrayers] = useState<Prayer[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    if (!supabaseConfigured) return;
    try {
      setPrayers(await listPrayers(search || undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách.');
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const remove = async (p: Prayer) => {
    const ok = await confirm({
      title: 'Xóa kinh nguyện',
      message: <>Xóa kinh <b>{p.title}</b>? Các lễ đang dùng kinh này sẽ mất mục tương ứng.</>,
      confirmLabel: 'Xóa kinh',
      danger: true,
    });
    if (!ok) return;
    await deletePrayer(p.id);
    load();
  };

  const duplicate = async (p: Prayer) => {
    await duplicatePrayer(p);
    load();
  };

  if (!supabaseConfigured) {
    return (
      <>
        <PageHeader title="Thư viện kinh nguyện" />
        <div className="px-7 py-5">
          <div className="card px-6 py-10 text-center text-[13px] text-ink-2">
            Chưa kết nối Supabase — tạo <code>.env.local</code> theo README rồi khởi động lại.
          </div>
        </div>
      </>
    );
  }

  const seedCount = prayers?.filter((p) => p.is_seed).length ?? 0;

  return (
    <>
      <PageHeader
        title="Thư viện kinh nguyện"
        sub={prayers ? `${prayers.length} kinh · ${seedCount} kinh có sẵn` : 'Đang tải…'}
      >
        <AdminOnly>
          <Link href="/prayers/new" className="btn btn-primary">
            <Plus size={15} /> Thêm kinh
          </Link>
        </AdminOnly>
      </PageHeader>

      <div className="flex-1 overflow-auto px-7 py-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              className="field pl-9"
              placeholder="Tìm theo tên kinh, lời kinh…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {error && <div className="mb-4 text-[13px]" style={{ color: 'var(--lit-do)' }}>{error}</div>}

        {prayers && prayers.length === 0 && (
          <div className="card px-6 py-14 text-center text-[13px] text-ink-2">
            {search ? 'Không tìm thấy kinh nào.' : 'Thư viện kinh còn trống.'}
          </div>
        )}

        {prayers && prayers.length > 0 && (
          <div className="card overflow-hidden">
            <table className="w-full table-fixed border-collapse text-[13px]">
              <colgroup>
                <col />
                <col style={{ width: '110px' }} />
                <col style={{ width: '164px' }} />
              </colgroup>
              <thead>
                <tr className={THEAD_TR}>
                  <th className={TH}>Tên kinh</th>
                  <th className={TH}>Slide</th>
                  <th className={TH} />
                </tr>
              </thead>
              <tbody>
                {prayers.map((p) => {
                  const open = openId === p.id;
                  return (
                    <Fragment key={p.id}>
                      <tr className="cursor-pointer hover:bg-bg" onClick={() => setOpenId(open ? null : p.id)}>
                        <TitleCell
                          title={p.title}
                          firstLine={p.slides[0]?.lines[0]}
                          open={open}
                          prefix={p.is_seed ? <Lock size={12} className="shrink-0 text-ink-3" /> : undefined}
                        />
                        <td className={TD}>{p.slides.length}</td>
                        {p.is_seed ? (
                          <td className={`${TD} whitespace-nowrap text-right`} onClick={(e) => e.stopPropagation()}>
                            <PresentButton href={`/present/quick-prayer-${p.id}/control`} />
                            <AdminOnly>
                              <button className="btn btn-sm" onClick={() => duplicate(p)}
                                data-tip="Bản gốc giữ nguyên — tạo bản riêng để sửa">
                                <Copy size={13} /> Nhân bản
                              </button>
                            </AdminOnly>
                          </td>
                        ) : (
                          <ActionsCell
                            presentHref={`/present/quick-prayer-${p.id}/control`}
                            editHref={`/prayers/${p.id}/edit`}
                            onDelete={() => remove(p)}
                          />
                        )}
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={3} className="border-b border-line bg-bg px-4 py-3">
                            <SlidePreviewGrid
                              slides={p.slides.map((sl, i) => ({
                                badge: i === 0 ? p.title : undefined,
                                lines: sl.lines,
                              }))}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
