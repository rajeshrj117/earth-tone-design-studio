import { NextRequest } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import { adminDb } from '@/lib/firebase-admin';
import { requireUser, canProject, errorResponse, audit } from '@/lib/server-auth';

export async function POST(req:NextRequest){
 try{
  const {uid,profile}=await requireUser(req); const b=await req.json() as {action:'update'|'create'|'delete';id?:string;patch?:Record<string,unknown>;record?:Record<string,unknown>;what?:string}; const db=adminDb();
  if(b.action==='create'){
   if(!['admin','accounts'].includes(profile.role))throw new Error('FORBIDDEN');
   const r=b.record||{};if(typeof r.p!=='string'||!canProject(profile,r.p))throw new Error('FORBIDDEN');
   const ref=await db.collection('agreements').add({...r,ts:Date.now(),by:uid});await audit(uid,profile,b.what||`Created agreement ${r.t}`,r.p);return Response.json({id:ref.id});
  }
  if(!b.id)throw new Error('FORBIDDEN');const ref=db.doc(`agreements/${b.id}`),snap=await ref.get();if(!snap.exists)throw new Error('FORBIDDEN');const old=snap.data() as {p:string;t:string;s:string;fileUrl?:string;d?:string};
  if(!canProject(profile,old.p))throw new Error('FORBIDDEN');
  if(b.action==='delete'){ if(!['admin','accounts'].includes(profile.role)) throw new Error('FORBIDDEN'); if(old.fileUrl){const path=new URL(old.fileUrl,'http://localhost').searchParams.get('path');if(path&&path.startsWith('projects/'))await getStorage().bucket().file(path).delete({ignoreNotFound:true});} await ref.delete(); await audit(uid,profile,b.what||`Deleted agreement ${old.t}`,old.p); return Response.json({ok:true}); }
  if(profile.role==='client'){const patch=b.patch||{};if(Object.keys(patch).some(k=>!['s','d'].includes(k))||old.s!=='Pending acknowledgement')throw new Error('FORBIDDEN');}
  else if(!['admin','accounts'].includes(profile.role))throw new Error('FORBIDDEN');
  await ref.update(b.patch||{});await audit(uid,profile,b.what||`Updated agreement ${old.t}`,old.p);return Response.json({ok:true});
 }catch(e){return errorResponse(e);}
}
