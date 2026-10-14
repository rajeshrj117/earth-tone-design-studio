import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Role, User } from '@/lib/data';
import { requireUser, assertRole, errorResponse, audit } from '@/lib/server-auth';

export async function POST(req: NextRequest) {
  try {
    const { uid: actorUid, profile } = await requireUser(req); assertRole(profile, ['admin']);
    const b = await req.json() as { action?: string; id?: string; name?: string; email?: string; role?: Role; projects?: string[]|'all'; title?: string; color?: string; clientId?: string; avatarUrl?: string; password?: string; disabled?: boolean };
    const auth = adminAuth(), db = adminDb();

    if (b.action === 'update' || b.action === 'deactivate' || b.action === 'reset' || b.action === 'delete') {
      if (!b.id) throw new Error('FORBIDDEN');
      if (b.action === 'reset') {
        const u = await auth.getUser(b.id);
        const link = await auth.generatePasswordResetLink(u.email!);
        await audit(actorUid, profile, `Generated password reset for ${u.email}`, '');
        return Response.json({ resetLink: link });
      }
      if (b.action === 'delete') { if (b.id === actorUid) throw new Error('FORBIDDEN'); const u = await auth.getUser(b.id); await db.doc(`users/${b.id}`).delete(); await auth.deleteUser(b.id); await audit(actorUid, profile, `Deleted user ${u.email}`, ''); return Response.json({ ok: true }); }
      if (b.password && b.password.length < 10) return Response.json({ error: 'Password must be at least 10 characters' }, { status: 400 });
      const ref = db.doc(`users/${b.id}`); const snap = await ref.get();
      if (!snap.exists) return Response.json({ error: 'User not found' }, { status: 404 });
      const old = snap.data() as User;
      const next = {
        ...old,
        ...(b.name !== undefined ? { name: b.name } : {}),
        ...(b.email !== undefined ? { email: b.email.trim().toLowerCase() } : {}),
        ...(b.role !== undefined ? { role: b.role } : {}),
        ...(b.projects !== undefined ? { projects: b.projects } : {}),
        ...(b.title !== undefined ? { title: b.title } : {}),
        ...(b.color !== undefined ? { color: b.color } : {}), ...(b.clientId !== undefined ? { clientId: b.clientId } : {}), ...(b.avatarUrl !== undefined ? { avatarUrl: b.avatarUrl } : {}),
      };
      await ref.set(next, { merge: true });
      await auth.updateUser(b.id, {
        ...(b.name !== undefined ? { displayName: b.name } : {}),
        ...(b.email !== undefined ? { email: b.email } : {}),
        ...(b.disabled !== undefined ? { disabled: b.disabled } : {}),
        ...(b.password ? { password: b.password } : {}),
      });
      await audit(actorUid, profile, `${b.action === 'deactivate' ? 'Deactivated' : 'Updated'} user ${old.email}`, '');
      return Response.json({ ok: true });
    }

    if (!b.email || !b.name || !b.role) return Response.json({ error: 'Name, email and role are required' }, { status: 400 });
    const password = b.password && b.password.length >= 10 ? b.password : crypto.randomUUID() + 'Aa1!';
    const u = await auth.createUser({ email: b.email.trim().toLowerCase(), password, displayName: b.name });
    const user: User = { id: u.uid, email: u.email!, name: b.name, role: b.role, title: b.title || b.role, projects: b.projects ?? [], clientId: b.clientId || '', color: b.color || '#b5654a', ...(b.avatarUrl ? {avatarUrl:b.avatarUrl} : {}) };
    await db.doc(`users/${u.uid}`).set({ ...user, theme: 'earth', read: [], disabled: false });
    await audit(actorUid, profile, `Created user ${user.email} as ${user.role}`, '');
    return Response.json({ ok: true, id: u.uid });
  } catch (e) { return errorResponse(e); }
}