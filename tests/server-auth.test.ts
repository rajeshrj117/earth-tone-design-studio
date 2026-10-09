import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { assertRole, canProject, errorResponse, requireUser } from '@/lib/server-auth';
import { RateLimitError } from '@/lib/rate-limit';
import { auth, reset, seedUsers } from './helpers/fake-admin';
import type { User } from '@/lib/data';

const req = (headers: Record<string, string> = {}) => new NextRequest('http://localhost/api/x', { headers });
beforeEach(() => { reset(); seedUsers(); });

describe('requireUser', () => {
  it('rejects requests without a token (401 path)', async () => {
    await expect(requireUser(req())).rejects.toThrow('UNAUTHENTICATED');
  });
  it('rejects an invalid token', async () => {
    await expect(requireUser(req({ Authorization: 'Bearer garbage' }))).rejects.toThrow();
  });
  it('rejects a valid token whose user has no profile', async () => {
    await expect(requireUser(req(auth('ghost')))).rejects.toThrow('FORBIDDEN');
  });
  it('rejects disabled accounts', async () => {
    await expect(requireUser(req(auth('banned')))).rejects.toThrow('DISABLED');
  });
  it('returns uid and profile for an active user', async () => {
    const { uid, profile } = await requireUser(req(auth('pm')));
    expect(uid).toBe('pm');
    expect(profile.role).toBe('pm');
  });
});

describe('canProject', () => {
  const u = (projects: User['projects']) => ({ projects } as User);
  it('"all" can access every project', () => expect(canProject(u('all'), 'ANY')).toBe(true));
  it('list members only see listed projects', () => {
    expect(canProject(u(['P1']), 'P1')).toBe(true);
    expect(canProject(u(['P1']), 'P2')).toBe(false);
  });
  it('empty list sees nothing', () => expect(canProject(u([]), 'P1')).toBe(false));
});

describe('assertRole', () => {
  it('allows listed roles and blocks others', () => {
    expect(() => assertRole({ role: 'admin' } as User, ['admin'])).not.toThrow();
    expect(() => assertRole({ role: 'client' } as User, ['admin', 'pm'])).toThrow('FORBIDDEN');
  });
});

describe('errorResponse', () => {
  const status = (e: unknown) => errorResponse(e).status;
  it('maps errors to the right HTTP status', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(status(new Error('UNAUTHENTICATED'))).toBe(401);
    expect(status(new Error('FORBIDDEN'))).toBe(403);
    expect(status(new Error('DISABLED'))).toBe(403);
    expect(status(new Error('INVALID_STATUS'))).toBe(400);
    expect(status(new Error('boom'))).toBe(500);
  });
  it('429 carries Retry-After and never leaks internals on 500', async () => {
    const r = errorResponse(new RateLimitError(42));
    expect(r.status).toBe(429);
    expect(r.headers.get('Retry-After')).toBe('42');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const e = errorResponse(new Error('secret db password'));
    expect(JSON.stringify(await e.json())).not.toContain('secret');
  });
});
