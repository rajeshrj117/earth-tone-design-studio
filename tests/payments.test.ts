import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/payments/route';
import { auth, reset, seedUsers, store } from './helpers/fake-admin';

const call = (uid: string | null, body: unknown) =>
  POST(new NextRequest('http://localhost/api/payments', { method: 'POST', headers: { 'content-type': 'application/json', ...(uid ? auth(uid) : {}) }, body: JSON.stringify(body) }));
const payments = () => [...store.entries()].filter(([k]) => k.startsWith('payments/'));
const auditLines = () => [...store.entries()].filter(([k]) => k.startsWith('audit/')).map(([, v]) => v.what as string);

beforeEach(() => {
  reset(); seedUsers();
  store.set('payments/pay1', { p: 'P1', m: 'payments', t: 'Stage 1', s: 'Pending verification', amt: 50000 });
  store.set('payments/pay2', { p: 'P2', m: 'payments', t: 'Other project', s: 'Pending verification', amt: 1000 });
});

describe('authentication', () => {
  it('401 without a token', async () => expect((await call(null, { action: 'record', paymentId: 'pay1' })).status).toBe(401));
  it('403 for disabled users', async () => expect((await call('banned', { action: 'record', paymentId: 'pay1' })).status).toBe(403));
  it('unknown actions are forbidden', async () => expect((await call('admin', { action: 'refund-everything' })).status).toBe(403));
});

describe('submit-manual (client says "I already paid")', () => {
  const body = { action: 'submit-manual', projectId: 'P1', amount: 25000.4, method: 'UPI', reference: 'UTR123' };
  it('client can submit for own project; lands as "Pending verification" with rounded amount', async () => {
    const r = await call('client', body);
    expect(r.status).toBe(200);
    const added = payments().find(([k]) => k !== 'payments/pay1' && k !== 'payments/pay2')![1];
    expect(added).toMatchObject({ s: 'Pending verification', amt: 25000, p: 'P1', submittedBy: 'client' });
    expect(auditLines().some(l => l.includes('manual payment'))).toBe(true);
  });
  it('a client can NEVER self-mark a payment as Received', async () => {
    await call('client', { ...body, status: 'Received', s: 'Received' });
    const added = payments().find(([k]) => k !== 'payments/pay1' && k !== 'payments/pay2')![1];
    expect(added.s).toBe('Pending verification');
  });
  it('client cannot submit for another project', async () => expect((await call('client', { ...body, projectId: 'P2' })).status).toBe(403));
  it.each(['pm', 'designer'])('%s cannot submit payments', async role => expect((await call(role, body)).status).toBe(403));
  it.each([
    ['zero amount', { amount: 0 }], ['negative amount', { amount: -5 }], ['missing method', { method: '' }], ['missing project', { projectId: '' }],
  ])('rejects %s', async (_n, patch) => expect((await call('client', { ...body, ...patch })).status).toBe(403));
});

describe('record / reject (staff verification)', () => {
  it('admin and accounts can verify; status becomes Received and is audited', async () => {
    for (const role of ['admin', 'accounts']) {
      store.set('payments/pay1', { p: 'P1', m: 'payments', t: 'Stage 1', s: 'Pending verification', amt: 50000 });
      expect((await call(role, { action: 'record', paymentId: 'pay1' })).status).toBe(200);
      expect(store.get('payments/pay1')).toMatchObject({ s: 'Received', recordedBy: role });
    }
    expect(auditLines().filter(l => l.includes('Verified')).length).toBe(2);
  });
  it.each(['client', 'pm', 'designer'])('%s cannot verify payments', async role => {
    expect((await call(role, { action: 'record', paymentId: 'pay1' })).status).toBe(403);
    expect(store.get('payments/pay1')!.s).toBe('Pending verification');
  });
  it('accounts (P1 only) cannot verify a payment in a project they do not have', async () => {
    expect((await call('accounts', { action: 'record', paymentId: 'pay2' })).status).toBe(403);
    expect(store.get('payments/pay2')!.s).toBe('Pending verification');
  });
  it('404 for missing payment', async () => expect((await call('admin', { action: 'record', paymentId: 'nope' })).status).toBe(404));
  it('reject needs a reason, stores it, and is staff-only', async () => {
    expect((await call('admin', { action: 'reject', paymentId: 'pay1', reason: '  ' })).status).toBe(403);
    expect((await call('client', { action: 'reject', paymentId: 'pay1', reason: 'x' })).status).toBe(403);
    expect((await call('accounts', { action: 'reject', paymentId: 'pay1', reason: 'Wrong UTR' })).status).toBe(200);
    expect(store.get('payments/pay1')).toMatchObject({ s: 'Rejected', rejectionReason: 'Wrong UTR' });
  });
});

describe('milestones', () => {
  const m = { action: 'create-milestone', projectId: 'P1', name: 'Handover', amount: 100000 };
  it('admin/accounts can create; status defaults to Due unless Upcoming', async () => {
    expect((await call('accounts', m)).status).toBe(200);
    expect((await call('admin', { ...m, status: 'Upcoming' })).status).toBe(200);
    const created = payments().filter(([k]) => !['payments/pay1', 'payments/pay2'].includes(k)).map(([, v]) => v.s);
    expect(created.sort()).toEqual(['Due', 'Upcoming']);
  });
  it('client can never set status Received through create/update', async () => {
    expect((await call('client', m)).status).toBe(403);
    expect((await call('client', { action: 'update-milestone', paymentId: 'pay1', status: 'Received' })).status).toBe(403);
  });
  it('pm/designer cannot create milestones', async () => {
    expect((await call('pm', m)).status).toBe(403);
    expect((await call('designer', m)).status).toBe(403);
  });
  it('rejects zero/negative amounts and other-project creation', async () => {
    expect((await call('admin', { ...m, amount: 0 })).status).toBe(403);
    expect((await call('admin', { ...m, amount: -1 })).status).toBe(403);
    expect((await call('accounts', { ...m, projectId: 'P2' })).status).toBe(403);
  });
  it('update only accepts known statuses', async () => {
    await call('admin', { action: 'update-milestone', paymentId: 'pay1', status: 'Hacked' });
    expect(store.get('payments/pay1')!.s).toBe('Pending verification');
    await call('admin', { action: 'update-milestone', paymentId: 'pay1', status: 'Due', amount: 7000.6 });
    expect(store.get('payments/pay1')).toMatchObject({ s: 'Due', amt: 7001 });
  });
  it('delete is staff-only and project-scoped', async () => {
    expect((await call('client', { action: 'delete-milestone', paymentId: 'pay1' })).status).toBe(403);
    expect((await call('accounts', { action: 'delete-milestone', paymentId: 'pay2' })).status).toBe(403);
    expect((await call('accounts', { action: 'delete-milestone', paymentId: 'pay1' })).status).toBe(200);
    expect(store.has('payments/pay1')).toBe(false);
  });
});

describe('online payments stay disabled', () => {
  it('webhook returns 410', async () => {
    const { POST: hook } = await import('@/app/api/payments/webhook/route');
    expect((await hook(new NextRequest('http://localhost/api/payments/webhook', { method: 'POST' }))).status).toBe(410);
  });
});
