'use client';

import Link from 'next/link';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SlidePreviewGrid, { type PreviewSlide } from '@/components/SlidePreviewGrid';
import AdminOnly from '@/components/ui/AdminOnly';
import { ActionsCell, TD, TH, THEAD_TR, TitleCell } from '@/components/ui/LibraryTable';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import {
  deleteResponsorial,
  listResponsorials,
  PART_TITLE,
  RESP_SEASON_LABEL,
  RESP_SEASON_ORDER,
  slidesForPart,
  type Responsorial,
  type ResponsorialSeason,
} from '@/lib/responsorials';
import { supabaseConfigured } from '@/lib/supabase';

export default function ResponsorialsPage() {
  const [rows, setRows] = useState<Responsorial[] | null>(null);
  const [season, setSeason] = useState<ResponsorialSeason>('thuong_nien');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    if (!supabaseConfigured) return;
    try {
      // Có tìm kiếm → tìm toàn bộ mùa; không thì lọc theo mùa đang chọn
      setRows(
        await listResponsorials(
          search.trim() ? { search } : { season },
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách.');
    }
  }, [season, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const remove = async (r: Responsorial) => {
    const ok = await confirm({
      title: 'Xóa Đáp ca / Tung hô',
      message: <>Xóa mục <b>{r.occasion}</b>? Các lễ đang dùng sẽ mất mục tương ứng.</>,
      confirmLabel: 'Xóa mục',
      danger: true,
    });
    if (!ok) return;
    await deleteResponsorial(r.id);
    setOpenId(null);
    load();
  };

  if (!supabaseConfigured) {
    return (
      <>
        <PageHeader title="Đáp Ca - Tung Hô Tin Mừng" />
        <div className="px-7 py-5">
          <div className="card px-6 py-10 text-center text-[13px] text-ink-2">
            Chưa kết nối Supabase — tạo <code>.env.local</code> theo README rồi khởi động lại.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Đáp Ca - Tung Hô Tin Mừng"
        sub={rows ? `${rows.length} mục${search ? ' (kết quả tìm)' : ` · ${RESP_SEASON_LABEL[season]}`}` : 'Đang tải…'}
      >
        <AdminOnly>
          <Link href="/responsorials/new" className="btn btn-primary">
            <Plus size={15} /> Thêm mục
          </Link>
        </AdminOnly>
      </PageHeader>
      <div className="flex-1 overflow-auto px-7 py-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              className="field pl-9"
              placeholder="Tìm theo dịp lễ, câu đáp, câu tung hô…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {!search && (
          <div className="mb-4 flex flex-wrap gap-2">
            {RESP_SEASON_ORDER.map((s) => (
              <button key={s} className={`chip ${season === s ? 'chip-on' : ''}`}
                onClick={() => { setSeason(s); setOpenId(null); }}>
                {RESP_SEASON_LABEL[s]}
              </button>
            ))}
          </div>
        )}

        {error && <div className="mb-4 text-[13px]" style={{ color: 'var(--lit-do)' }}>{error}</div>}

        {rows && rows.length === 0 && (
          <div className="card px-6 py-14 text-center text-[13px] text-ink-2">
            {search ? 'Không tìm thấy mục nào.' : 'Chưa có dữ liệu cho mùa này.'}
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="card overflow-hidden">
            <table className="w-full table-fixed border-collapse text-[13px]">
              <colgroup>
                <col />
                {search && <col style={{ width: '150px' }} />}
                <col style={{ width: '110px' }} />
                <col style={{ width: '164px' }} />
              </colgroup>
              <thead>
                <tr className={THEAD_TR}>
                  <th className={TH}>Dịp lễ</th>
                  {search && <th className={TH}>Mùa</th>}
                  <th className={TH}>Slide</th>
                  <th className={TH} />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const open = openId === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr className="cursor-pointer hover:bg-bg" onClick={() => setOpenId(open ? null : r.id)}>
                        <TitleCell title={r.occasion} firstLine={`Đáp ca: ${r.psalm_response}`} open={open} />
                        {search && (
                          <td className={`${TD} truncate text-ink-2`}>{RESP_SEASON_LABEL[r.season]}</td>
                        )}
                        <td className={TD}>{r.slides.length}</td>
                        <ActionsCell
                          presentHref={`/present/quick-resp-${r.id}/control`}
                          editHref={`/responsorials/${r.id}/edit`}
                          onDelete={() => remove(r)}
                        />
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={search ? 4 : 3} className="border-b border-line bg-bg px-4 py-3">
                            <SlidePreviewGrid
                              slides={(['dap_ca', 'tung_ho'] as const).flatMap((part) =>
                                slidesForPart(r, part).map((sl, i): PreviewSlide => ({
                                  badge: i === 0 ? PART_TITLE[part] : undefined,
                                  lines: sl.lines,
                                })),
                              )}
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
