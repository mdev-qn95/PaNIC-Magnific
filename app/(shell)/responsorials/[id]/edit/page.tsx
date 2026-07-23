'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import ResponsorialEditor from '@/components/ResponsorialEditor';
import { getResponsorial, type Responsorial } from '@/lib/responsorials';

export default function EditResponsorialPage({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<Responsorial | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getResponsorial(params.id)
      .then(setItem)
      .catch((e) => setError(e instanceof Error ? e.message : 'Không tìm thấy mục này.'));
  }, [params.id]);

  if (error) {
    return (
      <>
        <PageHeader title="Sửa Đáp ca / Tung hô" />
        <div className="px-7 py-5 text-[13px]" style={{ color: 'var(--lit-do)' }}>{error}</div>
      </>
    );
  }
  if (!item) return <PageHeader title="Sửa Đáp ca / Tung hô" sub="Đang tải…" />;
  return <ResponsorialEditor item={item} />;
}
