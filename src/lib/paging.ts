import type { Rec } from './data';

/** Firestore `in` queries accept at most 30 values, so project ids are queried in chunks. */
export const IN_LIMIT = 30;

export function chunk<T>(items: T[], size = IN_LIMIT): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Same ordering the store uses for records: newest first, then insertion order. */
export const byRecency = (a: Rec, b: Rec) => (b.ts ?? 0) - (a.ts ?? 0) || (a.seq ?? 0) - (b.seq ?? 0);

/**
 * Merge the result of several per-chunk queries that were each run with `limit(limit)` ordered by ts desc.
 * The top `limit` of the union is always contained in the union of each chunk's top `limit`, so this is exact.
 * `hasMore` is true when anything was cut off: either the merged set is larger than one window, or some chunk
 * came back full (so it may hold more beyond its window).
 */
export function mergePages(rows: Rec[][], limit: number): { recs: Rec[]; hasMore: boolean } {
  const seen = new Set<string>();
  const merged = rows.flat().filter(r => !seen.has(r.id) && seen.add(r.id)).sort(byRecency);
  return { recs: merged.slice(0, limit), hasMore: merged.length > limit || rows.some(r => r.length >= limit) };
}
