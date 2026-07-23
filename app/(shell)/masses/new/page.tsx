'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import MassEditor from '@/components/MassEditor';
import { getMassBundle, type MassBundle } from '@/lib/masses';

function NewMassInner() {
  const sp = useSearchParams();
  const from = sp.get('from'); // nhân bản từ lễ này (chưa lưu tới khi bấm Lưu)
  const date = sp.get('date') ?? undefined;
  const [draft, setDraft] = useState<MassBundle | null>(null);
  const [loading, setLoading] = useState(Boolean(from));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!from) return;
    let alive = true;
    getMassBundle(from)
      .then((b) => alive && setDraft(b))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Không tải được lễ nguồn.'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [from]);

  if (loading) {
    return <div className="px-7 py-8 text-[13px] text-ink-2">Đang chuẩn bị bản sao…</div>;
  }
  if (error) {
    return <div className="px-7 py-8 text-[13px]" style={{ color: 'var(--lit-do)' }}>{error}</div>;
  }
  return <MassEditor draftFrom={draft ?? undefined} draftDate={date} />;
}

export default function NewMassPage() {
  return (
    <Suspense fallback={<div className="px-7 py-8 text-[13px] text-ink-2">Đang tải…</div>}>
      <NewMassInner />
    </Suspense>
  );
}
