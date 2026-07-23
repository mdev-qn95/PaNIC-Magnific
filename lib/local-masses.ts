/**
 * Lễ lưu trên máy (IndexedDB) — dành cho người dùng KHÔNG phải admin.
 * Chỉ admin mới ghi được xuống DB chung, nhưng ai cũng phải soạn được lễ để
 * chiếu / xuất PowerPoint / dùng offline. Lễ dạng này chỉ nằm trên máy họ.
 */

import Dexie, { type EntityTable } from 'dexie';
import type { MassInput, MassItemInput, MassListRow } from './masses';
import type { Mass, MassItem } from './types';

export const LOCAL_PREFIX = 'local-';
export const isLocalMassId = (id: string): boolean => id.startsWith(LOCAL_PREFIX);

interface LocalMassRow {
  id: string;
  mass: Mass;
  items: MassItem[];
  updated_at: number;
}

const db = new Dexie('magnific-local') as Dexie & {
  masses: EntityTable<LocalMassRow, 'id'>;
};
db.version(1).stores({ masses: 'id, updated_at' });

export async function saveLocalMass(
  massId: string | null,
  input: MassInput,
  items: MassItemInput[],
): Promise<string> {
  const id = massId ?? `${LOCAL_PREFIX}${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const existing = massId ? await db.masses.get(massId) : undefined;
  const mass: Mass = {
    id,
    mass_date: input.mass_date,
    title: input.title,
    liturgical_color: input.liturgical_color,
    poster_path: input.poster_path ?? null,
    notes: input.notes ?? null,
    created_at: existing?.mass.created_at ?? now,
    updated_at: now,
  };
  const rows: MassItem[] = items.map((it, position) => ({
    id: `${id}-i${position}`,
    mass_id: id,
    position,
    item_type: it.item_type,
    ref_id: it.ref_id,
    custom_slides: it.custom_slides,
    background_id: it.background_id ?? null,
    overrides: it.overrides ?? {},
  }));
  await db.masses.put({ id, mass, items: rows, updated_at: Date.now() });
  return id;
}

export async function getLocalMass(id: string): Promise<{ mass: Mass; items: MassItem[] } | null> {
  const row = await db.masses.get(id);
  return row ? { mass: row.mass, items: row.items } : null;
}

export async function listLocalMasses(): Promise<MassListRow[]> {
  const rows = await db.masses.toArray();
  return rows
    .sort((a, b) => b.mass.mass_date.localeCompare(a.mass.mass_date))
    .map((r) => ({ ...r.mass, mass_items: [{ count: r.items.length }] }));
}

export async function deleteLocalMass(id: string): Promise<void> {
  await db.masses.delete(id);
}

export async function countLocalMasses(): Promise<number> {
  try {
    return await db.masses.count();
  } catch {
    return 0;
  }
}
