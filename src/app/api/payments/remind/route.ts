import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireUser, canProject, errorResponse, audit } from '@/lib/server-auth';

export async function POST(req:NextRequest){
 try{
  const {uid,profile}=await requireUser(req);
  if(!['admin','accounts'].includes(profile.role))throw new Error('FORBIDDEN');
  const {paymentId}=await req.json() as {paymentId:string}; if(!paymentId)throw new Error('FORBIDDEN');
  const db=adminDb();const ps=await db.doc(`payments/${paymentId}`).get();if(!ps.exists)throw new Error('FORBIDDEN');const p=ps.data() as {p:string;s:string;t:string;amt?:number;d?:string;};
  if(!canProject(profile,p.p)||p.s!=='Due')throw new Error('FORBIDDEN');
  const project=(await db.doc(`projects/${p.p}`).get()).data() as {name?:string;client?:string}|undefined;const cs=await db.collection('clients').where('name','==',project?.client||'').limit(1).get();
  const client=cs.empty?null:cs.docs[0].data() as {email?:string;contact?:string;name?:string};if(!client?.email)throw new Error('Client email not found');
  if(!process.env.RESEND_API_KEY||!process.env.FROM_EMAIL)return Response.json({error:'Email provider is not configured.'},{status:503});
  const rr=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.FROM_EMAIL,to:[client.email],subject:`Payment reminder — ${p.t}`,html:`<p>Dear ${client.contact||client.name},</p><p>This is a reminder that <strong>₹${Number(p.amt||0).toLocaleString('en-IN')}</strong> is due for ${project?.name||p.p}.</p><p>Payment stage: ${p.t}<br/>Due date: ${p.d}</p><p>Regards,<br/>Earth Tone Design Studio</p>`})});
  if(!rr.ok)return Response.json({error:'Email provider rejected the message.'},{status:502});
  await audit(uid,profile,`Sent payment reminder for ${paymentId}`,p.p);return Response.json({ok:true});
 }catch(e){return errorResponse(e)}
}
