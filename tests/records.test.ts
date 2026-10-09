import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/records/route';
import { auth, reset, seedUsers, store } from './helpers/fake-admin';

const call = (uid: string | null, body: unknown) =>
  POST(new NextRequest('http://localhost/api/records', { method: 'POST', headers: { 'content-type': 'application/json', ...(uid ? auth(uid) : {}) }, body: JSON.stringify(body) }));
const create = (uid: string, m: string, extra: Record<string, unknown> = {}, p = 'P1') =>
  call(uid, { action: 'create', record: { p, m, t: 'Item', s: statusFor[m] ?? 'Pending', d: '01 Jan 2026', ...extra } });
const statusFor: Record<string, string> = { scope: 'Planned', expenses: 'Pending', tasks: 'Upcoming', updates: 'Site', documents: 'Draft', requests: 'In Review', snags: 'Open', feedback: 'Rated', quotations: 'Draft', variations: 'Draft', timeline: 'Upcoming' };
const recs = () => [...store.entries()].filter(([k]) => k.startsWith('records/'));

beforeEach(() => { reset(); seedUsers(); store.set('projects/P1', { name: 'One' }); });

describe('create: role × module', () => {
  const cases: [string, string, boolean][] = [
    ['admin', 'scope', true], ['pm', 'scope', true], ['pm', 'expenses', true],
    ['designer', 'updates', true], ['designer', 'documents', true], ['designer', 'tasks', true],
    ['designer', 'expenses', false], ['designer', 'quotations', false], ['designer', 'snags', false],
    ['accounts', 'expenses', true], ['accounts', 'quotations', true], ['accounts', 'variations', true],
    ['accounts', 'tasks', false], ['accounts', 'scope', false], ['accounts', 'updates', false],
    ['client', 'requests', true], ['client', 'snags', true], ['client', 'feedback', true],
    ['client', 'scope', false], ['client', 'documents', false], ['client', 'quotations', false], ['client', 'expenses', false], ['client', 'tasks', false],
  ];
  it.each(cases)('%s → %s: %s', async (role, mod, ok) => {
    const r = await create(role, mod);
    expect(r.status).toBe(ok ? 200 : 403);
    expect(recs().length).toBe(ok ? 1 : 0);
  });
  it.each(['admin', 'pm', 'accounts', 'client'])('%s can never create payments/agreements through the generic API', async role => {
    expect((await create(role, 'payments', { s: 'Received' })).status).toBe(403);
    expect((await create(role, 'agreements', { s: 'Pending' })).status).toBe(403);
  });
});

describe('create: scoping & validation', () => {
  it('401 without token, 403 for disabled', async () => {
    expect((await call(null, { action: 'create', record: {} })).status).toBe(401);
    expect((await create('banned', 'requests')).status).toBe(403);
  });
  it('blocks creating in a project the user does not belong to', async () => {
    expect((await create('pm', 'scope', {}, 'P2')).status).toBe(403);
    expect((await create('client2', 'requests', {}, 'P1')).status).toBe(403);
    expect((await create('admin', 'scope', {}, 'P2')).status).toBe(200); // admin = all
  });
  it('rejects fields outside the module allow-list with 400 (e.g. injecting "by"/"ts")', async () => {
    const r = await create('pm', 'scope', { by: 'someone-else' });
    expect(r.status).toBe(400);
    expect(recs().length).toBe(0);
  });
  it('rejects invalid status and over-long titles with 400', async () => {
    expect((await create('pm', 'scope', { s: 'Hacked' })).status).toBe(400);
    expect((await create('pm', 'scope', { t: 'x'.repeat(201) })).status).toBe(400);
  });
  it('stamps the creator server-side', async () => {
    await create('pm', 'scope');
    expect(recs()[0][1]).toMatchObject({ by: 'pm' });
  });
  it('allocates request numbers on the server (REQ-year-0001, 0002…)', async () => {
    await create('client', 'requests', { t: 'Move socket' });
    await create('client', 'requests', { t: 'Paint colour' });
    const titles = recs().map(([, v]) => v.t as string).sort();
    const y = new Date().getFullYear();
    expect(titles[0]).toMatch(new RegExp(`^REQ-${y}-0001 · `));
    expect(titles[1]).toMatch(new RegExp(`^REQ-${y}-0002 · `));
  });
  it('recalculates project progress when timeline stages change', async () => {
    store.set('records/t1', { p: 'P1', m: 'timeline', t: 'Civil', s: 'Completed' });
    await create('pm', 'timeline', { s: 'Upcoming' });
    expect(store.get('projects/P1')!.progress).toBe(50);
  });
});

