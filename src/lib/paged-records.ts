'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, limit as fsLimit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from './firebase';
import type { Rec } from './data';
import { chunk, mergePages } from './paging';

type Snap = { key: string; limit: number; rows: Rec[][] };

/**
 * Live, paginated view of one module's records (the `records` collection).
 *
 * Query: where p in <project ids> AND m == <module> ORDER BY ts DESC LIMIT n*pageSize. "Load more" raises n, which
 * re-subscribes with a larger window; the previous results stay on screen until the bigger window arrives, and edits
 * or new records show up live. Needs the composite index (p ASC, m ASC, ts DESC) in firestore.indexes.json.
 *
 * If the query fails (e.g. the index is not deployed yet) `error` is set so the caller can fall back to its
 * in-memory list instead of showing an empty page.
 */
export function usePagedRecords({ mod, projectIds, pageSize = 20, enabled = true }: { mod: string; projectIds: string[]; pageSize?: number; enabled?: boolean }) {
  const idsKey = projectIds.join(',');
  const key = `${mod}|${idsKey}`;
  const [pages, setPages] = useState({ key, n: 1 });
  const n = pages.key === key ? pages.n : 1; // a different module/project resets paging
  const limit = n * pageSize;
  const [snap, setSnap] = useState<Snap | null>(null);
  const [failed, setFailed] = useState<{ key: string; msg: string } | null>(null);

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : [];
    if (!enabled || !ids.length) return;
    const groups = chunk(ids);
    const rows: (Rec[] | undefined)[] = new Array(groups.length).fill(undefined);
    const offs = groups.map((g, i) =>
      onSnapshot(
        query(collection(db, 'records'), where('p', 'in', g), where('m', '==', mod), orderBy('ts', 'desc'), fsLimit(limit)),
        s => {
          rows[i] = s.docs.map(d => ({ ...(d.data() as Rec), id: d.id }));
          if (rows.every(Boolean)) { setSnap({ key, limit, rows: rows as Rec[][] }); setFailed(null); }
        },
        e => { console.error('paged records', mod, e); setFailed({ key, msg: e.message || 'Could not load records' }); },
      ),
    );
    return () => offs.forEach(off => off());
  }, [enabled, idsKey, key, limit, mod]);

  const merged = useMemo(() => (snap && snap.key === key ? mergePages(snap.rows, snap.limit) : null), [snap, key]);
  const error = failed && failed.key === key ? failed.msg : null;
  const loadMore = useCallback(() => setPages(p => ({ key, n: (p.key === key ? p.n : 1) + 1 })), [key]);

  return {
    enabled,
    recs: merged?.recs ?? ([] as Rec[]),
    hasMore: merged?.hasMore ?? false,
    loading: enabled && !error && !merged && projectIds.length > 0,
    loadingMore: !!merged && snap!.limit < limit && !error,
    limit,
    error,
    loadMore,
  };
}
