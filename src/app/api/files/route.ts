import { NextRequest } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import { requireUser, canProject, errorResponse, audit } from '@/lib/server-auth';
import { adminDb } from '@/lib/firebase-admin';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req:NextRequest){
 try{
  const {uid,profile}=await requireUser(req); await rateLimit('upload',uid,40,600); const form=await req.formData();
  const file=form.get('file'); const projectId=String(form.get('projectId')||''); const kind=String(form.get('kind')||'documents');
  if(!(file instanceof File)||!projectId||!canProject(profile,projectId))throw new Error('FORBIDDEN');
  if(file.size>15*1024*1024)return Response.json({error:'Maximum file size is 15 MB'},{status:413});
  const ext=file.name.toLowerCase().split('.').pop()||'';
  const allowedTypes:Record<string,string[]>={pdf:['application/pdf'],png:['image/png'],jpg:['image/jpeg'],jpeg:['image/jpeg'],webp:['image/webp'],doc:['application/msword'],docx:['application/vnd.openxmlformats-officedocument.wordprocessingml.document']};
  const mime=(!file.type||file.type==='application/octet-stream')?(allowedTypes[ext]?.[0]||''):file.type; // multipart sends a missing type as octet-stream
  if(!allowedTypes[ext]?.includes(mime)) return Response.json({error:'Unsupported or unsafe file type'},{status:415});
  if(!['documents','updates','snags','agreements','payment-proof','expense-receipts','quotation-attachments','variation-attachments','floor-plans','approval-images','material-samples','project-cover','avatars'].includes(kind))throw new Error('FORBIDDEN');
  const UPLOAD_ROLES:Record<string,string[]>={documents:['admin','pm','designer'],updates:['admin','pm','designer'],snags:['admin','pm','client'],agreements:['admin','accounts'],'payment-proof':['admin','accounts','client'],'expense-receipts':['admin','pm','accounts'],'quotation-attachments':['admin','pm','accounts'],'variation-attachments':['admin','pm','accounts'],'floor-plans':['admin','pm','designer'],'approval-images':['admin','pm','designer'],'material-samples':['admin','pm','designer'],'project-cover':['admin','pm','designer'],avatars:['admin','pm','designer','accounts','client']};
  const allowed=!!UPLOAD_ROLES[kind]?.includes(profile.role);
  if(!allowed)throw new Error('FORBIDDEN');
  const bucket=getStorage().bucket(); const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'); const path=`projects/${projectId}/${kind}/${Date.now()}-${safe}`;
  const buf=Buffer.from(await file.arrayBuffer()); const f=bucket.file(path);
  await f.save(buf,{metadata:{contentType:mime,metadata:{uploadedBy:uid,projectId,kind},cacheControl:'private, no-store'}});
  const url=`/api/files?path=${encodeURIComponent(path)}`;
  await audit(uid,profile,`Uploaded ${kind} file ${file.name}`,projectId);
  return Response.json({url,path,name:file.name,size:file.size,type:file.type});
 }catch(e){return errorResponse(e);}
}


export async function GET(req:NextRequest){
 try{
  const {profile}=await requireUser(req); const path=new URL(req.url).searchParams.get('path'); if(!path||!path.startsWith('projects/'))throw new Error('FORBIDDEN');
  const parts=path.split('/'); const pid=parts[1]; if(!canProject(profile,pid))throw new Error('FORBIDDEN');
  const kind=parts[2];
  const roleAllowed:Record<string,string[]>={documents:['admin','pm','designer','client'],updates:['admin','pm','designer','client'],snags:['admin','pm','client'],agreements:['admin','accounts','client'],'payment-proof':['admin','accounts','client'],'expense-receipts':['admin','pm','accounts'],'quotation-attachments':['admin','pm','accounts','client'],'variation-attachments':['admin','pm','accounts','client'],'floor-plans':['admin','pm','designer','client'],'approval-images':['admin','pm','designer','client'],'material-samples':['admin','pm','designer','client'],'project-cover':['admin','pm','designer','client'],'avatars':['admin','pm','designer','accounts','client']};
  if(!roleAllowed[kind]?.includes(profile.role))throw new Error('FORBIDDEN');
  const file=getStorage().bucket().file(path); const [buf,meta]=await Promise.all([file.download(),file.getMetadata()]);
  return new Response(new Uint8Array(buf[0]),{headers:{'Content-Type':meta[0].contentType||'application/octet-stream','Content-Disposition':`attachment; filename="${path.split('/').pop()}"`,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'}});
 }catch(e){return errorResponse(e);}
}

export async function DELETE(req:NextRequest){
 try{
  const {uid,profile}=await requireUser(req); const path=new URL(req.url).searchParams.get('path');
  if(!path||!path.startsWith('projects/'))throw new Error('FORBIDDEN');
  const parts=path.split('/'); const pid=parts[1]; const kind=parts[2];
  if(!canProject(profile,pid))throw new Error('FORBIDDEN');
  const allowed:Record<string,string[]>={documents:['admin','pm','designer'],updates:['admin','pm','designer'],snags:['admin','pm'],agreements:['admin','accounts'],'payment-proof':['admin','accounts','client'],'expense-receipts':['admin','pm','accounts'],'quotation-attachments':['admin','pm','accounts'],'variation-attachments':['admin','pm','accounts'],'floor-plans':['admin','pm','designer'],'approval-images':['admin','pm','designer'],'material-samples':['admin','pm','designer'],'project-cover':['admin','pm','designer'],'avatars':['admin','pm','designer','accounts','client']};
  if(!allowed[kind]?.includes(profile.role))throw new Error('FORBIDDEN');
  const target=getStorage().bucket().file(path);
  if(profile.role==='client' && kind==='payment-proof'){
    const [meta]=await target.getMetadata();
    if(meta.metadata?.uploadedBy!==uid)throw new Error('FORBIDDEN');
  }
  await target.delete({ignoreNotFound:true});
  await audit(uid,profile,`Deleted ${kind} file ${path.split('/').pop()}`,pid);
  return Response.json({ok:true});
 }catch(e){return errorResponse(e);}
}
