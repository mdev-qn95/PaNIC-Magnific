/**
 * Offline (CLAUDE.md mục 9): "Tải để chiếu offline" lưu MassSnapshot + blob ảnh
 * vào IndexedDB — ở nhà thờ mất mạng hoàn toàn vẫn chiếu được.
 *
 * Ghi chú thứ tự đọc: spec nói "đọc IndexedDB trước, fallback Supabase", nhưng
 * như vậy sau khi sửa lễ mà quên tải lại sẽ chiếu bản cũ một cách khó hiểu.
 * Ở đây dùng: thử mạng (timeout 5s) → fail thì dùng bản offline. Kết quả cuối
 * giống nhau (mất mạng vẫn chiếu), nhưng khi có mạng luôn được bản mới nhất.
 */

import Dexie, { type EntityTable } from 'dexie';
import { buildSnapshot, type MassSnapshot, type SnapshotSlide } from './present';

interface SnapshotRow {
  massId: string;
  snapshot: MassSnapshot;
  savedAt: number;
}

interface AssetRow {
  url: string;
  blob: Blob;
}

const db = new Dexie('magnific') as Dexie & {
  snapshots: EntityTable<SnapshotRow, 'massId'>;
  assets: EntityTable<AssetRow, 'url'>;
};

db.version(1).stores({
  snapshots: 'massId',
  assets: 'url',
});

/** Tải lễ về máy: snapshot + toàn bộ ảnh nền/poster (blob). */
export async function saveOffline(massId: string): Promise<number> {
  const snap = await buildSnapshot(massId);
  const urls = new Set<string>();
  for (const s of [...snap.landscape, ...snap.portrait]) {
    if (s.background?.url) urls.add(s.background.url);
  }
  for (const url of urls) {
    const res = await fetch(url);
    if (res.ok) await db.assets.put({ url, blob: await res.blob() });
  }
  const savedAt = Date.now();
  await db.snapshots.put({ massId, snapshot: snap, savedAt });
  return savedAt;
}

export async function getOfflineSavedAt(massId: string): Promise<number | null> {
  try {
    const row = await db.snapshots.get(massId);
    return row?.savedAt ?? null;
  } catch {
    return null;
  }
}

export async function removeOffline(massId: string): Promise<void> {
  await db.snapshots.delete(massId);
}

/** Đọc snapshot offline, thay URL ảnh bằng blob URL (chiếu không cần mạng). */
export async function loadOffline(massId: string): Promise<MassSnapshot | null> {
  const row = await db.snapshots.get(massId);
  if (!row) return null;
  const snap: MassSnapshot = JSON.parse(JSON.stringify(row.snapshot));
  const objectUrls = new Map<string, string>();
  const swap = async (s: SnapshotSlide) => {
    if (!s.background?.url) return;
    let u = objectUrls.get(s.background.url);
    if (!u) {
      const asset = await db.assets.get(s.background.url);
      if (asset) {
        u = URL.createObjectURL(asset.blob);
        objectUrls.set(s.background.url, u);
      }
    }
    if (u) s.background.url = u;
  };
  for (const s of snap.landscape) await swap(s);
  for (const s of snap.portrait) await swap(s);
  return snap;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

export interface SmartSnapshot {
  snap: MassSnapshot;
  /** true = đang dùng bản offline (mất mạng / mạng quá chậm). */
  offline: boolean;
}

export async function loadSnapshotSmart(massId: string): Promise<SmartSnapshot> {
  try {
    const snap = await withTimeout(buildSnapshot(massId), 5000);
    return { snap, offline: false };
  } catch {
    const off = await loadOffline(massId);
    if (off) return { snap: off, offline: true };
    throw new Error('Không tải được lễ — mất mạng và lễ chưa được tải offline.');
  }
}
