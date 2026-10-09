import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireUser, errorResponse } from '@/lib/server-auth';

export async function POST(req: NextRequest) {
  try {
    const { uid, profile } = await requireUser(req);
    const b = await req.json() as { what?: string; p?: string };
    if (!b.what) return Response.json({ error:'Missing audit action' },{status:400});
    await adminDb().collection('audit').add({ who: profile.name, role: profile.title, what: b.what, p: b.p || '', uid, ts: Date.now() });
    return Response.json({ok:true});
  } catch(e){return errorResponse(e);}
}
