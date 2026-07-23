'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogIn, LogOut, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/components/AuthProvider';
import { signIn, signOut } from '@/lib/auth';
import { supabaseConfigured } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const { user, isAdmin, loading, refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      await refresh();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const doSignOut = async () => {
    setBusy(true);
    await signOut();
    await refresh();
    setBusy(false);
  };

  return (
    <>
      <PageHeader title="Đăng nhập" sub="Chỉ người quản lý mới cần đăng nhập để sửa dữ liệu" />
      <div className="flex-1 overflow-auto px-7 py-5">
        <div className="max-w-[440px]">
          {!supabaseConfigured && (
            <div className="card mb-4 px-4 py-3 text-[13px] text-ink-2">
              Chưa kết nối Supabase — xem hướng dẫn trong README.
            </div>
          )}

          {loading ? (
            <div className="card px-5 py-8 text-center text-[13px] text-ink-3">Đang kiểm tra…</div>
          ) : user ? (
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck size={18} style={{ color: isAdmin ? 'var(--primary)' : 'var(--ink-3)' }} />
                <div>
                  <div className="text-[13.5px] font-bold">{user.email}</div>
                  <div className="text-xs text-ink-2">
                    {isAdmin ? 'Quản trị viên — được sửa dữ liệu chung' : 'Người dùng thường — chỉ xem'}
                  </div>
                </div>
              </div>
              {!isAdmin && (
                <p className="mb-3 rounded-token-2 bg-surface-2 px-3 py-2 text-xs text-ink-2">
                  Tài khoản này chưa có quyền quản trị. Nhờ người quản lý đặt vai trò
                  <code className="mx-1">admin</code> trong bảng <code>profiles</code>.
                </p>
              )}
              <button className="btn" onClick={doSignOut} disabled={busy}>
                <LogOut size={15} /> Đăng xuất
              </button>
            </div>
          ) : (
            <form className="card p-5" onSubmit={doSignIn}>
              <p className="mb-4 text-[13px] text-ink-2">
                Không đăng nhập vẫn dùng được: xem thư viện, soạn lễ (lưu trên máy),
                trình chiếu, xuất PowerPoint. Đăng nhập chỉ cần khi muốn <b>sửa dữ liệu chung</b>.
              </p>
              <label className="field-label">Email</label>
              <input className="field mb-3" type="email" autoComplete="username" required
                value={email} onChange={(e) => setEmail(e.target.value)} />
              <label className="field-label">Mật khẩu</label>
              <input className="field mb-4" type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)} />
              {error && (
                <div className="mb-3 text-[13px]" style={{ color: 'var(--lit-do)' }}>{error}</div>
              )}
              <button className="btn btn-primary" type="submit" disabled={busy || !supabaseConfigured}>
                <LogIn size={15} /> {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
