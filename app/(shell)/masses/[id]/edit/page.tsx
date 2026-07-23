'use client';

import { useEffect, useState } from 'react';
import MassEditor from '@/components/MassEditor';
import PageHeader from '@/components/PageHeader';
import { getMassBundle, type MassBundle } from '@/lib/masses';

export default function EditMassPage({ params }: { params: { id: string } }) {
  const [bundle, setBundle] = useState<MassBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMassBundle(params.id)
      .then(setBundle)
      .catch((e) => setError(e instanceof Error ? e.message : 'Không tìm thấy lễ.'));
  }, [params.id]);

  if (error) {
    return (
      <>
        <PageHeader title="Sửa lễ" />
        <div className="px-7 py-5 text-[13px]" style={{ color: 'var(--lit-do)' }}>{error}</div>
      </>
    );
  }
  if (!bundle) {
    return <PageHeader title="Sửa lễ" sub="Đang tải…" />;
  }
  return <MassEditor bundle={bundle} />;
}
