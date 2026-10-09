import { NextRequest } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import { adminDb } from '@/lib/firebase-admin';
import { Project } from '@/lib/data';
import { requireUser, assertRole, errorResponse, audit } from '@/lib/server-auth';

export async function POST(req: NextRequest) {
  try {
    const { uid, profile } = await requireUser(req); assertRole(profile, ['admin']);
    const b = await req.json() as { action:'create'|'update'|'delete'; id?:string; project?:Partial<Project>; clientId?:string };
    const db=adminDb();
    if (b.action==='delete') {
      if(!b.id) throw new Error('FORBIDDEN');
      const [rs,ps,as,cs] = await Promise.all([db.collection('records').where('p','==',b.id).get(),db.collection('payments').where('p','==',b.id).get(),db.collection('agreements').where('p','==',b.id).get(),db.collection('clients').get()]);
      const batch=db.batch(); rs.docs.forEach(d=>batch.delete(d.ref)); ps.docs.forEach(d=>batch.delete(d.ref)); as.docs.forEach(d=>batch.delete(d.ref));
      cs.docs.forEach(d=>{const c=d.data() as {projects?:string[]};if(Array.isArray(c.projects)&&c.projects.includes(b.id!))batch.set(d.ref,{projects:c.projects.filter((x:string)=>x!==b.id)},{merge:true});});
      batch.delete(db.doc(`projects/${b.id}`)); await batch.commit();
      await getStorage().bucket().deleteFiles({prefix:`projects/${b.id}/`}).catch(()=>{});
      await audit(uid,profile,`Deleted project ${b.id}`,b.id); return Response.json({ok:true});
    }
    if (b.action==='update') { if(!b.id) throw new Error('FORBIDDEN'); await db.doc(`projects/${b.id}`).set(b.project||{}, {merge:true}); await audit(uid,profile,`Updated project ${b.id}`,b.id); return Response.json({ok:true}); }
    const p=b.project as Project; if(!p?.id||!p.name||!p.client) return Response.json({error:'Project id, name and client are required'},{status:400}); if(/[\/\\]/.test(p.id)||p.id==='.'||p.id==='..'||p.id.length>100) return Response.json({error:'Project ID cannot contain / or \\'},{status:400});
    await db.doc(`projects/${p.id}`).set(p); if(b.clientId){const c=db.doc(`clients/${b.clientId}`);const cs=await c.get();if(cs.exists){const d=cs.data() as {projects?:string[]};await c.set({projects:Array.from(new Set([...(d.projects||[]),p.id]))},{merge:true})}} await audit(uid,profile,`Created project ${p.id}`,p.id); return Response.json({ok:true});
  } catch(e){return errorResponse(e);}
}
