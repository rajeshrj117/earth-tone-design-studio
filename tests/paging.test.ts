import { describe, it, expect } from 'vitest';
import { chunk, mergePages, byRecency } from '@/lib/paging';
import type { Rec } from '@/lib/data';

const rec = (id: string, ts: number, seq = 0): Rec => ({ id, p: 'P1', m: 'tasks', t: id, s: 'Open', d: '', ts, seq });

describe('chunk', () => {
  it('splits into groups of at most 30 (Firestore `in` limit)', () => {
    const ids = Array.from({ length: 65 }, (_, i) => 'P' + i);
    expect(chunk(ids).map(c => c.length)).toEqual([30, 30, 5]);
  });
  it('returns nothing for no ids', () => expect(chunk([])).toEqual([]));
});

describe('byRecency', () => {
  it('orders newest first, then by seq', () => {
    const rs = [rec('old', 1), rec('b', 5, 2), rec('a', 5, 1)].sort(byRecency);
    expect(rs.map(r => r.id)).toEqual(['a', 'b', 'old']);
  });
});

describe('mergePages', () => {
  it('takes the global top-N across chunks', () => {
    const c1 = [rec('a', 10), rec('b', 8), rec('c', 2)];
    const c2 = [rec('d', 9), rec('e', 7), rec('f', 1)];
    const { recs, hasMore } = mergePages([c1, c2], 3);
    expect(recs.map(r => r.id)).toEqual(['a', 'd', 'b']);
    expect(hasMore).toBe(true);
  });
  it('reports no more when every chunk is under the limit and the union fits', () => {
    const { recs, hasMore } = mergePages([[rec('a', 3)], [rec('b', 2)]], 5);
    expect(recs.map(r => r.id)).toEqual(['a', 'b']);
    expect(hasMore).toBe(false);
  });
  it('reports more when a chunk is exactly full (there may be more behind it)', () => {
    expect(mergePages([[rec('a', 3), rec('b', 2)]], 2).hasMore).toBe(true);
  });
  it('reports more when the union exceeds one window even if no chunk is full', () => {
    expect(mergePages([[rec('a', 4), rec('b', 3)], [rec('c', 2), rec('d', 1)]], 3).hasMore).toBe(true);
  });
  it('de-duplicates a record that appears in two snapshots', () => {
    expect(mergePages([[rec('a', 3)], [rec('a', 3)]], 5).recs).toHaveLength(1);
  });
  it('handles empty input', () => expect(mergePages([], 20)).toEqual({ recs: [], hasMore: false }));
});
