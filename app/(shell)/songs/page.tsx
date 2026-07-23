'use client';

import Link from 'next/link';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SlidePreviewGrid from '@/components/SlidePreviewGrid';
import AdminOnly from '@/components/ui/AdminOnly';
import { ActionsCell, TD, TH, THEAD_TR, TitleCell } from '@/components/ui/LibraryTable';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { deleteSong, listSongs } from '@/lib/songs';
import { supabaseConfigured } from '@/lib/supabase';
import { SONG_CATEGORY_LABEL, type Song, type SongCategory } from '@/lib/types';

const FILTERS: (SongCategory | 'all')[] = ['all', 'nhap_le', 'dap_ca', 'dang_le', 'hiep_le', 'ket_le', 'duc_me'];

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<SongCategory | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    if (!supabaseConfigured) return;
    try {
      const rows = await listSongs({
        search: search || undefined,
        category: category === 'all' ? undefined : category,
      });
      // Sắp theo tên bài hát (có dấu tiếng Việt) — dễ tra cứu trong thư viện lớn
      rows.sort((a, b) => a.title.localeCompare(b.title, 'vi'));
      setSongs(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách.');
    }
  }, [search, category]);

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const remove = async (s: Song) => {
    const ok = await confirm({
      title: 'Xóa bài hát',
      message: <>Xóa bài <b>{s.title}</b>? Các lễ đang dùng bài này sẽ mất mục tương ứng.</>,
      confirmLabel: 'Xóa bài hát',
      danger: true,
    });
    if (!ok) return;
    await deleteSong(s.id);
    load();
  };

  if (!supabaseConfigured) {
    return (
      <>
        <PageHeader title="Thư viện bài hát" />
        <div className="px-7 py-5">
          <div className="card px-6 py-10 text-center text-[13px] text-ink-2">
            Chưa kết nối Supabase — tạo <code>.env.local</code> theo hướng dẫn trong README rồi khởi động lại.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Thư viện bài hát" sub={songs ? `${songs.length} bài` : 'Đang tải…'}>
        <AdminOnly>
          <Link href="/songs/new" className="btn btn-primary">
            <Plus size={15} /> Thêm bài hát
          </Link>
        </AdminOnly>
      </PageHeader>

      <div className="flex-1 overflow-auto px-7 py-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              className="field pl-9"
              placeholder="Tìm theo tên, tác giả, câu lời…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`chip ${category === f ? 'chip-on' : ''}`}
              onClick={() => setCategory(f)}
            >
              {f === 'all' ? 'Tất cả' : SONG_CATEGORY_LABEL[f]}
            </button>
          ))}
        </div>

        {error && <div className="mb-4 text-[13px]" style={{ color: 'var(--lit-do)' }}>{error}</div>}

        {songs && songs.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
            <div className="font-display text-[15px] font-semibold text-heading">
              {search || category !== 'all' ? 'Không tìm thấy bài nào' : 'Thư viện còn trống'}
            </div>
            <p className="max-w-md text-[13px] text-ink-2">
              Thêm bài hát một lần — dùng lại cho mọi thánh lễ về sau. Dán lời thô, slide tự sinh.
            </p>
            <Link href="/songs/new" className="btn btn-primary btn-sm">
              <Plus size={14} /> Thêm bài hát đầu tiên
            </Link>
          </div>
        ) : (
          songs && (
            <div className="card overflow-hidden">
              <table className="w-full table-fixed border-collapse text-[13px]">
                <colgroup>
                  <col />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '180px' }} />
                  <col style={{ width: '90px' }} />
                  <col style={{ width: '164px' }} />
                </colgroup>
                <thead>
                  <tr className={THEAD_TR}>
                    <th className={TH}>Tên bài</th>
                    <th className={TH}>Thể loại</th>
                    <th className={TH}>Tác giả</th>
                    <th className={TH}>Slide</th>
                    <th className={TH} />
                  </tr>
                </thead>
                <tbody>
                  {songs.map((s) => {
                    const open = openId === s.id;
                    return (
                      <Fragment key={s.id}>
                        <tr className="cursor-pointer hover:bg-bg" onClick={() => setOpenId(open ? null : s.id)}>
                          <TitleCell title={s.title} firstLine={s.slides[0]?.lines[0]} open={open} />
                          <td className={`${TD} truncate`}>{SONG_CATEGORY_LABEL[s.category]}</td>
                          <td className={`${TD} truncate text-ink-2`}>{s.author ?? '—'}</td>
                          <td className={TD}>{s.slides.length}</td>
                          <ActionsCell
                            presentHref={`/present/quick-song-${s.id}/control`}
                            editHref={`/songs/${s.id}/edit`}
                            onDelete={() => remove(s)}
                          />
                        </tr>
                        {open && (
                          <tr>
                            <td colSpan={5} className="border-b border-line bg-bg px-4 py-3">
                              <SlidePreviewGrid
                                slides={s.slides.map((sl) => ({
                                  lines: sl.lines,
                                  isChorus: sl.is_chorus,
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
          )
        )}
      </div>
    </>
  );
}
