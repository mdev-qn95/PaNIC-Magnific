'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { listPrayers } from '@/lib/prayers';
import { listSongs } from '@/lib/songs';
import { getSongUsage, type SongUsage } from '@/lib/stats';
import { SONG_CATEGORY_LABEL, type Prayer, type Song } from '@/lib/types';

type Kind = 'song' | 'prayer';

export default function LibraryPickerModal({
  kind,
  onPick,
  onClose,
}: {
  kind: Kind;
  onPick: (item: Song | Prayer) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<(Song | Prayer)[]>([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<Map<string, SongUsage>>(new Map());

  useEffect(() => {
    if (kind !== 'song') return;
    getSongUsage().then(setUsage).catch(() => {});
  }, [kind]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data =
          kind === 'song' ? await listSongs({ search: search || undefined }) : await listPrayers(search || undefined);
        if (alive) setRows(data);
      } finally {
        if (alive) setLoading(false);
      }
    }, search ? 250 : 0);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [kind, search]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[10vh]"
      onClick={onClose}
    >
      <div
        className="card w-[520px] max-w-[92vw] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Search size={15} className="text-ink-3" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-[13.5px] outline-none"
            placeholder={kind === 'song' ? 'Tìm bài hát…' : 'Tìm kinh…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={onClose} className="text-ink-3 hover:text-ink">
            <X size={17} />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-auto">
          {loading ? (
            <div className="px-4 py-8 text-center text-[13px] text-ink-3">Đang tải…</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-ink-3">
              {kind === 'song' ? 'Không có bài hát nào — thêm trong Thư viện bài hát.' : 'Không có kinh nào.'}
            </div>
          ) : (
            [...rows]
              .sort((a, b) => {
                if (kind !== 'song') return 0;
                // bài dùng nhiều lên trước (không gợi ý theo mùa)
                const ua = usage.get(a.id)?.count ?? 0;
                const ub = usage.get(b.id)?.count ?? 0;
                if (ua !== ub) return ub - ua;
                return a.title.localeCompare(b.title, 'vi');
              })
              .map((r) => {
                const u = kind === 'song' ? usage.get(r.id) : undefined;
                return (
                  <button
                    key={r.id}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[13px] hover:bg-bg"
                    onClick={() => onPick(r)}
                  >
                    <span className="truncate font-semibold">{r.title}</span>
                    <span className="shrink-0 text-[11.5px] text-ink-3">
                      {'category' in r
                        ? `${SONG_CATEGORY_LABEL[r.category]}${r.author ? ' · ' + r.author : ''}`
                        : r.is_seed
                          ? '🔒 Có sẵn'
                          : 'Tự soạn'}
                      {' · '}
                      {r.slides.length} slide
                      {u && u.count > 0 && ` · ${u.count} lần`}
                    </span>
                  </button>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}
