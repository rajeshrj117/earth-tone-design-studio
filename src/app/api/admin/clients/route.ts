import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireUser, assertRole, errorResponse, audit } from '@/lib/server-auth';

export async function POST(req: NextRequest) {
  try {
    const { uid, profile } = await requireUser(req); assertRole(profile,['admin']);
    const b=await req.json() as {action:'create'|'update'|'delete';id?:string;client?:Record<string,unknown>}; const db=adminDb();
    if(!b.id && b.action!=='create') throw new Error('FORBIDDEN');
    const id=b.id || db.collection('clients').doc().id;
    if(b.action==='delete') await db.doc(`clients/${id}`).delete();
    else await db.doc(`clients/${id}`).set(b.client||{}, {merge:b.action==='update'});
    await audit(uid,profile,`${b.action} client ${id}`, '');
    return Response.json({ok:true,id});
  } catch(e){return errorResponse(e);}
}
