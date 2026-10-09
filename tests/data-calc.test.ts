import { describe, expect, it } from 'vitest';
import { money, setProjectsForCalc } from '@/lib/calc';
import { MODULES, inr, type Project, type Rec } from '@/lib/data';

const rec = (o: Partial<Rec>): Rec => ({ id: Math.random().toString(), p: 'P1', m: 'payments', t: 't', s: 'Due', d: '', ...o });

describe('money()', () => {
  setProjectsForCalc([{ id: 'P1', value: 1_000_000 } as Project, { id: 'P2', value: 500 } as Project]);
  it('adds only APPROVED variations to the contract value', () => {
    const m = money([rec({ m: 'variations', s: 'Approved', amt: 100 }), rec({ m: 'variations', s: 'Pending', amt: 999 }), rec({ m: 'variations', s: 'Rejected', amt: 999 })], 'P1');
    expect(m).toMatchObject({ orig: 1_000_000, vars: 100, current: 1_000_100 });
  });
  it('only Received payments count as paid; Pending verification/Rejected never do', () => {
    const m = money([rec({ s: 'Received', amt: 300 }), rec({ s: 'Pending verification', amt: 5000 }), rec({ s: 'Rejected', amt: 5000 }), rec({ s: 'Due', amt: 70 }), rec({ s: 'Upcoming', amt: 30 })], 'P1');
    expect(m).toMatchObject({ paid: 300, due: 70, upcoming: 30 });
  });
  it('ignores other projects and handles unknown projects/empty lists', () => {
    expect(money([rec({ p: 'P2', s: 'Received', amt: 99 })], 'P1').paid).toBe(0);
    expect(money([], 'NOPE')).toMatchObject({ orig: 0, current: 0, paid: 0 });
  });
});

describe('MODULES role visibility', () => {
  const visible = (role: string) => MODULES.filter(m => m.roles.includes(role as never)).map(m => m.key);
  it('clients never see internal modules', () => {
    for (const k of ['expenses', 'tasks']) expect(visible('client')).not.toContain(k);
  });
  it('designers never see money modules', () => {
    for (const k of ['payments', 'quotations', 'variations', 'expenses', 'agreements']) expect(visible('designer')).not.toContain(k);
  });
  it('accounts see finance modules but not site-quality modules', () => {
    expect(visible('accounts')).toEqual(expect.arrayContaining(['payments', 'expenses', 'agreements']));
    for (const k of ['snags', 'tasks']) expect(visible('accounts')).not.toContain(k);
  });
  it('admin sees everything', () => expect(visible('admin')).toHaveLength(MODULES.length));
});

describe('inr()', () => { it('formats in Indian grouping', () => expect(inr(1234567.4)).toBe('₹12,34,567')); });
