import { adminDb } from './firebase-admin';

export class RateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter: number) { super('RATE_LIMITED'); this.retryAfter = retryAfter; }
}

// Fixed-window limiter backed by Firestore (works across serverless instances, unlike in-memory counters).
// Docs live in `rateLimits/*` (client access is denied by the catch-all rule). Add a Firestore TTL policy on
// the `expireAt` field of the `rateLimits` collection so old windows are cleaned up automatically.
// Fails OPEN on infrastructure errors so a Firestore hiccup never locks everyone out of the portal.
export async function rateLimit(bucket: string, key: string, limit: number, windowSec: number) {
  const now = Date.now(), win = windowSec * 1000;
  const start = Math.floor(now / win) * win;
  const id = `${bucket}_${key}_${start}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 300);
  const ref = adminDb().collection('rateLimits').doc(id);
  try {
    const count = await adminDb().runTransaction(async tx => {
      const snap = await tx.get(ref);
      const c = (snap.exists ? (snap.data()!.count as number) : 0) + 1;
      tx.set(ref, { bucket, key, count: c, windowStart: start, expireAt: new Date(start + win * 2) });
      return c;
    });
    if (count > limit) throw new RateLimitError(Math.max(1, Math.ceil((start + win - now) / 1000)));
  } catch (e) {
    if (e instanceof RateLimitError) throw e;
    console.error('rate-limit check failed (allowing request)', e);
  }
}
