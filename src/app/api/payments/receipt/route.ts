import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireUser, canProject, errorResponse } from '@/lib/server-auth';

function pdf(textLines:string[]) {
  const esc=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  const content=['BT','/F1 22 Tf','50 760 Td',`(${esc(textLines[0])}) Tj`,'/F1 11 Tf','0 -35 Td',...textLines.slice(1).flatMap(x=>[`(${esc(x)}) Tj`,'0 -22 Td']),'ET'].join('\n');
  const objs=[
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let out='%PDF-1.4\n', offsets=[0];
  objs.forEach((o,i)=>{offsets[i+1]=Buffer.byteLength(out);out+=`${i+1} 0 obj\n${o}\nendobj\n`});
  const xref=Buffer.byteLength(out);out+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;for(let i=1;i<offsets.length;i++)out+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;out+=`trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out,'binary');
}

export async function GET(req:NextRequest){
 try{
  const {profile}=await requireUser(req);if(!['admin','accounts','client'].includes(profile.role))throw new Error('FORBIDDEN');const id=new URL(req.url).searchParams.get('id');if(!id)throw new Error('FORBIDDEN');
  const snap=await adminDb().doc(`payments/${id}`).get();if(!snap.exists)return new Response('Not found',{status:404});
  const p=snap.data() as {p:string;t:string;s:string;amt?:number;paidAt?:number;};if(!canProject(profile,p.p))throw new Error('FORBIDDEN');
  const project=(await adminDb().doc(`projects/${p.p}`).get()).data() as {name?:string}|undefined;
  const amount=`INR ${Number(p.amt||0).toLocaleString('en-IN')}`;
  const data=pdf(['EARTH TONE DESIGN STUDIO','PAYMENT RECEIPT',`Receipt: ${id}`,`Project: ${project?.name||p.p}`,`Payment stage: ${p.t}`,`Amount: ${amount}`,`Status: ${p.s}`,`Paid: ${new Date(p.paidAt||Date.now()).toLocaleString('en-IN')}`]);
  return new Response(data as unknown as BodyInit,{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="ETDS-${id}-receipt.pdf"`}});
 }catch(e){return errorResponse(e);}
}
