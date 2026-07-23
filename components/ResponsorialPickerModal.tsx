'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import {
  listResponsorials,
  RESP_SEASON_LABEL,
  RESP_SEASON_ORDER,
  type Responsorial,
  type ResponsorialSeason,
} from '@/lib/responsorials';

export default function ResponsorialPickerModal({
  part,
  defaultSeason,
  suggestedItems,
  onPick,
  onClose,
}: {
  /** Đang chọn phần nào — quyết định nội dung hiển thị trong danh sách. */
  part: 'dap_ca' | 'tung_ho';
  defaultSeason?: ResponsorialSeason;
  /** Mục gợi ý theo ngày lễ — luôn ghim lên đầu, kể cả khi khác mùa đang lọc. */
  suggestedItems?: Responsorial[];
  onPick: (r: Responsorial) => void;
  onClose: () => void;
}) {
  const isDapCa = part === 'dap_ca';
  const partLabel = isDapCa ? 'Đáp ca' : 'Tung hô Tin Mừng';
  const partText = (r: Responsorial) =>
    isDapCa ? r.psalm_response : (r.gospel_acclamation ?? '(không có)');
  const [season, setSeason] = useState<ResponsorialSeason>(defaultSeason ?? 'thuong_nien');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Responsorial[]>([]);
  const [loading, setLoading] = useState(true);
  const suggestedList = useMemo(() => suggestedItems ?? [], [suggestedItems]);
  const suggested = useMemo(() => new Set(suggestedList.map((r) => r.id)), [suggestedList]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await listResponsorials(search.trim() ? { search } : { season });
        if (alive) setRows(data);
      } finally {
        if (alive) setLoading(false);
      }
    }, search ? 250 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [season, search]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const sa = suggested.has(a.id) ? 1 : 0, sb = suggested.has(b.id) ? 1 : 0;
      if (sa !== sb) return sb - sa;
      return a.sort_order - b.sort_order;
    });
  }, [rows, suggested]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[8vh]" onClick={onClose}>
      <div className="card w-[620px] max-w-[94vw] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Search size={15} className="text-ink-3" />
          <input autoFocus className="flex-1 bg-transparent text-[13.5px] outline-none"
            placeholder={`Chọn ${partLabel} — tìm theo dịp lễ, nội dung…`}
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <button onClick={onClose} className="text-ink-3 hover:text-ink"><X size={17} /></button>
        </div>

        {!search && (
          <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2">
            {RESP_SEASON_ORDER.map((s) => (
              <button key={s} className={`chip ${season === s ? 'chip-on' : ''}`} onClick={() => setSeason(s)}>
                {RESP_SEASON_LABEL[s]}
              </button>
            ))}
          </div>
        )}

        {suggestedList.length > 0 && !search && (
          <div className="border-b border-line">
            <div className="bg-surface-2 px-4 py-1.5 text-[11px] font-semibold text-ink-2">
              ⭐ Gợi ý cho ngày lễ đang soạn
            </div>
            {suggestedList.map((r) => (
              <button key={`sg-${r.id}`}
                className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left hover:bg-bg"
                onClick={() => onPick(r)}>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold">⭐ {r.occasion}</div>
                  <div className="truncate text-[11.5px] text-ink-2">
                    <span className="font-medium">{partLabel}:</span> {partText(r)}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] text-ink-2">
                  {RESP_SEASON_LABEL[r.season]}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="max-h-[52vh] overflow-auto">
          {loading ? (
            <div className="px-4 py-8 text-center text-[13px] text-ink-3">Đang tải…</div>
          ) : sorted.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-ink-3">Không có mục nào.</div>
          ) : (
            sorted.map((r) => (
              <button key={r.id}
                className="flex w-full items-start justify-between gap-3 px-4 py-2.5 text-left hover:bg-bg"
                onClick={() => onPick(r)}>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold">
                    {suggested.has(r.id) && '⭐ '}{r.occasion}
                  </div>
                  <div className="truncate text-[11.5px] text-ink-2">
                    <span className="font-medium">{partLabel}:</span> {partText(r)}
                  </div>
                </div>
                {search && (
                  <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] text-ink-2">
                    {RESP_SEASON_LABEL[r.season]}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
