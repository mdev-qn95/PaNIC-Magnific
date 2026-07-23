'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Copy, Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SlideRenderer from '@/components/SlideRenderer';
import {
  COLOR_LABEL,
  getLiturgicalDay,
  type LiturgicalDay,
} from '@/lib/liturgical-calendar';
import { listMasses, type MassListRow } from '@/lib/masses';
import { calendarOptions, getSettings } from '@/lib/settings';
import { supabase, supabaseConfigured } from '@/lib/supabase';

const WEEKDAY_FULL = [
  'Chúa Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy',
];

function greeting(hour: number): string {
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

interface Stats {
  songs: number;
  prayers: number;
  backgrounds: number;
  masses: number;
}

export default function HomePage() {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  const [today, setToday] = useState<LiturgicalDay | null>(null);
  const [nextSunday, setNextSunday] = useState<{ date: Date; info: LiturgicalDay } | null>(null);
  const [latestMass, setLatestMass] = useState<MassListRow | null>(null);
  const [sundayMass, setSundayMass] = useState<MassListRow | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const n = new Date();
    setNow(n);
    const d = new Date(n);
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    getSettings().then((s) => {
      const opts = calendarOptions(s);
      setToday(getLiturgicalDay(n, opts));
      setNextSunday({ date: d, info: getLiturgicalDay(d, opts) });
    });

    if (!supabaseConfigured || !supabase) return;
    const sundayISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    (async () => {
      try {
        const masses = await listMasses();
        setLatestMass(masses[0] ?? null);
        setSundayMass(masses.find((m) => m.mass_date === sundayISO) ?? null);
      } catch {
        /* hiển thị phần tĩnh */
      }
      const count = async (table: string) => {
        const { count: c } = await supabase!
          .from(table)
          .select('*', { count: 'exact', head: true });
        return c ?? 0;
      };
      try {
        setStats({
          songs: await count('songs'),
          prayers: await count('prayers'),
          backgrounds: await count('backgrounds'),
          masses: await count('masses'),
        });
      } catch {
        /* stats để trống */
      }
    })();
  }, []);

  // Nhân bản = mở trình soạn lễ với bản sao CHƯA lưu (không ghi DB tới khi bấm Lưu)
  const duplicateLatest = () => {
    if (!latestMass || !nextSunday) return;
    const d = nextSunday.date;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    router.push(`/masses/new?from=${latestMass.id}&date=${iso}`);
  };

  const sub = now && today
    ? `${WEEKDAY_FULL[now.getDay()]}, ${fmtDate(now)} · ${today.title}`
    : '';

  return (
    <>
      <PageHeader title={now ? `${greeting(now.getHours())} 👋` : 'Xin chào'} sub={sub}>
        <button
          className="btn"
          disabled={!latestMass}
          onClick={duplicateLatest}
          data-tip={latestMass ? `Nhân bản "${latestMass.title}" sang CN tới` : 'Chưa có lễ nào để nhân bản'}
        >
          <Copy size={15} /> Nhân bản lễ gần nhất
        </button>
        <Link href="/masses/new" className="btn btn-primary">
          <Plus size={15} /> Soạn lễ mới
        </Link>
      </PageHeader>

      <div className="flex-1 overflow-auto px-7 py-5">
        <h3 className="mb-3 font-display text-[15px] font-semibold text-heading">
          Chúa Nhật sắp tới
        </h3>
        {nextSunday && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <div className="font-display text-[15.5px] font-semibold text-heading">
                    {nextSunday.info.title}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-2">
                    CN {fmtDate(nextSunday.date)} · Năm {nextSunday.info.cycle}
                  </div>
                </div>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: 'var(--primary-soft)', color: `var(--lit-${nextSunday.info.color})` }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: `var(--lit-${nextSunday.info.color})` }}
                  />
                  {COLOR_LABEL[nextSunday.info.color]}
                </span>
              </div>
              {sundayMass ? (
                <>
                  <div className="mb-3 text-[12.5px] text-ink-2">
                    Đã soạn: {sundayMass.mass_items[0]?.count ?? 0} mục.
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/present/${sundayMass.id}/control`} className="btn btn-sm btn-primary">
                      ▶ Trình chiếu
                    </Link>
                    <Link href={`/masses/${sundayMass.id}/edit`} className="btn btn-sm">
                      Soạn tiếp
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-3 text-[12.5px] text-ink-2">Chưa soạn lễ cho ngày này.</div>
                  <Link href="/masses/new" className="btn btn-sm btn-primary">Soạn lễ này</Link>
                </>
              )}
            </div>

            <div className="card flex items-center gap-4 p-4">
              <div className="w-44 shrink-0">
                <SlideRenderer
                  orientation="landscape"
                  color={nextSunday.info.color}
                  slide={{ title: nextSunday.info.title, lines: [`Năm ${nextSunday.info.cycle}`] }}
                />
              </div>
              <div className="text-[12.5px] leading-relaxed text-ink-2">
                Slide xem thử theo theme hiện tại — đổi chủ đề trong{' '}
                <Link href="/settings" className="font-bold text-primary">Cài đặt</Link>.
                Dải màu cạnh trái là màu phụng vụ của lễ.
              </div>
            </div>
          </div>
        )}

        <h3 className="mb-3 mt-6 font-display text-[15px] font-semibold text-heading">
          Thư viện
        </h3>
        <div className="flex flex-wrap gap-3.5">
          {[
            { n: stats?.songs, label: 'bài hát', href: '/songs' },
            { n: stats?.prayers, label: 'kinh nguyện', href: '/prayers' },
            { n: stats?.backgrounds, label: 'ảnh nền', href: '/backgrounds' },
            { n: stats?.masses, label: 'lễ đã soạn', href: '/masses' },
          ].map((s) => (
            <Link key={s.label} href={s.href}
              className="card px-6 py-3.5 text-[13px] text-ink-2 transition-colors hover:border-primary">
              <b className="block font-display text-2xl text-primary">{s.n ?? '—'}</b>
              {s.label}
            </Link>
          ))}
        </div>
        {!supabaseConfigured && (
          <p className="mt-3 text-xs text-ink-3">
            Số liệu hiển thị sau khi kết nối Supabase (xem README — mục Cài đặt).
          </p>
        )}
      </div>
    </>
  );
}
