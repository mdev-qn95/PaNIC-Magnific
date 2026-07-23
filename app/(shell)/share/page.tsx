'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Download, FileUp, Upload } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/components/AuthProvider';
import Checkbox from '@/components/ui/Checkbox';
import Select from '@/components/ui/Select';
import { listMasses, type MassListRow } from '@/lib/masses';
import {
  analyzePackage,
  downloadPackage,
  exportMassPackage,
  importPackage,
  parsePackage,
  type ConflictDecision,
  type ImportAnalysis,
  type MassPackage,
} from '@/lib/share';
import { supabaseConfigured } from '@/lib/supabase';

function fmtSize(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

const DECISION_LABEL: Record<ConflictDecision, string> = {
  keep: 'Giữ bản của mình',
  overwrite: 'Ghi đè bằng bản trong gói',
  both: 'Giữ cả hai',
};

export default function SharePage() {
  const [masses, setMasses] = useState<MassListRow[]>([]);
  const [exportId, setExportId] = useState('');
  const [includeImages, setIncludeImages] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportedSize, setExportedSize] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [pkg, setPkg] = useState<MassPackage | null>(null);
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [songDecisions, setSongDecisions] = useState<Record<number, ConflictDecision>>({});
  const [prayerDecisions, setPrayerDecisions] = useState<Record<number, ConflictDecision>>({});
  const [importing, setImporting] = useState(false);
  const [importedId, setImportedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!supabaseConfigured) return;
    listMasses().then((m) => {
      setMasses(m);
      if (m.length) setExportId(m[0].id);
    });
  }, []);

  const doExport = async () => {
    if (!exportId) return;
    setExporting(true);
    setError(null);
    setExportedSize(null);
    try {
      const p = await exportMassPackage(exportId, includeImages);
      setExportedSize(downloadPackage(p));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xuất thất bại.');
    } finally {
      setExporting(false);
    }
  };

  const readFile = async (file: File) => {
    setError(null);
    setImportedId(null);
    setPkg(null);
    setAnalysis(null);
    try {
      const parsed = parsePackage(await file.text());
      setPkg(parsed);
      const a = await analyzePackage(parsed);
      setAnalysis(a);
      setSongDecisions(Object.fromEntries(a.songConflicts.map((c) => [c.index, 'keep'])));
      setPrayerDecisions(Object.fromEntries(a.prayerConflicts.map((c) => [c.index, 'keep'])));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không đọc được file.');
    }
  };

  const doImport = async () => {
    if (!pkg || !analysis) return;
    setImporting(true);
    setError(null);
    try {
      const id = await importPackage(pkg, analysis, {
        songs: songDecisions,
        prayers: prayerDecisions,
      });
      setImportedId(id);
      setPkg(null);
      setAnalysis(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nhập thất bại.');
    } finally {
      setImporting(false);
    }
  };

  if (!supabaseConfigured) {
    return (
      <>
        <PageHeader title="Xuất / Nhập gói lễ" />
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
      <PageHeader title="Xuất / Nhập gói lễ" sub="Chia sẻ lễ đã soạn giữa các giáo xứ" />
      <div className="flex-1 overflow-auto px-7 py-5">
        {error && (
          <div className="mb-4 rounded-token-2 border px-4 py-2.5 text-[13px]"
            style={{ borderColor: 'var(--lit-do)', color: 'var(--lit-do)' }}>
            {error}
          </div>
        )}

        <div className="grid max-w-[900px] grid-cols-1 gap-4 lg:grid-cols-2">
          {/* ---- Xuất ---- */}
          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-[15px] font-semibold text-heading">
              <Upload size={16} /> Xuất gói lễ
            </h3>
            {masses.length === 0 ? (
              <p className="text-[13px] text-ink-2">Chưa có lễ nào để xuất.</p>
            ) : (
              <>
                <label className="field-label">Chọn lễ</label>
                <div className="mb-3">
                  <Select
                    value={exportId}
                    options={masses.map((m) => ({ value: m.id, label: `${m.title} — ${m.mass_date}` }))}
                    onChange={setExportId}
                  />
                </div>
                <div className="mb-1.5">
                  <Checkbox checked disabled onChange={() => {}}
                    label="Kèm bài hát & kinh trong lễ (bắt buộc)" />
                </div>
                <div className="mb-4">
                  <Checkbox checked={includeImages} onChange={setIncludeImages}
                    label="Kèm ảnh nền & poster (file lớn hơn)" />
                </div>
                <button className="btn btn-primary" onClick={doExport} disabled={exporting}>
                  <Download size={15} />
                  {exporting ? 'Đang đóng gói…' : 'Xuất file .magnific.json'}
                </button>
                {exportedSize !== null && (
                  <p className="mt-3 text-xs text-primary">✓ Đã tải xuống ({fmtSize(exportedSize)})</p>
                )}
              </>
            )}
          </div>

          {/* ---- Nhập ---- */}
          <div className="card p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-[15px] font-semibold text-heading">
              <FileUp size={16} /> Nhập gói lễ
            </h3>
            {!isAdmin && (
              <p className="rounded-token-2 bg-surface-2 px-3 py-2.5 text-[12.5px] text-ink-2">
                Nhập gói lễ sẽ thêm bài hát / kinh / ảnh vào thư viện chung nên cần{' '}
                <Link href="/login" className="font-bold text-primary">quyền quản trị</Link>.
                Bạn vẫn xuất gói lễ bình thường.
              </p>
            )}
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden"
              onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />

            {!pkg && isAdmin && (
              <div
                className="mb-3 cursor-pointer rounded-token border-2 border-dashed px-6 py-10 text-center text-[13px] text-ink-2"
                style={{ borderColor: dragOver ? 'var(--primary)' : 'var(--line)' }}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) readFile(f);
                }}
              >
                Kéo thả file <b>.magnific.json</b> vào đây
                <br />hoặc <span className="font-bold text-primary">chọn file</span>
              </div>
            )}

            {importedId && (
              <div className="rounded-token-2 border border-line bg-primary-soft px-4 py-3 text-[13px]">
                ✓ Đã nhập lễ thành công.{' '}
                <Link href={`/masses/${importedId}/edit`} className="font-bold text-primary">
                  Mở lễ vừa nhập →
                </Link>
              </div>
            )}

            {pkg && analysis && (
              <div className="text-[13px]">
                <div className="mb-3 rounded-token-2 bg-surface-2 px-3.5 py-2.5">
                  <b className="font-display text-heading">{pkg.mass.title}</b>
                  <div className="mt-1 text-xs text-ink-2">
                    {pkg.mass.mass_date} · {pkg.items.length} mục · {pkg.songs.length} bài hát ·{' '}
                    {pkg.prayers.length} kinh
                    {pkg.backgrounds.some((b) => b.data_base64) &&
                      ` · ${pkg.backgrounds.filter((b) => b.data_base64).length} ảnh nền`}
                    {pkg.poster && ' · có poster'}
                  </div>
                </div>

                {(analysis.songConflicts.length > 0 || analysis.prayerConflicts.length > 0) && (
                  <div className="mb-3">
                    <div className="field-label">Trùng tên với thư viện của bạn — chọn cách xử lý:</div>
                    {analysis.songConflicts.map((c) => (
                      <div key={`s${c.index}`} className="mb-2 flex items-center justify-between gap-2">
                        <span className="truncate">♪ {c.title}</span>
                        <Select
                          className="w-52 shrink-0"
                          value={songDecisions[c.index] ?? 'keep'}
                          options={(Object.keys(DECISION_LABEL) as ConflictDecision[]).map((k) => ({
                            value: k, label: DECISION_LABEL[k],
                          }))}
                          onChange={(v) => setSongDecisions((d) => ({ ...d, [c.index]: v }))}
                        />
                      </div>
                    ))}
                    {analysis.prayerConflicts.map((c) => (
                      <div key={`p${c.index}`} className="mb-2 flex items-center justify-between gap-2">
                        <span className="truncate">✝ {c.title}</span>
                        <Select
                          className="w-52 shrink-0"
                          value={prayerDecisions[c.index] ?? 'keep'}
                          options={(Object.keys(DECISION_LABEL) as ConflictDecision[]).map((k) => ({
                            value: k, label: DECISION_LABEL[k],
                          }))}
                          onChange={(v) => setPrayerDecisions((d) => ({ ...d, [c.index]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button className="btn btn-primary" onClick={doImport} disabled={importing}>
                    {importing ? 'Đang nhập…' : 'Nhập gói lễ'}
                  </button>
                  <button className="btn" onClick={() => { setPkg(null); setAnalysis(null); }}>
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
