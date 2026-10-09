import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/records/route';
import { FIELDS, STATUS, defaultForm } from '@/components/module/config';
import { auth, reset, seedUsers, store } from './helpers/fake-admin';

const call = (uid: string, body: unknown) =>
  POST(new NextRequest('http://localhost/api/records', { method: 'POST', headers: { 'content-type': 'application/json', ...auth(uid) }, body: JSON.stringify(body) }));

beforeEach(() => { reset(); seedUsers(); store.set('projects/P1', { name: 'One' }); });

// Mirrors RecordFormModal.saveRecord for an edit: whole form + p/m + numeric coercion.
describe('edit form → /api/records update, every module', () => {
  it.each(Object.keys(FIELDS))('%s saves edited fields', async mod => {
    const old = { p: 'P1', m: mod, t: 'Old title', s: STATUS[mod][0], d: '01 Jan 2026', by: 'pm', ts: 1, seq: 1 };
    store.set('records/r1', old);
    const form = defaultForm(mod, { id: 'r1', ...old } as never);
    form.t = 'New title'; form.sub = 'New notes';
    const r: Record<string, string | number> = { p: 'P1', m: mod, ...form };
    if (r.amt !== undefined) r.amt = Number(r.amt) || 0;
    if (r.pct !== undefined) r.pct = Math.max(0, Math.min(100, Number(r.pct) || 0));
    const res = await call('admin', { action: 'update', id: 'r1', patch: r, what: 'x' });
    expect(res.status, JSON.stringify(await res.clone().json())).toBe(200);
    expect(store.get('records/r1')).toMatchObject({ t: 'New title', sub: 'New notes' });
  });
});

describe('immutable fields in an update patch', () => {
  it('ignores unchanged p/m but still refuses changed ones', async () => {
    store.set('projects/P2', { name: 'Two' });
    store.set('records/r1', { p: 'P1', m: 'quotations', t: 'Q', s: 'Draft', by: 'pm', ts: 1, seq: 1 });
    expect((await call('admin', { action: 'update', id: 'r1', patch: { p: 'P1', m: 'quotations', t: 'Q2' } })).status).toBe(200);
    expect((await call('admin', { action: 'update', id: 'r1', patch: { p: 'P2', t: 'Q3' } })).status).toBe(403);
    expect((await call('admin', { action: 'update', id: 'r1', patch: { m: 'expenses' } })).status).toBe(403);
    expect(store.get('records/r1')).toMatchObject({ p: 'P1', m: 'quotations', t: 'Q2' });
  });
});
