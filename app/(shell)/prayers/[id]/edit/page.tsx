'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import PrayerEditor from '@/components/PrayerEditor';
import { getPrayer } from '@/lib/prayers';
import type { Prayer } from '@/lib/types';

export default function EditPrayerPage({ params }: { params: { id: string } }) {
  const [prayer, setPrayer] = useState<Prayer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPrayer(params.id)
      .then(setPrayer)
      .catch((e) => setError(e instanceof Error ? e.message : 'Không tìm thấy kinh.'));
  }, [params.id]);

  if (error) {
    return (
      <>
        <PageHeader title="Sửa kinh" />
        <div className="px-7 py-5 text-[13px]" style={{ color: 'var(--lit-do)' }}>{error}</div>
      </>
    );
  }
  if (!prayer) {
    return <PageHeader title="Sửa kinh" sub="Đang tải…" />;
  }
  return <PrayerEditor prayer={prayer} />;
}
