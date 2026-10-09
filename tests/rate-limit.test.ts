import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rateLimit, RateLimitError } from '@/lib/rate-limit';
import { flags, reset } from './helpers/fake-admin';

beforeEach(() => { reset(); vi.restoreAllMocks(); });

describe('rateLimit', () => {
  it('allows up to the limit, then blocks with a positive retryAfter', async () => {
    for (let i = 0; i < 3; i++) await rateLimit('ai', 'u1', 3, 600);
    const err = await rateLimit('ai', 'u1', 3, 600).catch(e => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryAfter).toBeGreaterThan(0);
    expect(err.retryAfter).toBeLessThanOrEqual(600);
  });
  it('counts users and buckets independently', async () => {
    for (let i = 0; i < 2; i++) await rateLimit('ai', 'u1', 2, 600);
    await expect(rateLimit('ai', 'u2', 2, 600)).resolves.toBeUndefined();
    await expect(rateLimit('upload', 'u1', 2, 600)).resolves.toBeUndefined();
    await expect(rateLimit('ai', 'u1', 2, 600)).rejects.toBeInstanceOf(RateLimitError);
  });
  it('starts a fresh window when time moves on', async () => {
    const now = Date.now();
    const spy = vi.spyOn(Date, 'now').mockReturnValue(now);
    for (let i = 0; i < 2; i++) await rateLimit('ai', 'u1', 2, 60);
    await expect(rateLimit('ai', 'u1', 2, 60)).rejects.toBeInstanceOf(RateLimitError);
    spy.mockReturnValue(now + 61_000);
    await expect(rateLimit('ai', 'u1', 2, 60)).resolves.toBeUndefined();
  });
  it('fails open (and logs) if Firestore is down', async () => {
    flags.failTransactions = true;
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(rateLimit('ai', 'u1', 1, 600)).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
  });
});
