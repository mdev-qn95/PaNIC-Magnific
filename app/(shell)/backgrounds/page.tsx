'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Select from '@/components/ui/Select';
import AdminOnly from '@/components/ui/AdminOnly';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import {
  deleteBackground,
  listBackgrounds,
  publicUrl,
  updateBackground,
  uploadBackground,
} from '@/lib/backgrounds';
import { SEASON_LABEL, type Season } from '@/lib/liturgical-calendar';
import { supabaseConfigured } from '@/lib/supabase';
import type { Background } from '@/lib/types';

const SEASONS: Season[] = ['vong', 'giang_sinh', 'chay', 'phuc_sinh', 'thuong_nien'];

export default function BackgroundsPage() {
  const [rows, setRows] = useState<Background[] | null>(null);
  const [filter, setFilter] = useState<Season | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    if (!supabaseConfigured) return;
    try {
      setRows(await listBackgrounds(filter === 'all' ? undefined : filter));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách.');
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const f of Array.from(files)) {
        await uploadBackground(f, filter === 'all' ? null : filter);
      }
      await load();
    } catch (e) {
      setError(
        (e instanceof Error ? e.message : 'Upload thất bại.') +
          ' — đã chạy supabase/storage.sql trong SQL Editor chưa?',
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const setFocal = async (bg: Background, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const clamp = (v: number) => Math.min(1, Math.max(0, Math.round(v * 100) / 100));
    const fx = clamp((e.clientX - rect.left) / rect.width);
    const fy = clamp((e.clientY - rect.top) / rect.height);
    setRows((r) => r?.map((x) => (x.id === bg.id ? { ...x, focal_x: fx, focal_y: fy } : x)) ?? null);
    await updateBackground(bg.id, { focal_x: fx, focal_y: fy });
  };

  const setSeason = async (bg: Background, season: string) => {
    const v = season === '' ? null : (season as Season);
    setRows((r) => r?.map((x) => (x.id === bg.id ? { ...x, season: v } : x)) ?? null);
    await updateBackground(bg.id, { season: v });
  };

  const remove = async (bg: Background) => {
    const ok = await confirm({
      title: 'Xóa ảnh nền',
      message: 'Xóa ảnh nền này? Các mục lễ đang dùng sẽ quay về nền theo mùa.',
      confirmLabel: 'Xóa ảnh',
      danger: true,
    });
    if (!ok) return;
    await deleteBackground(bg);
    load();
  };

  if (!supabaseConfigured) {
    return (
      <>
        <PageHeader title="Thư viện ảnh nền" />
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
      <PageHeader title="Thư viện ảnh nền" sub={rows ? `${rows.length} ảnh` : 'Đang tải…'}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onUpload(e.target.files)}
        />
        <AdminOnly>
          <button className="btn btn-primary" disabled={uploading}
            onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> {uploading ? 'Đang tải lên…' : 'Upload ảnh'}
          </button>
        </AdminOnly>
      </PageHeader>

      <div className="flex-1 overflow-auto px-7 py-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <button className={`chip ${filter === 'all' ? 'chip-on' : ''}`} onClick={() => setFilter('all')}>
            Tất cả
          </button>
          {SEASONS.map((se) => (
            <button key={se} className={`chip ${filter === se ? 'chip-on' : ''}`}
              onClick={() => setFilter(se)}>
              {SEASON_LABEL[se].replace('Mùa ', '')}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 text-[13px]" style={{ color: 'var(--lit-do)' }}>{error}</div>}

        {rows && rows.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
            <div className="font-display text-[15px] font-semibold text-heading">
              {filter === 'all' ? 'Chưa có ảnh nền nào' : 'Chưa có ảnh cho mùa này'}
            </div>
            <p className="max-w-md text-[13px] text-ink-2">
              Upload ảnh và gắn tag mùa — mục lễ không chọn nền riêng sẽ tự dùng ảnh theo mùa phụng vụ.
              {filter !== 'all' && ' Ảnh upload lúc này sẽ tự gắn tag mùa đang lọc.'}
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> Upload ảnh đầu tiên
            </button>
          </div>
        ) : (
          rows && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {rows.map((bg) => (
                <div key={bg.id} className="card overflow-hidden">
                  <div
                    className="relative h-28 cursor-crosshair bg-surface-2"
                    data-tip="Click để đặt điểm quan trọng của ảnh (focal point)"
                    onClick={(e) => setFocal(bg, e)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={publicUrl(bg.storage_path)} alt=""
                      className="h-full w-full object-cover"
                      style={{ objectPosition: `${bg.focal_x * 100}% ${bg.focal_y * 100}%` }} />
                    <span
                      className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                      style={{
                        left: `${bg.focal_x * 100}%`,
                        top: `${bg.focal_y * 100}%`,
                        boxShadow: '0 0 0 2px rgba(0,0,0,.4)',
                      }}
                    />
                  </div>
                  <AdminOnly>
                  <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                    <Select
                      className="flex-1"
                      value={bg.season ?? ''}
                      placeholder="— Không tag mùa —"
                      options={SEASONS.map((se) => ({ value: se, label: SEASON_LABEL[se] }))}
                      onChange={(v) => setSeason(bg, v)}
                    />
                    <button className="btn btn-sm !px-2" style={{ color: 'var(--lit-do)' }}
                      onClick={() => remove(bg)} data-tip="Xóa ảnh">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  </AdminOnly>
                </div>
              ))}
            </div>
          )
        )}

        <div className="mt-5 rounded-token-2 border border-line bg-surface-2 px-4 py-2.5 text-xs text-ink-2">
          💡 Click lên ảnh để đặt <b>focal point</b> (vòng tròn trắng) vào điểm quan trọng — khuôn mặt
          thánh, thánh giá… App giữ điểm đó trong khung khi crop cho tivi ngang lẫn dọc.
        </div>
      </div>
    </>
  );
}
