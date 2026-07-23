'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export default function PageHeader({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // Vùng cuộn là phần tử kế ngay sau header (div flex-1 overflow-auto của mỗi trang).
  // Khi cuộn xuống → thêm shadow cho header tách khỏi nội dung.
  useEffect(() => {
    const scroller = ref.current?.nextElementSibling as HTMLElement | null;
    if (!scroller) return;
    const onScroll = () => setScrolled(scroller.scrollTop > 2);
    onScroll();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      ref={ref}
      className={`app-topbar flex shrink-0 items-center justify-between px-7 py-4${scrolled ? ' is-scrolled' : ''}`}
    >
      <div>
        <h1>{title}</h1>
        {sub && <div className="mt-0.5 text-[12.5px] text-ink-2">{sub}</div>}
      </div>
      {children && <div className="flex items-center gap-2.5">{children}</div>}
    </div>
  );
}