describe('update', () => {
  const seed = (id: string, data: Record<string, unknown>) => store.set(`records/${id}`, { p: 'P1', t: 'T', d: 'x', ...data });
  const upd = (uid: string, id: string, patch: Record<string, unknown>) => call(uid, { action: 'update', id, patch });

  it('client can approve a Pending approval but not edit its title or re-open it later', async () => {
    seed('a1', { m: 'approvals', s: 'Pending' });
    expect((await upd('client', 'a1', { t: 'Hacked title' })).status).toBe(403);
    expect((await upd('client', 'a1', { s: 'Approved' })).status).toBe(200);
    expect(store.get('records/a1')!.s).toBe('Approved');
    expect((await upd('client', 'a1', { s: 'Rejected' })).status).toBe(403); // already decided
  });
  it('client cannot change internal modules or protected fields', async () => {
    seed('s1', { m: 'scope', s: 'Planned' }); seed('a2', { m: 'approvals', s: 'Pending' });
    expect((await upd('client', 's1', { s: 'Completed' })).status).toBe(403);
    for (const f of ['p', 'm', 'by', 'ts', 'seq']) expect((await upd('client', 'a2', { [f]: 'x' })).status).toBe(403);
  });
  it('client can close a snag only after it is Rectified', async () => {
    seed('n1', { m: 'snags', s: 'Open' }); seed('n2', { m: 'snags', s: 'Rectified' });
    expect((await upd('client', 'n1', { s: 'Closed' })).status).toBe(403);
    expect((await upd('client', 'n2', { s: 'Closed' })).status).toBe(200);
  });
  it('clients from another project cannot touch the record', async () => {
    seed('a3', { m: 'approvals', s: 'Pending' });
    expect((await upd('client2', 'a3', { s: 'Approved' })).status).toBe(403);
    expect(store.get('records/a3')!.s).toBe('Pending');
  });
  it('rejects invalid statuses (400) and missing records (404)', async () => {
    seed('s2', { m: 'scope', s: 'Planned' });
    expect((await upd('pm', 's2', { s: 'Nonsense' })).status).toBe(400);
    expect((await upd('pm', 'missing', { s: 'Completed' })).status).toBe(404);
  });
  it('regression: finishing one of two timeline stages sets progress to 50%, not 100%', async () => {
    seed('tl1', { m: 'timeline', s: 'Upcoming' }); seed('tl2', { m: 'timeline', s: 'Upcoming' });
    expect((await upd('pm', 'tl1', { s: 'Completed' })).status).toBe(200);
    expect(store.get('projects/P1')!.progress).toBe(50);
    await upd('pm', 'tl2', { s: 'Completed' });
    expect(store.get('projects/P1')!.progress).toBe(100);
    await upd('pm', 'tl2', { s: 'In Progress' });
    expect(store.get('projects/P1')!.progress).toBe(50);
  });
  it('pm can update scope; the change is stored', async () => {
    seed('s3', { m: 'scope', s: 'Planned' });
    expect((await upd('pm', 's3', { s: 'In Progress' })).status).toBe(200);
    expect(store.get('records/s3')!.s).toBe('In Progress');
  });
});

describe('delete', () => {
  const seed = (id: string, m: string, p = 'P1') => store.set(`records/${id}`, { p, m, t: 'T', s: 'x', d: 'x' });
  it('client can never delete', async () => {
    seed('r1', 'requests');
    expect((await call('client', { action: 'delete', id: 'r1' })).status).toBe(403);
    expect(store.has('records/r1')).toBe(true);
  });
  it('designer deletes only design modules; accounts only finance modules', async () => {
    seed('e1', 'expenses'); seed('u1', 'updates'); seed('q1', 'quotations'); seed('t1', 'tasks');
    expect((await call('designer', { action: 'delete', id: 'e1' })).status).toBe(403);
    expect((await call('designer', { action: 'delete', id: 'u1' })).status).toBe(200);
    expect((await call('accounts', { action: 'delete', id: 't1' })).status).toBe(403);
    expect((await call('accounts', { action: 'delete', id: 'q1' })).status).toBe(200);
  });
  it('payments/agreements cannot be deleted here, even by admin', async () => {
    seed('p1', 'payments'); seed('g1', 'agreements');
    expect((await call('admin', { action: 'delete', id: 'p1' })).status).toBe(403);
    expect((await call('admin', { action: 'delete', id: 'g1' })).status).toBe(403);
  });
  it('cannot delete records in other projects; timeline delete recalculates progress', async () => {
    seed('x1', 'scope', 'P2');
    expect((await call('pm', { action: 'delete', id: 'x1' })).status).toBe(403);
    store.set('records/tl1', { p: 'P1', m: 'timeline', t: 'A', s: 'Completed' }); store.set('records/tl2', { p: 'P1', m: 'timeline', t: 'B', s: 'Upcoming' });
    expect((await call('pm', { action: 'delete', id: 'tl2' })).status).toBe(200);
    expect(store.get('projects/P1')!.progress).toBe(100);
  });
});
