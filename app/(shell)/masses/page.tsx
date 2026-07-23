'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Copy, HardDrive, Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Dialog from '@/components/ui/Dialog';
import DatePicker from '@/components/ui/DatePicker';
import MonthPicker from '@/components/ui/MonthPicker';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { COLOR_LABEL } from '@/lib/liturgical-calendar';
import { useAuth } from '@/components/AuthProvider';
import { isLocalMassId, listLocalMasses } from '@/lib/local-masses';
import { deleteMass, listMasses, type MassListRow } from '@/lib/masses';
import { supabaseConfigured } from '@/lib/supabase';

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const wd = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
  return `${wd} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function MassesPage() {
  const router = useRouter();
  const [masses, setMasses] = useState<MassListRow[] | null>(null);
  const [month, setMonth] = useState(''); // '' = tất cả
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();
  // hộp thoại nhân bản: chọn ngày mới bằng lịch theo theme
  const [dup, setDup] = useState<{ mass: MassListRow; date: string } | null>(null);

  const load = useCallback(async () => {
    if (!supabaseConfigured) return;
    try {
      // Lễ chung (DB) + lễ lưu trên máy này, gộp và sắp theo ngày
      const [shared, local] = await Promise.all([
        listMasses(month || undefined).catch(() => [] as MassListRow[]),
        listLocalMasses().catch(() => [] as MassListRow[]),
      ]);
      const localFiltered = month
        ? local.filter((m) => m.mass_date.startsWith(month))
        : local;
      setMasses(
        [...shared, ...localFiltered].sort((a, b) => b.mass_date.localeCompare(a.mass_date)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách.');
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (m: MassListRow) => {
    const ok = await confirm({
      title: 'Xóa thánh lễ',
      message: (
        <>
          Xóa lễ <b>{m.title}</b> ({fmtDate(m.mass_date)})? Toàn bộ mục trong lễ cũng bị xóa.
          Thao tác này không hoàn tác được.
        </>
      ),
      confirmLabel: 'Xóa lễ',
      danger: true,
    });
    if (!ok) return;
    await deleteMass(m.id);
    load();
  };

  const openDuplicate = (m: MassListRow) => {
    const base = new Date(`${m.mass_date}T12:00:00`);
    base.setDate(base.getDate() + 7);
    setDup({ mass: m, date: base.toISOString().slice(0, 10) });
  };

  // Nhân bản = mở trình soạn lễ với bản sao CHƯA lưu (không ghi DB tới khi bấm Lưu)
  const doDuplicate = () => {
    if (!dup) return;
    router.push(`/masses/new?from=${dup.mass.id}&date=${dup.date}`);
  };

  if (!supabaseConfigured) {
    return (
      <>
        <PageHeader title="Thánh lễ" />
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
      <PageHeader title="Thánh lễ" sub={masses ? `${masses.length} lễ` : 'Đang tải…'}>
        <MonthPicker value={month} onChange={setMonth} className="w-48" />
        <Link href="/masses/new" className="btn btn-primary">
          <Plus size={15} /> Soạn lễ mới
        </Link>
      </PageHeader>

      <div className="flex-1 overflow-auto px-7 py-5">
        {error && <div className="mb-4 text-[13px]" style={{ color: 'var(--lit-do)' }}>{error}</div>}

        {masses && masses.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
            <div className="font-display text-[15px] font-semibold text-heading">
              {month ? 'Không có lễ nào trong tháng này' : 'Chưa soạn lễ nào'}
            </div>
            <p className="max-w-md text-[13px] text-ink-2">
              Chọn ngày — tên lễ và màu phụng vụ tự điền. Kéo-thả bài hát, kinh nguyện từ thư viện.
            </p>
            <Link href="/masses/new" className="btn btn-primary btn-sm">
              <Plus size={14} /> Soạn lễ đầu tiên
            </Link>
          </div>
        ) : (
          masses && (
            <div className="card overflow-hidden">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-ink-3">
                    <th className="border-b border-line px-4 py-3 font-semibold">Ngày</th>
                    <th className="border-b border-line px-4 py-3 font-semibold">Tên lễ</th>
                    <th className="border-b border-line px-4 py-3 font-semibold">Màu</th>
                    <th className="border-b border-line px-4 py-3 font-semibold">Mục</th>
                    <th className="border-b border-line px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {masses.map((m) => (
                    <tr key={m.id} className="hover:bg-bg">
                      <td className="border-b border-line px-4 py-3 text-ink-2">{fmtDate(m.mass_date)}</td>
                      <td className="border-b border-line px-4 py-3 font-semibold">
                        {m.title}
                        {isLocalMassId(m.id) && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] font-normal text-ink-2"
                            data-tip="Lễ này chỉ lưu trên máy bạn">
                            <HardDrive size={11} /> trên máy
                          </span>
                        )}
                      </td>
                      <td className="border-b border-line px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                          style={{ background: 'var(--primary-soft)', color: `var(--lit-${m.liturgical_color})` }}>
                          <span className="h-2 w-2 rounded-full"
                            style={{ background: `var(--lit-${m.liturgical_color})` }} />
                          {COLOR_LABEL[m.liturgical_color]}
                        </span>
                      </td>
                      <td className="border-b border-line px-4 py-3">{m.mass_items[0]?.count ?? 0}</td>
                      <td className="border-b border-line px-4 py-3 text-right">
                        <Link href={`/present/${m.id}/control`} className="btn btn-sm mr-1.5"
                          data-tip="Bắt đầu trình chiếu">▶</Link>
                        <Link href={`/masses/${m.id}/edit`} className="btn btn-sm mr-1.5">Sửa</Link>
                        <button className="btn btn-sm mr-1.5" onClick={() => openDuplicate(m)}
                          data-tip="Nhân bản sang ngày khác">
                          <Copy size={13} />
                        </button>
                        <button className="btn btn-sm" style={{ color: 'var(--lit-do)' }}
                          onClick={() => remove(m)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      <Dialog
        open={Boolean(dup)}
        title="Nhân bản thánh lễ"
        onClose={() => setDup(null)}
        allowOverflow
        footer={
          <>
            <button className="btn" onClick={() => setDup(null)}>Hủy</button>
            <button className="btn btn-primary" onClick={doDuplicate}>Nhân bản</button>
          </>
        }
      >
        <div className="mb-3">
          Nhân bản <b>{dup?.mass.title}</b> sang ngày mới. Tên lễ và màu phụng vụ sẽ
          được tính lại tự động theo lịch.
        </div>
        <label className="field-label">Ngày lễ mới</label>
        {dup && (
          <DatePicker value={dup.date} onChange={(v) => setDup({ ...dup, date: v })} />
        )}
      </Dialog>
    </>
  );
}
