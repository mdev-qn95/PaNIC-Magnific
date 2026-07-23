'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  BookOpenText,
  Church,
  Home,
  Image as ImageIcon,
  Music,
  ScrollText,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import {
  COLOR_LABEL,
  getLiturgicalDay,
  romanNumeral,
  type LiturgicalDay,
} from '@/lib/liturgical-calendar';
import { calendarOptions, getSettings } from '@/lib/settings';

const NAV_MAIN = [
  { href: '/', label: 'Trang chủ', icon: Home },
  { href: '/masses', label: 'Thánh lễ', icon: Church },
];
const NAV_LIB = [
  { href: '/songs', label: 'Bài hát', icon: Music },
  { href: '/responsorials', label: 'Đáp Ca - Tung Hô Tin Mừng', icon: ScrollText },
  { href: '/prayers', label: 'Kinh nguyện', icon: BookOpenText },
  { href: '/backgrounds', label: 'Ảnh nền', icon: ImageIcon },
];
const NAV_OTHER = [
  { href: '/share', label: 'Xuất / Nhập gói lễ', icon: ArrowLeftRight },
  { href: '/settings', label: 'Cài đặt', icon: Settings },
];

function NavSection({ items, pathname }: { items: typeof NAV_MAIN; pathname: string }) {
  return (
    <>
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={`nav-link ${active ? 'active' : ''}`}>
            <Icon size={16} strokeWidth={2} />
            {label}
          </Link>
        );
      })}
    </>
  );
}

export default function AppShell() {
  const pathname = usePathname();
  // Tính sau khi mount để tránh lệch ngày server/client lúc hydrate
  const { user, isAdmin } = useAuth();
  const [today, setToday] = useState<LiturgicalDay | null>(null);
  const [parish, setParish] = useState('');
  useEffect(() => {
    getSettings().then((s) => {
      setToday(getLiturgicalDay(new Date(), calendarOptions(s)));
      setParish(s.parish_name);
    });
  }, [pathname]); // re-đọc khi đổi trang — bắt kịp thay đổi từ màn Cài đặt

  return (
    <aside className="app-sidebar flex h-full w-[220px] min-w-[220px] shrink-0 flex-col overflow-y-auto py-5">
      <div className="border-b border-line px-5 pb-4">
        <div className="font-display text-[19px] font-bold text-heading">
          PaNIC-<span className="text-primary">Magnific</span>
        </div>
        <div className="mt-0.5 text-[11px] text-ink-3">{parish || 'Phụng Vụ Slides'}</div>
      </div>

      <nav className="mt-2 flex flex-col">
        <NavSection items={NAV_MAIN} pathname={pathname} />
        <div className="px-5 pb-1 pt-4 text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
          Thư viện
        </div>
        <NavSection items={NAV_LIB} pathname={pathname} />
        <div className="px-5 pb-1 pt-4 text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
          Khác
        </div>
        <NavSection items={NAV_OTHER} pathname={pathname} />
      </nav>

      <div className="mx-3.5 mt-auto">
        <Link
          href="/login"
          className="mb-2 flex items-center gap-2 rounded-token-2 border border-line px-3 py-2 text-[11.5px] text-ink-2 transition-colors hover:border-primary"
          data-tip={isAdmin ? 'Đang đăng nhập với quyền quản trị' : 'Đăng nhập để sửa dữ liệu chung'}
        >
          <ShieldCheck size={14} style={{ color: isAdmin ? 'var(--primary)' : 'var(--ink-3)' }} />
          {isAdmin ? (
            <span className="truncate">
              <b className="text-heading">Quản trị</b>
              <span className="ml-1 text-ink-3">· {user?.email}</span>
            </span>
          ) : (
            <span>Đăng nhập quản trị</span>
          )}
        </Link>
      </div>

      {today && (
        <div className="mx-3.5 mb-0 rounded-token-2 border border-line bg-primary-soft px-3 py-2.5 text-[11.5px] text-ink-2">
          <div className="mb-0.5 flex items-center gap-1.5 font-display text-[12.5px] font-semibold text-heading">
            <span
              className="inline-block h-[9px] w-[9px] rounded-full"
              style={{ background: `var(--lit-${today.color})` }}
            />
            {today.seasonTitle}
          </div>
          {today.week ? `Tuần ${romanNumeral(today.week)} — ` : ''}Năm {today.cycle} · Màu{' '}
          {COLOR_LABEL[today.color].toLowerCase()}
        </div>
      )}
    </aside>
  );
}
