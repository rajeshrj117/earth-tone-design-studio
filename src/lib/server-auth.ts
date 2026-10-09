import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from './firebase-admin';
import { Role, User } from './data';
import { RateLimitError } from './rate-limit';

export async function requireUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('UNAUTHENTICATED');
  const decoded = await adminAuth().verifyIdToken(token);
  const snap = await adminDb().doc(`users/${decoded.uid}`).get();
  if (!snap.exists) throw new Error('FORBIDDEN');
  const profile = { ...(snap.data() as User), id: decoded.uid };
  if ((profile as User & { disabled?: boolean }).disabled) throw new Error('DISABLED');
  return { uid: decoded.uid, profile };
}

export function assertRole(profile: User, roles: Role[]) {
  if (!roles.includes(profile.role)) throw new Error('FORBIDDEN');
}

export function canProject(profile: User, pid: string) {
  return profile.projects === 'all' || profile.projects.includes(pid);
}

export function errorResponse(e: unknown) {
  const code = e instanceof Error ? e.message : '';
  if (code === 'UNAUTHENTICATED') return Response.json({ error: 'Unauthenticated' }, { status: 401 });
  if (code === 'FORBIDDEN') return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (e instanceof RateLimitError) return Response.json({ error: `Too many requests. Try again in ${e.retryAfter}s.` }, { status: 429, headers: { 'Retry-After': String(e.retryAfter) } });
  if (/^INVALID_/.test(code)) return Response.json({ error: `Invalid request (${code.replace(/^INVALID_/, '').toLowerCase().replace(/_/g, ' ')})` }, { status: 400 });
  if (code === 'DISABLED') return Response.json({ error: 'Account disabled' }, { status: 403 });
  console.error(e);
  return Response.json({ error: 'Request failed' }, { status: 500 });
}

export async function audit(uid: string, profile: User, what: string, p = '') {
  await adminDb().collection('audit').add({
    who: profile.name, role: profile.title || profile.role, what, p, uid, ts: Date.now()
  });
}
