'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import SlideRenderer from '@/components/SlideRenderer';
import Checkbox from '@/components/ui/Checkbox';
import UnsavedGuard from '@/components/ui/UnsavedGuard';
import { useAuth } from '@/components/AuthProvider';
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  type AppSettings,
} from '@/lib/settings';
import { supabaseConfigured } from '@/lib/supabase';
import { applyTheme, THEMES, type ThemeId } from '@/lib/theme';

export default function SettingsPage() {
  const [s, setS] = useState<AppSettings>(DEFAULT_SETTINGS);
  /** Bản đã lưu — dùng để biết có thay đổi chưa lưu và để hoàn tác. */
  const [baseline, setBaseline] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin } = useAuth();
  // Người dùng thường không lưu được cài đặt chung → không có trạng thái "chưa lưu".
  // Riêng chủ đề giao diện là tùy chọn của từng máy, đổi là áp dụng ngay (lưu localStorage).
  const dirty = loaded && isAdmin && JSON.stringify(s) !== JSON.stringify(baseline);

  useEffect(() => {
    getSettings(true).then((v) => {
      setS(v);
      setBaseline(v);
      setLoaded(true);
      // đồng bộ theme từ DB (trường hợp đổi máy) — localStorage vẫn là nguồn nhanh
      applyTheme(v.theme);
    });
  }, []);

  /** Bỏ thay đổi: trả state + theme đang hiển thị về bản đã lưu. */
  const discard = () => {
    setS(baseline);
    applyTheme(baseline.theme);
    setError(null);
  };

  const patch = (p: Partial<AppSettings>) => {
    setS((prev) => ({ ...prev, ...p }));
    setSavedAt(null);
  };

  const chooseTheme = (t: ThemeId) => {
    applyTheme(t); // đổi ngay, không chờ lưu
    patch({ theme: t });
  };

  const save = async (): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      const clean: AppSettings = {
        ...s,
        max_lines_landscape: Math.max(1, Math.min(8, s.max_lines_landscape || 4)),
        max_lines_portrait: Math.max(1, Math.min(10, s.max_lines_portrait || 6)),
      };
      await saveSettings(clean);
      setS(clean);
      setBaseline(clean);
      setSavedAt(Date.now());
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <UnsavedGuard
        dirty={dirty}
        message={
          <>
            Bạn đã đổi cài đặt nhưng chưa lưu
            {s.theme !== baseline.theme && <> (trong đó có <b>chủ đề giao diện</b>)</>}.
            Nếu bỏ thay đổi, mọi thứ sẽ trở lại như trước.
          </>
        }
        onSave={save}
        onDiscard={discard}
      />

      <PageHeader title="Cài đặt" sub={loaded ? undefined : 'Đang tải…'}>
        {dirty ? (
          <span className="text-xs" style={{ color: 'var(--lit-do)' }}>● Chưa lưu</span>
        ) : (
          savedAt && <span className="text-xs text-primary">✓ Đã lưu</span>
        )}
        {dirty && (
          <button className="btn" onClick={discard} disabled={saving}>Hoàn tác</button>
        )}
        <button className="btn btn-primary" onClick={save}
          disabled={saving || !supabaseConfigured || !dirty || !isAdmin}
          data-tip={!isAdmin ? 'Chỉ quản trị viên mới lưu được cài đặt chung' : undefined}>
          {saving ? 'Đang lưu…' : 'Lưu cài đặt'}
        </button>
      </PageHeader>

      <div className="flex-1 overflow-auto px-7 py-5">
        {!isAdmin && (
          <div className="mb-4 rounded-token-2 border border-line bg-surface-2 px-4 py-2.5 text-[12.5px] text-ink-2">
            Bạn đang xem ở chế độ thường: <b>chủ đề giao diện đổi được ngay</b> (lưu riêng trên máy này),
            các cài đặt chung của giáo xứ cần quyền quản trị.
          </div>
        )}
        {!supabaseConfigured && (
          <div className="mb-4 rounded-token-2 border border-line bg-surface px-4 py-2.5 text-[13px] text-ink-2">
            Chưa kết nối Supabase — theme vẫn đổi được (lưu trên máy), các mục khác cần .env.local.
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-token-2 border px-4 py-2.5 text-[13px]"
            style={{ borderColor: 'var(--lit-do)', color: 'var(--lit-do)' }}>
            {error}
          </div>
        )}

        <div className="grid max-w-[880px] grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card p-5 lg:col-span-2">
            <h3 className="mb-3 font-display text-[15px] font-semibold text-heading">Giao diện</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {THEMES.map((t) => (
                <button key={t.id} onClick={() => chooseTheme(t.id)}
                  className="rounded-token border p-3 text-left transition-colors"
                  style={{
                    borderColor: s.theme === t.id ? 'var(--primary)' : 'var(--line)',
                    boxShadow: s.theme === t.id ? '0 0 0 3px var(--primary-soft)' : 'none',
                    background: 'var(--surface)',
                  }}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[13.5px] font-bold text-ink">{t.emoji} {t.label}</span>
                    {s.theme === t.id && <span className="text-[11px] font-bold text-primary">Đang dùng</span>}
                  </div>
                  <div className="text-xs text-ink-2">{t.desc}</div>
                </button>
              ))}
            </div>
            <div className="mt-4 max-w-sm">
              <div className="field-label">Slide xem thử theo theme đang chọn</div>
              <SlideRenderer orientation="landscape" color="xanh"
                slide={{ title: 'Hãy Đến Tung Hô Chúa', lines: ['Hãy đến tung hô Chúa,', 'reo mừng Đấng cứu thoát ta.'] }} />
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-3 font-display text-[15px] font-semibold text-heading">Giáo xứ</h3>
            <label className="field-label">Tên giáo xứ</label>
            <input className="field mb-3" value={s.parish_name}
              onChange={(e) => patch({ parish_name: e.target.value })}
              placeholder="Ví dụ: Giáo xứ Cẩm Sơn" />
            <label className="field-label">Giáo phận</label>
            <input className="field" value={s.diocese}
              onChange={(e) => patch({ diocese: e.target.value })}
              placeholder="Ví dụ: Đà Nẵng" />
          </div>

          <div className="card p-5">
            <h3 className="mb-3 font-display text-[15px] font-semibold text-heading">Trình chiếu</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Số dòng tối đa — Ngang</label>
                <input type="number" min={1} max={8} className="field" value={s.max_lines_landscape}
                  onChange={(e) => patch({ max_lines_landscape: parseInt(e.target.value, 10) || 4 })} />
              </div>
              <div>
                <label className="field-label">Số dòng tối đa — Dọc</label>
                <input type="number" min={1} max={10} className="field" value={s.max_lines_portrait}
                  onChange={(e) => patch({ max_lines_portrait: parseInt(e.target.value, 10) || 6 })} />
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-3">
              Áp dụng khi auto-chia slide trong soạn bài hát/kinh và khi trình chiếu.
              Bài đã lưu giữ nguyên — mở lại editor để chia lại theo cài đặt mới.
            </p>
          </div>

          <div className="card p-5 lg:col-span-2">
            <h3 className="mb-3 font-display text-[15px] font-semibold text-heading">Lịch phụng vụ</h3>
            <div className="mb-2">
              <Checkbox checked={s.ascension_on_sunday}
                onChange={(v) => patch({ ascension_on_sunday: v })}
                label="Chúa Thăng Thiên dời sang Chúa Nhật (lệ VN)" />
            </div>
            <Checkbox checked={s.tu_dao_on_sunday}
              onChange={(v) => patch({ tu_dao_on_sunday: v })}
              label="Các Thánh Tử Đạo VN mừng vào Chúa Nhật gần 24/11" />
          </div>
        </div>
      </div>
    </>
  );
}
