'use client';

import { useEffect, useState } from 'react';
import SongEditor from '@/components/SongEditor';
import PageHeader from '@/components/PageHeader';
import { getSong } from '@/lib/songs';
import type { Song } from '@/lib/types';

export default function EditSongPage({ params }: { params: { id: string } }) {
  const [song, setSong] = useState<Song | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSong(params.id)
      .then(setSong)
      .catch((e) => setError(e instanceof Error ? e.message : 'Không tìm thấy bài hát.'));
  }, [params.id]);

  if (error) {
    return (
      <>
        <PageHeader title="Sửa bài hát" />
        <div className="px-7 py-5 text-[13px]" style={{ color: 'var(--lit-do)' }}>{error}</div>
      </>
    );
  }
  if (!song) {
    return (
      <>
        <PageHeader title="Sửa bài hát" sub="Đang tải…" />
      </>
    );
  }
  return <SongEditor song={song} />;
}
